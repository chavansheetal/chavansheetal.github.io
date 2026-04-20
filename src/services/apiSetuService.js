/**
 * Simulated API Setu Service for Document Verification
 * 
 * Note: In a real environment, API Setu requests MUST be routed through
 * a secure backend to prevent exposing client keys and handling CORS.
 * This file simulates the API Setu verification flows for frontend demonstration.
 */

export const apiSetuVerifyDocument = async (file, docType, expectedDetails) => {
  // Simulate network delay for scanning and connecting to API Setu
  await new Promise(resolve => setTimeout(resolve, 2500));

  const fileName = file.name.toLowerCase();

  // 1. Simulate Image Type Rejection (Selfies, Random Objects)
  if (
    fileName.includes("selfie") ||
    fileName.includes("dog") ||
    fileName.includes("cat") ||
    fileName.includes("random") ||
    file.size < 5000 // Too small, likely blank image
  ) {
    return {
      isValid: false,
      status: "rejected",
      errorMsg: "Verification Failed: Irrelevant or random image detected. Please upload a clear scan of the original document.",
      confidence: 15
    };
  }

  // 2. Simulate API Setu connection and official record matching
  // (Assuming typical document names for demo purposes. E.g., 'aadhaar.pdf')
  
  // Create a mock extraction based on expected details to simulate success
  // or introduce a random failure if document name implies manipulation
  if (fileName.includes("fake") || fileName.includes("edit")) {
    return {
      isValid: false,
      status: "rejected",
      errorMsg: "Verification Failed: Document integrity check failed. Possible manipulation detected by API Setu.",
      confidence: 30
    };
  }

  // 3. Simulate Successful Verification
  // In API Setu, we would receive verified fields from the issuing authority
  return {
    isValid: true,
    status: "verified",
    confidence: Math.floor(Math.random() * (99 - 90 + 1) + 90), // 90 to 99% confident
    extractedData: {
      documentType: docType,
      verifiedName: expectedDetails?.fullName || "Verified User",
      verifiedDob: expectedDetails?.dob || "Matched",
      source: "API Setu / DigiLocker",
    },
    message: "Verified securely via API Setu records.",
  };
};
