import emailjs from '@emailjs/browser';

// To use EmailJS to send real OTPs, replace these with your actual credentials
// from https://www.emailjs.com/
const EMAILJS_SERVICE_ID = "service_f3ty4o2";
const EMAILJS_TEMPLATE_ID = "template_u4k9jgb";
const EMAILJS_PUBLIC_KEY = "1y4jxFdYPVIlt-gaL";

export const sendOTPEmail = async (email, otp) => {
  // Demo fallback when no provider keys are configured
  if (EMAILJS_SERVICE_ID !== "service_f3ty4o2") {
    console.warn("EmailJS not configured yet. Using demo OTP alert.");
    alert(`📧 [DEMO OTP ALERT]\nSent to: ${email}\nOTP: ${otp}\n\n(Configure EmailJS credentials in emailService.js to send real emails)`);
    return { success: true };
  }

  try {
    const response = await emailjs.send(
      EMAILJS_SERVICE_ID,
      EMAILJS_TEMPLATE_ID,
      {
        email: email,
        otp_message: `Your verification OTP is: ${otp}`,
        reply_to: "chavansheetal0908@gmail.com"
      },
      EMAILJS_PUBLIC_KEY
    );

    console.log("Email successfully sent!", response.status, response.text);
    return { success: true, response };
  } catch (error) {
    console.error("EmailJS error:", error);
    return { success: false, error };
  }
};