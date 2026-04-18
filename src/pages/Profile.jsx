import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "./Navbar";
import StudentSidebar from "./StudentSidebar";
import { getUserByAppId, saveUser } from "../store";
import "../styles/Dashboard.css";
import "../styles/Profile.css";

// ── All fields that contribute to completeness ──
// Each entry: { key, label, weight, section }
const COMPLETENESS_FIELDS = [
  // Personal — total weight 40
  { key: "fullName",     label: "Full Name",        weight: 6,  section: "Personal"  },
  { key: "dob",          label: "Date of Birth",    weight: 5,  section: "Personal"  },
  { key: "gender",       label: "Gender",           weight: 4,  section: "Personal"  },
  { key: "category",     label: "Category",         weight: 4,  section: "Personal"  },
  { key: "mobile",       label: "Mobile Number",    weight: 6,  section: "Personal"  },
  { key: "email",        label: "Email ID",         weight: 5,  section: "Personal"  },
  { key: "aadhaar",      label: "Aadhaar Number",   weight: 5,  section: "Personal"  },
  { key: "state",        label: "State",            weight: 3,  section: "Personal"  },
  { key: "district",     label: "District",         weight: 2,  section: "Personal"  },
  // Academic — total weight 30
  { key: "instituteName",label: "Institution Name", weight: 10, section: "Academic"  },
  { key: "course",       label: "Course",           weight: 8,  section: "Academic"  },
  { key: "year",         label: "Year of Study",    weight: 6,  section: "Academic"  },
  { key: "marks",        label: "Last Exam Marks",  weight: 6,  section: "Academic"  },
  // Bank — total weight 30
  { key: "bankName",     label: "Bank Name",        weight: 8,  section: "Bank"      },
  { key: "accountNo",    label: "Account Number",   weight: 10, section: "Bank"      },
  { key: "ifsc",         label: "IFSC Code",        weight: 7,  section: "Bank"      },
  { key: "accountHolder",label: "Account Holder",   weight: 5,  section: "Bank"      },
];

const TOTAL_WEIGHT = COMPLETENESS_FIELDS.reduce((s, f) => s + f.weight, 0); // 100

// Returns true if the field value is genuinely filled
function isFilled(value) {
  if (!value) return false;
  const v = String(value).trim();
  if (v === "" || v === "0") return false;
  // Reject placeholder patterns like XXXX, 98XXXXXXXX, rahul@example.com etc.
  if (/^X+$/i.test(v.replace(/[\s\-]/g, ""))) return false;
  if (/example\.(com|org|net)/i.test(v)) return false;
  if (/^9[0-9]X{6,}/i.test(v)) return false;
  if (v === "--" || v === "—") return false;
  return true;
}

function calcCompleteness(form) {
  let earned = 0;
  const missing = [];
  COMPLETENESS_FIELDS.forEach(({ key, label, weight }) => {
    if (isFilled(form[key])) {
      earned += weight;
    } else {
      missing.push(label);
    }
  });
  const pct = Math.round((earned / TOTAL_WEIGHT) * 100);
  return { pct, missing };
}

function getBarColor(pct) {
  if (pct >= 80) return "linear-gradient(to right, #138808, #4caf50)";
  if (pct >= 50) return "linear-gradient(to right, #FF9933, #ffc107)";
  return "linear-gradient(to right, #C0392B, #e74c3c)";
}

const STATES = [
  "Andhra Pradesh","Arunachal Pradesh","Assam","Bihar","Chhattisgarh","Goa",
  "Gujarat","Haryana","Himachal Pradesh","Jharkhand","Karnataka","Kerala",
  "Madhya Pradesh","Maharashtra","Manipur","Meghalaya","Mizoram","Nagaland",
  "Odisha","Punjab","Rajasthan","Sikkim","Tamil Nadu","Telangana","Tripura",
  "Uttar Pradesh","Uttarakhand","West Bengal","Delhi","Jammu & Kashmir","Ladakh",
];

export default function Profile({ user, onLogout }) {
  const navigate  = useNavigate();
  const [editing, setEditing] = useState(false);
  const [saved,   setSaved]   = useState(false);

  // Load real user data from store if available, else start blank
  const storedUser = useMemo(() => {
    return user?.appId ? getUserByAppId(user.appId) : null;
  }, [user?.appId]);

  const [form, setForm] = useState({
    fullName:      storedUser?.fullName     || user?.name  || "",
    dob:           storedUser?.dob          || "",
    gender:        storedUser?.gender       || "",
    category:      storedUser?.category     || "",
    religion:      storedUser?.religion     || "",
    aadhaar:       storedUser?.aadhaar      || "",
    mobile:        storedUser?.mobile       || user?.mobile || "",
    email:         storedUser?.email        || user?.email  || "",
    state:         storedUser?.state        || "",
    district:      storedUser?.district     || "",
    pincode:       storedUser?.pincode      || "",
    instituteName: storedUser?.instituteName|| "",
    course:        storedUser?.course       || "",
    year:          storedUser?.year         || "",
    marks:         storedUser?.marks        || "",
    bankName:      storedUser?.bankName     || "",
    accountNo:     storedUser?.accountNo    || "",
    ifsc:          storedUser?.ifsc         || "",
    accountHolder: storedUser?.accountHolder|| "",
  });

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  // ── Auto-calculated completeness ──
  const { pct, missing } = useMemo(() => calcCompleteness(form), [form]);

  const handleSave = () => {
    // Persist to store
    if (user?.appId) {
      saveUser({ appId: user.appId, ...form });
    }
    setEditing(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const handleCancel = () => {
    // Revert to stored data
    const s = user?.appId ? getUserByAppId(user.appId) : null;
    if (s) {
      setForm({
        fullName: s.fullName || "", dob: s.dob || "", gender: s.gender || "",
        category: s.category || "", religion: s.religion || "", aadhaar: s.aadhaar || "",
        mobile: s.mobile || "", email: s.email || "", state: s.state || "",
        district: s.district || "", pincode: s.pincode || "",
        instituteName: s.instituteName || "", course: s.course || "",
        year: s.year || "", marks: s.marks || "",
        bankName: s.bankName || "", accountNo: s.accountNo || "",
        ifsc: s.ifsc || "", accountHolder: s.accountHolder || "",
      });
    }
    setEditing(false);
  };

  const displayAppId = user?.appId || storedUser?.appId || "NSP/2025/KA/XXXXX";

  return (
    <div className="page-wrapper">
      <Navbar user={user} onLogout={onLogout} />
      <div className="dashboard-layout">
        <StudentSidebar user={user} onLogout={() => { onLogout(); navigate("/"); }} />
        <main className="dashboard-main">

          {/* Header */}
          <div className="dash-header">
            <div>
              <h2>👤 My Profile</h2>
              <p>Application ID: <strong>{displayAppId}</strong> | Academic Year 2025-26</p>
            </div>
            {!editing && (
              <button className="btn-apply-now" onClick={() => setEditing(true)}>
                ✏️ Edit Profile
              </button>
            )}
          </div>

          {saved && (
            <div className="alert alert-success" style={{ marginBottom: 16 }}>
              ✅ Profile updated successfully!
            </div>
          )}

          <div className="profile-layout">

            {/* ── LEFT: Avatar + Completeness ── */}
            <div className="profile-avatar-card">
              <div className="profile-big-avatar">
                {(form.fullName || user?.name || "S")[0].toUpperCase()}
              </div>
              <div className="profile-name">{form.fullName || user?.name || "—"}</div>
              <div className="profile-id">{displayAppId}</div>

              {form.category && (
                <div className="profile-tags">
                  <span className={`tag tag-${form.category.toLowerCase()}`}>
                    {form.category}
                  </span>
                </div>
              )}

              <div className="profile-contact">
                {form.mobile  && <div>📱 {form.mobile}</div>}
                {form.email   && <div>✉️ {form.email}</div>}
                {(form.district || form.state) && (
                  <div>📍 {[form.district, form.state].filter(Boolean).join(", ")}</div>
                )}
              </div>

              {/* ── Completeness ── */}
              <div className="profile-completeness">
                <div className="complete-label">Profile Completeness</div>
                <div className="complete-bar">
                  <div
                    className="complete-fill"
                    style={{
                      width: `${pct}%`,
                      background: getBarColor(pct),
                      transition: "width 0.6s ease",
                    }}
                  />
                </div>
                <div className="complete-pct" style={{
                  color: pct >= 80 ? "#138808" : pct >= 50 ? "#FF9933" : "#C0392B"
                }}>
                  {pct}%
                </div>

                {/* Missing fields hint */}
                {missing.length > 0 && (
                  <div className="complete-missing">
                    <div className="complete-missing-title">
                      📋 {missing.length} field{missing.length > 1 ? "s" : ""} pending:
                    </div>
                    {missing.slice(0, 5).map(m => (
                      <div key={m} className="complete-missing-item">• {m}</div>
                    ))}
                    {missing.length > 5 && (
                      <div className="complete-missing-item" style={{ color: "#FF9933" }}>
                        +{missing.length - 5} more...
                      </div>
                    )}
                    {editing ? null : (
                      <button
                        className="complete-edit-btn"
                        onClick={() => setEditing(true)}
                      >
                        Fill Now →
                      </button>
                    )}
                  </div>
                )}

                {pct === 100 && (
                  <div style={{ fontSize: 11, color: "#138808", marginTop: 6, fontWeight: 600 }}>
                    ✅ Profile 100% complete!
                  </div>
                )}
              </div>
            </div>

            {/* ── RIGHT: Detail sections ── */}
            <div className="profile-details">

              {/* Personal */}
              <div className="profile-section">
                <h3>Personal Information</h3>
                <div className="form-row-2">
                  <div className="form-group">
                    <label>Full Name</label>
                    <input type="text" placeholder="Enter full name"
                      value={form.fullName} onChange={e => set("fullName", e.target.value)} disabled={!editing} />
                  </div>
                  <div className="form-group">
                    <label>Date of Birth</label>
                    <input type="date"
                      value={form.dob} onChange={e => set("dob", e.target.value)} disabled={!editing} />
                  </div>
                </div>
                <div className="form-row-2">
                  <div className="form-group">
                    <label>Gender</label>
                    <select value={form.gender} onChange={e => set("gender", e.target.value)} disabled={!editing}>
                      <option value="">-- Select --</option>
                      <option>Male</option><option>Female</option><option>Transgender</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Category</label>
                    <select value={form.category} onChange={e => set("category", e.target.value)} disabled={!editing}>
                      <option value="">-- Select --</option>
                      {["General","OBC","SC","ST","Minority"].map(c => <option key={c}>{c}</option>)}
                    </select>
                  </div>
                </div>
                <div className="form-row-2">
                  <div className="form-group">
                    <label>Mobile Number</label>
                    <input type="tel" placeholder="10-digit mobile"
                      value={form.mobile} onChange={e => set("mobile", e.target.value)} disabled={!editing} />
                  </div>
                  <div className="form-group">
                    <label>Email ID</label>
                    <input type="email" placeholder="Email address"
                      value={form.email} onChange={e => set("email", e.target.value)} disabled={!editing} />
                  </div>
                </div>
                <div className="form-row-2">
                  <div className="form-group">
                    <label>Aadhaar Number</label>
                    <input type="text" placeholder="12-digit Aadhaar" maxLength={12}
                      value={form.aadhaar} onChange={e => set("aadhaar", e.target.value.replace(/\D/,""))} disabled={!editing} />
                  </div>
                  <div className="form-group">
                    <label>Religion</label>
                    <select value={form.religion} onChange={e => set("religion", e.target.value)} disabled={!editing}>
                      <option value="">-- Select --</option>
                      {["Hindu","Muslim","Christian","Sikh","Buddhist","Jain","Others"].map(r => <option key={r}>{r}</option>)}
                    </select>
                  </div>
                </div>
                <div className="form-row-2">
                  <div className="form-group">
                    <label>State</label>
                    <select value={form.state} onChange={e => set("state", e.target.value)} disabled={!editing}>
                      <option value="">-- Select State --</option>
                      {STATES.map(s => <option key={s}>{s}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label>District</label>
                    <input type="text" placeholder="Enter district"
                      value={form.district} onChange={e => set("district", e.target.value)} disabled={!editing} />
                  </div>
                </div>
                <div className="form-group">
                  <label>Pincode</label>
                  <input type="text" placeholder="6-digit pincode" maxLength={6}
                    value={form.pincode} onChange={e => set("pincode", e.target.value.replace(/\D/,""))} disabled={!editing} style={{ maxWidth: 200 }} />
                </div>
              </div>

              {/* Academic */}
              <div className="profile-section">
                <h3>Academic Information</h3>
                <div className="form-group">
                  <label>Institution Name</label>
                  <input type="text" placeholder="Enter institution / college name"
                    value={form.instituteName} onChange={e => set("instituteName", e.target.value)} disabled={!editing} />
                </div>
                <div className="form-row-2">
                  <div className="form-group">
                    <label>Course / Programme</label>
                    <input type="text" placeholder="e.g. B.Tech, B.A., M.Sc."
                      value={form.course} onChange={e => set("course", e.target.value)} disabled={!editing} />
                  </div>
                  <div className="form-group">
                    <label>Year of Study</label>
                    <select value={form.year} onChange={e => set("year", e.target.value)} disabled={!editing}>
                      <option value="">-- Select --</option>
                      {["1st Year","2nd Year","3rd Year","4th Year","5th Year"].map(y => <option key={y}>{y}</option>)}
                    </select>
                  </div>
                </div>
                <div className="form-group">
                  <label>Last Exam Percentage (%)</label>
                  <input type="number" placeholder="e.g. 78.5" min="0" max="100"
                    value={form.marks} onChange={e => set("marks", e.target.value)} disabled={!editing} style={{ maxWidth: 200 }} />
                </div>
              </div>

              {/* Bank */}
              <div className="profile-section">
                <h3>Bank Account Details</h3>
                <div className="form-row-2">
                  <div className="form-group">
                    <label>Account Holder Name</label>
                    <input type="text" placeholder="As per bank records"
                      value={form.accountHolder} onChange={e => set("accountHolder", e.target.value)} disabled={!editing} />
                  </div>
                  <div className="form-group">
                    <label>Bank Name</label>
                    <input type="text" placeholder="e.g. State Bank of India"
                      value={form.bankName} onChange={e => set("bankName", e.target.value)} disabled={!editing} />
                  </div>
                </div>
                <div className="form-row-2">
                  <div className="form-group">
                    <label>Account Number</label>
                    <input type="text" placeholder="Bank account number"
                      value={form.accountNo} onChange={e => set("accountNo", e.target.value)} disabled={!editing} />
                  </div>
                  <div className="form-group">
                    <label>IFSC Code</label>
                    <input type="text" placeholder="e.g. SBIN0001234"
                      value={form.ifsc} onChange={e => set("ifsc", e.target.value.toUpperCase())} disabled={!editing} />
                  </div>
                </div>
              </div>

              {/* Save / Cancel */}
              {editing && (
                <div style={{ display: "flex", gap: 12, marginTop: 8 }}>
                  <button className="btn-gov" style={{ width: "auto" }} onClick={handleSave}>
                    💾 Save Changes
                  </button>
                  <button className="btn-secondary" style={{ width: "auto" }} onClick={handleCancel}>
                    Cancel
                  </button>
                </div>
              )}

            </div>
          </div>

        </main>
      </div>
    </div>
  );
}
