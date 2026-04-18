// Free alternative (Firebase-free): Web3Forms
// Configure in .env as VITE_WEB3FORMS_ACCESS_KEY=your_access_key
const WEB3FORMS_ENDPOINT = "https://api.web3forms.com/submit";
const WEB3FORMS_ACCESS_KEY = import.meta.env.VITE_WEB3FORMS_ACCESS_KEY || "";

export const sendOTPEmail = async (email, otp) => {
  // Demo fallback when no provider key is configured.
  if (!WEB3FORMS_ACCESS_KEY) {
    console.warn("Web3Forms access key not configured. Using demo OTP alert.");
    alert(`📧 OTP sent to registered email id\n\nOTP: ${otp}\n\nEmail: ${email}\n\nSet VITE_WEB3FORMS_ACCESS_KEY to send real emails.`);
    return { success: true };
  }

  try {
    const response = await fetch(WEB3FORMS_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({
        access_key: WEB3FORMS_ACCESS_KEY,
        subject: "Your NSP Scholar OTP Code",
        from_name: "NSP Scholar OTP",
        email,
        message: `Your OTP code is ${otp}. It is valid for a short time. Do not share this code.`,
      }),
    });

    const data = await response.json();
    if (!response.ok || !data.success) {
      throw new Error(data.message || "Failed to send OTP email");
    }

    return { success: true, response: data };
  } catch (error) {
    console.error("Web3Forms email error:", error);
    return { success: false, error };
  }
};