const ProductsGrid = ({ products, loyaltyData, quantities, handleQuantityChange, handlePurchase, loading, processingProductId }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 w-full mb-10">
      {products.map(product => (
        <div 
          key={product.id} 
          className="rounded-xl overflow-hidden shadow-md hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 bg-white border border-gray-100"
        >
          <div className="relative">
            <img 
              src={product.image} 
              alt={product.name} 
              className="w-full h-48 object-cover transition-transform duration-500 hover:scale-105" 
            />
            {loyaltyData?.category === "Loyal" && (
              <div className="absolute top-3 right-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white text-xs font-medium px-3 py-1.5 rounded-full shadow-sm">
                10% Loyalty Discount
              </div>
            )}
          </div>
          <div className="p-5">
            <h3 className="font-semibold text-lg text-gray-800">{product.name}</h3>
            <p className="text-gray-600 text-sm mt-2 leading-relaxed">{product.description}</p>
            <div className="mt-3">
              {loyaltyData?.category === "Loyal" ? (
                <div className="flex items-center">
                  <p className="text-gray-500 line-through mr-2">${product.price.toFixed(2)}</p>
                  <p className="text-indigo-600 font-bold text-lg">${(product.price * 0.9).toFixed(2)}</p>
                </div>
              ) : (
                <p className="text-indigo-600 font-bold text-lg">${product.price.toFixed(2)}</p>
              )}
            </div>
            
            <div className="flex items-center mt-4">
              <label className="mr-2 text-sm font-medium text-gray-700">Qty:</label>
              <div className="relative">
                <input
                  type="number"
                  min="1"
                  value={quantities[product.id] || 1}
                  onChange={(e) => handleQuantityChange(product.id, e.target.value)}
                  className="border border-gray-300 rounded-lg w-20 px-3 py-2 text-center focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                />
              </div>
            </div>
            
            <button
              onClick={() => handlePurchase(product)}
              disabled={loading && processingProductId === product.id}
              className="mt-4 w-full bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-white py-2.5 px-4 rounded-lg transition-all duration-300 disabled:from-gray-400 disabled:to-gray-500 font-medium shadow-sm hover:shadow flex justify-center items-center"
            >
              {loading && processingProductId === product.id ? (
                <div className="flex items-center">
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span>Processing...</span>
                </div>
              ) : (
                "Buy Now"
              )}
            </button>
          </div>
        </div>
      ))}
    </div>
  );
};

export default ProductsGrid;
