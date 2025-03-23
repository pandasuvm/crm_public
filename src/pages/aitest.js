import { getVertexAI, getGenerativeModel } from "firebase/vertexai";
import { getApp } from "firebase/app";

// Use the existing Firebase app instance
const firebaseApp = getApp();

// Get Vertex AI service
const vertexAI = getVertexAI(firebaseApp, "us-central1");

// Initialize the generative model
const model = getGenerativeModel(vertexAI, { model: "gemini-2.0-flash" });

/**
 * Analyzes customer data to generate a loyalty score using AI
 * @param {Object} customerData - Customer behavior and purchase data
 * @returns {Promise<number>} - AI-calculated loyalty score
 */
export const predictLoyaltyScore = async (customerData) => {
  try {
    const {
      purchaseHistory = [],
      totalSpent = 0,
      daysInactive = 0,
      engagementScore = 0,
      feedbackScore = 0,
      returns = 0,
      avgOrderValue = 0,
      purchaseFrequency = 0,
      customerLifetime = 0
    } = customerData;

    // Create a detailed prompt for AI to analyze customer loyalty
    const prompt = `
    As a CRM loyalty analysis expert, calculate a loyalty score (0-100) for this customer:
    
    Purchase metrics:
    - Total purchases: ${purchaseHistory.length}
    - Total spent: $${totalSpent.toFixed(2)}
    - Average order value: $${avgOrderValue.toFixed(2)}
    - Purchase frequency: ${purchaseFrequency.toFixed(2)} orders per month
    - Customer lifetime: ${customerLifetime} days
    - Return rate: ${returns > 0 ? (returns / purchaseHistory.length * 100).toFixed(1) : 0}%
    
    Engagement metrics:
    - Days since last activity: ${daysInactive}
    - Engagement score (0-1): ${engagementScore.toFixed(2)}
    - Feedback score (0-5): ${feedbackScore}
    
    Consider these industry standards:
    - RFM (Recency, Frequency, Monetary value) analysis
    - Customer Lifetime Value calculation
    - Net Promoter Score influence
    - Churn prediction indicators
    
    Return only a numeric score between 0-100, where:
    - 80-100: Highly loyal, brand advocate
    - 60-79: Loyal customer
    - 40-59: Moderate loyalty
    - 20-39: At-risk customer
    - 0-19: Churned or about to churn
    `;

    console.log("Requesting AI loyalty score prediction");
    const result = await model.generateContent(prompt);
    const response = result.response;
    const text = response.text().trim();
    
    // Extract numeric score from response
    const scoreMatch = text.match(/\d+(\.\d+)?/);
    let score = scoreMatch ? parseFloat(scoreMatch[0]) : 50;
    
    // Ensure score is between 0-100
    score = Math.max(0, Math.min(100, score));
    
    console.log("AI predicted loyalty score:", score);
    return Math.round(score);
  } catch (error) {
    console.error("Error predicting loyalty score with AI:", error);
    
    // Fallback to traditional RFM calculation if AI fails
    return calculateTraditionalLoyaltyScore(customerData);
  }
};

/**
 * Fallback function to calculate loyalty score using traditional methods
 * @param {Object} customerData - Customer behavior and purchase data
 * @returns {number} - Calculated loyalty score
 */
const calculateTraditionalLoyaltyScore = (customerData) => {
  const {
    purchaseHistory = [],
    totalSpent = 0,
    daysInactive = 0,
    engagementScore = 0,
    feedbackScore = 0,
    customerLifetime = 1
  } = customerData;

  // Calculate RFM components
  // Recency (lower is better)
  const recencyScore = Math.max(0, 100 - (daysInactive * 2));
  
  // Frequency (higher is better)
  const frequency = purchaseHistory.length;
  const frequencyScore = Math.min(100, frequency * 20);
  
  // Monetary (higher is better)
  const monetaryScore = Math.min(100, (totalSpent / 1000) * 50);
  
  // Engagement component
  const engagementComponent = engagementScore * 100;
  
  // Feedback component
  const feedbackComponent = (feedbackScore / 5) * 100;
  
  // Calculate customer lifetime value
  const clvFactor = Math.min(1, customerLifetime / 365);
  
  // Weighted average of all components
  const loyaltyScore = (
    (recencyScore * 0.3) +
    (frequencyScore * 0.25) +
    (monetaryScore * 0.2) +
    (engagementComponent * 0.15) +
    (feedbackComponent * 0.1)
  ) * clvFactor;
  
  return Math.round(Math.max(0, Math.min(100, loyaltyScore)));
};

/**
 * Generates personalized offers based on customer data and loyalty category
 * @param {Object} customerProfile - Customer profile and loyalty data
 * @returns {Promise<Object>} - AI-generated personalized offer
 */
export const generateAIOffer = async (customerProfile) => {
  try {
    console.log("Starting AI offer generation...");
    
    const { 
      loyaltyScore, 
      category, 
      daysInactive, 
      totalSpent, 
      engagementScore, 
      purchaseCount,
      purchaseHistory = [],
      customerLifetime = 0,
      preferredCategories = []
    } = customerProfile;
    
    // Calculate customer metrics for better offer targeting
    const avgOrderValue = purchaseCount > 0 ? totalSpent / purchaseCount : 0;
    const purchaseFrequency = customerLifetime > 0 ? (purchaseCount / customerLifetime) * 30 : 0; // Monthly
    
    // Determine customer behavioral segment for more targeted offers
    const behavioralSegment = determineBehavioralSegment(customerProfile);
    
    // Calculate optimal discount based on customer value and status
    const suggestedDiscount = calculateOptimalDiscount(customerProfile);
    
    // Determine best timing strategy based on purchase patterns
    const timingStrategy = determineTimingStrategy(customerProfile);
    
    // Identify specific products or categories to recommend
    const recommendedCategories = identifyRecommendedCategories(customerProfile);
    
    // Create a detailed prompt for personalized offer generation
    const prompt = `
    As a CRM marketing specialist with expertise in personalization, create a highly targeted e-commerce offer for this specific customer segment:
    
    Customer Profile:
    - Loyalty Score: ${loyaltyScore}/100
    - Loyalty Category: ${category}
    - Days Since Last Purchase: ${daysInactive}
    - Total Lifetime Spend: $${totalSpent.toFixed(2)}
    - Average Order Value: $${avgOrderValue.toFixed(2)}
    - Purchase Frequency: ${purchaseFrequency.toFixed(2)} orders per month
    - Total Purchases: ${purchaseCount}
    - Behavioral Segment: ${behavioralSegment}
    - Preferred Categories: ${preferredCategories.length > 0 ? preferredCategories.join(', ') : "None identified"}
    
    Important context for this customer:
    - ${getCustomerInsights(customerProfile)}
    - Suggested discount range: ${suggestedDiscount}
    - Optimal timing strategy: ${timingStrategy}
    - Recommended product categories: ${recommendedCategories.join(', ')}
    
    Based on this customer's specific profile, create a personalized offer that:
    1. Has a compelling single-word name that reflects their exact loyalty status and purchase behavior
    2. Includes a specific discount or promotion precisely calibrated to their spending habits and likelihood to convert
    3. Directly references their preferred product categories with specific product suggestions
    4. Creates urgency with a strategic expiration timeframe based on their typical purchase cycle
    5. Uses language and incentives that specifically address their ${category} status
    
    Format your response as a clean JSON object:
    {
      "name": "OFFER-NAME",
      "discount": "DISCOUNT-PERCENTAGE-OR-AMOUNT",
      "description": "Compelling offer description with specific product references",
      "expiration": "Strategic timeframe with specific date",
      "targetedCategory": "Specific product category to promote",
      "expectedConversionRate": "Estimated conversion percentage based on customer data"
    }
    `;

    console.log("Sending enhanced prompt to Vertex AI for offer generation");
    
    const result = await model.generateContent(prompt);
    const response = result.response;
    const text = response.text();
    
    try {
      // Parse the JSON response
      const jsonStart = text.indexOf('{');
      const jsonEnd = text.lastIndexOf('}') + 1;
      const jsonString = text.substring(jsonStart, jsonEnd);
      
      const offerData = JSON.parse(jsonString);
      
      // Validate and enhance the AI response
      const enhancedOffer = validateAndEnhanceOffer(offerData, customerProfile);
      
      console.log("Successfully generated personalized offer:", enhancedOffer);
      return enhancedOffer;
    } catch (parseError) {
      console.error("Error parsing AI response as JSON:", parseError);
      
      // Enhanced fallback with sophisticated offer generation
      const fallbackOffer = createSophisticatedFallbackOffer(customerProfile);
      console.log("Created sophisticated fallback offer:", fallbackOffer);
      return fallbackOffer;
    }
  } catch (error) {
    console.error("Error generating AI offer:", error);
    
    // Emergency fallback with basic targeting
    return createEmergencyOffer(customerProfile);
  }
};

// Determine customer behavioral segment based on profile
function determineBehavioralSegment(customerProfile) {
  const { loyaltyScore, daysInactive, purchaseCount, engagementScore } = customerProfile;
  
  if (loyaltyScore >= 80 && purchaseCount > 5) return "High-Value Regular";
  if (loyaltyScore >= 60 && daysInactive < 30) return "Active Loyal";
  if (daysInactive > 60 && loyaltyScore > 50) return "Dormant High-Value";
  if (daysInactive > 30 && daysInactive <= 60) return "Recent Churner";
  if (purchaseCount <= 2 && daysInactive < 30) return "New Customer";
  if (engagementScore < 0.3) return "Low Engagement Browser";
  
  return "Standard Customer";
}

// Calculate optimal discount based on customer value and status
function calculateOptimalDiscount(customerProfile) {
  const { category, loyaltyScore, totalSpent, daysInactive } = customerProfile;
  
  // Base discount by category
  let baseDiscount = category === "Loyal" ? "10-15%" : 
                    category === "At-Risk" ? "15-20%" : "20-25%";
  
  // Adjust for high-value customers
  if (totalSpent > 500 && category === "Loyal") {
    baseDiscount = "15-20%";
  }
  
  // Adjust for long inactivity
  if (daysInactive > 90) {
    baseDiscount = "25-30%";
  }
  
  return baseDiscount;
}

// Determine timing strategy based on purchase patterns
function determineTimingStrategy(customerProfile) {
  const { purchaseFrequency, daysInactive } = customerProfile;
  
  if (purchaseFrequency > 1) {
    // Frequent purchaser
    return "Short timeframe (3-5 days) to create urgency";
  } else if (daysInactive > 60) {
    // Long dormant customer
    return "Extended timeframe (14 days) with reminder";
  } else {
    // Standard customer
    return "Standard timeframe (7 days)";
  }
}

// Identify recommended categories based on purchase history and preferences
function identifyRecommendedCategories(customerProfile) {
  const { preferredCategories, purchaseHistory } = customerProfile;
  
  if (preferredCategories.length > 0) {
    return preferredCategories;
  }
  
  // Extract categories from purchase history if available
  const purchasedCategories = [];
  purchaseHistory.forEach(purchase => {
    if (purchase.category && !purchasedCategories.includes(purchase.category)) {
      purchasedCategories.push(purchase.category);
    }
  });
  
  if (purchasedCategories.length > 0) {
    return purchasedCategories;
  }
  
  return ["bestsellers", "new arrivals"];
}

// Get customer insights based on profile
function getCustomerInsights(customerProfile) {
  const { category, daysInactive, purchaseCount, engagementScore } = customerProfile;
  
  const insights = [];
  
  if (category === "Loyal" && purchaseCount > 5) {
    insights.push("This is a high-value repeat customer who responds well to exclusivity and premium offers");
  }
  
  if (category === "At-Risk" && daysInactive > 30) {
    insights.push("This customer is showing signs of disengagement and needs a compelling reason to return");
  }
  
  if (category === "Churned") {
    insights.push("This customer has likely moved to a competitor and needs a strong incentive to reconsider");
  }
  
  if (engagementScore < 0.3) {
    insights.push("Low engagement with marketing communications suggests need for a different approach");
  }
  
  return insights.length > 0 ? insights.join("; ") : "Standard customer profile";
}

// Validate and enhance the AI-generated offer
function validateAndEnhanceOffer(offerData, customerProfile) {
  const { category, daysInactive } = customerProfile;
  
  // Ensure offer name is appropriate for customer category
  if (!offerData.name || offerData.name.length < 3) {
    offerData.name = category === "Loyal" ? "VIPSTATUS" : 
                     category === "At-Risk" ? "WINBACK" : "WELCOME";
  }
  
  // Ensure discount is appropriate
  if (!offerData.discount || offerData.discount.length < 2) {
    offerData.discount = category === "Loyal" ? "15%" : 
                        category === "At-Risk" ? "20%" : "25%";
  }
  
  // Ensure expiration has specific timeframe
  if (!offerData.expiration || offerData.expiration.length < 5) {
    const days = category === "Loyal" ? 7 : 
                category === "At-Risk" ? 10 : 14;
    
    // Calculate expiration date
    const expirationDate = new Date();
    expirationDate.setDate(expirationDate.getDate() + days);
    offerData.expiration = `Valid until ${expirationDate.toLocaleDateString()}`;
  }
  
  // Ensure targeted category is specified
  if (!offerData.targetedCategory || offerData.targetedCategory.length < 2) {
    offerData.targetedCategory = "bestsellers";
  }
  
  // Add dynamic elements based on customer behavior
  if (daysInactive > 60) {
    offerData.description = `We've missed you! ${offerData.description}`;
  }
  
  return offerData;
}

// Create sophisticated fallback offer
function createSophisticatedFallbackOffer(customerProfile) {
  const { category, loyaltyScore, totalSpent, daysInactive, preferredCategories } = customerProfile;
  
  // Determine appropriate discount based on customer value and status
  let discountPercentage;
  let offerName;
  let expiration;
  let targetedCategory = preferredCategories.length > 0 ? preferredCategories[0] : "bestsellers";
  
  if (category === "Loyal") {
    // Loyal customers get better rewards but shorter timeframes to encourage quick action
    discountPercentage = totalSpent > 500 ? "20%" : "15%";
    offerName = totalSpent > 1000 ? "VIPSTATUS" : "LOYALIST";
    expiration = `Valid until ${new Date(Date.now() + 7*24*60*60*1000).toLocaleDateString()}`;
  } else if (category === "At-Risk") {
    // At-risk customers get compelling offers with moderate timeframes
    discountPercentage = "25%";
    offerName = daysInactive > 60 ? "COMEBACK" : "MISSYOU";
    expiration = `Valid until ${new Date(Date.now() + 10*24*60*60*1000).toLocaleDateString()}`;
  } else {
    // Churned customers get the best offers with longest timeframes
    discountPercentage = "30%";
    offerName = "WELCOME";
    expiration = `Valid until ${new Date(Date.now() + 14*24*60*60*1000).toLocaleDateString()}`;
  }
  
  // Create description based on available data
  let description;
  if (preferredCategories.length > 0) {
    description = `Exclusive ${discountPercentage} discount on ${preferredCategories[0]} products just for you.`;
  } else {
    description = `Enjoy ${discountPercentage} off your next purchase as a valued ${category.toLowerCase()} customer.`;
  }
  
  // Estimate conversion rate based on offer quality and customer loyalty
  const expectedConversionRate = category === "Loyal" ? "30-40%" : 
                                category === "At-Risk" ? "15-25%" : "5-15%";
  
  return {
    name: offerName,
    discount: discountPercentage,
    description: description,
    expiration: expiration,
    targetedCategory: targetedCategory,
    expectedConversionRate: expectedConversionRate
  };
}

// Create emergency offer when AI generation fails completely
function createEmergencyOffer(customerProfile) {
  const { category } = customerProfile;
  
  // Get current date
  const today = new Date();
  
  // Calculate expiration date (7-14 days in the future)
  const expirationDate = new Date();
  expirationDate.setDate(today.getDate() + (category === "Loyal" ? 7 : 14));
  
  const emergencyOffer = {
    name: category === "Loyal" ? "LOYALVIP" : category === "At-Risk" ? "COMEBACK" : "WELCOME",
    discount: category === "Loyal" ? "15%" : category === "At-Risk" ? "20%" : "25%",
    description: `Special ${category === "Loyal" ? "loyalty" : category === "At-Risk" ? "comeback" : "welcome"} offer just for you! Use this exclusive discount on your next purchase.`,
    expiration: `Valid until ${expirationDate.toLocaleDateString()}`,
    targetedCategory: "all products",
    expectedConversionRate: category === "Loyal" ? "25%" : category === "At-Risk" ? "15%" : "10%"
  };
  
  return emergencyOffer;
}

/**
 * Analyzes customer feedback text to extract sentiment and actionable insights
 * @param {string} feedbackText - Customer feedback text
 * @returns {Promise<Object>} - Sentiment analysis and insights
 */
export const analyzeFeedbackSentiment = async (feedbackText) => {
  try {
    const prompt = `
    Analyze this customer feedback and provide:
    1. A sentiment score from -1 (very negative) to 1 (very positive)
    2. Key themes or issues mentioned
    3. Actionable recommendations for the business
    
    Customer feedback: "${feedbackText}"
    
    Format your response as a JSON object:
    {
      "sentimentScore": number,
      "keyThemes": ["theme1", "theme2"],
      "actionableInsights": ["insight1", "insight2"],
      "priority": "high/medium/low"
    }
    `;
    
    const result = await model.generateContent(prompt);
    const response = result.response;
    const text = response.text();
    
    try {
      const jsonStart = text.indexOf('{');
      const jsonEnd = text.lastIndexOf('}') + 1;
      const jsonString = text.substring(jsonStart, jsonEnd);
      
      return JSON.parse(jsonString);
    } catch (error) {
      console.error("Error parsing feedback analysis:", error);
      return {
        sentimentScore: 0,
        keyThemes: ["Unable to analyze"],
        actionableInsights: ["Review feedback manually"],
        priority: "medium"
      };
    }
  } catch (error) {
    console.error("Error analyzing feedback:", error);
    return null;
  }
};

/**
 * Predicts customer churn risk based on behavior patterns
 * @param {Object} customerData - Customer behavior data
 * @returns {Promise<Object>} - Churn risk assessment
 */
export const predictChurnRisk = async (customerData) => {
  try {
    // Normalize data to prevent zero/null values from causing issues
    const normalizedData = {
      daysInactive: customerData.daysInactive || 0,
      purchaseCount: customerData.purchaseCount || 0,
      engagementScore: customerData.engagementScore || 0,
      avgOrderValue: customerData.avgOrderValue || 0,
      purchaseFrequency: customerData.purchaseFrequency || 0
    };
    
    // Add specific context for zero values to help the model understand the situation
    const zeroValueContext = [];
    if (normalizedData.purchaseCount === 0) zeroValueContext.push("Customer has made no purchases yet");
    if (normalizedData.purchaseFrequency === 0) zeroValueContext.push("Purchase frequency is zero");
    if (normalizedData.daysInactive > 90) zeroValueContext.push(`Customer inactive for ${normalizedData.daysInactive} days`);
    
    // Create a more detailed prompt with clearer instructions and zero-value handling
    const prompt = `
    Analyze this customer data and calculate a precise churn probability (0-100%):
    
    - Days since last purchase: ${normalizedData.daysInactive}
    - Total purchases: ${normalizedData.purchaseCount}
    - Engagement score (0-1): ${normalizedData.engagementScore}
    - Average order value: $${normalizedData.avgOrderValue}
    - Purchase frequency: ${normalizedData.purchaseFrequency} orders per month
    ${zeroValueContext.length > 0 ? `- Special context: ${zeroValueContext.join(', ')}` : ''}
    
    Important guidelines:
    - New customers with zero purchases should be evaluated based on engagement score and days inactive
    - Zero purchase frequency with previous purchases indicates high churn risk
    - For customers with no purchase history, focus on engagement metrics
    - Higher inactivity periods strongly correlate with increased churn risk
    - Low engagement scores indicate potential disinterest
    
    Return ONLY a JSON object with these fields:
    {
      "churnProbability": [a specific number between 0-100 based on the data, NOT a default value],
      "riskLevel": [either "high" if >70%, "medium" if >40%, or "low" otherwise],
      "keyRiskFactors": [specific factors from the data that indicate risk],
      "retentionStrategies": [targeted strategies based on the specific risk factors]
    }
    `;
    
    const result = await model.generateContent(prompt);
    const response = result.response;
    const text = response.text();
    
    try {
      const jsonStart = text.indexOf('{');
      const jsonEnd = text.lastIndexOf('}') + 1;
      const jsonString = text.substring(jsonStart, jsonEnd);
      
      const parsedResult = JSON.parse(jsonString);
      
      // Validate the result to ensure we're not getting default values
      if (parsedResult.churnProbability === 95 || parsedResult.churnProbability === 0) {
        // If we detect suspicious default values, use our calculation instead
        return calculateBasicChurnRisk(customerData);
      }
      
      return parsedResult;
    } catch (error) {
      console.error("Error parsing churn prediction:", error);
      return calculateBasicChurnRisk(customerData);
    }
  } catch (error) {
    console.error("Error predicting churn:", error);
    return calculateBasicChurnRisk(customerData);
  }
};

// Improved fallback calculation based on industry standards
const calculateBasicChurnRisk = (customerData) => {
  const { daysInactive = 0, engagementScore = 0, purchaseCount = 0, purchaseFrequency = 0, avgOrderValue = 0 } = customerData;
  
  // Initialize base probability
  let churnProbability = 0;
  const keyRiskFactors = [];
  
  // Handle zero purchase cases specifically
  if (purchaseCount === 0) {
    // New user with no purchases yet
    if (daysInactive < 7) {
      // Very new user, moderate risk
      churnProbability = 50;
      keyRiskFactors.push("New user with no purchase history");
    } else {
      // User who hasn't purchased after being inactive for a while
      churnProbability = Math.min(50 + (daysInactive / 2), 95);
      keyRiskFactors.push("No purchases despite being registered for some time");
    }
  } else {
    // Inactivity factor (0-60%)
    let inactivityFactor = 0;
    if (daysInactive > 90) {
      inactivityFactor = 60;
      keyRiskFactors.push("Extended inactivity (90+ days)");
    } else if (daysInactive > 60) {
      inactivityFactor = 40;
      keyRiskFactors.push("Significant inactivity (60+ days)");
    } else if (daysInactive > 30) {
      inactivityFactor = 20;
      keyRiskFactors.push("Moderate inactivity (30+ days)");
    }
    churnProbability += inactivityFactor;
    
    // Engagement factor (0-30%)
    let engagementFactor = 0;
    if (engagementScore < 0.2) {
      engagementFactor = 30;
      keyRiskFactors.push("Very low engagement score");
    } else if (engagementScore < 0.5) {
      engagementFactor = 15;
      keyRiskFactors.push("Below average engagement");
    }
    churnProbability += engagementFactor;
    
    // Purchase frequency factor (0-20%)
    if (purchaseFrequency === 0 && purchaseCount > 0) {
      // Has purchased before but frequency is now zero (stopped purchasing)
      churnProbability += 20;
      keyRiskFactors.push("Customer has stopped making purchases");
    } else if (purchaseFrequency < 0.3) {
      churnProbability += 15;
      keyRiskFactors.push("Very low purchase frequency");
    } else if (purchaseFrequency < 0.7) {
      churnProbability += 10;
      keyRiskFactors.push("Infrequent purchasing pattern");
    }
  }
  
  // Average order value factor
  if (avgOrderValue > 0 && avgOrderValue < 10) {
    churnProbability += 10;
    keyRiskFactors.push("Low average order value");
  }
  
  // Cap at 100%
  churnProbability = Math.min(100, Math.round(churnProbability));
  
  // Determine risk level
  let riskLevel = "low";
  if (churnProbability > 70) riskLevel = "high";
  else if (churnProbability > 40) riskLevel = "medium";
  
  // Generate retention strategies based on risk factors
  const retentionStrategies = generateRetentionStrategies(keyRiskFactors, customerData);
  
  return {
    churnProbability,
    riskLevel,
    keyRiskFactors,
    retentionStrategies
  };
};


// Improved fallback calculation based on industry standards



// Improved fallback calculation based on industry standards


const generateRetentionStrategies = (riskFactors, customerData) => {
  const strategies = [];
  
  if (riskFactors.includes("Extended inactivity (90+ days)") || 
      riskFactors.includes("Significant inactivity (60+ days)")) {
    strategies.push("Send re-engagement email with special offer");
    strategies.push("Provide significant win-back discount");
  } else if (riskFactors.includes("Moderate inactivity (30+ days)")) {
    strategies.push("Send reminder email with personalized recommendations");
  }
  
  if (riskFactors.includes("Very low engagement score") || 
      riskFactors.includes("Below average engagement")) {
    strategies.push("Improve product onboarding experience");
    strategies.push("Offer personalized content based on past purchases");
  }
  
  if (riskFactors.includes("Limited purchase history") || 
      riskFactors.includes("Few total purchases")) {
    strategies.push("Offer loyalty program enrollment incentive");
  }
  
  if (riskFactors.includes("Very low purchase frequency") || 
      riskFactors.includes("Infrequent purchasing pattern")) {
    strategies.push("Create time-limited offers to encourage immediate purchase");
  }
  
  if (riskFactors.includes("Low average order value")) {
    strategies.push("Provide bundle discounts to increase order value");
  }
  
  // Add general strategies if we have few specific ones
  if (strategies.length < 2) {
    strategies.push("Request feedback to understand pain points");
    strategies.push("Highlight new products or features since last visit");
  }
  
  return strategies;
};

