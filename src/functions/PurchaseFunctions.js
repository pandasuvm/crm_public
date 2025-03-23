import { doc, getDoc, updateDoc, setDoc, arrayUnion } from "firebase/firestore";
import { logEvent } from "firebase/analytics";
import { db,analytics } from "../firebase";

export const recordPurchase = async (userId, purchaseData) => {
  try {
    const { productId, productName, quantity, amount } = purchaseData;
    console.log("Recording purchase:", { userId, productId, productName, quantity, amount });
    
    // Log analytics event
    logEvent(analytics, "purchase", { 
      value: amount,
      items: [{ item_id: productId, item_name: productName, quantity }]
    });

    const userRef = doc(db, "users", userId);
    const userSnap = await getDoc(userRef);

    const timestamp = new Date().toISOString();
    const purchaseRecord = {
      productId,
      productName,
      quantity,
      amount,
      timestamp
    };

    if (userSnap.exists()) {
      const userData = userSnap.data();
      console.log("Updating existing user purchase data");
      
      await updateDoc(userRef, {
        purchases: (userData.purchases || 0) + 1,
        totalSpent: (userData.totalSpent || 0) + amount,
        lastActivity: timestamp,
        purchaseHistory: arrayUnion(purchaseRecord)
      });
      
      console.log("Purchase recorded successfully for existing user");
    } else {
      console.log("Creating new user with purchase data");
      
      await setDoc(userRef, {
        uid: userId,
        purchases: 1,
        totalSpent: amount,
        lastActivity: timestamp,
        feedbackScore: 0,
        engagementScore: 0.5,
        purchaseHistory: [purchaseRecord],
        createdAt: timestamp
      });
      
      console.log("Purchase recorded successfully for new user");
    }
    
    return { success: true, timestamp };
  } catch (error) {
    console.error("Error recording purchase:", error);
    throw error;
  }
};

export const getPurchaseHistory = async (userId) => {
  try {
    const userRef = doc(db, "users", userId);
    const userSnap = await getDoc(userRef);
    
    if (userSnap.exists()) {
      const userData = userSnap.data();
      return userData.purchaseHistory || [];
    }
    return [];
  } catch (error) {
    console.error("Error getting purchase history:", error);
    throw error;
  }
};
