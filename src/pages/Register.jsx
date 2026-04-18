import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import Navbar from "./Navbar";
import Footer from "./Footer";
import { saveUser, generateAppId } from "../store";
import "../styles/Auth.css";

const STATES = [
  "Andhra Pradesh","Arunachal Pradesh","Assam","Bihar","Chhattisgarh","Goa",
  "Gujarat","Haryana","Himachal Pradesh","Jharkhand","Karnataka","Kerala",
  "Madhya Pradesh","Maharashtra","Manipur","Meghalaya","Mizoram","Nagaland",
  "Odisha","Punjab","Rajasthan","Sikkim","Tamil Nadu","Telangana","Tripura",
  "Uttar Pradesh","Uttarakhand","West Bengal","Delhi","Jammu & Kashmir","Ladakh",
];

function generateCaptcha() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  return Array.from({ length: 5 }, () => chars[Math.floor(Math.random() * chars.length)]).join(" ");
}

// ── Left-panel decorative data ──
const STATS = [
  { value: "5.2Cr+", label: "Students Benefited" },
  { value: "₹2800Cr", label: "Disbursed Annually" },
  { value: "50+", label: "Scholarship Schemes" },
  { value: "100%", label: "Digital & Paperless" },
];

const BENEFITS = [
  { icon: "🎓", title: "Pre-Matric Scholarships", desc: "For students in Class 1–10 from minority & SC/ST communities." },
  { icon: "📚", title: "Post-Matric Scholarships", desc: "Higher education support for Class 11 and above." },
  { icon: "🏆", title: "Top Class Education", desc: "Merit-based aid for top-ranked institutions across India." },
  { icon: "🔒", title: "Secure & Transparent", desc: "Direct bank transfer via DBT. No middlemen." },
];

// ── Duplicate detection helpers ──
const REGISTRY_KEY = "nsp_applicant_registry";

function getRegistry() {
  try {
    return JSON.parse(localStorage.getItem(REGISTRY_KEY) || "{}");
  } catch {
    return {};
  }
}

function saveRegistry(registry) {
  localStorage.setItem(REGISTRY_KEY, JSON.stringify(registry));
}

function checkDuplicate(aadhaar, mobile, email) {
  const registry = getRegistry();
  for (const [, record] of Object.entries(registry)) {
    if (aadhaar && record.aadhaar && record.aadhaar === aadhaar) {
      return { isDuplicate: true, field: "aadhaar", existingAppId: record.appId };
    }
    if (mobile && record.mobile && record.mobile === mobile) {
      return { isDuplicate: true, field: "mobile", existingAppId: record.appId };
    }
    if (email && record.email && record.email.toLowerCase() === email.toLowerCase()) {
      return { isDuplicate: true, field: "email", existingAppId: record.appId };
    }
  }
  return { isDuplicate: false };
}

function registerApplicant({ appId, aadhaar, mobile, email }) {
  const registry = getRegistry();
  registry[appId] = { appId, aadhaar, mobile, email, registeredAt: new Date().toISOString() };
  saveRegistry(registry);
}

// ══════════════════════════════════════════════════
//  VALIDATION HELPERS
// ══════════════════════════════════════════════════

function verhoeffCheck(num) {
  const d = [
    [0,1,2,3,4,5,6,7,8,9],[1,2,3,4,0,6,7,8,9,5],[2,3,4,0,1,7,8,9,5,6],
    [3,4,0,1,2,8,9,5,6,7],[4,0,1,2,3,9,5,6,7,8],[5,9,8,7,6,0,4,3,2,1],
    [6,5,9,8,7,1,0,4,3,2],[7,6,5,9,8,2,1,0,4,3],[8,7,6,5,9,3,2,1,0,4],
    [9,8,7,6,5,4,3,2,1,0],
  ];
  const p = [
    [0,1,2,3,4,5,6,7,8,9],[1,5,7,6,2,8,3,0,9,4],[5,8,0,3,7,9,6,1,4,2],
    [8,9,1,6,0,4,3,5,2,7],[9,4,5,3,1,2,6,8,7,0],[4,2,8,6,5,7,3,9,0,1],
    [2,7,9,3,8,0,6,4,1,5],[7,0,4,6,9,1,3,2,5,8],
  ];
  const digits = num.split("").reverse().map(Number);
  let c = 0;
  for (let i = 0; i < digits.length; i++) {
    c = d[c][p[i % 8][digits[i]]];
  }
  return c === 0;
}

function validateAadhaar(val) {
  if (!val) return null;
  if (!/^\d{12}$/.test(val)) return "Aadhaar must be exactly 12 digits.";
  if (val[0] === "0" || val[0] === "1") return "Aadhaar number cannot start with 0 or 1.";
  if (/^(\d)\1{11}$/.test(val)) return "Aadhaar number cannot have all identical digits.";
  if (!verhoeffCheck(val)) return "Invalid Aadhaar number (checksum failed). Please re-enter.";
  return null;
}

function validateFullName(val) {
  const trimmed = val.trim();
  if (!trimmed) return "Full Name is required.";
  if (trimmed.length < 3) return "Name is too short.";
  if (trimmed.length > 100) return "Name cannot exceed 100 characters.";
  if (!/^[A-Za-z\s.\-]+$/.test(trimmed))
    return "Name can only contain letters, spaces, dots, and hyphens.";
  if (/\s{2,}/.test(trimmed)) return "Name cannot have consecutive spaces.";
  const words = trimmed.split(/\s+/).filter(Boolean);
  if (words.length < 2) return "Please enter your full name (first and last name).";
  for (const w of words) {
    if (w.replace(/[.\-]/g, "").length < 2)
      return `Name part "${w}" is too short. Each part must have at least 2 letters.`;
  }
  if (/^[.\-\s]/.test(trimmed) || /[.\-\s]$/.test(trimmed))
    return "Name cannot start or end with a space, dot, or hyphen.";
  return null;
}

function validateDob(val) {
  if (!val) return "Date of Birth is required.";
  const dob = new Date(val);
  if (isNaN(dob.getTime())) return "Enter a valid date.";
  const today = new Date();
  let age = today.getFullYear() - dob.getFullYear();
  const monthDiff = today.getMonth() - dob.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) age--;
  if (dob > today) return "Date of Birth cannot be in the future.";
  if (age < 5) return "Applicant must be at least 5 years old.";
  if (age > 35) return "Applicant must not be older than 35 years to apply.";
  return null;
}

function validateMobile(val) {
  if (!val) return "Mobile number is required.";
  if (!/^\d{10}$/.test(val)) return "Mobile number must be exactly 10 digits.";
  if (!/^[6-9]/.test(val)) return "Mobile number must start with 6, 7, 8, or 9.";
  if (/^(\d)\1{9}$/.test(val)) return "Mobile number cannot have all identical digits.";
  if (/^(1234567890|0987654321|1111111111|0000000000)$/.test(val))
    return "Please enter a valid mobile number.";
  return null;
}

const BLOCKED_EMAIL_DOMAINS = [
  "mailinator.com","guerrillamail.com","tempmail.com","throwaway.email",
  "yopmail.com","sharklasers.com","trashmail.com","fakeinbox.com",
  "maildrop.cc","dispostable.com","temp-mail.org","getnada.com",
];

function validateEmail(val) {
  if (!val) return "Email address is required.";
  if (val.length > 100) return "Email address is too long.";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val)) return "Enter a valid email address.";
  const domain = val.split("@")[1]?.toLowerCase();
  if (BLOCKED_EMAIL_DOMAINS.includes(domain))
    return "Disposable / temporary email addresses are not allowed.";
  const local = val.split("@")[0].toLowerCase();
  if (/^(test|fake|dummy|abc|xyz|asdf|qwerty|sample|demo|admin|user\d*)$/.test(local))
    return "Please use your real email address.";
  return null;
}

const COMMON_PASSWORDS = [
  "password","password1","12345678","123456789","qwerty123","iloveyou",
  "abc12345","letmein1","welcome1","monkey123","dragon12","master12",
];

function validatePassword(val) {
  if (!val) return "Password is required.";
  if (val.length < 8) return "Password must be at least 8 characters.";
  if (val.length > 20) return "Password cannot exceed 20 characters.";
  if (/\s/.test(val)) return "Password cannot contain spaces.";
  if (!/[A-Z]/.test(val)) return "Password must contain at least one uppercase letter (A–Z).";
  if (!/[a-z]/.test(val)) return "Password must contain at least one lowercase letter (a–z).";
  if (!/\d/.test(val)) return "Password must contain at least one number (0–9).";
  if (!/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(val))
    return "Password must contain at least one special character (e.g. @, #, $, !).";
  if (COMMON_PASSWORDS.includes(val.toLowerCase()))
    return "This password is too common. Please choose a stronger one.";
  return null;
}

function passwordStrength(val) {
  if (!val) return 0;
  let score = 0;
  if (val.length >= 8) score++;
  if (/[A-Z]/.test(val) && /[a-z]/.test(val)) score++;
  if (/\d/.test(val)) score++;
  if (/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(val)) score++;
  return score;
}

const strengthLabel = ["", "Weak", "Fair", "Good", "Strong"];
const strengthColor = ["", "#ef4444", "#f97316", "#eab308", "#22c55e"];

// ══════════════════════════════════════════════════
//  MAIN REGISTER COMPONENT
// ══════════════════════════════════════════════════

export default function Register({ onLogin }) {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [captcha]       = useState(generateCaptcha);
  const [captchaInput, setCaptchaInput] = useState("");
  const [showPwd, setShowPwd]           = useState(false);
  const [showConfirm, setShowConfirm]   = useState(false);
  const [error, setError]               = useState("");
  const [fieldErrors, setFieldErrors]   = useState({});
  const [appId]                         = useState(() => generateAppId("KA"));
  const [duplicateInfo, setDuplicateInfo] = useState(null);
  const [emailOtp, setEmailOtp] = useState("");

  const [form, setForm] = useState({
    category: "Post-Matric",
    fullName: "", dob: "", gender: "", aadhaar: "",
    studentCategory: "", state: "", mobile: "", email: "",
    password: "", confirmPassword: "", otp: "",
  });

  const set = (k, v) => {
    setForm(f => ({ ...f, [k]: v }));
    if (fieldErrors[k]) setFieldErrors(fe => ({ ...fe, [k]: "" }));
  };

  // Live blur validation
  const handleBlur = (field) => {
    const errs = { ...fieldErrors };
    switch (field) {
      case "fullName":  errs.fullName  = validateFullName(form.fullName)  || ""; break;
      case "dob":       errs.dob       = validateDob(form.dob)            || ""; break;
      case "aadhaar":   errs.aadhaar   = validateAadhaar(form.aadhaar)    || ""; break;
      case "mobile":    errs.mobile    = validateMobile(form.mobile)      || ""; break;
      case "email":     errs.email     = validateEmail(form.email)        || ""; break;
      case "password":  errs.password  = validatePassword(form.password)  || ""; break;
      case "confirmPassword":
        errs.confirmPassword = form.confirmPassword !== form.password
          ? "Passwords do not match." : "";
        break;
      default: break;
    }
    setFieldErrors(errs);
  };

  const handleProceed = async () => {
    setError("");
    const errors = {};

    const nameErr = validateFullName(form.fullName);
    if (nameErr) errors.fullName = nameErr;

    const dobErr = validateDob(form.dob);
    if (dobErr) errors.dob = dobErr;

    if (!form.gender) errors.gender = "Please select your gender.";
    if (!form.state)  errors.state  = "Please select your Domicile State.";

    const aadhaarErr = validateAadhaar(form.aadhaar);
    if (aadhaarErr) errors.aadhaar = aadhaarErr;

    const mobileErr = validateMobile(form.mobile);
    if (mobileErr) errors.mobile = mobileErr;

    const emailErr = validateEmail(form.email);
    if (emailErr) errors.email = emailErr;

    const passwordErr = validatePassword(form.password);
    if (passwordErr) errors.password = passwordErr;

    if (!form.confirmPassword) {
      errors.confirmPassword = "Please confirm your password.";
    } else if (form.password !== form.confirmPassword) {
      errors.confirmPassword = "Passwords do not match.";
    }

    if (captchaInput.replace(/\s/g,"").toUpperCase() !== captcha.replace(/\s/g,"").toUpperCase()) {
      errors.captcha = "Captcha does not match. Please try again.";
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      setError("Please fix the highlighted errors before proceeding.");
      return;
    }

    setFieldErrors({});

    const dupCheck = checkDuplicate(form.aadhaar, form.mobile, form.email);
    if (dupCheck.isDuplicate) {
      setDuplicateInfo({ field: dupCheck.field, existingAppId: dupCheck.existingAppId });
      return;
    }

    try {
      setError("Sending OTP...");
      // Generate email OTP for verification
      const otp = String(Math.floor(100000 + Math.random() * 900000));
      setEmailOtp(otp);
      setError("");
      alert(`📧 Email OTP Sent!\n\nOTP: ${otp}\n\nTo: ${form.email}\n\nPlease enter this 6-digit code to continue registration.`);
      setStep(2);
    } catch (error) {
      console.error("Error generating OTP:", error);
      setError("Failed to generate OTP. Please try again.");
    }
  };

  const handleVerify = () => {
    setError("");
    if (!form.otp) { setError("Please enter the OTP."); return; }
    if (form.otp.trim() !== emailOtp) {
      setError("Invalid OTP. Please check the code shown in the alert and try again.");
      return;
    }

    const userData = {
      appId, fullName: form.fullName, dob: form.dob, gender: form.gender,
      aadhaar: form.aadhaar, category: form.studentCategory, state: form.state,
      mobile: form.mobile, email: form.email, password: form.password,
      type: "Student - Fresh", scholarshipCategory: form.category,
      registeredAt: new Date().toLocaleDateString("en-IN"),
    };
    saveUser(userData);

    registerApplicant({ appId, aadhaar: form.aadhaar, mobile: form.mobile, email: form.email });

    localStorage.setItem("nsp_registered_name",  form.fullName);
    localStorage.setItem("nsp_registered_mobile", form.mobile);
    localStorage.setItem("nsp_registered_email",  form.email);
    localStorage.setItem("nsp_app_id",            appId);
    setError("");
    setStep(3);
  };

  const handleGoToDashboard = () => {
    const sessionUser = { name: form.fullName, id: appId, mobile: form.mobile, appId, type: "Student" };
    onLogin(sessionUser);
    navigate("/dashboard");
  };

  const fieldLabel = (field) => ({
    aadhaar: "Aadhaar number",
    mobile:  "mobile number (Aadhaar-linked)",
    email:   "email address",
  }[field] || field);

  const FErr = ({ field }) =>
    fieldErrors[field]
      ? <div style={{ fontSize: 11, color: "#dc2626", marginTop: 3, display: "flex", alignItems: "center", gap: 4 }}>
          <span>⚠</span> {fieldErrors[field]}
        </div>
      : null;

  const inputStyle = (field) => ({
    borderColor: fieldErrors[field] ? "#ef4444" : undefined,
    background: fieldErrors[field] ? "#fff5f5" : undefined,
  });

  const pwdScore = passwordStrength(form.password);

  return (
    <div className="page-wrapper" style={{ display: "flex", flexDirection: "column", minHeight: "100vh" }}>
      <Navbar />

      <div style={{ flex: 1, display: "flex", minHeight: "calc(100vh - 120px)" }}>

        {/* ════════════════ LEFT PANEL ════════════════ */}
        <div style={{
          flex: "0 0 42%",
          background: "linear-gradient(155deg, #0a1628 0%, #0d2461 40%, #1a3a8f 70%, #0f2d6e 100%)",
          position: "relative", overflowY: "auto", display: "flex",
          flexDirection: "column", color: "#fff",
        }}>
          <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, background: "linear-gradient(90deg, #FFB800, #FF8C00, #FFB800)", zIndex: 10 }} />
          <div style={{ position: "absolute", top: -80, right: -80, width: 300, height: 300, borderRadius: "50%", background: "rgba(255,200,50,0.07)", pointerEvents: "none" }} />
          <div style={{ position: "absolute", bottom: -100, left: -60, width: 340, height: 340, borderRadius: "50%", background: "rgba(100,160,255,0.08)", pointerEvents: "none" }} />
          <div style={{ position: "absolute", top: "40%", left: "55%", width: 160, height: 160, borderRadius: "50%", background: "rgba(255,180,0,0.05)", pointerEvents: "none" }} />
          <div style={{ position: "absolute", inset: 0, backgroundImage: "radial-gradient(circle, rgba(255,255,255,0.08) 1px, transparent 1px)", backgroundSize: "28px 28px", pointerEvents: "none" }} />

          <div style={{ position: "relative", zIndex: 1, padding: "44px 36px 36px", display: "flex", flexDirection: "column", gap: 0 }}>
            <div style={{ marginBottom: 20 }}>
              <div style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 48, height: 48, borderRadius: 13, background: "linear-gradient(135deg, #FFB800, #FF8C00)", fontSize: 22, marginBottom: 12, boxShadow: "0 6px 16px rgba(255,160,0,0.4)" }}>🎓</div>
              <h1 style={{ fontSize: 20, fontWeight: 800, margin: "0 0 6px", letterSpacing: "-0.3px", lineHeight: 1.25 }}>Unified Scholarship Platform</h1>
              <p style={{ fontSize: 12.5, color: "rgba(255,255,255,0.6)", margin: 0, lineHeight: 1.6 }}>Empowering India's students with direct, transparent, and secure scholarship access.</p>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 16 }}>
              {STATS.map((s) => (
                <div key={s.value} style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 10, padding: "9px 13px" }}>
                  <div style={{ fontSize: 17, fontWeight: 800, color: "#FFD24C", letterSpacing: "-0.3px" }}>{s.value}</div>
                  <div style={{ fontSize: 11, color: "rgba(255,255,255,0.55)", marginTop: 1 }}>{s.label}</div>
                </div>
              ))}
            </div>

            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", color: "rgba(255,255,255,0.4)", marginBottom: 8, textTransform: "uppercase" }}>What You Get</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 16 }}>
              {BENEFITS.map((b) => (
                <div key={b.title} style={{ display: "flex", alignItems: "flex-start", gap: 10, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.09)", borderRadius: 9, padding: "8px 11px" }}>
                  <span style={{ fontSize: 15, lineHeight: 1.2, flexShrink: 0 }}>{b.icon}</span>
                  <div>
                    <div style={{ fontSize: 12.5, fontWeight: 700, marginBottom: 1 }}>{b.title}</div>
                    <div style={{ fontSize: 11, color: "rgba(255,255,255,0.5)", lineHeight: 1.4 }}>{b.desc}</div>
                  </div>
                </div>
              ))}
            </div>

            <div style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 9, padding: "10px 13px", marginBottom: 16 }}>
              <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", color: "rgba(255,255,255,0.4)", marginBottom: 6, textTransform: "uppercase" }}>Password Requirements</div>
              {[
                "8–20 characters",
                "At least 1 uppercase letter (A–Z)",
                "At least 1 lowercase letter (a–z)",
                "At least 1 number (0–9)",
                "At least 1 special character (@, #, $, ! etc.)",
                "No spaces allowed",
              ].map(r => (
                <div key={r} style={{ fontSize: 11, color: "rgba(255,255,255,0.55)", display: "flex", alignItems: "center", gap: 6, marginBottom: 2 }}>
                  <span style={{ color: "#FFD24C" }}>›</span> {r}
                </div>
              ))}
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 9, background: "rgba(255,210,76,0.11)", border: "1px solid rgba(255,210,76,0.28)", borderRadius: 8, padding: "9px 13px" }}>
              <span style={{ fontSize: 16 }}>🇮🇳</span>
              <span style={{ fontSize: 11.5, color: "rgba(255,255,255,0.75)", lineHeight: 1.5 }}>
                A <strong style={{ color: "#FFD24C" }}>Government of India</strong> initiative — Ministry of Electronics & IT
              </span>
            </div>
          </div>
        </div>

        {/* ════════════════ RIGHT PANEL ════════════════ */}
        <div style={{
          flex: 1, background: "#EEF2FF", display: "flex",
          alignItems: "flex-start", justifyContent: "center",
          overflowY: "auto", padding: "32px 24px",
        }}>
          <div style={{ maxWidth: 540, width: "100%", margin: "0 auto" }}>
            <div className="auth-card">
              <div className="auth-header premium-auth-head">
                <div className="auth-logo">🎓</div>
                <h2>New Student Registration</h2>
                <p>Unified Scholarship Platform — Premium Auth Gateway</p>
              </div>
              <div className="auth-body">

                {/* ══ DUPLICATE / BLOCKED SCREEN ══ */}
                {duplicateInfo ? (
                  <div style={{ textAlign: "center" }}>
                    <div style={{
                      width: 72, height: 72,
                      background: "linear-gradient(135deg, #fee2e2, #fca5a5)",
                      borderRadius: "50%", display: "flex", alignItems: "center",
                      justifyContent: "center", fontSize: 32, margin: "0 auto 16px",
                      boxShadow: "0 4px 16px rgba(220,38,38,0.2)",
                    }}>🚫</div>

                    <h3 style={{ color: "#991b1b", fontWeight: 800, fontSize: 18, marginBottom: 8 }}>
                      Duplicate Application Detected
                    </h3>

                    <div style={{
                      background: "#fff5f5", border: "1.5px solid #fca5a5", borderRadius: 10,
                      padding: "14px 16px", marginBottom: 16, textAlign: "left",
                      fontSize: 13, lineHeight: 1.8, color: "#7f1d1d",
                    }}>
                      <p style={{ margin: "0 0 8px" }}>
                        ⚠️ Our records show that a student with this{" "}
                        <strong>{fieldLabel(duplicateInfo.field)}</strong> is already
                        registered on the National Scholarship Portal.
                      </p>
                      <p style={{ margin: "0 0 8px" }}>
                        🪪 <strong>Existing Application ID:</strong>{" "}
                        <span style={{ fontFamily: "monospace", color: "#003580", fontWeight: 700 }}>
                          {duplicateInfo.existingAppId}
                        </span>
                      </p>
                      <p style={{ margin: 0, fontSize: 12, color: "#9a3412" }}>
                        Submitting multiple applications for the same scholarship
                        constitutes fraud under Section 420 IPC and may lead to
                        permanent disqualification from all government scholarship schemes.
                      </p>
                    </div>

                    <div style={{
                      background: "#f0fdf4", border: "1px solid #86efac", borderRadius: 10,
                      padding: "12px 16px", marginBottom: 20, textAlign: "left",
                      fontSize: 12.5, color: "#14532d", lineHeight: 1.8,
                    }}>
                      <strong>What should you do?</strong>
                      <ul style={{ margin: "6px 0 0 16px", padding: 0 }}>
                        <li>Login with your existing Application ID and password.</li>
                        <li>If you forgot your credentials, use <strong>Forgot Password</strong> on the login page.</li>
                        <li>For genuine errors (wrong Aadhaar entered earlier), contact the NSP Helpdesk: <strong>0120-6619540</strong>.</li>
                      </ul>
                    </div>

                    <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
                      <Link to="/login">
                        <button className="btn-gov premium-btn" style={{ fontSize: 13, padding: "10px 22px" }}>
                          🔐 Login with Existing ID
                        </button>
                      </Link>
                    </div>

                    <div style={{ marginTop: 14, fontSize: 11.5, color: "#6b7280" }}>
                      NSP Helpdesk: <strong>0120-6619540</strong> | helpdesk@nsp.gov.in
                    </div>
                  </div>
                ) : (
                  <>
                    {/* Step indicator */}
                    <div className="register-steps">
                      {["Basic Info", "Verify OTP", "Complete"].map((label, i) => (
                        <div key={i} className={`reg-step ${step === i+1 ? "active" : step > i+1 ? "done" : ""}`}>
                          <div className="reg-step-num">{step > i+1 ? "✓" : i+1}</div>
                          <span>{label}</span>
                        </div>
                      ))}
                    </div>

                    <div className="alert alert-info">
                      ℹ️ Registration is free. Keep your Aadhaar card, bank passbook and mark sheets ready.
                    </div>

                    {error && <div className="alert alert-error">❌ {error}</div>}

                    {/* ══ STEP 1 ══ */}
                    {step === 1 && (
                      <>
                        <div className="form-group">
                          <label>Scholarship Category</label>
                          <select value={form.category} onChange={e => set("category", e.target.value)}>
                            <option>Pre-Matric (Class 1-8)</option>
                            <option>Pre-Matric (Class 9-10)</option>
                            <option>Post-Matric</option>
                            <option>Top Class Education</option>
                          </select>
                        </div>

                        <div className="form-group">
                          <label>Full Name (as per Aadhaar) *</label>
                          <input
                            type="text"
                            placeholder="E.g. Rahul Kumar Sharma"
                            value={form.fullName}
                            onChange={e => set("fullName", e.target.value)}
                            onBlur={() => handleBlur("fullName")}
                            style={inputStyle("fullName")}
                          />
                          <FErr field="fullName" />
                          <div style={{ fontSize: 10.5, color: "#718096", marginTop: 2 }}>
                            Enter full name exactly as on your Aadhaar card (first + last name required)
                          </div>
                        </div>

                        <div className="reg-row-2">
                          <div className="form-group">
                            <label>Date of Birth *</label>
                            <input
                              type="date"
                              value={form.dob}
                              max={new Date(new Date().setFullYear(new Date().getFullYear() - 5)).toISOString().split("T")[0]}
                              min={new Date(new Date().setFullYear(new Date().getFullYear() - 35)).toISOString().split("T")[0]}
                              onChange={e => set("dob", e.target.value)}
                              onBlur={() => handleBlur("dob")}
                              style={inputStyle("dob")}
                            />
                            <FErr field="dob" />
                            <div style={{ fontSize: 10.5, color: "#718096", marginTop: 2 }}>Age must be between 5 and 35 years</div>
                          </div>
                          <div className="form-group">
                            <label>Gender *</label>
                            <select
                              value={form.gender}
                              onChange={e => set("gender", e.target.value)}
                              style={inputStyle("gender")}
                            >
                              <option value="">-- Select --</option>
                              <option>Male</option><option>Female</option><option>Transgender</option>
                            </select>
                            <FErr field="gender" />
                          </div>
                        </div>

                        <div className="reg-row-2">
                          <div className="form-group">
                            <label>Aadhaar Number</label>
                            <input
                              type="text"
                              placeholder="12-digit Aadhaar"
                              maxLength={12}
                              value={form.aadhaar}
                              onChange={e => set("aadhaar", e.target.value.replace(/\D/g, ""))}
                              onBlur={() => handleBlur("aadhaar")}
                              style={inputStyle("aadhaar")}
                            />
                            <FErr field="aadhaar" />
                            <div style={{ fontSize: 10.5, color: "#718096", marginTop: 2 }}>
                              Enter all 12 digits without spaces
                            </div>
                          </div>
                          <div className="form-group">
                            <label>Category</label>
                            <select value={form.studentCategory} onChange={e => set("studentCategory", e.target.value)}>
                              <option value="">-- Select --</option>
                              <option>General</option><option>OBC</option><option>SC</option><option>ST</option><option>Minority</option>
                            </select>
                          </div>
                        </div>

                        <div className="form-group">
                          <label>Domicile State / UT *</label>
                          <select
                            value={form.state}
                            onChange={e => set("state", e.target.value)}
                            style={inputStyle("state")}
                          >
                            <option value="">-- Select State --</option>
                            {STATES.map(s => <option key={s}>{s}</option>)}
                          </select>
                          <FErr field="state" />
                        </div>

                        <div className="reg-row-2">
                          <div className="form-group">
                            <label>Mobile No. (Linked to Aadhaar) *</label>
                            <input
                              type="tel"
                              placeholder="10-digit mobile (starts 6–9)"
                              maxLength={10}
                              value={form.mobile}
                              onChange={e => set("mobile", e.target.value.replace(/\D/g, ""))}
                              onBlur={() => handleBlur("mobile")}
                              style={inputStyle("mobile")}
                            />
                            <FErr field="mobile" />
                          </div>
                          <div className="form-group">
                            <label>Email ID *</label>
                            <input
                              type="email"
                              placeholder="yourname@example.com"
                              value={form.email}
                              onChange={e => set("email", e.target.value)}
                              onBlur={() => handleBlur("email")}
                              style={inputStyle("email")}
                            />
                            <FErr field="email" />
                          </div>
                        </div>

                        <div className="reg-row-2">
                          <div className="form-group">
                            <label>Create Password *</label>
                            <div className="password-input-wrap">
                              <input
                                type={showPwd ? "text" : "password"}
                                placeholder="Min 8 chars"
                                value={form.password}
                                onChange={e => set("password", e.target.value)}
                                onBlur={() => handleBlur("password")}
                                style={inputStyle("password")}
                              />
                              <button type="button" className="password-toggle" onClick={() => setShowPwd(p => !p)}>
                                {showPwd ? "🙈" : "👁️"}
                              </button>
                            </div>
                            {form.password && (
                              <div style={{ marginTop: 5 }}>
                                <div style={{ display: "flex", gap: 3 }}>
                                  {[1,2,3,4].map(i => (
                                    <div key={i} style={{
                                      flex: 1, height: 4, borderRadius: 2,
                                      background: i <= pwdScore ? strengthColor[pwdScore] : "#e2e8f0",
                                      transition: "background 0.2s",
                                    }} />
                                  ))}
                                </div>
                                <div style={{ fontSize: 10.5, color: strengthColor[pwdScore], marginTop: 2, fontWeight: 600 }}>
                                  {strengthLabel[pwdScore]}
                                </div>
                              </div>
                            )}
                            <FErr field="password" />
                            <div style={{ fontSize: 10.5, color: "#718096", marginTop: 2 }}>
                              Must include uppercase, lowercase, number & special char
                            </div>
                          </div>
                          <div className="form-group">
                            <label>Confirm Password *</label>
                            <div className="password-input-wrap">
                              <input
                                type={showConfirm ? "text" : "password"}
                                placeholder="Re-enter password"
                                value={form.confirmPassword}
                                onChange={e => set("confirmPassword", e.target.value)}
                                onBlur={() => handleBlur("confirmPassword")}
                                style={inputStyle("confirmPassword")}
                              />
                              <button type="button" className="password-toggle" onClick={() => setShowConfirm(p => !p)}>
                                {showConfirm ? "🙈" : "👁️"}
                              </button>
                            </div>
                            {form.confirmPassword && form.password === form.confirmPassword && (
                              <div style={{ fontSize: 11, color: "#16a34a", marginTop: 3 }}>✓ Passwords match</div>
                            )}
                            <FErr field="confirmPassword" />
                          </div>
                        </div>

                        <div className="form-group">
                          <label>Enter Captcha *</label>
                          <div className="captcha-row">
                            <div className="captcha-box">{captcha}</div>
                            <input
                              type="text"
                              placeholder="Type captcha here"
                              value={captchaInput}
                              onChange={e => { setCaptchaInput(e.target.value); setFieldErrors(fe => ({ ...fe, captcha: "" })); }}
                              maxLength={6}
                              style={inputStyle("captcha")}
                            />
                          </div>
                          <FErr field="captcha" />
                        </div>

                        <button className="btn-gov premium-btn" onClick={handleProceed}>
                          Securely Proceed to OTP →
                        </button>
                      </>
                    )}

                    {/* ══ STEP 2 ══ */}
                    {step === 2 && (
                      <div className="otp-secure-box">
                        <div className="otp-lock-icon">🔐</div>
                        <h3 style={{ color: "#1e1b4b", marginBottom: 12 }}>Multi-Factor Authentication</h3>
                        <div className="alert alert-success" style={{ textAlign: "left" }}>
                          ✅ One Time Password sent to Email: <strong>{form.email}</strong>
                        </div>
                        <div className="form-group" style={{ textAlign: "left" }}>
                          <label style={{ fontWeight: 600 }}>Enter 6-digit Secure OTP *</label>
                          <div className="otp-input-row">
                            <input
                              type="text"
                              placeholder="● ● ● ● ● ●"
                              maxLength={6}
                              value={form.otp}
                              onChange={e => set("otp", e.target.value.replace(/\D/g, ""))}
                              className="otp-input auth-input-focus"
                              autoFocus
                            />
                            <div className="otp-hint" style={{ background: "#f0fdf4", borderColor: "#bbf7d0", color: "#166534" }}>
                              📧 OTP shown in the browser alert — enter it below
                            </div>
                          </div>
                        </div>
                        <button className="btn-gov premium-btn" style={{ marginTop: "16px" }} onClick={handleVerify}>
                          Authenticate & Complete Registration →
                        </button>
                        <div style={{ textAlign: "center", marginTop: 16, fontSize: 12 }}>
                          Didn't get OTP?{" "}
                          <button 
                            style={{ color: "#4338ca", fontWeight: 600, background: "none", border: "none", cursor: "pointer", textDecoration: "underline" }} 
                            onClick={handleProceed}
                            disabled={!otpSent}
                          >
                            Resend OTP
                          </button>
                        </div>
                      </div>
                    )}

                    {/* ══ STEP 3 ══ */}
                    {step === 3 && (
                      <>
                        <div className="alert alert-success">
                          🎉 <strong>Registration Successful!</strong><br />
                          Welcome, <strong>{form.fullName}</strong>!
                        </div>
                        <div style={{ background: "#F8FAFF", border: "1px solid #b3d4ff", borderRadius: 8, padding: "16px 20px", marginBottom: 16 }}>
                          <div style={{ fontSize: 13, lineHeight: 2 }}>
                            <div>🪪 <strong>Application ID:</strong> <span style={{ color: "#003580", fontWeight: 700, fontFamily: "monospace" }}>{appId}</span></div>
                            <div>📱 <strong>Mobile:</strong> +91 {form.mobile}</div>
                            <div>📧 <strong>Email:</strong> {form.email}</div>
                            <div>🔐 <strong>Password:</strong> Use the password you just created</div>
                          </div>
                          <div style={{ marginTop: 12, padding: "10px 12px", background: "#FFF8E1", border: "1px solid #f0d060", borderRadius: 6, fontSize: 12, color: "#6a4500" }}>
                            ⚠️ <strong>Save your Application ID!</strong> You need it to login. Write it down or take a screenshot.
                          </div>
                        </div>
                        <button className="btn-gov premium-btn" onClick={handleGoToDashboard}>
                          Go to Dashboard →
                        </button>
                      </>
                    )}

                    <div style={{ textAlign: "center", marginTop: 12 }}>
                      <Link to="/login" style={{ fontSize: 12, color: "#003580" }}>Already registered? Login here</Link>
                    </div>
                  </>
                )}

              </div>
            </div>
          </div>
        </div>
      </div>

      <Footer />
      {/* reCAPTCHA container */}
      <div id="recaptcha-container"></div>
    </div>
  );
}