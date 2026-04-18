// EmailJS configuration for OTP sending
// NOTE: Replace these with your actual EmailJS service credentials
// 1. Go to https://www.emailjs.com/
// 2. Create an account and set up a service (Gmail, Outlook, etc.)
// 3. Create an email template with variables: {{to_email}}, {{otp_code}}, {{subject}}
// 4. Get your Service ID, Template ID, and Public Key from the dashboard

export const EMAILJS_CONFIG = {
  SERVICE_ID: 'service_your_service_id', // Replace with your EmailJS service ID
  TEMPLATE_ID: 'template_otp_template', // Replace with your EmailJS template ID
  PUBLIC_KEY: 'your_public_key' // Replace with your EmailJS public key
};

// Function to send OTP via email
export const sendOTPEmail = async (email, otp) => {
  // For demo purposes, if EmailJS is not configured, show alert as fallback
  if (EMAILJS_CONFIG.SERVICE_ID === 'service_your_service_id') {
    console.warn('EmailJS not configured. Showing OTP in alert for demo purposes.');
    alert(`📧 Email OTP (Demo Mode)\n\nOTP: ${otp}\n\nTo: ${email}\n\nIn production, this would be sent via email.`);
    return { success: true };
  }

  const templateParams = {
    to_email: email,
    otp_code: otp,
    subject: 'Your NSP Scholar OTP Code'
  };

  try {
    const response = await emailjs.send(
      EMAILJS_CONFIG.SERVICE_ID,
      EMAILJS_CONFIG.TEMPLATE_ID,
      templateParams,
      EMAILJS_CONFIG.PUBLIC_KEY
    );
    return { success: true, response };
  } catch (error) {
    console.error('EmailJS error:', error);
    return { success: false, error };
  }
};