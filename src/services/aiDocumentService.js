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

  // 3. Strict Content/Filename Matching (Simulating OCR Content Validation)
  const docTypeLower = docType.toLowerCase();
  let expectedKeywords = [];
  
  if (docTypeLower.includes("identity") || docTypeLower.includes("aadhaar") || docTypeLower.includes("residence")) {
    expectedKeywords = ["aadhaar", "id", "pan", "passport", "voter", "identity", "proof"];
  } else if (docTypeLower.includes("academic") || docTypeLower.includes("mark sheet") || docTypeLower.includes("records")) {
    expectedKeywords = ["mark", "memo", "sslc", "puc", "10", "12", "degree", "academic", "transcript", "result"];
  } else if (docTypeLower.includes("fee") || docTypeLower.includes("receipt")) {
    expectedKeywords = ["fee", "receipt", "challan", "payment"];
  } else if (docTypeLower.includes("bank") || docTypeLower.includes("passbook") || docTypeLower.includes("account")) {
    expectedKeywords = ["bank", "passbook", "cheque", "statement", "account"];
  } else if (docTypeLower.includes("bonafide")) {
    expectedKeywords = ["bonafide", "certificate"];
  } else if (docTypeLower.includes("income") || docTypeLower.includes("financial")) {
    expectedKeywords = ["income", "financial", "salary", "certificate"];
  } else if (docTypeLower.includes("photograph")) {
    expectedKeywords = ["photo", "pic", "image", "passport_size"];
  }

  // If we have expected keywords for this category, the filename MUST contain at least one
  if (expectedKeywords.length > 0) {
    const isMatch = expectedKeywords.some(kw => fileName.includes(kw));
    // Also fail if the user uploaded something meant for another category
    // For example, if it's "Bank Passbook" but the filename says "Aadhaar"
    let mismatchedCategory = false;
    if (docTypeLower.includes("bank") && (fileName.includes("aadhaar") || fileName.includes("mark"))) mismatchedCategory = true;
    if (docTypeLower.includes("academic") && (fileName.includes("aadhaar") || fileName.includes("bank") || fileName.includes("fee"))) mismatchedCategory = true;
    if (docTypeLower.includes("fee") && (fileName.includes("mark") || fileName.includes("aadhaar") || fileName.includes("bank"))) mismatchedCategory = true;

    if (!isMatch || mismatchedCategory) {
       return {
         isValid: false,
         status: "rejected",
         errorMsg: `Verification Failed: Content mismatch. You uploaded an invalid file for "${docType}". Please ensure you upload the correct document.`,
         confidence: 15
       };
    }
  }

  // 4. Simulate Successful OCR Extraction based on document type
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
