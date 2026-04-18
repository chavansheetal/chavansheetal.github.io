import { initializeApp } from "firebase/app";
import { getAuth, RecaptchaVerifier, signInWithPhoneNumber, signOut } from "firebase/auth";

// Firebase configuration - REPLACE WITH YOUR ACTUAL VALUES
const firebaseConfig = {
  apiKey: "YOUR_API_KEY_HERE",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "123456789012",
  appId: "1:123456789012:web:abcdef123456"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

// Initialize reCAPTCHA verifier for phone auth
export const setupRecaptcha = (containerId = 'recaptcha-container') => {
  if (!window.recaptchaVerifier) {
    window.recaptchaVerifier = new RecaptchaVerifier(auth, containerId, {
      size: 'invisible',
      callback: (response) => {
        console.log("reCAPTCHA solved successfully");
      },
      'expired-callback': () => {
        console.log("reCAPTCHA expired, please try again");
        // Reset reCAPTCHA
        if (window.recaptchaVerifier) {
          window.recaptchaVerifier.clear();
          window.recaptchaVerifier = null;
        }
      }
    });
  }
  return window.recaptchaVerifier;
};

// Send OTP to phone number
export const sendOTP = async (phoneNumber) => {
  try {
    // Ensure reCAPTCHA is set up
    if (!window.recaptchaVerifier) {
      setupRecaptcha();
    }

    console.log(`Sending OTP to ${phoneNumber}...`);
    const confirmationResult = await signInWithPhoneNumber(
      auth,
      phoneNumber,
      window.recaptchaVerifier
    );

    console.log("OTP sent successfully");
    return confirmationResult;
  } catch (error) {
    console.error("Error sending OTP:", error);

    // Handle specific error cases
    if (error.code === 'auth/invalid-phone-number') {
      throw new Error('Invalid phone number format. Please use +91XXXXXXXXXX');
    } else if (error.code === 'auth/too-many-requests') {
      throw new Error('Too many requests. Please try again later.');
    } else if (error.code === 'auth/missing-recaptcha-token') {
      throw new Error('reCAPTCHA verification failed. Please refresh and try again.');
    }

    throw new Error(`Failed to send OTP: ${error.message}`);
  }
};

// Verify OTP code
export const verifyOTP = async (confirmationResult, otp) => {
  try {
    console.log("Verifying OTP...");
    const result = await confirmationResult.confirm(otp);
    console.log("OTP verified successfully");
    return result.user;
  } catch (error) {
    console.error("Error verifying OTP:", error);

    if (error.code === 'auth/invalid-verification-code') {
      throw new Error('Invalid OTP. Please check the code and try again.');
    } else if (error.code === 'auth/code-expired') {
      throw new Error('OTP has expired. Please request a new one.');
    }

    throw new Error(`OTP verification failed: ${error.message}`);
  }
};

// Sign out current user
export const signOutUser = async () => {
  try {
    await signOut(auth);
    console.log("User signed out successfully");
  } catch (error) {
    console.error("Error signing out:", error);
  }
};

// Get current user
export const getCurrentUser = () => {
  return auth.currentUser;
};