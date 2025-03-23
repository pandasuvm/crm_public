import { getVertexAI, getGenerativeModel } from "firebase/vertexai";
import { getApp } from "firebase/app";

// Use the existing Firebase app instance
const firebaseApp = getApp();

// Get Vertex AI service
const vertexAI = getVertexAI(firebaseApp, "us-central1");

// Initialize the generative model
const model = getGenerativeModel(vertexAI, { model: "gemini-2.0-flash" });

export const generateAIOffer = async (customerProfile) => {
  try {
    console.log("Starting AI offer generation...");
    
    const { loyaltyScore, category, daysInactive, totalSpent, engagementScore, purchaseCount } = customerProfile;
    
    // Create a prompt for one-word offer with details
    const prompt = `
    Generate a personalized e-commerce special offer for a customer with the following profile:
    
    Loyalty Score: ${loyaltyScore}/100
    Customer Category: ${category}
    Days Since Last Activity: ${daysInactive}
    Total Amount Spent: $${totalSpent.toFixed(2)}
    Engagement Score: ${engagementScore.toFixed(2)}/1.0
    Total Purchase Count: ${purchaseCount}
    
    Create a special offer with:
    1. A single-word name for the offer (like "FLASHSALE" or "COMEBACK")
    2. A discount percentage or special deal
    3. A short description (1-2 sentences)
    4. An expiration timeframe
    
    Format the response as a JSON object:
    {
      "name": "ONE-WORD-NAME",
      "discount": "DISCOUNT-PERCENTAGE",
      "description": "Short description of the offer",
      "expiration": "Expiration timeframe"
    }
    
    The offer should be tailored to their ${category} status.
    `;

    console.log("Sending prompt to Vertex AI");
    
    const result = await model.generateContent(prompt);
    console.log("Received response from Vertex AI");
    
    const response = result.response;
    const text = response.text();
    
    console.log("AI generated text:", text);
    
    try {
      // Try to parse the JSON response
      const jsonStart = text.indexOf('{');
      const jsonEnd = text.lastIndexOf('}') + 1;
      const jsonString = text.substring(jsonStart, jsonEnd);
      
      const offerData = JSON.parse(jsonString);
      console.log("Parsed offer data:", offerData);
      return offerData;
    } catch (parseError) {
      console.error("Error parsing AI response as JSON:", parseError);
      
      // Fallback: Create a structured object from the text
      const fallbackOffer = createFallbackOffer(category, text);
      console.log("Created fallback offer:", fallbackOffer);
      return fallbackOffer;
    }
  } catch (error) {
    console.error("Error generating AI offer:", error);
    
    // Emergency fallback
    const emergencyOffer = {
      name: category === "Loyal" ? "LOYALVIP" : category === "At-Risk" ? "COMEBACK" : "WELCOME",
      discount: category === "Loyal" ? "15%" : category === "At-Risk" ? "20%" : "25%",
      description: `Special offer for our ${category.toLowerCase()} customers.`,
      expiration: "Valid for 14 days"
    };
    
    console.log("Using emergency fallback offer:", emergencyOffer);
    return emergencyOffer;
  }
};

const createFallbackOffer = (category, text) => {
  // Extract potential offer details from text
  const discountMatch = text.match(/(\d+)%/);
  const discount = discountMatch ? discountMatch[0] : 
                  (category === "Loyal" ? "15%" : 
                   category === "At-Risk" ? "20%" : "25%");
  
  // Try to find a potential name in the text
  const lines = text.split('\n').filter(line => line.trim().length > 0);
  let name = "";
  
  if (lines.length > 0) {
    // Look for short all-caps words that might be offer names
    const nameMatch = lines[0].match(/\b([A-Z]{3,})\b/);
    name = nameMatch ? nameMatch[1] : 
           category === "Loyal" ? "LOYALVIP" : 
           category === "At-Risk" ? "COMEBACK" : "WELCOME";
  }
  
  // Extract a description
  let description = "";
  for (const line of lines) {
    if (line.length > 20 && !line.includes("name") && !line.includes("discount")) {
      description = line.trim();
      break;
    }
  }
  
  if (!description) {
    description = `Special offer for our ${category.toLowerCase()} customers.`;
  }
  
  // Extract expiration if present
  const expirationMatch = text.match(/valid for (\d+) days/i) || 
                          text.match(/expires in (\d+) days/i);
  const expiration = expirationMatch ? `Valid for ${expirationMatch[1]} days` : "Valid for 14 days";
  
  return {
    name: name,
    discount: discount,
    description: description,
    expiration: expiration
  };
};
