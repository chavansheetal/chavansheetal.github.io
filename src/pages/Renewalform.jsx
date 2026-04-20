import { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import Navbar from "./Navbar";
import StudentSidebar from "./StudentSidebar";
import { getApplicationsByUser, getApplications, getUserByAppId, saveRenewal } from "../store";
import { SCHOLARSHIP_RULES } from "./ApplicationForm";
import "../styles/Dashboard.css";
import "../styles/ApplicationForm.css";

const RENEWAL_STEPS = ["Login & Verify", "Academics", "Documents", "Verify & Submit", "Done"];

const GRADING_OPTIONS = ["Percentage (%)", "CGPA (out of 10)", "CGPA (out of 4)", "Grade (A, B, C…)"];

export default function RenewalForm({ user, onLogout }) {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [existingApp, setExistingApp] = useState(null);
  const [errors, setErrors] = useState({});
  const [toast, setToast] = useState("");
  const [submitted, setSubmitted] = useState(false);

  // Step 1 – verify identity
  const [verified, setVerified] = useState(false);
  const [loginAppId, setLoginAppId] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginError, setLoginError] = useState("");

  // Step 2 – academic details (pre-filled, editable)
  const [academic, setAcademic] = useState({
    instituteName: "",
    course: "",
    specialisation: "",
    year: "",
    marks: "",
    gradingSystem: "",
    boardUniv: "",
    courseDuration: "",
    academicYear: "",
    studentType: "college",
    // school fields
    schoolClass: "",
    stream: "",
    lastExamClass: "",
    schoolState: "",
    schoolAcademicYear: "",
    board: "",
    promotedToYear: "",
    lastYearMarks: "",
  });

  // Step 3 – bank (editable)
  const [bank, setBank] = useState({
    accountHolder: "",
    bankName: "",
    accountNo: "",
    ifsc: "",
  });

  // Step 3 – documents
  const [files, setFiles] = useState({});

  // Step 4 – declaration
  const [declaration, setDeclaration] = useState(false);
  const [remarks, setRemarks] = useState("");

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(""), 3500);
  };

  // Auto-fill from existing application when user prop available
  useEffect(() => {
    if (user) {
      const apps = getApplicationsByUser(user);
      if (apps && apps.length > 0) {
        const app = apps[0];
        setExistingApp(app);
        prefillFromApp(app);
        setVerified(true); // already logged in via main portal
      }
    }
  }, [user]);

  const prefillFromApp = (app) => {
    const ad = app.academicDetails || {};
    const bd = app.bankDetails || {};
    const st = ad.studentType === "School" ? "school" : "college";

    setAcademic({
      studentType: st,
      instituteName: ad.instituteName || "",
      course: ad.course || "",
      specialisation: ad.specialisation || "",
      year: ad.year || "",
      marks: "",  // intentionally blank — student must enter latest marks
      gradingSystem: ad.gradingSystem || "",
      boardUniv: ad.boardUniv || ad.board || "",
      courseDuration: ad.courseDuration || "",
      academicYear: "",  // new academic year
      schoolClass: ad.schoolClass || "",
      stream: ad.stream || "",
      lastExamClass: ad.lastExamClass || "",
      schoolState: ad.state || ad.schoolState || "",
      schoolAcademicYear: "",
      board: ad.board || ad.boardUniv || "",
      promotedToYear: "",
      lastYearMarks: ad.marks || "",  // pre-fill with previous marks for reference
    });

    setBank({
      accountHolder: bd.accountHolder || "",
      bankName: bd.bankName || "",
      accountNo: bd.accountNo || "",
      ifsc: bd.ifsc || "",
    });
  };

  // Login & verify for renewal (if coming from renewal login page directly)
  const handleRenewalLogin = () => {
    setLoginError("");

    if (!loginAppId || !loginPassword) {
      setLoginError("Please enter both Application ID and Password.");
      return;
    }

    const matchedUser = getUserByAppId(loginAppId.trim());
    if (!matchedUser) {
      setLoginError("No account found with this Application ID.");
      return;
    }

    if (matchedUser.password !== loginPassword) {
      setLoginError("Incorrect password. Please try again.");
      return;
    }

    // Since we verified the user, fetch their applications
    const apps = getApplications();
    const match = apps.find(a =>
      a.appId?.toUpperCase() === loginAppId.trim().toUpperCase() ||
      a.userId?.toUpperCase() === loginAppId.trim().toUpperCase()
    );

    if (!match) {
      setLoginError("Account verified, but no previous application was found to renew.");
      return;
    }
    setExistingApp(match);
    prefillFromApp(match);
    setVerified(true);
    setStep(1);
  };

  const setAcad = (k, v) => {
    setAcademic(prev => ({ ...prev, [k]: v }));
    if (errors[k]) setErrors(p => ({ ...p, [k]: false }));
  };
  const setB = (k, v) => setBank(prev => ({ ...prev, [k]: v }));

  const playErrorSound = () => {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain); gain.connect(ctx.destination);
      osc.type = "sine"; osc.frequency.setValueAtTime(880, ctx.currentTime);
      gain.gain.setValueAtTime(0.5, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);
      osc.start(ctx.currentTime); osc.stop(ctx.currentTime + 0.5);
    } catch (e) { }
  };

  const filesRef = useRef({});
  useEffect(() => { filesRef.current = files; }, [files]);

  const handleFileUpload = async (e, docName) => {
    const file = e.target.files[0];
    if (!file) return;

    // Force pull from Ref to absolutely prevent state staleness across concurrent updates
    const currentFiles = filesRef.current;

    // Check across all other deployed doc inputs to prevent cross-duplicate uploads
    const isDuplicate = Object.keys(currentFiles).some(key => {
      if (key === docName) return false; // Allowed to overwrite itself
      const existingDoc = currentFiles[key];
      if (!existingDoc || !existingDoc.name) return false;
      const cleanName = (n) => n.replace(/\s+/g, "").toLowerCase();
      return cleanName(existingDoc.name) === cleanName(file.name);
    });

    if (isDuplicate) {
      playErrorSound();
      alert(`🔔 AI Duplicate Detection: The document "${file.name}" has already been uploaded for another category.`);
      e.target.value = "";
      return;
    }

    const fileUrl = URL.createObjectURL(file);
    if (file.type.startsWith("image/")) {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        let { width, height } = img;
        const MAX = 600;
        if (width > height && width > MAX) { height *= MAX / width; width = MAX; }
        else if (height > MAX) { width *= MAX / height; height = MAX; }
        canvas.width = width; canvas.height = height;
        canvas.getContext("2d").drawImage(img, 0, 0, width, height);
        const compressed = canvas.toDataURL("image/jpeg", 0.6);
        setFiles(prev => ({ ...prev, [docName]: { ...prev[docName], base64: compressed } }));
      };
      img.src = fileUrl;
    } else {
      const reader = new FileReader();
      reader.onload = (ev) => setFiles(prev => ({ ...prev, [docName]: { ...prev[docName], base64: ev.target.result } }));
      reader.readAsDataURL(file);
    }
    setFiles(prev => ({ ...prev, [docName]: { name: file.name, status: "scanning", url: fileUrl } }));

    // Mock verification delay since API Setu was removed
    setTimeout(() => {
      setFiles(prev => {
        if (prev[docName]?.name === file.name) {
          return { ...prev, [docName]: { ...prev[docName], status: "verified", confidence: 98 } };
        }
        return prev;
      });
    }, 1500);
  };

  const validate = () => {
    let newErrors = {};
    let msg = "";

    if (step === 1) {
      const isCollege = academic.studentType === "college";
      if (!academic.instituteName || academic.instituteName.length < 2) { newErrors.instituteName = true; }
      if (isCollege) {
        if (!academic.course || academic.course.length < 2) newErrors.course = true;
        if (!academic.year) newErrors.year = true;
        if (!academic.boardUniv || academic.boardUniv.length < 2) newErrors.boardUniv = true;
        if (!academic.courseDuration) newErrors.courseDuration = true;
        if (!academic.academicYear || academic.academicYear.length < 4) newErrors.academicYear = true;
        if (!academic.gradingSystem) newErrors.gradingSystem = true;
        if (!academic.promotedToYear) newErrors.promotedToYear = true;
      } else {
        if (!academic.schoolClass) newErrors.schoolClass = true;
        if (!academic.boardUniv) newErrors.boardUniv = true;
        if (!academic.schoolState || academic.schoolState.length < 2) newErrors.schoolState = true;
        if (!academic.lastExamClass) newErrors.lastExamClass = true;
        if (!academic.gradingSystem) newErrors.gradingSystem = true;
        if (!academic.schoolAcademicYear || academic.schoolAcademicYear.length < 4) newErrors.schoolAcademicYear = true;
      }
      const marksVal = parseFloat(academic.marks);

      let rule = null;
      if (existingApp && existingApp.scheme) {
        const schemeLower = existingApp.scheme.toLowerCase().trim();
        rule = SCHOLARSHIP_RULES.find(r =>
          r.name.toLowerCase().includes(schemeLower) ||
          schemeLower.includes(r.name.split(" — ")[0].toLowerCase().trim())
        );
      }
      const minimumMarks = rule ? rule.minMarks : 40; // Fallback to lowest possible minimum (40) if string match fails

      if (!academic.marks || isNaN(marksVal) || marksVal < 0 || marksVal > 100) {
        newErrors.marks = true;
      } else if (marksVal < minimumMarks) {
        newErrors.marks = true;
        msg = `A failure to meet the minimum academic criteria, which may result in a reduction or cancellation of the financial aid. Your scholarship has been cancelled due to failure to meet the minimum academic requirements`;
      }

      if (Object.keys(newErrors).length > 0 && !msg) msg = "Please fill all required academic fields correctly.";
    }

    if (step === 2) {
      const requiredRenewalDocs = ["Current Year Fee Receipt", "Previous Year Mark Sheet"];
      for (let doc of requiredRenewalDocs) {
        if (!files[doc] || files[doc].status !== "verified") {
          newErrors.files = true;
          msg = `Mandatory document missing or still scanning: "${doc}". Please upload and wait for verification.`;
          break;
        }
      }
    }

    if (step === 3) {
      if (!declaration) {
        msg = "You must accept the declaration before submitting.";
        newErrors.declaration = true;
      }
    }

    setErrors(newErrors);
    return msg;
  };

  const handleNext = () => {
    if (step === 0 && !verified) {
      handleRenewalLogin();
      return;
    }
    const errMsg = validate();
    if (errMsg) { alert(errMsg); return; }
    if (step < RENEWAL_STEPS.length - 2) {
      setStep(s => s + 1);
    } else {
      handleSubmit();
    }
  };

  const handleSubmit = () => {
    if (!declaration) { alert("Please accept the declaration."); return; }
    if (!existingApp) { alert("No application found."); return; }

    const isCollege = academic.studentType === "college";
    const renewalAcademicYear = isCollege ? academic.academicYear : academic.schoolAcademicYear;

    const academicPayload = isCollege
      ? {
        studentType: "College",
        instituteName: academic.instituteName,
        course: academic.course,
        specialisation: academic.specialisation,
        year: academic.promotedToYear || academic.year,
        marks: academic.marks,
        gradingSystem: academic.gradingSystem,
        boardUniv: academic.boardUniv,
        courseDuration: academic.courseDuration,
        academicYear: academic.academicYear,
      }
      : {
        studentType: "School",
        instituteName: academic.instituteName,
        schoolClass: academic.schoolClass,
        stream: academic.stream,
        board: academic.boardUniv,
        state: academic.schoolState,
        lastExamClass: academic.lastExamClass,
        marks: academic.marks,
        gradingSystem: academic.gradingSystem,
        academicYear: academic.schoolAcademicYear,
      };

    const success = saveRenewal(existingApp.appId, {
      academicDetails: academicPayload,
      bankDetails: bank,
      files: Object.fromEntries(
        Object.entries(files).map(([k, v]) => [k, { name: v.name, base64: v.base64 }])
      ),
      renewalAcademicYear,
      promotedToYear: academic.promotedToYear,
      lastYearMarks: academic.lastYearMarks,
      remarks,
    });

    if (success) {
      setSubmitted(true);
      setStep(4);
    } else {
      alert("Failed to save renewal. Please try again.");
    }
  };

  const errorStyle = (key) => ({
    borderColor: errors[key] ? "#d93025" : "",
    backgroundColor: errors[key] ? "#fff4f4" : "",
  });

  // ── Render ──
  return (
    <div className="page-wrapper">
      <Navbar user={user} onLogout={onLogout} />
      <div className="dashboard-layout">
        <StudentSidebar user={user} onLogout={() => { onLogout(); navigate("/"); }} />
        <main className="dashboard-main">

          {toast && (
            <div style={{
              position: "fixed", top: 20, right: 20, zIndex: 9999,
              background: "#1b5e20", color: "#fff", padding: "12px 22px",
              borderRadius: 8, fontWeight: 600, fontSize: 14,
              boxShadow: "0 4px 16px rgba(0,0,0,0.2)",
            }}>{toast}</div>
          )}

          <div className="appform-header">
            <h2>🔄 Scholarship Renewal Form</h2>
            <p>Academic Year 2025-26 | Renewal Application</p>
          </div>

          {/* Steps */}
          <div className="appform-steps">
            {RENEWAL_STEPS.map((s, i) => (
              <div key={i} className={`appform-step ${i === step ? "active" : i < step ? "done" : ""}`}>
                <div className="appform-step-num">{i < step ? "✓" : i + 1}</div>
                <span>{s}</span>
              </div>
            ))}
          </div>

          <div className="appform-card">

            {/* ══ STEP 0 — Login & Verify ══ */}
            {step === 0 && (
              <div className="appform-section">
                <h3>🔐 Verify Your Identity</h3>

                {/* If already logged in via main portal, show existing app info */}
                {verified && existingApp ? (
                  <div style={{
                    background: "#E8F5E9", border: "1px solid #81c784", borderRadius: 10,
                    padding: "20px 24px", marginBottom: 20,
                  }}>
                    <div style={{ fontSize: 15, fontWeight: 700, color: "#1b5e20", marginBottom: 12 }}>
                      ✅ Application Verified Successfully
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px 24px", fontSize: 13 }}>
                      {[
                        ["Application ID", existingApp.appId],
                        ["Student Name", existingApp.studentName],
                        ["Scheme", existingApp.scheme],
                        ["Current Status", existingApp.status],
                        ["Applied On", existingApp.appliedOn],
                        ["Renewal Count", existingApp.renewalHistory?.length > 0 ? `${existingApp.renewalHistory.length} previous renewal(s)` : "First renewal"],
                      ].map(([label, val]) => (
                        <div key={label}>
                          <span style={{ color: "#4a5568", fontSize: 11, fontWeight: 600 }}>{label}</span>
                          <div style={{ color: "#1a202c", fontWeight: 500 }}>{val || "—"}</div>
                        </div>
                      ))}
                    </div>
                    <div style={{ marginTop: 14, padding: "10px 14px", background: "#FFF8E1", border: "1px solid #f0d060", borderRadius: 6, fontSize: 13, color: "#6a4500" }}>
                      ⚠️ <strong>Renewal Checklist:</strong> You'll need to confirm promotion to next year/semester, enter latest marks, upload current fee receipt and mark sheet.
                    </div>
                  </div>
                ) : (
                  <div>
                    <p style={{ fontSize: 13, color: "#4a5568", marginBottom: 16 }}>
                      To renew your scholarship, please verify with your Application ID and password you created during registration.
                    </p>
                    <div style={{ background: "#EFF6FF", border: "1px solid #93c5fd", borderRadius: 8, padding: "14px 18px", marginBottom: 18 }}>
                      <div style={{ fontSize: 13, color: "#1d4ed8", fontWeight: 600, marginBottom: 4 }}>ℹ️ Login with Previous Credentials</div>
                      <div style={{ fontSize: 12, color: "#3b82f6" }}>Your Application ID was provided upon successful registration.</div>
                    </div>
                    <div className="form-group">
                      <label>Application ID *</label>
                      <input
                        type="text"
                        placeholder="E.g. NSP/2025/KA/72582"
                        value={loginAppId}
                        onChange={e => setLoginAppId(e.target.value)}
                        style={{ borderColor: loginError ? "#d93025" : "" }}
                      />
                    </div>
                    <div className="form-group">
                      <label>Password *</label>
                      <input
                        type="password"
                        placeholder="Enter your password"
                        value={loginPassword}
                        onChange={e => setLoginPassword(e.target.value)}
                      />
                    </div>
                    {loginError && (
                      <div style={{ color: "#C0392B", fontSize: 13, marginTop: -8, marginBottom: 10 }}>
                        ❌ {loginError}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* ══ STEP 1 — Academic Info ══ */}
            {step === 1 && (
              <div className="appform-section">
                <h3>🎓 Academic Information — Renewal</h3>

                <div style={{
                  background: "#EFF6FF", border: "1px solid #93c5fd",
                  borderRadius: 8, padding: "12px 16px", marginBottom: 20, fontSize: 13,
                }}>
                  <strong style={{ color: "#1d4ed8" }}>ℹ️ Pre-filled from your previous application.</strong>
                  <span style={{ color: "#374151" }}> Update the fields that have changed for this academic year.</span>
                </div>

                {/* Previous marks reference */}
                {academic.lastYearMarks && (
                  <div style={{
                    background: "#F5F3FF", border: "1px solid #c4b5fd",
                    borderRadius: 8, padding: "10px 16px", marginBottom: 16, fontSize: 13,
                    color: "#4c1d95",
                  }}>
                    📊 <strong>Previous Year Marks on Record:</strong> {academic.lastYearMarks}%
                  </div>
                )}

                <div className="form-group">
                  <label>{academic.studentType === "school" ? "School Name" : "Institution Name"}</label>
                  <input
                    style={{ background: "#f3f4f6", color: "#6b7280", cursor: "not-allowed" }}
                    type="text"
                    value={academic.instituteName}
                    readOnly
                  />
                </div>

                {academic.studentType === "college" ? (
                  <>
                    <div className="form-row-2">
                      <div className="form-group">
                        <label>Course / Programme</label>
                        <input style={{ background: "#f3f4f6", color: "#6b7280", cursor: "not-allowed" }} type="text" value={academic.course} readOnly />
                      </div>
                      <div className="form-group">
                        <label>Specialisation / Branch</label>
                        <input style={{ background: "#f3f4f6", color: "#6b7280", cursor: "not-allowed" }} type="text" value={academic.specialisation} readOnly />
                      </div>
                    </div>

                    <div className="form-row-2">
                      <div className="form-group">
                        <label>Previous Year of Study</label>
                        <input type="text" value={academic.year} readOnly
                          style={{ background: "#f3f4f6", color: "#6b7280", cursor: "not-allowed" }} />
                      </div>
                      <div className="form-group">
                        <label>Promoted to Year (Current) *</label>
                        <select style={errorStyle("promotedToYear")} value={academic.promotedToYear} onChange={e => setAcad("promotedToYear", e.target.value)}>
                          <option value="">-- Select --</option>
                          <option>1st Year</option><option>2nd Year</option>
                          <option>3rd Year</option><option>4th Year</option><option>5th Year</option>
                        </select>
                      </div>
                    </div>

                    <div className="form-row-2">
                      <div className="form-group">
                        <label>University / Board</label>
                        <input style={{ background: "#f3f4f6", color: "#6b7280", cursor: "not-allowed" }} type="text" value={academic.boardUniv} readOnly />
                      </div>
                      <div className="form-group">
                        <label>Course Duration</label>
                        <input style={{ background: "#f3f4f6", color: "#6b7280", cursor: "not-allowed" }} type="text" value={academic.courseDuration} readOnly />
                      </div>
                    </div>

                    <div className="form-row-2">
                      <div className="form-group">
                        <label>Current Academic Year *</label>
                        <input style={errorStyle("academicYear")} type="text" placeholder="E.g. 2025-26" value={academic.academicYear} onChange={e => setAcad("academicYear", e.target.value)} />
                      </div>
                      <div className="form-group">
                        <label>Grading System *</label>
                        <select style={errorStyle("gradingSystem")} value={academic.gradingSystem} onChange={e => setAcad("gradingSystem", e.target.value)}>
                          <option value="">-- Select --</option>
                          {GRADING_OPTIONS.map(o => <option key={o}>{o}</option>)}
                        </select>
                      </div>
                    </div>

                    <div style={{ fontSize: 13, fontWeight: 600, color: "#6b7280", margin: "20px 0 12px", paddingBottom: 6, borderBottom: "1px solid #e5e7eb" }}>
                      Last exam performance
                    </div>
                    <div className="form-row-2">
                      <div className="form-group">
                        <label>Marks / CGPA in Last Year Exam *</label>
                        <input style={errorStyle("marks")} type="number" placeholder="Enter your last marks %" value={academic.marks} onChange={e => setAcad("marks", e.target.value)} />
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="form-row-2">
                      <div className="form-group">
                        <label>Current Class / Grade *</label>
                        <select style={errorStyle("schoolClass")} value={academic.schoolClass} onChange={e => setAcad("schoolClass", e.target.value)}>
                          <option value="">-- Select --</option>
                          {["Class 1", "Class 2", "Class 3", "Class 4", "Class 5", "Class 6", "Class 7", "Class 8", "Class 9", "Class 10", "Class 11", "Class 12"].map(c => <option key={c}>{c}</option>)}
                        </select>
                      </div>
                      <div className="form-group">
                        <label>Stream <span style={{ color: "#6b7280", fontWeight: 400 }}>(Class 11 & 12 only)</span></label>
                        <select value={academic.stream} onChange={e => setAcad("stream", e.target.value)}>
                          <option value="">-- Select --</option>
                          <option>Science (PCM)</option><option>Science (PCB)</option>
                          <option>Commerce</option><option>Arts / Humanities</option><option>Not applicable</option>
                        </select>
                      </div>
                    </div>

                    <div className="form-row-2">
                      <div className="form-group">
                        <label>Board</label>
                        <input style={{ background: "#f3f4f6", color: "#6b7280", cursor: "not-allowed" }} type="text" value={academic.boardUniv} readOnly />
                      </div>
                      <div className="form-group">
                        <label>State / UT</label>
                        <input style={{ background: "#f3f4f6", color: "#6b7280", cursor: "not-allowed" }} type="text" value={academic.schoolState} readOnly />
                      </div>
                    </div>

                    <div className="form-row-2">
                      <div className="form-group">
                        <label>Last Exam Class *</label>
                        <select style={errorStyle("lastExamClass")} value={academic.lastExamClass} onChange={e => setAcad("lastExamClass", e.target.value)}>
                          <option value="">-- Select --</option>
                          {["Kindergarten / Pre-School (KG/LKG/UKG)", "Class 1", "Class 2", "Class 3", "Class 4", "Class 5", "Class 6", "Class 7", "Class 8", "Class 9", "Class 10", "Class 11"].map(c => <option key={c}>{c}</option>)}
                        </select>
                      </div>
                      <div className="form-group">
                        <label>Marks / CGPA *</label>
                        <input style={errorStyle("marks")} type="number" placeholder="E.g. 85.5" value={academic.marks} onChange={e => setAcad("marks", e.target.value)} />
                      </div>
                    </div>

                    <div className="form-row-2">
                      <div className="form-group">
                        <label>Grading System *</label>
                        <select style={errorStyle("gradingSystem")} value={academic.gradingSystem} onChange={e => setAcad("gradingSystem", e.target.value)}>
                          <option value="">-- Select --</option>
                          {GRADING_OPTIONS.map(o => <option key={o}>{o}</option>)}
                        </select>
                      </div>
                      <div className="form-group">
                        <label>Current Academic Year *</label>
                        <input style={errorStyle("schoolAcademicYear")} type="text" placeholder="E.g. 2025-26" value={academic.schoolAcademicYear} onChange={e => setAcad("schoolAcademicYear", e.target.value)} />
                      </div>
                    </div>
                  </>
                )}

                {/* Bank details update (optional) */}
                <div style={{ marginTop: 28, borderTop: "1px solid #e5e7eb", paddingTop: 20 }}>
                  <h4 style={{ color: "#003580", marginBottom: 14 }}>🏦 Bank Details — Confirm / Update</h4>
                  <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 6, padding: "12px 16px", fontSize: 12, color: "#64748b", marginBottom: 14 }}>
                    Current details pre-filled. Update only if your bank account has changed.
                  </div>
                  <div className="form-row-2">
                    <div className="form-group">
                      <label>Account Holder Name</label>
                      <input type="text" value={bank.accountHolder} onChange={e => setB("accountHolder", e.target.value)} />
                    </div>
                    <div className="form-group">
                      <label>Bank Name</label>
                      <input type="text" value={bank.bankName} onChange={e => setB("bankName", e.target.value)} />
                    </div>
                  </div>
                  <div className="form-row-2">
                    <div className="form-group">
                      <label>Account Number</label>
                      <input type="text" value={bank.accountNo} onChange={e => setB("accountNo", e.target.value)} />
                    </div>
                    <div className="form-group">
                      <label>IFSC Code</label>
                      <input type="text" value={bank.ifsc} onChange={e => setB("ifsc", e.target.value)} />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ══ STEP 2 — Documents ══ */}
            {step === 2 && (
              <div className="appform-section">
                <h3>📁 Upload Renewal Documents</h3>
                <div style={{ background: "#FFF8E1", border: "1px solid #f0d060", borderRadius: 8, padding: "12px 16px", marginBottom: 20, fontSize: 13, color: "#6a4500" }}>
                  ⚠️ <strong>Mandatory for renewal:</strong> Current Year Fee Receipt and Previous Year Mark Sheet. Other documents are optional unless changed.
                </div>

                <div className="upload-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
                  {[
                    { name: "Current Year Fee Receipt", required: true },
                    { name: "Previous Year Mark Sheet", required: true },
                    { name: "Bonafide Certificate", required: false },
                    { name: "Bank Passbook / Account Proof", required: false },
                    { name: "Photographs", required: false },
                    { name: "Category Certificate (if updated)", required: false },
                  ].map(({ name: doc, required }) => {
                    const fileObj = files[doc];
                    return (
                      <div key={doc} style={{
                        border: `1px solid ${errors.files && required ? "#d93025" : "#eee"}`,
                        padding: "16px", borderRadius: "8px",
                        boxShadow: fileObj?.status === "verified" ? "0 0 0 2px #22c55e, 0 4px 12px rgba(34,197,94,0.1)" : "none",
                        transition: "all 0.3s", background: "#fff",
                      }}>
                        <label style={{ fontWeight: 600, fontSize: 13, display: "flex", gap: 6, alignItems: "center" }}>
                          {doc} {required && <span style={{ color: "#d93025" }}>*</span>}
                          {required && (
                            <span style={{ fontSize: 10, background: "#FFF0F0", color: "#C0392B", border: "1px solid #ffc0c0", borderRadius: 10, padding: "1px 7px" }}>
                              MANDATORY
                            </span>
                          )}
                        </label>
                        <input type="file" onChange={e => handleFileUpload(e, doc)} style={{ marginTop: "8px" }} />
                        {fileObj?.status === "scanning" && (
                          <div style={{ marginTop: 10, color: "#eab308", fontSize: "13px", fontWeight: "bold", display: "flex", alignItems: "center", gap: "6px" }}>
                            <span style={{ display: "inline-block", width: 14, height: 14, border: "2px solid #eab308", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 1s linear infinite" }}></span>
                            AI Scanning Document...
                          </div>
                        )}
                        {fileObj?.status === "verified" && (
                          <div style={{ marginTop: 12, display: "flex", alignItems: "center", gap: "12px", background: "#f0fdf4", padding: "8px", borderRadius: "6px" }}>
                            {fileObj.url && <img src={fileObj.url} alt="Preview" style={{ width: 40, height: 40, objectFit: "cover", borderRadius: "4px", border: "1px solid #bbf7d0" }} />}
                            <div style={{ flex: 1 }}>
                              <div style={{ color: "#16a34a", fontSize: "12px", fontWeight: "bold" }}>✅ Document Verified {fileObj.confidence && `(${fileObj.confidence}% Match)`}</div>
                              <div style={{ fontSize: "11px", color: "#475569", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: "160px" }}>{fileObj.name}</div>
                            </div>
                          </div>
                        )}
                        <style>{`@keyframes spin { 100% { transform: rotate(360deg); } }`}</style>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ══ STEP 3 — Verify & Submit ══ */}
            {step === 3 && existingApp && (
              <div className="appform-section">
                <h3>✅ Verify & Submit Renewal</h3>

                {/* Summary table */}
                <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 10, padding: "18px 20px", marginBottom: 20 }}>
                  <h4 style={{ color: "#003580", marginBottom: 14, borderBottom: "1px solid #e2e8f0", paddingBottom: 8 }}>
                    📋 Renewal Summary — {existingApp.appId}
                  </h4>
                  <div className="preview-grid">
                    {[
                      ["Application ID", existingApp.appId],
                      ["Student Name", existingApp.studentName],
                      ["Scheme", existingApp.scheme],
                      ["Amount", existingApp.amount],
                      ["Academic Year", academic.academicYear || academic.schoolAcademicYear || "—"],
                      ["Institution", academic.instituteName],
                      academic.studentType === "college"
                        ? ["Promoted to Year", academic.promotedToYear]
                        : ["Current Class", academic.schoolClass],
                      ["Marks / CGPA (%)", academic.marks],
                      ["Grading System", academic.gradingSystem],
                      ["Bank Account", bank.accountNo ? `****${bank.accountNo.slice(-4)}` : "—"],
                      ["IFSC Code", bank.ifsc || "—"],
                      ["Renewal #", `${(existingApp.renewalHistory?.length || 0) + 1}`],
                    ].map(([label, val], i) => (
                      <div key={i} className="preview-item">
                        <div className="preview-label">{label}</div>
                        <div className="preview-value">{val || "—"}</div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Documents summary */}
                <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 8, padding: "14px 16px", marginBottom: 16 }}>
                  <div style={{ fontWeight: 600, color: "#374151", marginBottom: 8, fontSize: 13 }}>📁 Uploaded Documents</div>
                  {Object.entries(files).length === 0 ? (
                    <div style={{ color: "#94a3b8", fontSize: 13 }}>No documents uploaded.</div>
                  ) : (
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                      {Object.entries(files).map(([doc, f]) => (
                        <div key={doc} style={{
                          background: f.status === "verified" ? "#f0fdf4" : "#fef9c3",
                          border: `1px solid ${f.status === "verified" ? "#86efac" : "#fde047"}`,
                          borderRadius: 6, padding: "4px 12px", fontSize: 12, color: "#374151",
                        }}>
                          {f.status === "verified" ? "✅" : "⏳"} {doc}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Remarks */}
                <div className="form-group">
                  <label>Additional Remarks (Optional)</label>
                  <textarea
                    placeholder="Any changes in address, contact, or other information you'd like the admin to know..."
                    value={remarks}
                    onChange={e => setRemarks(e.target.value)}
                    rows={3}
                    style={{ width: "100%", padding: "10px 12px", border: "1px solid #cbd5e1", borderRadius: 6, fontSize: 13, resize: "vertical", fontFamily: "inherit" }}
                  />
                </div>

                <div className="declaration-box">
                  <label className="declaration-label" style={{ borderColor: errors.declaration ? "#d93025" : "" }}>
                    <input type="checkbox" checked={declaration} onChange={e => setDeclaration(e.target.checked)} />
                    <span>
                      I hereby declare that I have been promoted to the next year/semester and the information provided
                      in this renewal application is true and correct. I understand that providing false information will
                      lead to cancellation of the scholarship.
                    </span>
                  </label>
                </div>
              </div>
            )}

            {/* ══ STEP 4 — Done ══ */}
            {step === 4 && submitted && (
              <div className="submit-success">
                <div className="success-icon">🎉</div>
                <h2>Renewal Submitted Successfully!</h2>
                <div className="app-ref">
                  Application ID: <strong>{existingApp?.appId}</strong>
                  <br />
                  <span style={{ fontSize: 13, color: "#4a5568" }}>Status reset to "Submitted" for admin review</span>
                </div>
                <div style={{ background: "#EFF6FF", border: "1px solid #93c5fd", borderRadius: 8, padding: "12px 16px", maxWidth: 400, margin: "16px auto", fontSize: 13, color: "#1d4ed8" }}>
                  ℹ️ Your updated academic details are now visible to the admin. Track your renewal status from the dashboard.
                </div>
                <div className="success-actions">
                  <Link to="/track" className="btn-gov" style={{ width: "auto", display: "inline-block", textDecoration: "none" }}>📊 Track Status</Link>
                  <Link to="/dashboard" className="btn-gov" style={{ width: "auto", background: "#138808", display: "inline-block", textDecoration: "none" }}>🏠 Home</Link>
                </div>
              </div>
            )}

            {/* Nav buttons */}
            {step !== 4 && (
              <div className="appform-nav">
                {step > 0 && (
                  <button className="btn-secondary" style={{ width: "auto" }} onClick={() => setStep(s => s - 1)}>
                    ← Previous
                  </button>
                )}
                <div style={{ flex: 1 }} />
                <button className="btn-gov" style={{ width: "auto" }} onClick={handleNext}>
                  {step === 3 ? "Submit Renewal ✓" : step === 0 && !verified ? "Login & Continue →" : "Save & Continue →"}
                </button>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}