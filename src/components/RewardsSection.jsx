const RewardsSection = ({ loyaltyData, rewards }) => {
  return (
    <>
      {/* AI Offer Section */}
      {loyaltyData?.aiOffer && (
        <div className="w-full mb-8 bg-gradient-to-br from-indigo-100 to-purple-100 rounded-xl p-6 shadow-lg transition-all duration-300 hover:shadow-xl">
  <h3 className="text-xl font-semibold mb-4 text-indigo-800">Your Special Offer</h3>
  <div className="bg-white p-6 rounded-xl shadow-sm border border-indigo-200 transition-all duration-300 hover:border-indigo-300">
    <div className="flex flex-col md:flex-row items-center">
      <div className="w-full md:w-1/3 mb-4 md:mb-0 md:mr-6">
      <img 
          src="https://img.freepik.com/free-vector/special-offer-creative-sale-banner-design_1017-16284.jpg?t=st=1742735685~exp=1742739285~hmac=f30fa9f46ace453e5704d6bb46c75b521ecd9a40db03be37aa20ba798571ed89&w=1800" 
          alt="Special Offer" 
          className="w-full h-auto rounded-lg object-cover"
        />
      </div>
      <div className="w-full md:w-2/3 flex flex-col justify-center">
        <div className="flex items-center space-x-3 mb-3">
          <span className="bg-indigo-600 text-white px-4 py-1.5 rounded-full text-sm font-bold">
            {loyaltyData.aiOffer.name}
          </span>
          {loyaltyData.aiOffer.discount && (
            <span className="text-green-600 font-bold text-lg">
              {loyaltyData.aiOffer.discount} OFF
            </span>
          )}
        </div>
        <p className="text-gray-700 leading-relaxed mb-3">{loyaltyData.aiOffer.description}</p>
        <p className="text-sm text-gray-500 mb-4">{loyaltyData.aiOffer.expiration}</p>
        
        <button className="cursor-pointer  w-[200px] bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-lg transition-colors duration-300 transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-opacity-50">
          Redeem Now
        </button>
      </div>
    </div>
  </div>
</div>




      )}
     

      {/* Regular Rewards Section */}
      {rewards.length > 0 && (
        <div className="w-full mb-8 bg-gradient-to-br from-indigo-100 to-purple-100 rounded-xl p-6 shadow-lg transition-all duration-300 hover:shadow-xl">
  <h3 className="text-xl font-semibold mb-5 text-indigo-800">Your Rewards</h3>
  <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
    {rewards.map(reward => (
      <div 
        key={reward.id} 
        className="bg-white p-5 rounded-xl shadow-sm border border-indigo-100 transition-all duration-300 hover:shadow-md hover:border-indigo-200 transform hover:-translate-y-1"
      >
        <h4 className="font-semibold text-indigo-700 text-lg mb-2">{reward.name}</h4>
        <p className="text-gray-600 mb-3 leading-relaxed">{reward.description}</p>
        {reward.discount && (
          <span className="inline-block mt-1 bg-green-100 text-green-800 text-sm font-medium px-3 py-1.5 rounded-full">
            {reward.discount}
          </span>
        )}
      </div>
    ))}
  </div>
</div>

      )}
    </>
  );
};

export default RewardsSection;
