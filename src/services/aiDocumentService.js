/**
 * Simulated AI/OCR Document Verification Service
 * 
 * Simulates a real-world document verification system by extracting text and validating
 * document data (OCR extraction, fake detection, data matching).
 */

export const analyzeDocument = async (file, docType, userProfile = {}) => {
  // Simulate network delay for OCR processing and AI analysis
  await new Promise(resolve => setTimeout(resolve, 2500));

  const fileName = file.name ? file.name.toLowerCase() : "";
  const size = file.size || 0;

  // 1. Basic image checks (simulate rejection of selfies, blank images, etc.)
  if (
    fileName.includes("selfie") ||
    fileName.includes("dog") ||
    fileName.includes("cat") ||
    fileName.includes("random") ||
    size < 5000 // Too small to be a readable document
  ) {
    return {
      isValid: false,
      status: "rejected",
      errorMsg: "Verification Failed: The image appears to be irrelevant or illegible. Please upload a clear scan of the required document.",
      confidence: 12
    };
  }

  // 2. Simulate forensic integrity check (Detect tampered/photoshopped images)
  if (fileName.includes("fake") || fileName.includes("edit") || fileName.includes("tamper")) {
    return {
      isValid: false,
      status: "rejected",
      errorMsg: "Verification Failed: AI Integrity Check failed. The document appears to be digitally altered or manipulated.",
      confidence: 8
    };
  }

  // 3. Simulate Successful OCR Extraction based on document type
  let extractedData = {};
  
  if (docType.toLowerCase().includes("identity") || docType.toLowerCase().includes("aadhaar")) {
    extractedData = {
      documentType: "National ID / Aadhaar",
      idNumber: "XXXX-XXXX-" + Math.floor(1000 + Math.random() * 9000),
      name: userProfile.fullName || "John Doe",
      dob: userProfile.dob || "01/01/2000",
      gender: userProfile.gender || "Not Specified"
    };
  } else if (docType.toLowerCase().includes("academic") || docType.toLowerCase().includes("mark sheet")) {
    extractedData = {
      documentType: "Academic Marksheet",
      boardOrUniversity: userProfile.boardUniv || "State Board of Education",
      passingYear: userProfile.academicYear || "2024",
      percentage: userProfile.marks ? `${userProfile.marks}%` : "85%",
      studentName: userProfile.fullName || "John Doe"
    };
  } else if (docType.toLowerCase().includes("financial") || docType.toLowerCase().includes("income")) {
    extractedData = {
      documentType: "Income Certificate",
      issuedBy: "Revenue Department",
      annualIncome: "₹" + (userProfile.annualIncome || "1,50,000"),
      issuedTo: userProfile.fullName || "John Doe",
      validUntil: "March 2026"
    };
  } else if (docType.toLowerCase().includes("bank")) {
    extractedData = {
      documentType: "Bank Passbook / Cheque",
      bankName: userProfile.bankName || "State Bank of India",
      accountNumber: "****" + (userProfile.accountNo ? String(userProfile.accountNo).slice(-4) : "1234"),
      ifscCode: userProfile.ifsc || "SBIN000XXXX",
      accountHolder: userProfile.accountHolder || userProfile.fullName || "John Doe"
    };
  } else {
    extractedData = {
      documentType: docType,
      verifiedName: userProfile.fullName || "Match Found",
      status: "Authentic Document"
    };
  }

  // 4. Return successful AI Verification
  return {
    isValid: true,
    status: "verified",
    confidence: Math.floor(Math.random() * (99 - 92 + 1) + 92), // High confidence 92-99%
    extractedData,
    verificationId: `VER-${Math.random().toString(36).substring(2, 10).toUpperCase()}-${Math.random().toString(10).substring(2, 6)}`,
    message: "Document successfully verified and data authenticated.",
  };
};
