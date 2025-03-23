import { doc, getDoc, updateDoc } from "firebase/firestore";
import { logEvent } from "firebase/analytics";
import { db, analytics } from "../firebase";

export const recordFeedback = async (userId, feedbackData) => {
  try {
    const { score, comments } = feedbackData;
    console.log("Recording feedback:", { userId, score, comments });
    
    // Log analytics event
    logEvent(analytics, "feedback", { score });

    const userRef = doc(db, "users", userId);
    const userSnap = await getDoc(userRef);

    if (userSnap.exists()) {
      // Calculate new engagement score based on feedback
      const userData = userSnap.data();
      const oldEngagementScore = userData.engagementScore || 0.5;
      
      // Feedback between 1-5, normalize to 0-1 range and blend with existing score
      const normalizedScore = score / 5;
      const newEngagementScore = (oldEngagementScore * 0.7) + (normalizedScore * 0.3);
      
      await updateDoc(userRef, {
        feedbackScore: score,
        feedbackComments: comments,
        engagementScore: newEngagementScore,
        lastActivity: new Date().toISOString()
      });
      
      console.log("Feedback recorded successfully");
      return { success: true, newEngagementScore };
    }
    
    throw new Error("User not found");
  } catch (error) {
    console.error("Error recording feedback:", error);
    throw error;
  }
};

export const trackEngagement = async (userId, action) => {
  try {
    // Log engagement action (page view, feature use, etc.)
    logEvent(analytics, "engagement", { action });
    
    const userRef = doc(db, "users", userId);
    const userSnap = await getDoc(userRef);
    
    if (userSnap.exists()) {
      const userData = userSnap.data();
      const oldEngagementScore = userData.engagementScore || 0.5;
      
      // Slightly increase engagement score for each tracked action
      const newEngagementScore = Math.min(oldEngagementScore + 0.02, 1.0);
      
      await updateDoc(userRef, {
        engagementScore: newEngagementScore,
        lastActivity: new Date().toISOString()
      });
      
      return { success: true };
    }
    
    return { success: false, error: "User not found" };
  } catch (error) {
    console.error("Error tracking engagement:", error);
    throw error;
  }
};
