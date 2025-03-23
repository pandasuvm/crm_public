import React, { useState, useEffect } from 'react';
import { collection, getDocs, doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
// import { 
//   as predictLoyaltyScore, 
//   generateAIOffer, 
//   analyzeFeedbackSen,
//   predictChurnRisk 
// } from '../functions/aiconfig';

import { predictLoyaltyScore } from './aitest';
import { generateAIOffer } from './aitest';
import { analyzeFeedbackSentiment } from './aitest';
import { predictChurnRisk } from './aitest';
// import { calculateLoyaltyScore } from '../functions/LoyalityFunctions';

const AdminDashboard = () => {
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [aiResponse, setAiResponse] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [manualInput, setManualInput] = useState({
    purchaseCount: 0,
    totalSpent: 0,
    daysInactive: 0,
    engagementScore: 0.5,
    feedbackScore: 0,
    preferredCategories: '',
    feedbackText: ''
  });
  const [processingAI, setProcessingAI] = useState(false);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const usersCollection = collection(db, 'users');
      const userSnapshot = await getDocs(usersCollection);
      const usersList = userSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setUsers(usersList);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching users:', error);
      setLoading(false);
    }
  };

  const handleUserSelect = async (userId) => {
    try {
      const userRef = doc(db, 'users', userId);
      const userSnap = await getDoc(userRef);
      
      if (userSnap.exists()) {
        setSelectedUser({
          id: userSnap.id,
          ...userSnap.data()
        });
      }
    } catch (error) {
      console.error('Error fetching user details:', error);
    }
  };

  const handleManualInputChange = (e) => {
    const { name, value } = e.target;
    
    // Allow all characters for the feedbackText field
    if (name === "feedbackText") {
      setManualInput({
        ...manualInput,
        [name]: value
      });
    } else {
      // For other fields, maintain your number validation
      setManualInput({
        ...manualInput,
        [name]: name === 'preferredCategories' ? value : 
                (name === 'engagementScore' || name === 'feedbackScore') ? parseFloat(value) : 
                parseInt(value) || 0
      });
    }
  };
  

  const handleGenerateAI = async (type) => {
    setProcessingAI(true);
    try {
      // Ensure we have valid data by providing defaults for zero values
      const customerData = {
        purchaseCount: manualInput.purchaseCount || 0,
        totalSpent: manualInput.totalSpent || 0,
        daysInactive: manualInput.daysInactive || 0,
        engagementScore: manualInput.engagementScore || 0,
        feedbackScore: manualInput.feedbackScore || 0,
        preferredCategories: manualInput.preferredCategories ? 
          manualInput.preferredCategories.split(',').map(cat => cat.trim()) : [],
        customerLifetime: 365 - (manualInput.daysInactive || 0)
      };
  
      // Add purchaseHistory only if purchaseCount > 0
      if (customerData.purchaseCount > 0) {
        customerData.purchaseHistory = Array(customerData.purchaseCount).fill({
          amount: customerData.totalSpent / customerData.purchaseCount,
          timestamp: new Date(Date.now() - (customerData.daysInactive * 24 * 60 * 60 * 1000))
        });
        
        // Calculate average order value and purchase frequency
        customerData.avgOrderValue = customerData.totalSpent / customerData.purchaseCount;
        customerData.purchaseFrequency = (customerData.purchaseCount / customerData.customerLifetime) * 30; // Monthly
      } else {
        customerData.purchaseHistory = [];
        customerData.avgOrderValue = 0;
        customerData.purchaseFrequency = 0;
      }
  
      let result;
      switch (type) {
        case 'loyalty':
          result = await predictLoyaltyScore(customerData);
          setAiResponse({ type: 'Loyalty Score', data: result });
          break;
          
        case 'offer':
          // First get the loyalty score
          const loyaltyScore = await predictLoyaltyScore(customerData);
          
          // Then determine category based on the actual score
          const category = loyaltyScore < 30 ? "Churned" : 
                           loyaltyScore < 50 ? "At-Risk" : "Loyal";
          
          // Now generate the offer with the correct data
          result = await generateAIOffer({
            ...customerData,
            loyaltyScore,
            category
          });
          
          setAiResponse({ type: 'AI Offer', data: result });
          break;
          
        case 'sentiment':
          if (!manualInput.feedbackText || manualInput.feedbackText.trim() === '') {
            throw new Error('Please provide feedback text for sentiment analysis');
          }
          result = await analyzeFeedbackSentiment(manualInput.feedbackText);
          setAiResponse({ type: 'Sentiment Analysis', data: result });
          break;
          
        case 'churn':
          console.log("Sending churn prediction data:", customerData);
          result = await predictChurnRisk(customerData);
          setAiResponse({ type: 'Churn Prediction', data: result });
          break;
          
        default:
          throw new Error('Unknown AI generation type');
      }
    } catch (error) {
      console.error('Error generating AI response:', error);
      setAiResponse({ 
        type: 'Error', 
        data: `Failed to generate AI response: ${error.message}` 
      });
    } finally {
      setProcessingAI(false);
    }
  };
  

  const recalculateUserLoyalty = async (userId) => {
    try {
      await predictLoyaltyScore(userId);
      await fetchUsers();
      if (selectedUser && selectedUser.id === userId) {
        await handleUserSelect(userId);
      }
    } catch (error) {
      console.error('Error recalculating loyalty:', error);
    }
  };

  const getLoyaltyBadgeColor = (category) => {
    switch(category) {
      case "Loyal": return "bg-green-100 text-green-800";
      case "At-Risk": return "bg-yellow-100 text-yellow-800";
      case "Churned": return "bg-red-100 text-red-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">CRM Admin Dashboard</h1>
      
      <div className="flex flex-col lg:flex-row gap-6">
        {/* Left sidebar - User list */}
        <div className="w-full lg:w-1/4">
          <div className="bg-white rounded-lg shadow p-4">
            <h2 className="text-xl font-semibold mb-4">Customers</h2>
            {loading ? (
              <p className="text-gray-500">Loading users...</p>
            ) : (
              <div className="max-h-[600px] overflow-y-auto">
                {users.map(user => (
                  <div 
                    key={user.id} 
                    className={`p-3 mb-2 rounded cursor-pointer hover:bg-gray-50 border-l-4 ${
                      selectedUser && selectedUser.id === user.id 
                        ? 'border-blue-500 bg-blue-50' 
                        : `border-${user.category === 'Loyal' ? 'green' : user.category === 'At-Risk' ? 'yellow' : 'red'}-300 bg-white`
                    }`}
                    onClick={() => handleUserSelect(user.id)}
                  >
                    <div className="flex justify-between items-center">
                      <div>
                        <h3 className="font-medium">{user.displayName || 'Anonymous User'}</h3>
                        <p className="text-sm text-gray-600">{user.email || user.id}</p>
                      </div>
                      <span className={`text-xs px-2 py-1 rounded-full ${getLoyaltyBadgeColor(user.category)}`}>
                        {user.category || 'Unknown'}
                      </span>
                    </div>
                    <div className="mt-1 text-sm">
                      <span className="font-medium">Score: </span>
                      <span>{user.loyaltyScore || 'N/A'}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
        
        {/* Main content area */}
        <div className="w-full lg:w-3/4">
          {selectedUser ? (
            <div className="bg-white rounded-lg shadow">
              {/* Tabs */}
              <div className="border-b">
                <nav className="flex">
                  <button 
                    className={`px-4 py-3 font-medium text-sm ${activeTab === 'overview' ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
                    onClick={() => setActiveTab('overview')}
                  >
                    Overview
                  </button>
                  <button 
                    className={`px-4 py-3 font-medium text-sm ${activeTab === 'loyalty' ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
                    onClick={() => setActiveTab('loyalty')}
                  >
                    Loyalty Analysis
                  </button>
                  <button 
                    className={`px-4 py-3 font-medium text-sm ${activeTab === 'offers' ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
                    onClick={() => setActiveTab('offers')}
                  >
                    AI Offers
                  </button>
                  <button 
                    className={`px-4 py-3 font-medium text-sm ${activeTab === 'purchases' ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
                    onClick={() => setActiveTab('purchases')}
                  >
                    Purchase History
                  </button>
                </nav>
              </div>
              
              {/* Tab content */}
              <div className="p-6">
                {activeTab === 'overview' && (
                  <div>
                    <div className="flex justify-between items-center mb-6">
                      <h2 className="text-2xl font-semibold">Customer Overview</h2>
                      <button 
                        onClick={() => recalculateUserLoyalty(selectedUser.id)}
                        className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded text-sm"
                      >
                        Recalculate Loyalty
                      </button>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                      <div className="bg-gray-50 p-4 rounded-lg">
                        <h3 className="text-sm text-gray-500 mb-1">Loyalty Score</h3>
                        <p className="text-3xl font-bold">{selectedUser.loyaltyScore || 0}</p>
                        <span className={`inline-block mt-2 text-xs px-2 py-1 rounded-full ${getLoyaltyBadgeColor(selectedUser.category)}`}>
                          {selectedUser.category || 'Unknown'}
                        </span>
                      </div>
                      
                      <div className="bg-gray-50 p-4 rounded-lg">
                        <h3 className="text-sm text-gray-500 mb-1">Total Spent</h3>
                        <p className="text-3xl font-bold">${selectedUser.totalSpent?.toFixed(2) || '0.00'}</p>
                        <span className="text-sm text-gray-500">
                          {selectedUser.purchases || 0} purchases
                        </span>
                      </div>
                      
                      <div className="bg-gray-50 p-4 rounded-lg">
                        <h3 className="text-sm text-gray-500 mb-1">Last Activity</h3>
                        <p className="text-3xl font-bold">{selectedUser.daysInactive || 0}</p>
                        <span className="text-sm text-gray-500">days ago</span>
                      </div>
                    </div>
                    
                    <div className="bg-gray-50 p-4 rounded-lg mb-6">
                      <h3 className="font-medium mb-2">Customer Details</h3>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-sm text-gray-500">Name</p>
                          <p>{selectedUser.displayName || 'N/A'}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-500">Email</p>
                          <p>{selectedUser.email || 'N/A'}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-500">Engagement Score</p>
                          <p>{selectedUser.engagementScore?.toFixed(2) || '0.00'}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-500">Feedback Score</p>
                          <p>{selectedUser.feedbackScore || 'No feedback'}</p>
                        </div>
                      </div>
                    </div>
                    
                    {selectedUser.aiOffer && (
                      <div className="bg-indigo-50 p-4 rounded-lg border border-indigo-100">
                        <h3 className="font-medium mb-2 text-indigo-800">AI-Generated Offer</h3>
                        <div className="bg-white p-3 rounded">
                          <div className="flex items-center mb-2">
                            <span className="bg-indigo-600 text-white px-2 py-1 rounded text-xs font-bold mr-2">
                              {selectedUser.aiOffer.name}
                            </span>
                            {selectedUser.aiOffer.discount && (
                              <span className="text-green-600 font-bold text-sm">
                                {selectedUser.aiOffer.discount} OFF
                              </span>
                            )}
                          </div>
                          <p className="text-gray-700 text-sm">{selectedUser.aiOffer.description}</p>
                          <p className="text-gray-500 text-xs mt-1">{selectedUser.aiOffer.expiration}</p>
                          
                          {selectedUser.aiOffer.targetedCategory && (
                            <div className="mt-2">
                              <span className="text-xs text-gray-500">Targeted Category: </span>
                              <span className="text-xs font-medium">{selectedUser.aiOffer.targetedCategory}</span>
                            </div>
                          )}
                          
                          {selectedUser.aiOffer.expectedConversionRate && (
                            <div>
                              <span className="text-xs text-gray-500">Expected Conversion: </span>
                              <span className="text-xs font-medium">{selectedUser.aiOffer.expectedConversionRate}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}
                
                {activeTab === 'loyalty' && (
                  <div>
                    <h2 className="text-2xl font-semibold mb-6">Loyalty Analysis</h2>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                      <div className="bg-gray-50 p-4 rounded-lg">
                        <h3 className="font-medium mb-3">Loyalty Metrics</h3>
                        <div className="space-y-3">
                          <div>
                            <div className="flex justify-between mb-1">
                              <span className="text-sm text-gray-500">Loyalty Score</span>
                              <span className="text-sm font-medium">{selectedUser.loyaltyScore || 0}/100</span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-2">
                              <div 
                                className={`h-2 rounded-full ${
                                  selectedUser.category === 'Loyal' ? 'bg-green-500' : 
                                  selectedUser.category === 'At-Risk' ? 'bg-yellow-500' : 'bg-red-500'
                                }`}
                                style={{ width: `${selectedUser.loyaltyScore || 0}%` }}
                              ></div>
                            </div>
                          </div>
                          
                          <div>
                            <div className="flex justify-between mb-1">
                              <span className="text-sm text-gray-500">Engagement</span>
                              <span className="text-sm font-medium">{(selectedUser.engagementScore || 0) * 100}%</span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-2">
                              <div 
                                className="bg-blue-500 h-2 rounded-full"
                                style={{ width: `${(selectedUser.engagementScore || 0) * 100}%` }}
                              ></div>
                            </div>
                          </div>
                          
                          <div>
                            <div className="flex justify-between mb-1">
                              <span className="text-sm text-gray-500">Purchase Frequency</span>
                              <span className="text-sm font-medium">
                                {selectedUser.purchases ? (selectedUser.purchases / (selectedUser.daysInactive || 1) * 30).toFixed(1) : 0} per month
                              </span>
                            </div>
                          </div>
                          
                          <div>
                            <div className="flex justify-between mb-1">
                              <span className="text-sm text-gray-500">Average Order Value</span>
                              <span className="text-sm font-medium">
                                ${selectedUser.purchases ? (selectedUser.totalSpent / selectedUser.purchases).toFixed(2) : '0.00'}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      <div className="bg-gray-50 p-4 rounded-lg">
                        <h3 className="font-medium mb-3">Recommended Actions</h3>
                        {selectedUser.recommendedActions ? (
                          <ul className="space-y-2">
                            {selectedUser.recommendedActions.map((action, index) => (
                              <li key={index} className="flex items-start">
                                <span className="inline-block w-5 h-5 rounded-full bg-blue-500 text-white flex items-center justify-center text-xs mr-2 mt-0.5">
                                  {index + 1}
                                </span>
                                <span>{action}</span>
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <p className="text-gray-500">No recommendations available</p>
                        )}
                      </div>
                    </div>
                    
                                        {/* Churn Risk Analysis */}
                                        <div className="bg-gray-50 p-4 rounded-lg">
                      <h3 className="font-medium mb-3">Churn Risk Analysis</h3>
                      {selectedUser.churnRisk ? (
                        <div>
                          <div className="flex items-center mb-3">
                            <div className="w-full bg-gray-200 rounded-full h-4 mr-2">
                              <div 
                                className={`h-4 rounded-full ${
                                  selectedUser.churnRisk.churnProbability > 70 ? 'bg-red-500' : 
                                  selectedUser.churnRisk.churnProbability > 40 ? 'bg-yellow-500' : 'bg-green-500'
                                }`}
                                style={{ width: `${selectedUser.churnRisk.churnProbability}%` }}
                              ></div>
                            </div>
                            <span className="text-sm font-bold w-16">{selectedUser.churnRisk.churnProbability}%</span>
                          </div>
                          
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <h4 className="text-sm font-medium mb-2">Risk Factors</h4>
                              <ul className="text-sm space-y-1">
                                {selectedUser.churnRisk.keyRiskFactors?.map((factor, idx) => (
                                  <li key={idx} className="text-red-600">• {factor}</li>
                                ))}
                              </ul>
                            </div>
                            <div>
                              <h4 className="text-sm font-medium mb-2">Retention Strategies</h4>
                              <ul className="text-sm space-y-1">
                                {selectedUser.churnRisk.retentionStrategies?.map((strategy, idx) => (
                                  <li key={idx} className="text-green-600">• {strategy}</li>
                                ))}
                              </ul>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <button
                          onClick={() => recalculateUserLoyalty(selectedUser.id)}
                          className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded text-sm"
                        >
                          Calculate Churn Risk
                        </button>
                      )}
                    </div>
                  </div>
                )}
                
                {activeTab === 'offers' && (
                  <div>
                    <h2 className="text-2xl font-semibold mb-6">AI-Generated Offers</h2>
                    
                    {selectedUser.aiOffer ? (
                      <div className="bg-white border rounded-lg shadow-sm p-4 mb-6">
                        <div className="flex justify-between items-start">
                          <div>
                            <div className="flex items-center mb-2">
                              <span className="bg-indigo-600 text-white px-3 py-1 rounded text-sm font-bold mr-2">
                                {selectedUser.aiOffer.name}
                              </span>
                              {selectedUser.aiOffer.discount && (
                                <span className="text-green-600 font-bold">
                                  {selectedUser.aiOffer.discount} OFF
                                </span>
                              )}
                            </div>
                            <p className="text-gray-700 mb-2">{selectedUser.aiOffer.description}</p>
                            <p className="text-gray-500 text-sm">{selectedUser.aiOffer.expiration}</p>
                            
                            {(selectedUser.aiOffer.targetedCategory || selectedUser.aiOffer.expectedConversionRate) && (
                              <div className="mt-3 pt-3 border-t border-gray-100">
                                {selectedUser.aiOffer.targetedCategory && (
                                  <div className="flex items-center text-sm mb-1">
                                    <span className="text-gray-500 mr-2">Target Category:</span>
                                    <span className="font-medium">{selectedUser.aiOffer.targetedCategory}</span>
                                  </div>
                                )}
                                
                                {selectedUser.aiOffer.expectedConversionRate && (
                                  <div className="flex items-center text-sm">
                                    <span className="text-gray-500 mr-2">Expected Conversion:</span>
                                    <span className="font-medium">{selectedUser.aiOffer.expectedConversionRate}</span>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                          
                          <div className="flex space-x-2">
                            <button className="bg-green-500 hover:bg-green-600 text-white px-3 py-1 rounded text-sm">
                              Send Offer
                            </button>
                            <button 
                              onClick={() => recalculateUserLoyalty(selectedUser.id)}
                              className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded text-sm"
                            >
                              Regenerate
                            </button>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="bg-gray-50 p-6 rounded-lg text-center mb-6">
                        <p className="text-gray-500 mb-3">No AI offers generated yet</p>
                        <button 
                          onClick={() => recalculateUserLoyalty(selectedUser.id)}
                          className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded text-sm"
                        >
                          Generate Offer
                        </button>
                      </div>
                    )}
                    
                    <h3 className="font-medium mb-3">Offer History</h3>
                    <div className="bg-gray-50 rounded-lg p-4">
                      {selectedUser.offerHistory?.length > 0 ? (
                        <div className="space-y-3">
                          {selectedUser.offerHistory.map((offer, idx) => (
                            <div key={idx} className="bg-white p-3 rounded border border-gray-200">
                              <div className="flex justify-between">
                                <div>
                                  <span className="bg-gray-200 text-gray-800 px-2 py-1 rounded text-xs font-medium">
                                    {offer.name}
                                  </span>
                                  <span className="text-sm ml-2">{offer.discount} OFF</span>
                                </div>
                                <span className="text-xs text-gray-500">
                                  {new Date(offer.createdAt).toLocaleDateString()}
                                </span>
                              </div>
                              <p className="text-sm mt-2">{offer.description}</p>
                              <div className="mt-1 text-xs">
                                <span className={`px-2 py-0.5 rounded-full ${
                                  offer.status === 'sent' ? 'bg-blue-100 text-blue-800' :
                                  offer.status === 'opened' ? 'bg-yellow-100 text-yellow-800' :
                                  offer.status === 'redeemed' ? 'bg-green-100 text-green-800' :
                                  'bg-gray-100 text-gray-800'
                                }`}>
                                  {offer.status || 'pending'}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-gray-500 text-center py-4">No previous offers</p>
                      )}
                    </div>
                  </div>
                )}
                
                {activeTab === 'purchases' && (
                  <div>
                    <h2 className="text-2xl font-semibold mb-6">Purchase History</h2>
                    
                    {selectedUser.purchaseHistory?.length > 0 ? (
                      <div className="overflow-x-auto">
                        <table className="min-w-full bg-white">
                          <thead>
                            <tr className="bg-gray-100 text-gray-600 uppercase text-sm leading-normal">
                              <th className="py-3 px-4 text-left">Product</th>
                              <th className="py-3 px-4 text-left">Date</th>
                              <th className="py-3 px-4 text-right">Quantity</th>
                              <th className="py-3 px-4 text-right">Amount</th>
                            </tr>
                          </thead>
                          <tbody className="text-gray-600 text-sm">
                            {selectedUser.purchaseHistory.map((purchase, idx) => (
                              <tr key={idx} className="border-b border-gray-200 hover:bg-gray-50">
                                <td className="py-3 px-4 text-left">
                                  {purchase.productName || 'Product ' + (idx + 1)}
                                </td>
                                <td className="py-3 px-4 text-left">
                                  {purchase.timestamp ? new Date(purchase.timestamp).toLocaleDateString() : 'N/A'}
                                </td>
                                <td className="py-3 px-4 text-right">
                                  {purchase.quantity || 1}
                                </td>
                                <td className="py-3 px-4 text-right font-medium">
                                  ${purchase.amount?.toFixed(2) || '0.00'}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                          <tfoot>
                            <tr className="bg-gray-50">
                              <td colSpan="3" className="py-3 px-4 text-right font-medium">Total</td>
                              <td className="py-3 px-4 text-right font-bold">
                                ${selectedUser.totalSpent?.toFixed(2) || '0.00'}
                              </td>
                            </tr>
                          </tfoot>
                        </table>
                      </div>
                    ) : (
                      <div className="bg-gray-50 p-6 rounded-lg text-center">
                        <p className="text-gray-500">No purchase history available</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Manual AI Testing Panel */}
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-xl font-semibold mb-4">AI Model Testing</h2>
                <p className="text-gray-500 mb-4">Input customer data to test AI models</p>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Purchase Count
                    </label>
                    <input
                      type="number"
                      name="purchaseCount"
                      value={manualInput.purchaseCount}
                      onChange={handleManualInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Total Spent ($)
                    </label>
                    <input
                      type="number"
                      name="totalSpent"
                      value={manualInput.totalSpent}
                      onChange={handleManualInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Days Inactive
                    </label>
                    <input
                      type="number"
                      name="daysInactive"
                      value={manualInput.daysInactive}
                      onChange={handleManualInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Engagement Score (0-1)
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      max="1"
                      name="engagementScore"
                      value={manualInput.engagementScore}
                      onChange={handleManualInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Feedback Score (0-5)
                    </label>
                    <input
                      type="number"
                      step="1"
                      min="0"
                      max="5"
                      name="feedbackScore"
                      value={manualInput.feedbackScore}
                      onChange={handleManualInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Preferred Categories (comma separated)
                    </label>
                    <input
                      type="text"
                      name="preferredCategories"
                      value={manualInput.preferredCategories}
                      onChange={handleManualInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      placeholder="electronics, clothing, books"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Feedback Text (for sentiment analysis)
                    </label>
                    <textarea
                      name="feedbackText"
                      value={manualInput.feedbackText}
                      onChange={handleManualInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      rows="3"
                      placeholder="Enter customer feedback here..."
                    ></textarea>
                  </div>
                  
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => handleGenerateAI('loyalty')}
                      disabled={processingAI}
                      className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-2 rounded text-sm disabled:bg-gray-400"
                    >
                      Calculate Loyalty Score
                    </button>
                    <button
                      onClick={() => handleGenerateAI('offer')}
                      disabled={processingAI}
                      className="bg-green-500 hover:bg-green-600 text-white px-3 py-2 rounded text-sm disabled:bg-gray-400"
                    >
                      Generate Offer
                    </button>
                    <button
                      onClick={() => handleGenerateAI('sentiment')}
                      disabled={processingAI}
                      className="bg-purple-500 hover:bg-purple-600 text-white px-3 py-2 rounded text-sm disabled:bg-gray-400"
                    >
                      Analyze Sentiment
                    </button>
                    <button
                      onClick={() => handleGenerateAI('churn')}
                      disabled={processingAI}
                      className="bg-red-500 hover:bg-red-600 text-white px-3 py-2 rounded text-sm disabled:bg-gray-400"
                    >
                      Predict Churn
                    </button>
                  </div>
                </div>
              </div>
              
              {/* AI Response Panel */}
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-xl font-semibold mb-4">AI Response</h2>
                
                {processingAI ? (
                  <div className="flex items-center justify-center h-64">
                    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
                  </div>
                ) : aiResponse ? (
                  <div>
                    <div className="bg-blue-50 p-3 rounded-lg mb-4">
                      <h3 className="font-medium text-blue-800">{aiResponse.type}</h3>
                    </div>
                    
                    {aiResponse.type === 'Loyalty Score' ? (
                      <div className="text-center py-6">
                        <div className="inline-block rounded-full bg-blue-100 p-6 mb-4">
                          <span className="text-4xl font-bold text-blue-700">{aiResponse.data}</span>
                        </div>
                        <p className="text-gray-600">
                          {aiResponse.data >= 80 ? 'Highly Loyal Customer' :
                           aiResponse.data >= 60 ? 'Loyal Customer' :
                           aiResponse.data >= 40 ? 'Moderate Loyalty' :
                           aiResponse.data >= 20 ? 'At-Risk Customer' : 'Churned Customer'}
                        </p>
                      </div>
                    ) : aiResponse.type === 'AI Offer' ? (
                      <div className="bg-white border rounded p-4">
                        <div className="flex items-center mb-2">
                          <span className="bg-indigo-600 text-white px-3 py-1 rounded text-sm font-bold mr-2">
                            {aiResponse.data.name}
                          </span>
                          {aiResponse.data.discount && (
                            <span className="text-green-600 font-bold">
                              {aiResponse.data.discount} OFF
                            </span>
                          )}
                        </div>
                        <p className="text-gray-700 mb-2">{aiResponse.data.description}</p>
                        <p className="text-gray-500 text-sm">{aiResponse.data.expiration}</p>
                        
                        {(aiResponse.data.targetedCategory || aiResponse.data.expectedConversionRate) && (
                          <div className="mt-3 pt-3 border-t border-gray-100">
                            {aiResponse.data.targetedCategory && (
                              <div className="flex items-center text-sm mb-1">
                                                                <span className="text-gray-500 mr-2">Target Category:</span>
                                <span className="font-medium">{aiResponse.data.targetedCategory}</span>
                              </div>
                            )}
                            
                            {aiResponse.data.expectedConversionRate && (
                              <div className="flex items-center text-sm">
                                <span className="text-gray-500 mr-2">Expected Conversion:</span>
                                <span className="font-medium">{aiResponse.data.expectedConversionRate}</span>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    ) : aiResponse.type === 'Sentiment Analysis' ? (
                      <div>
                        <div className="mb-4">
                          <h4 className="text-sm font-medium text-gray-500 mb-1">Sentiment Score</h4>
                          <div className="flex items-center">
                            <div className="w-full bg-gray-200 rounded-full h-4 mr-2">
                              <div 
                                className={`h-4 rounded-full ${
                                  aiResponse.data.sentimentScore > 0.3 ? 'bg-green-500' : 
                                  aiResponse.data.sentimentScore > -0.3 ? 'bg-yellow-500' : 'bg-red-500'
                                }`}
                                style={{ width: `${((aiResponse.data.sentimentScore + 1) / 2) * 100}%` }}
                              ></div>
                            </div>
                            <span className="text-sm font-bold w-16">
                              {aiResponse.data?.sentimentScore?.toFixed(2)||0}
                            </span>
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-1 gap-4">
                          <div>
                            <h4 className="text-sm font-medium text-gray-500 mb-2">Key Themes</h4>
                            <div className="flex flex-wrap gap-2">
                              {aiResponse.data.keyThemes?.map((theme, idx) => (
                                <span key={idx} className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full">
                                  {theme}
                                </span>
                              ))}
                            </div>
                          </div>
                          
                          <div>
                            <h4 className="text-sm font-medium text-gray-500 mb-2">Actionable Insights</h4>
                            <ul className="space-y-1">
                              {aiResponse.data.actionableInsights?.map((insight, idx) => (
                                <li key={idx} className="text-sm">• {insight}</li>
                              ))}
                            </ul>
                          </div>
                          
                          <div className="flex items-center">
                            <span className="text-sm text-gray-500 mr-2">Priority:</span>
                            <span className={`text-xs px-2 py-1 rounded-full ${
                              aiResponse.data.priority === 'high' ? 'bg-red-100 text-red-800' :
                              aiResponse.data.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                              'bg-green-100 text-green-800'
                            }`}>
                              {aiResponse.data.priority}
                            </span>
                          </div>
                        </div>
                      </div>
                    ) : aiResponse.type === 'Churn Prediction' ? (
                      <div>
                        <div className="mb-4">
                          <h4 className="text-sm font-medium text-gray-500 mb-1">Churn Probability</h4>
                          <div className="flex items-center">
                            <div className="w-full bg-gray-200 rounded-full h-4 mr-2">
                              <div 
                                className={`h-4 rounded-full ${
                                  aiResponse.data.churnProbability > 70 ? 'bg-red-500' : 
                                  aiResponse.data.churnProbability > 40 ? 'bg-yellow-500' : 'bg-green-500'
                                }`}
                                style={{ width: `${aiResponse.data.churnProbability}%` }}
                              ></div>
                            </div>
                            <span className="text-sm font-bold w-16">{aiResponse.data.churnProbability}%</span>
                          </div>
                          <div className="mt-1">
                            <span className={`text-xs px-2 py-1 rounded-full ${
                              aiResponse.data.riskLevel === 'high' ? 'bg-red-100 text-red-800' :
                              aiResponse.data.riskLevel === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                              'bg-green-100 text-green-800'
                            }`}>
                              {aiResponse.data.riskLevel} risk
                            </span>
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <h4 className="text-sm font-medium text-gray-500 mb-2">Risk Factors</h4>
                            <ul className="space-y-1">
                              {aiResponse.data.keyRiskFactors?.map((factor, idx) => (
                                <li key={idx} className="text-sm text-red-600">• {factor}</li>
                              ))}
                            </ul>
                          </div>
                          
                          <div>
                            <h4 className="text-sm font-medium text-gray-500 mb-2">Retention Strategies</h4>
                            <ul className="space-y-1">
                              {aiResponse.data.retentionStrategies?.map((strategy, idx) => (
                                <li key={idx} className="text-sm text-green-600">• {strategy}</li>
                              ))}
                            </ul>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <pre className="bg-gray-100 p-4 rounded overflow-x-auto">
                        {JSON.stringify(aiResponse.data, null, 2)}
                      </pre>
                    )}
                  </div>
                ) : (
                  <div className="bg-gray-50 p-6 rounded-lg text-center h-64 flex items-center justify-center">
                    <div>
                      <p className="text-gray-500 mb-2">No AI response yet</p>
                      <p className="text-sm text-gray-400">Use the form on the left to test AI models</p>
                    </div>
                  </div>
                )}
              </div>
              
              {/* Analytics Overview */}
              <div className="bg-white rounded-lg shadow p-6 md:col-span-2">
                <h2 className="text-xl font-semibold mb-4">Customer Analytics Overview</h2>
                
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <h3 className="text-sm text-blue-500 mb-1">Total Customers</h3>
                    <p className="text-2xl font-bold">{users.length}</p>
                  </div>
                  
                  <div className="bg-green-50 p-4 rounded-lg">
                    <h3 className="text-sm text-green-500 mb-1">Loyal Customers</h3>
                    <p className="text-2xl font-bold">
                      {users.filter(user => user.category === 'Loyal').length}
                    </p>
                  </div>
                  
                  <div className="bg-yellow-50 p-4 rounded-lg">
                    <h3 className="text-sm text-yellow-500 mb-1">At-Risk Customers</h3>
                    <p className="text-2xl font-bold">
                      {users.filter(user => user.category === 'At-Risk').length}
                    </p>
                  </div>
                  
                  <div className="bg-red-50 p-4 rounded-lg">
                    <h3 className="text-sm text-red-500 mb-1">Churned Customers</h3>
                    <p className="text-2xl font-bold">
                      {users.filter(user => user.category === 'Churned').length}
                    </p>
                  </div>
                </div>
                
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="font-medium mb-3">Customer Distribution</h3>
                  <div className="h-8 bg-gray-200 rounded-lg overflow-hidden flex">
                    <div 
                      className="bg-green-500 h-full"
                      style={{ 
                        width: `${(users.filter(user => user.category === 'Loyal').length / users.length) * 100}%` 
                      }}
                    ></div>
                    <div 
                      className="bg-yellow-500 h-full"
                      style={{ 
                        width: `${(users.filter(user => user.category === 'At-Risk').length / users.length) * 100}%` 
                      }}
                    ></div>
                    <div 
                      className="bg-red-500 h-full"
                      style={{ 
                        width: `${(users.filter(user => user.category === 'Churned').length / users.length) * 100}%` 
                      }}
                    ></div>
                  </div>
                  <div className="flex justify-between mt-2 text-sm">
                    <div className="flex items-center">
                      <span className="w-3 h-3 bg-green-500 rounded-full mr-1"></span>
                      <span>Loyal</span>
                    </div>
                    <div className="flex items-center">
                      <span className="w-3 h-3 bg-yellow-500 rounded-full mr-1"></span>
                      <span>At-Risk</span>
                    </div>
                    <div className="flex items-center">
                      <span className="w-3 h-3 bg-red-500 rounded-full mr-1"></span>
                      <span>Churned</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;


