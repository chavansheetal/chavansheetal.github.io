import { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import Navbar from "./Navbar";
import StudentSidebar from "./StudentSidebar";
import { getApplicationsByUser } from "../store";
import "../styles/Dashboard.css";
import "../styles/ApplicationTracking.css";

const STATUS_STYLE = {
  "Approved":          { bg: "#E8F5E9", color: "#1b5e20",  border: "#81c784" },
  "Under Review":      { bg: "#FFF8E1", color: "#6a4500",  border: "#f0d060" },
  "Submitted":         { bg: "#EEF6FF", color: "#003580",  border: "#b3d4ff" },
  "Institute Verified":{ bg: "#E3F2FD", color: "#0d47a1",  border: "#90caf9" },
  "Rejected":          { bg: "#FFF0F0", color: "#C0392B",  border: "#ffc0c0" },
  "Amount Credited":   { bg: "#E8F5E9", color: "#1b5e20",  border: "#81c784" },
};
const STATUS_ICONS = {
  "Approved":"✅","Under Review":"🔍","Submitted":"📋",
  "Institute Verified":"🏫","Rejected":"❌","Amount Credited":"💰",
};

/* ─── helper: what colour should a dot be? ─────────────────────
   GREEN  →  step is genuinely completed (done=true, not the
             rejection point, and overall status is NOT Rejected
             OR it's a step that finished before rejection)
   RED    →  this step is where rejection happened (rejected=true)
             OR overall status=Rejected and step shows done=true
             but we need to override it
   YELLOW →  step is the "current" in-progress one for Under-Review
   GREY   →  future / not yet reached
──────────────────────────────────────────────────────────────── */
function getDotStyle(t, index, appStatus) {
  const isRejected = appStatus === "Rejected";

  // If overall app is rejected, ALL green ticks must be re-evaluated
  if (isRejected) {
    if (t.rejected === true || (t.done === true && index > 0)) {
      // Step where it was rejected OR any prior verification step → RED ✗
      return { bg: "#C0392B", color: "white", label: "✗", glow: t.rejected ? "0 0 0 3px rgba(192,57,43,0.25)" : "none" };
    }
    if (t.done === true) {
      // Application Submitted (index 0) remains green
      return { bg: "#138808", color: "white", label: "✓", glow: "none" };
    }
    // Steps AFTER rejection → GREY (not reached)
    return { bg: "#CBD5E1", color: "#4a5568", label: index + 1, glow: "none" };
  }

  // Normal flow (not rejected)
  if (t.done) {
    return { bg: "#138808", color: "white", label: "✓", glow: "0 0 0 3px rgba(19,136,8,0.15)" };
  }
  // Current step (first undone step when app is Under Review / Institute Verified)
  if (appStatus === "Under Review" || appStatus === "Institute Verified") {
    // Highlight the next pending step in amber
    return { bg: "#FF9933", color: "white", label: index + 1, glow: "0 0 0 3px rgba(255,153,51,0.25)" };
  }
  return { bg: "#CBD5E1", color: "#4a5568", label: index + 1, glow: "none" };
}

/* connector colour between step i and step i+1 */
function getConnectorColor(t, nextT, appStatus) {
  const isRejected = appStatus === "Rejected";
  if (isRejected) {
    if (t.done && nextT?.done) return "#C0392B"; // red
    return "#CBD5E1"; // grey
  }
  if (t.done && nextT?.done) return "#138808"; // green
  return "#CBD5E1"; // grey
}

/* ═══════════════════════════════════
   PRINT CERTIFICATE COMPONENT
═══════════════════════════════════ */
function PrintCertificate({ app, onClose }) {
  const printRef = useRef();

  const handlePrint = () => {
    const content = printRef.current.innerHTML;
    const win = window.open("", "_blank", "width=900,height=750");
    win.document.write(`<!DOCTYPE html>
<html>
<head>
  <title>Scholarship Approval Certificate — ${app.appId}</title>
  <meta charset="UTF-8">
  <style>
    *{margin:0;padding:0;box-sizing:border-box;}
    body{font-family:'Times New Roman',Georgia,serif;background:white;color:#000;padding:24px;}
    .cert-outer{border:4px double #003580;max-width:800px;margin:0 auto;}
    .cert-tricolor{height:8px;background:linear-gradient(to right,#FF9933 33.3%,#fff 33.3% 66.6%,#138808 66.6%);}
    .cert-header{background:#003580;color:white;padding:18px 30px;text-align:center;}
    .cert-header .emblem{font-size:42px;margin-bottom:6px;}
    .cert-header h1{font-size:20px;font-weight:bold;letter-spacing:1.5px;}
    .cert-header p{font-size:12px;opacity:.85;margin-top:3px;}
    .cert-header .sub{font-size:11px;opacity:.7;margin-top:2px;}
    .cert-body{padding:24px 36px;}
    .cert-title{text-align:center;margin-bottom:18px;}
    .cert-title h2{font-size:18px;color:#003580;border-bottom:2px solid #FF9933;display:inline-block;padding-bottom:6px;letter-spacing:.5px;}
    .cert-ref{background:#F0F8FF;border:1px solid #b3d4ff;border-radius:4px;padding:10px 16px;margin-bottom:16px;font-size:12px;display:flex;justify-content:space-between;flex-wrap:wrap;gap:8px;}
    .cert-approved-banner{background:#E8F5E9;border:2px solid #138808;border-radius:6px;padding:12px 20px;margin-bottom:16px;text-align:center;}
    .cert-approved-banner h3{color:#138808;font-size:17px;margin-bottom:3px;}
    .cert-approved-banner p{color:#1b5e20;font-size:12px;}
    .cert-greeting{font-size:13px;line-height:1.9;margin-bottom:18px;text-align:justify;}
    .cert-grid{display:grid;grid-template-columns:1fr 1fr;gap:0;border:1px solid #ccc;margin-bottom:18px;}
    .cert-row{display:contents;}
    .cert-key{background:#EEF6FF;padding:8px 12px;font-size:11px;font-weight:bold;color:#003580;border-bottom:1px solid #ccc;border-right:1px solid #ccc;text-transform:uppercase;letter-spacing:.3px;}
    .cert-val{background:white;padding:8px 12px;font-size:12px;border-bottom:1px solid #ccc;}
    .cert-note{font-size:11px;color:#555;background:#FFF8E1;border:1px solid #f0d060;padding:10px 14px;border-radius:4px;margin-bottom:18px;line-height:1.7;}
    .cert-footer{border-top:2px solid #003580;padding-top:16px;display:grid;grid-template-columns:1fr 1fr;gap:20px;}
    .cert-sign-box{text-align:center;}
    .cert-sign-line{border-bottom:1px solid #333;margin-bottom:6px;height:40px;}
    .cert-sign-label{font-size:12px;color:#333;font-weight:bold;}
    .cert-sign-sub{font-size:11px;color:#666;}
    .cert-seal{text-align:center;margin-top:8px;}
    .cert-seal-circle{width:76px;height:76px;border:3px solid #003580;border-radius:50%;display:inline-flex;align-items:center;justify-content:center;font-size:9px;color:#003580;font-weight:bold;text-align:center;line-height:1.4;padding:8px;}
    .cert-barcode{text-align:center;font-family:monospace;font-size:10px;color:#666;margin-top:10px;letter-spacing:2px;}
    @media print{body{padding:0;}.cert-outer{-webkit-print-color-adjust:exact;print-color-adjust:exact;}}
  </style>
</head>
<body>${content}</body>
</html>`);
    win.document.close();
    win.focus();
    setTimeout(() => { win.print(); }, 500);
  };

  const today = new Date().toLocaleDateString("en-IN", { day:"2-digit", month:"long", year:"numeric" });

  return (
    <div className="print-modal-overlay" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="print-modal">
        <div className="print-modal-header">
          <h3>🖨️ Scholarship Approval Certificate</h3>
          <div style={{ display:"flex", gap:10 }}>
            <button className="print-btn-download" onClick={handlePrint}>🖨️ Print / Save as PDF</button>
            <button className="print-btn-close" onClick={onClose}>✕ Close</button>
          </div>
        </div>
        <div className="print-preview">
          <div ref={printRef}>
            <div className="cert-outer">
              <div className="cert-tricolor"></div>
              <div className="cert-header">
                <div className="emblem">🇮🇳</div>
                <h1>Unified Scholarship Platform</h1>
                <p>राष्ट्रीय छात्रवृत्ति पोर्टल</p>
                <div className="sub">Ministry of Education, Government of India</div>
              </div>
              <div className="cert-body">
                <div className="cert-title"><h2>SCHOLARSHIP APPROVAL CERTIFICATE</h2></div>
                <div className="cert-ref">
                  <span><strong>Application ID:</strong> {app.appId}</span>
                  <span><strong>Issue Date:</strong> {app.updatedAt || today}</span>
                  <span><strong>Academic Year:</strong> 2025-26</span>
                </div>
                <div className="cert-approved-banner">
                  <h3>✅ APPLICATION APPROVED</h3>
                  <p>This application has been reviewed and approved by the competent authority.</p>
                </div>
                <div className="cert-greeting">
                  This is to certify that the scholarship application submitted by{" "}
                  <strong>{app.studentName || app.personalDetails?.fullName}</strong>,
                  bearing Application ID <strong>{app.appId}</strong>, has been{" "}
                  <strong>duly verified and approved</strong> under the{" "}
                  <strong>{app.scheme}</strong> scholarship scheme for the Academic Year 2025-26.
                  The scholarship amount shall be directly credited to the beneficiary's
                  Aadhaar-linked bank account through Direct Benefit Transfer (DBT) within 7-10 working days.
                </div>
                <div className="cert-grid">
                  {[
                    ["Student Name",       app.studentName || app.personalDetails?.fullName || "—"],
                    ["Scholarship Scheme", app.scheme],
                    ["Application Status", app.status],
                    ["Approved Amount",    app.amount],
                    ["Date of Application",app.appliedOn],
                    ["Approval Date",      app.updatedAt || today],
                    ["Category",           app.personalDetails?.category || "—"],
                    ["Mobile",             app.personalDetails?.mobile || "—"],
                    ["Institution",        app.academicDetails?.instituteName || "—"],
                    ["Course",             app.academicDetails?.course || "—"],
                    ["Bank Name",          app.bankDetails?.bankName || "—"],
                    ["IFSC Code",          app.bankDetails?.ifsc || "—"],
                    ["Account No.",        app.bankDetails?.accountNo ? "XXXXXX" + String(app.bankDetails.accountNo).slice(-4) : "—"],
                    ["Account Holder",     app.bankDetails?.accountHolder || app.studentName || "—"],
                  ].map(([k, v]) => (
                    <div key={k} className="cert-row">
                      <div className="cert-key">{k}</div>
                      <div className="cert-val">{v}</div>
                    </div>
                  ))}
                </div>
                <div className="cert-note">
                  <strong>Important Instructions:</strong><br/>
                  1. This certificate is auto-generated from the Unified Scholarship Platform and is valid without physical signature.<br/>
                  2. The scholarship amount will be credited within 7-10 working days after final approval.<br/>
                  3. Any discrepancy must be reported to helpdesk@nsp.gov.in or call 0120-6619540 within 30 days.<br/>
                  4. Retain this certificate for future correspondence with the Ministry.
                </div>
                <div className="cert-footer">
                  <div className="cert-sign-box">
                    <div className="cert-sign-line"></div>
                    <div className="cert-sign-label">Authorised Signatory</div>
                    <div className="cert-sign-sub">Ministry of Education, GoI</div>
                  </div>
                  <div className="cert-sign-box">
                    <div className="cert-seal">
                      <div className="cert-seal-circle">GOVT.<br/>OF<br/>INDIA<br/>NSP</div>
                    </div>
                  </div>
                </div>
                <div className="cert-barcode">
                  ║ {app.appId.replace(/\//g,"│")} ║ APPROVED ║ NSP-2025-26 ║
                </div>
              </div>
              <div className="cert-tricolor"></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════
   MAIN TRACKER COMPONENT
═══════════════════════════════════ */
export default function ApplicationTracker({ user, onLogout }) {
  const navigate = useNavigate();
  const [apps, setApps]               = useState([]);
  const [expanded, setExpanded]       = useState(null);
  const [printApp, setPrintApp]       = useState(null);
  const [filterStatus, setFilterStatus] = useState("All");

  const loadApps = () => {
    if (user?.id) setApps(getApplicationsByUser(user));
  };

  useEffect(() => {
    loadApps();
    const interval = setInterval(loadApps, 5000);
    return () => clearInterval(interval);
  }, [user]);

  /* ── also fix any OLD rejected apps in localStorage that
     still have wrong timeline (all-green) ── */
  useEffect(() => {
    try {
      const raw = localStorage.getItem("nsp_applications");
      if (!raw) return;
      const allApps = JSON.parse(raw);
      let changed = false;
      allApps.forEach(app => {
        if (app.status !== "Rejected") return;
        // Check if any step after index 0 shows done:true without a rejected flag anywhere
        const hasRejectedFlag = app.timeline?.some(t => t.rejected === true);
        if (!hasRejectedFlag) {
          // Find the last done step and mark the one after it as rejected
          let lastDone = -1;
          app.timeline?.forEach((t, i) => { if (t.done) lastDone = i; });
          const rejIdx = Math.min(lastDone, (app.timeline?.length ?? 1) - 1);
          app.timeline = app.timeline?.map((t, i) => ({
            ...t,
            done:     i < rejIdx,
            rejected: i === rejIdx ? true : false,
          }));
          changed = true;
        }
      });
      if (changed) {
        localStorage.setItem("nsp_applications", JSON.stringify(allApps));
        loadApps();
      }
    } catch(e) { /* silent */ }
  }, []);

  const filtered = filterStatus === "All"
    ? apps
    : apps.filter(a => {
        if (filterStatus === "Approved")     return a.status === "Approved" || a.status === "Amount Credited";
        if (filterStatus === "Under Review") return a.status === "Under Review" || a.status === "Institute Verified";
        return a.status === filterStatus;
      });

  const statusCounts = {
    All:            apps.length,
    Approved:       apps.filter(a => a.status === "Approved" || a.status === "Amount Credited").length,
    "Under Review": apps.filter(a => a.status === "Under Review" || a.status === "Institute Verified").length,
    Submitted:      apps.filter(a => a.status === "Submitted").length,
    Rejected:       apps.filter(a => a.status === "Rejected").length,
  };

  return (
    <div className="page-wrapper">
      <Navbar user={user} onLogout={onLogout} />
      <div className="dashboard-layout">
        <StudentSidebar user={user} onLogout={() => { onLogout(); navigate("/"); }} />
        <main className="dashboard-main">

          {/* Header */}
          <div className="dash-header">
            <div>
              <h2>📊 My Applications</h2>
              <p>Track the real-time status of your scholarship applications.</p>
            </div>
            <Link to="/application-form" className="btn-apply-now">+ New Application</Link>
          </div>

          {/* Filter Pills */}
          <div className="tracker-filter-pills">
            {Object.entries(statusCounts).map(([status, count]) => (
              <button
                key={status}
                className={`tracker-pill ${filterStatus === status ? "active" : ""} pill-${status.replace(/\s/g,"-").toLowerCase()}`}
                onClick={() => setFilterStatus(status)}
              >
                {STATUS_ICONS[status] || "📋"} {status}
                <span className="pill-count">{count}</span>
              </button>
            ))}
            <span style={{ fontSize:12, color:"#4a5568", marginLeft:8 }}>
              — Status updates automatically every 5 seconds.
            </span>
          </div>

          {/* Empty state */}
          {apps.length === 0 && (
            <div className="no-apps">
              <div style={{ fontSize:48, marginBottom:12 }}>📋</div>
              <h3>No Applications Yet</h3>
              <p>You haven't applied for any scholarship. Apply now to get started!</p>
              <Link to="/application-form" className="btn-apply-now"
                style={{ display:"inline-block", marginTop:16, textDecoration:"none" }}>
                Apply for Scholarship →
              </Link>
            </div>
          )}

          {/* Cards */}
          {filtered.map(app => {
            const ss         = STATUS_STYLE[app.status] || STATUS_STYLE["Submitted"];
            const isExpanded = expanded === app.appId;
            const isApproved = app.status === "Approved" || app.status === "Amount Credited";
            const isRejected = app.status === "Rejected";

            return (
              <div
                key={app.appId}
                className={`tracker-card-new ${isApproved ? "approved-card" : ""} ${isRejected ? "rejected-card" : ""}`}
              >
                {/* Top Row */}
                <div className="tracker-card-top">
                  <div className="tracker-left-info">
                    <div className="tracker-app-id"><code>{app.appId}</code></div>
                    <h3 className="tracker-scheme-name">{app.scheme}</h3>
                    <div className="tracker-meta-row">
                      <span>📅 Applied: <strong>{app.appliedOn}</strong></span>
                      <span>💰 Amount: <strong style={{ color: isApproved ? "#138808" : "#4a5568" }}>{app.amount}</strong></span>
                      {app.updatedAt && <span>🔄 Updated: <strong>{app.updatedAt}</strong></span>}
                    </div>
                  </div>
                  <div className="tracker-right-actions">
                    <span className="tracker-status-badge"
                      style={{ background:ss.bg, color:ss.color, border:`1px solid ${ss.border}` }}>
                      {STATUS_ICONS[app.status]} {app.status}
                    </span>
                    <div style={{ display:"flex", gap:8, flexWrap:"wrap", justifyContent:"flex-end" }}>
                      <button className="btn-expand"
                        onClick={() => setExpanded(isExpanded ? null : app.appId)}>
                        {isExpanded ? "▲ Hide Details" : "▼ View Details"}
                      </button>
                      {isApproved && (
                        <button className="btn-print-cert" onClick={() => setPrintApp(app)}>
                          🖨️ Print Certificate
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Rejection banner */}
                {isRejected && app.rejectionReason && (
                  <div className="rejection-notice">
                    <div className="rejection-notice-icon">❌</div>
                    <div>
                      <div className="rejection-notice-title">Application Rejected</div>
                      <div className="rejection-notice-reason">
                        <strong>Reason:</strong> {app.rejectionReason}
                      </div>
                      <div className="rejection-notice-action">
                        Please rectify the issue and reapply, or contact helpdesk at{" "}
                        <strong>0120-6619540</strong> or <strong>helpdesk@nsp.gov.in</strong>
                      </div>
                    </div>
                  </div>
                )}

                {/* Approval banner */}
                {isApproved && (
                  <div className="approval-notice">
                    <span style={{ fontSize:22 }}>🎉</span>
                    <div>
                      <strong>Congratulations! Your application has been approved.</strong>
                      <div style={{ fontSize:12, marginTop:3 }}>
                        The scholarship amount will be credited to your bank account within
                        7-10 working days. Click <strong>"Print Certificate"</strong> to
                        download your official approval certificate.
                      </div>
                    </div>
                  </div>
                )}

                {/* Expanded section */}
                {isExpanded && (
                  <div className="tracker-expanded">

                    {/* ── Progress Timeline ── */}
                    <div className="tracker-progress-section">
                      <h4 className="tracker-section-title">📍 Application Progress</h4>
                      <div className="progress-timeline">
                        {(app.timeline || []).map((t, i) => {
                          const dot = getDotStyle(t, i, app.status);
                          const connColor = i < (app.timeline.length - 1)
                            ? getConnectorColor(t, app.timeline[i + 1], app.status)
                            : null;

                          return (
                            <div key={i} className="progress-step">

                              {/* ── Dot ── */}
                              <div
                                className="progress-dot"
                                style={{
                                  background:  dot.bg,
                                  color:       dot.color,
                                  boxShadow:   dot.glow,
                                  border:      t.rejected ? "2px solid #a93226" : "none",
                                  fontWeight:  700,
                                  fontSize:    typeof dot.label === "string" ? 14 : 13,
                                }}
                              >
                                {dot.label}
                              </div>

                              {/* ── Connector to next step ── */}
                              {connColor && (
                                <div
                                  className="progress-connector"
                                  style={{ background: connColor }}
                                />
                              )}

                              {/* ── Label ── */}
                              <div className="progress-label">
                                <div
                                  className="progress-step-name"
                                  style={{
                                    color:      (t.rejected || (app.status === "Rejected" && t.done && i > 0)) ? "#C0392B"
                                              : (app.status === "Rejected" && t.done && i === 0) ? "#138808"
                                              : t.done      ? "#138808"
                                              : (app.status === "Under Review" && !t.done && i === (app.timeline.findIndex(x => !x.done)))
                                                            ? "#FF9933"
                                              : "#4a5568",
                                    fontWeight: (t.done || t.rejected) ? 700 : 400,
                                  }}
                                >
                                  {t.step}
                                  {/* "REJECTED HERE" badge */}
                                  {t.rejected && (
                                    <span style={{
                                      display: "inline-block",
                                      marginLeft: 6,
                                      fontSize: 9,
                                      background: "#FFF0F0",
                                      color: "#C0392B",
                                      border: "1px solid #ffc0c0",
                                      borderRadius: 3,
                                      padding: "1px 5px",
                                      fontWeight: 700,
                                      letterSpacing: 0.3,
                                      verticalAlign: "middle",
                                    }}>
                                      REJECTED
                                    </span>
                                  )}
                                </div>
                                <div
                                  className="progress-step-date"
                                  style={{ color: t.rejected ? "#C0392B" : undefined }}
                                >
                                  {t.date}
                                </div>
                              </div>

                            </div>
                          );
                        })}
                      </div>

                      {/* Colour legend */}
                      <div className="timeline-legend">
                        <span className="tl-item"><span className="tl-dot tl-green">✓</span> Completed</span>
                        <span className="tl-item"><span className="tl-dot tl-red">✗</span> Rejected</span>
                        <span className="tl-item"><span className="tl-dot tl-amber">→</span> In Progress</span>
                        <span className="tl-item"><span className="tl-dot tl-grey">·</span> Pending</span>
                      </div>

                      {/* Status message */}
                      <div
                        className="tracker-status-msg"
                        style={{ background:ss.bg, borderColor:ss.border, color:ss.color }}
                      >
                        {isRejected ? (
                          <>❌ Your application has been <strong>Rejected</strong>.
                            {app.rejectionReason && <> Reason: <strong>{app.rejectionReason}</strong>.</>}
                            {" "}Please correct and reapply or contact helpdesk.</>
                        ) : isApproved ? (
                          <>✅ Your application is <strong>Approved</strong>! Amount will be credited within 7-10 working days.</>
                        ) : (
                          <>ℹ️ Your application is currently <strong>{app.status}</strong>.{" "}
                            {app.status === "Submitted" && "You will be notified when the status changes."}
                            {app.status === "Institute Verified" && "Your institute has verified your details. Awaiting State NOC."}
                            {app.status === "Under Review" && "Being reviewed by the Ministry. Kindly wait."}
                          </>
                        )}
                      </div>
                    </div>

                    {/* Submitted Details */}
                    <div className="tracker-details-section">
                      <h4 className="tracker-section-title">📋 Submitted Details</h4>
                      <div className="tracker-details-grid">
                        {[
                          ["Full Name",   app.studentName || app.personalDetails?.fullName || "—"],
                          ["Course",      app.academicDetails?.course || "—"],
                          ["Institution", app.academicDetails?.instituteName || "—"],
                          ["Category",    app.personalDetails?.category || "—"],
                          ["Bank",        app.bankDetails?.bankName || "—"],
                          ["IFSC",        app.bankDetails?.ifsc || "—"],
                        ].map(([label, val]) => (
                          <div key={label} className="td-item">
                            <div className="td-label">{label}</div>
                            <div className="td-val">{val}</div>
                          </div>
                        ))}
                      </div>
                    </div>

                  </div>
                )}
              </div>
            );
          })}

          {filtered.length === 0 && apps.length > 0 && (
            <div className="no-apps">
              <p>No applications with status "<strong>{filterStatus}</strong>".</p>
            </div>
          )}

        </main>
      </div>

      {/* Print Certificate Modal */}
      {printApp && (
        <PrintCertificate app={printApp} onClose={() => setPrintApp(null)} />
      )}
    </div>
  );
}