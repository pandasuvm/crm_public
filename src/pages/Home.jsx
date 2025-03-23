import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { signInWithGoogle } from "../functions/AuthFunctions";
import { recordPurchase } from "../functions/purchaseFunctions";
import { calculateLoyaltyScore, getLoyaltyRewards } from "../functions/LoyalityFunctions";
import { trackEngagement } from "../functions/feedbackFunctions";
import FeedbackForm from "../components/FeedbackForm";
import { toast } from "react-toastify";
import ProductsGrid from "../components/ProductsGrid";
import RewardsSection from "../components/RewardsSection";
import LoyaltyStatusDetails from "../components/LoyaltyStatusDetails";

const products = [
  { 
    id: "prod1", 
    name: "Premium Headphones", 
    price: 129.99, 
    image: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?q=80&w=2940&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
    description: "Noise-cancelling with 20hr battery life"
  },
  { 
    id: "prod2", 
    name: "Smartwatch", 
    price: 199.99, 
    image: "https://images.unsplash.com/photo-1523275335684-37898b6baf30?q=80&w=3199&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
    description: "Fitness tracking and notifications"
  },
  { 
    id: "prod3", 
    name: "Wireless Earbuds", 
    price: 89.99, 
    image: "https://images.unsplash.com/photo-1572569511254-d8f925fe2cbb?w=900&auto=format&fit=crop&q=60&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8NXx8ZWFyYnVkc3xlbnwwfDB8MHx8fDI%3D",
    description: "Water-resistant with charging case"
  },
  { 
    id: "prod4", 
    name: "Bluetooth Speaker", 
    price: 79.99, 
    image: "https://images.unsplash.com/photo-1589001384171-4e4e6f21e761?q=80&w=3174&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
    description: "360° sound with 12hr playtime"
  },
];

const Home = () => {
  const { user } = useAuth();
  const [loyaltyData, setLoyaltyData] = useState(null);
  const [rewards, setRewards] = useState([]);
  const [quantities, setQuantities] = useState({});
  const [loading, setLoading] = useState(false);
  const [processingProductId, setProcessingProductId] = useState(null);

  const fetchLoyaltyData = async (retryCount = 0) => {
    if (!user) return;

    try {
      console.log("Fetching loyalty data for user:", user.uid);

      // Ensure engagement tracking doesn't block the next operations
      trackEngagement(user.uid, "home_page_view").catch(console.error);

      // Get loyalty data
      const data = await calculateLoyaltyScore(user.uid);
      if (!data) {
        console.warn("No loyalty data found for user:", user.uid);
        return;
      }

      setLoyaltyData(data);

      // Get available rewards
      const availableRewards = getLoyaltyRewards(data);
      setRewards(availableRewards);

      // Initialize product quantities
      const initialQuantities = {};
      products.forEach((product) => {
        initialQuantities[product.id] = 1;
      });
      setQuantities(initialQuantities);

    } catch (error) {
      if (error.message.includes("429") && retryCount < 3) {
        // Retry with exponential backoff
        setTimeout(() => fetchLoyaltyData(retryCount + 1), Math.pow(2, retryCount) * 1000);
      } else {
        console.error("Error fetching loyalty data:", error);
        // toast.error("Failed to load your loyalty information");
      }
    }
  };

  useEffect(() => {
    fetchLoyaltyData();
  }, [user]);
  
  const handleSignIn = async () => {
    try {
      await signInWithGoogle();
    } catch (error) {
      console.error("Sign in error:", error);
      toast.error("Failed to sign in. Please try again.");
    }
  };

  const handleQuantityChange = (productId, value) => {
    const newValue = Math.max(1, parseInt(value) || 1);
    setQuantities(prev => ({
      ...prev,
      [productId]: newValue
    }));
  };

  const handlePurchase = async (product) => {
    if (!user) {
      toast.error("Please sign in to make a purchase");
      return;
    }

    setLoading(true);
    setProcessingProductId(product.id);
    
    try {
      const quantity = quantities[product.id];
      const totalAmount = product.price * quantity;
      
      // Apply loyalty discount if applicable
      let finalAmount = totalAmount;
      if (loyaltyData?.category === "Loyal") {
        finalAmount = totalAmount * 0.9; // 10% discount
      }
      
      // Record the purchase
      await recordPurchase(user.uid, {
        productId: product.id,
        productName: product.name,
        quantity: quantity,
        amount: finalAmount,
        originalAmount: totalAmount,
        discountApplied: loyaltyData?.category === "Loyal"
      });
      
      // Update loyalty score after purchase
      const updatedLoyalty = await calculateLoyaltyScore(user.uid);
      setLoyaltyData(updatedLoyalty);
      
      // Update rewards
      const updatedRewards = getLoyaltyRewards(updatedLoyalty);
      setRewards(updatedRewards);
      
      toast.success(`Successfully purchased ${quantity} ${product.name}${quantity > 1 ? 's' : ''}!`);
      
      if (loyaltyData?.category === "Loyal") {
        toast.info("Loyalty discount of 10% was applied!");
      }
    } catch (error) {
      console.error("Purchase error:", error);
      toast.error("Failed to complete purchase. Please try again.");
    } finally {
      setLoading(false);
      setProcessingProductId(null);
    }
  };

  const getLoyaltyBadgeColor = (category) => {
    switch(category) {
      case "Loyal": return "from-green-500 to-emerald-600";
      case "At-Risk": return "from-yellow-500 to-amber-600";
      case "Churned": return "from-red-500 to-rose-600";
      default: return "from-blue-500 to-indigo-600";
    }
  };

  return (
    <div className="flex flex-col items-center p-6 max-w-6xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Customer Loyalty System</h1>
  
      {!user ? (
        <div className="text-center p-8 bg-gray-50 rounded-lg shadow-sm w-full max-w-md">
          <h2 className="text-xl mb-4">Please sign in to start shopping</h2>
          <button 
            onClick={handleSignIn} 
            className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-6 rounded-lg transition-colors"
          >
            Sign in with Google
          </button>
        </div>
      ) : (
        <>
          {/* <div className="flex flex-col md:flex-row items-center justify-between w-full mb-8 gap-4">
            <h2 className="text-xl font-medium">Welcome, {user.displayName}</h2>
            {loyaltyData && (
              <div className={`bg-gradient-to-r ${getLoyaltyBadgeColor(loyaltyData.category)} text-white px-4 py-2 rounded-lg shadow flex flex-col md:flex-row items-center gap-2`}>
                <span className="font-bold">Loyalty Score: {loyaltyData.loyaltyScore}</span>
                <span className="px-2 py-1 bg-white bg-opacity-20 rounded text-sm">
                  {loyaltyData.category} Member
                </span>
                {loyaltyData.purchaseCount > 0 && (
                  <span className="text-xs md:ml-2">
                    {loyaltyData.purchaseCount} purchase{loyaltyData.purchaseCount !== 1 ? 's' : ''}
                  </span>
                )}
              </div>
            )}
          </div> */}
  
          {/* Rewards Section */}
          <RewardsSection loyaltyData={loyaltyData} rewards={rewards} />

          {/* Products Grid */}
          <ProductsGrid 
            products={products} 
            loyaltyData={loyaltyData} 
            quantities={quantities} 
            handleQuantityChange={handleQuantityChange} 
            handlePurchase={handlePurchase} 
            loading={loading} 
            processingProductId={processingProductId} 
          />

          {/* Feedback Form */}
          <div className="w-full bg-white rounded-lg shadow-sm p-6 border border-gray-200">
            <h3 className="text-lg font-medium mb-4">We Value Your Feedback</h3>
            <p className="text-gray-600 mb-4">Your feedback helps us improve and earns you loyalty points!</p>
            <FeedbackForm userId={user.uid} onFeedbackSubmitted={() => {
              // Refresh loyalty data after feedback
              calculateLoyaltyScore(user.uid).then(data => {
                setLoyaltyData(data);
                setRewards(getLoyaltyRewards(data));
              });
            }} />
          </div>

          {/* Loyalty Status Details */}
          {/* <LoyaltyStatusDetails loyaltyData={loyaltyData} /> */}
        </>
      )}
    </div>
  );
};

export default Home;
