import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { getUserByEmail, getUserByAppId, updateUserPassword } from "../store";
import "../styles/Auth.css";

export default function ForgotPassword() {
  const navigate = useNavigate();
  const [step, setStep]               = useState(1);
  const [email, setEmail]             = useState("");
  const [enteredOtp, setEnteredOtp]   = useState("");
  const [newPwd, setNewPwd]           = useState("");
  const [confirmPwd, setConfirmPwd]   = useState("");
  const [showPwd, setShowPwd]         = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError]             = useState("");
  const [loading, setLoading]         = useState(false);
  const [sentOtp, setSentOtp]         = useState("");
  const [foundUser, setFoundUser]     = useState(null);

  /* ── STEP 1: send OTP to email ── */
  const handleSendOtp = () => {
    setError("");
    const trimmed = email.trim();
    if (!trimmed || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      setError("Please enter a valid email address.");
      return;
    }
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      // Try to find user by email
      const user = getUserByEmail(trimmed);
      if (!user) {
        // Also try localStorage fallback for backward compatibility
        const savedEmail = localStorage.getItem("nsp_registered_email");
        const savedAppId = localStorage.getItem("nsp_app_id");
        if (savedEmail && savedEmail.toLowerCase() === trimmed.toLowerCase() && savedAppId) {
          const userByAppId = getUserByAppId(savedAppId);
          if (userByAppId) {
            const code = String(Math.floor(100000 + Math.random() * 900000));
            setSentOtp(code);
            setFoundUser(userByAppId);
            alert(`Password Reset OTP\n\nOTP: ${code}\n\nSent to: ${trimmed}`);
            setStep(2);
            return;
          }
        }
        setError(
          "No account found with this email address. " +
          "Please check your registered email or register a new account."
        );
        return;
      }
      const code = String(Math.floor(100000 + Math.random() * 900000));
      setSentOtp(code);
      setFoundUser(user);
      alert(`Password Reset OTP\n\nOTP: ${code}\n\nSent to: ${trimmed}`);
      setStep(2);
    }, 800);
  };

  /* ── STEP 2: verify OTP ── */
  const handleVerifyOtp = () => {
    setError("");
    if (!enteredOtp.trim()) { setError("Please enter the OTP."); return; }
    if (enteredOtp.trim() !== sentOtp) {
      setError("Incorrect OTP. Check the OTP shown in the browser alert.");
      return;
    }
    setStep(3);
  };

  /* ── STEP 3: set new password ── */
  const handleResetPassword = () => {
    setError("");
    if (newPwd.length < 6)     { setError("Password must be at least 6 characters."); return; }
    if (newPwd !== confirmPwd) { setError("Passwords do not match."); return; }
    if (!foundUser?.appId) { setError("Session expired. Please restart."); return; }
    const ok = updateUserPassword(foundUser.appId, newPwd);
    if (!ok) { setError("Something went wrong. Please try again."); return; }
    alert("✅ Password reset successfully!\n\nYou can now login with your new password.");
    navigate("/login");
  };

  return (
    <div className="forgot-page">
      <div className="forgot-card">

        {/* ─── STEP 1: Enter Email ─── */}
        {step === 1 && (
          <>
            <span className="forgot-icon">🔑</span>
            <h2 className="forgot-title">Forgot Password</h2>
            <p className="forgot-sub">Enter your registered email</p>
            <div className="forgot-body">
              {error && <div className="forgot-error">⚠️ {error}</div>}
              <input
                type="email"
                className="forgot-input"
                placeholder="Enter your registered email address"
                value={email}
                onChange={e => setEmail(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleSendOtp()}
                autoFocus
              />
              <button className="forgot-btn" onClick={handleSendOtp} disabled={loading}>
                {loading ? "Sending..." : "Send OTP"}
              </button>
              <Link to="/login" className="forgot-back">Back to Login</Link>
            </div>
          </>
        )}

        {/* ─── STEP 2: Enter OTP ─── */}
        {step === 2 && (
          <>
            <span className="forgot-icon">🔒</span>
            <h2 className="forgot-title">Forgot Password</h2>
            <p className="forgot-sub">Enter the OTP sent to your email</p>
            <div className="forgot-body">
              {error && <div className="forgot-error">⚠️ {error}</div>}
              <div className="forgot-otp-hint">
                📧 OTP shown in the browser alert — enter it below.
              </div>
              <input
                type="text"
                className="forgot-input forgot-otp-input"
                placeholder="Enter 6-digit OTP"
                maxLength={6}
                value={enteredOtp}
                onChange={e => setEnteredOtp(e.target.value.replace(/\D/, ""))}
                onKeyDown={e => e.key === "Enter" && handleVerifyOtp()}
                autoFocus
              />
              <button className="forgot-btn" onClick={handleVerifyOtp}>
                Verify OTP
              </button>
              <button
                className="forgot-resend"
                onClick={() => alert(`OTP: ${sentOtp}\n\nSent to: ${email}`)}
              >
                Show OTP again
              </button>
              <Link to="/login" className="forgot-back">Back to Login</Link>
            </div>
          </>
        )}

        {/* ─── STEP 3: Set New Password ─── */}
        {step === 3 && (
          <>
            <span className="forgot-icon">🔑</span>
            <h2 className="forgot-title">Set New Password</h2>
            <p className="forgot-sub">Create a strong new password</p>
            <div className="forgot-body">
              {error && <div className="forgot-error">⚠️ {error}</div>}
              <div className="forgot-pwd-wrap">
                <input
                  type={showPwd ? "text" : "password"}
                  className="forgot-input"
                  placeholder="New Password (min 6 chars)"
                  value={newPwd}
                  onChange={e => setNewPwd(e.target.value)}
                  autoFocus
                />
                <button type="button" className="forgot-eye" onClick={() => setShowPwd(p => !p)}>
                  {showPwd ? "🙈" : "👁️"}
                </button>
              </div>
              <div className="forgot-pwd-wrap">
                <input
                  type={showConfirm ? "text" : "password"}
                  className="forgot-input"
                  placeholder="Confirm New Password"
                  value={confirmPwd}
                  onChange={e => setConfirmPwd(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && handleResetPassword()}
                />
                <button type="button" className="forgot-eye" onClick={() => setShowConfirm(p => !p)}>
                  {showConfirm ? "🙈" : "👁️"}
                </button>
              </div>
              <button className="forgot-btn" onClick={handleResetPassword}>
                Reset Password
              </button>
            </div>
          </>
        )}

      </div>
    </div>
  );
}
