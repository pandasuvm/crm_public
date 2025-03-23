import { doc, getDoc, updateDoc } from "firebase/firestore";
import { db } from "../firebase";
import { generateAIOffer } from "./aiconfig";

export const calculateLoyaltyScore = async (userId) => {
  try {
    console.log("Calculating loyalty score for user:", userId);
    const userRef = doc(db, "users", userId);
    const userSnap = await getDoc(userRef);

    if (userSnap.exists()) {
      const userData = userSnap.data();
      const { purchases, lastActivity, feedbackScore, engagementScore, totalSpent } = userData;
      
      // Parse the lastActivity date safely
      let lastActivityDate;
      try {
        lastActivityDate = new Date(lastActivity);
        if (isNaN(lastActivityDate.getTime())) throw new Error("Invalid date");
      } catch (e) {
        console.warn("Invalid lastActivity date, using current date");
        lastActivityDate = new Date();
      }
      
      const daysInactive = (new Date() - lastActivityDate) / (1000 * 60 * 60 * 24);
      console.log("Days inactive:", daysInactive);
      
      // Calculate base loyalty score with proper capping
      let loyaltyScore = 0;
      
      // Add purchase component (10 points per purchase)
      loyaltyScore += (purchases || 0) * 10;
      
      // Add feedback component (0-5 scale, up to 20 points)
      loyaltyScore += (feedbackScore || 0) * 4;
      
      // Add engagement component (0-1 scale, up to 50 points)
      loyaltyScore += (engagementScore || 0.5) * 50;
      
      // Add spending component (10% of total spent, max 100 points)
      loyaltyScore += Math.min((totalSpent || 0) / 10, 100);
      
      console.log("Base loyalty score:", loyaltyScore);
      
      // Apply penalties for inactivity
      if (daysInactive > 30) {
        const inactivityFactor = Math.max(0.5, 1 - ((daysInactive - 30) / 60));
        loyaltyScore *= inactivityFactor;
        console.log("Applied inactivity penalty:", inactivityFactor);
      }
      
      // Ensure loyalty score doesn't exceed 100
      loyaltyScore = Math.min(Math.round(loyaltyScore), 100);
      
      // Determine loyalty category
      let category = "Loyal";
      if (loyaltyScore < 50 || engagementScore < 0.5 || daysInactive > 30) category = "At-Risk";
      if (loyaltyScore < 30) category = "Churned";
      
      console.log(`User category determined: ${category}`);
      
      // Generate AI offer using Vertex AI
      const customerProfile = {
        loyaltyScore,
        category,
        daysInactive: Math.round(daysInactive),
        totalSpent: totalSpent || 0,
        engagementScore: engagementScore || 0,
        purchaseCount: purchases || 0
      };
      
      console.log("Generating AI offer with customer profile:", customerProfile);
      const aiOffer = await generateAIOffer(customerProfile);
      console.log("AI generated offer:", aiOffer);
      
      const recommendedActions = getRecommendedActions(category);
      
      const result = {
        userId,
        loyaltyScore,
        category,
        lastPurchase: lastActivityDate,
        purchaseCount: purchases || 0,
        totalSpent: totalSpent || 0,
        daysInactive: Math.round(daysInactive),
        recommendedActions,
        aiOffer
      };
      
      // Update the user document with calculated values
      await updateDoc(userRef, {
        loyaltyScore,
        category,
        lastCalculated: new Date().toISOString(),
        aiOffer
      }).then(() => {
        console.log("Successfully updated user document with loyalty data");
      }).catch(error => {
        console.error("Error updating user document:", error);
      });
      
      console.log("Loyalty calculation result:", result);
      return result;
    }
    
    console.log("User not found, returning null");
    return null;
  } catch (error) {
    console.error("Error calculating loyalty score:", error);
    throw error;
  }
};

const getRecommendedActions = (category) => {
  console.log("Getting recommended actions for category:", category);
  
  if (category === "Loyal") {
    return [
      "Offer premium loyalty rewards",
      "Invite to beta test new features",
      "Provide exclusive discounts",
      "Send personalized product recommendations",
      "Offer early access to sales"
    ];
  } else if (category === "At-Risk") {
    return [
      "Send re-engagement email campaign",
      "Offer special time-limited discount",
      "Request feedback on last purchase",
      "Showcase new products since last visit",
      "Provide personalized product recommendations"
    ];
  } else {
    return [
      "Send win-back campaign with major incentive",
      "Offer significant discount with expiration",
      "Request feedback on why they left",
      "Highlight new improvements since last visit",
      "Provide free shipping or gift with purchase"
    ];
  }
};

export const getLoyaltyRewards = (loyaltyData) => {
  if (!loyaltyData) {
    console.log("No loyalty data provided, returning empty rewards array");
    return [];
  }
  
  const { category, loyaltyScore, totalSpent, aiOffer } = loyaltyData;
  console.log("Generating rewards for:", { category, loyaltyScore, totalSpent });
  
  // Basic rewards for all users
  const rewards = [];
  
  // Add AI-generated offer as the primary reward if available
  if (aiOffer) {
    rewards.push({
      id: "ai-offer",
      name: aiOffer.name || "Special Offer",
      discount: aiOffer.discount || "",
      description: aiOffer.description || "Personalized offer just for you",
      expiration: aiOffer.expiration || "Limited time offer"
    });
  }
  
  // Category-specific rewards
  if (category === "Loyal") {
    rewards.push(
      { id: "reward2", name: "Free Shipping", description: "On all orders" },
      { id: "reward3", name: "Early Access", description: "To new products" }
    );
    
    if (loyaltyScore > 80) {
      rewards.push({ id: "reward4", name: "VIP Support", description: "Priority customer service" });
    }
    
    if (totalSpent > 500) {
      rewards.push({ id: "reward5", name: "10% Lifetime Discount", description: "On all future purchases" });
    }
  } else if (category === "At-Risk") {
    rewards.push(
      { id: "reward6", name: "Free Gift", description: "With next purchase over $50" }
    );
  } else {
    rewards.push(
      { id: "reward9", name: "Free Product", description: "With purchase over $75" }
    );
  }
  
  console.log("Generated rewards:", rewards);
  return rewards;
};
