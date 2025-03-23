const LoyaltyStatusDetails = ({ loyaltyData }) => {
  if (!loyaltyData) {
    return null;
  }

  return (
    <div className="w-full mt-8 bg-gray-50 rounded-lg p-6">
      <h3 className="text-lg font-medium mb-3">Your Loyalty Status</h3>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded shadow-sm">
          <h4 className="text-sm text-gray-500">Purchase History</h4>
          <p className="text-2xl font-medium">{loyaltyData.purchaseCount}</p>
          <p className="text-sm text-gray-600">Total Purchases</p>
        </div>
        <div className="bg-white p-4 rounded shadow-sm">
          <h4 className="text-sm text-gray-500">Total Spent</h4>
          <p className="text-2xl font-medium">${loyaltyData.totalSpent.toFixed(2)}</p>
          <p className="text-sm text-gray-600">Lifetime Value</p>
        </div>
        <div className="bg-white p-4 rounded shadow-sm">
          <h4 className="text-sm text-gray-500">Last Activity</h4>
          <p className="text-2xl font-medium">{loyaltyData.daysInactive}</p>
          <p className="text-sm text-gray-600">Days Since Last Purchase</p>
        </div>
      </div>
      
      {loyaltyData.recommendedActions && loyaltyData.recommendedActions.length > 0 && (
        <div className="mt-4">
          <h4 className="text-sm text-gray-500 mb-2">Recommended Actions</h4>
          <ul className="list-disc pl-5">
            {loyaltyData.recommendedActions.map((action, index) => (
              <li key={index} className="text-sm text-gray-700">{action}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default LoyaltyStatusDetails;
