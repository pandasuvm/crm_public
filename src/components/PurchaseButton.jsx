import { logPurchase } from "../firebase";
import { useAuth } from "../functions/AuthFunctions";

const PurchaseButton = () => {
  const { user } = useAuth();

  const handlePurchase = () => {
    if (user) logPurchase(user.uid, 20); // Log a $20 purchase
  };

  return <button onClick={handlePurchase} className="bg-blue-500 text-white p-2">Buy Now</button>;
};

export default PurchaseButton;
