// ── NSP Shared Data Store (localStorage as backend simulation) ──

export const STORE_KEYS = {
  APPLICATIONS: "usp_applications",
  USERS:        "usp_users",
};

export function initStore() {
  if (!localStorage.getItem(STORE_KEYS.APPLICATIONS))
    localStorage.setItem(STORE_KEYS.APPLICATIONS, JSON.stringify([]));
  if (!localStorage.getItem(STORE_KEYS.USERS))
    localStorage.setItem(STORE_KEYS.USERS, JSON.stringify([]));
}

// ── USERS ──
export function getUsers() {
  return JSON.parse(localStorage.getItem(STORE_KEYS.USERS) || "[]");
}

export function saveUser(user) {
  const users = getUsers();
  const idx = users.findIndex(u => u.appId === user.appId);
  if (idx >= 0) users[idx] = { ...users[idx], ...user };
  else users.push(user);
  localStorage.setItem(STORE_KEYS.USERS, JSON.stringify(users));
}

export function getUserByAppId(appId) {
  return getUsers().find(u => u.appId?.toUpperCase() === appId?.toUpperCase()) || null;
}

export function getUserByEmail(email) {
  return getUsers().find(u => u.email?.toLowerCase() === email?.toLowerCase()) || null;
}

export function getUserByMobile(mobile) {
  return getUsers().find(u => u.mobile === mobile) || null;
}

export function getUserByAadhaar(aadhaar) {
  return getUsers().find(u => u.aadhaar === aadhaar && u.aadhaar !== "") || null;
}

export function updateUserPassword(appId, newPassword) {
  const users = getUsers();
  const idx = users.findIndex(u => u.appId?.toUpperCase() === appId?.toUpperCase());
  if (idx >= 0) {
    users[idx].password = newPassword;
    localStorage.setItem(STORE_KEYS.USERS, JSON.stringify(users));
    return true;
  }
  return false;
}

export function generateAppId(state = "KA") {
  const num = Math.floor(10000 + Math.random() * 90000);
  return `NSP/2025/${state}/${num}`;
}

// ── APPLICATIONS ──
export function getApplications() {
  const data = localStorage.getItem(STORE_KEYS.APPLICATIONS);
  if (!data) return [];

  let apps = JSON.parse(data);
  let changed = false;

  const users = getUsers();
  apps = apps.map(app => {
    if (app.studentName === "DigiLocker User" || (app.personalDetails && app.personalDetails.fullName === "DigiLocker User")) {
      const owner = users.find(u => u.appId === app.userId || u.mobile === app.userId || u.id === app.userId);
      if (owner && owner.fullName && owner.fullName !== "DigiLocker User") {
        changed = true;
        const newApp = { ...app, studentName: owner.fullName };
        if (newApp.personalDetails) {
          newApp.personalDetails = { ...newApp.personalDetails, fullName: owner.fullName };
        }
        return newApp;
      }
    }
    return app;
  });

  if (changed) {
    localStorage.setItem(STORE_KEYS.APPLICATIONS, JSON.stringify(apps));
  }

  return apps;
}

export function saveApplication(app) {
  const apps = getApplications();
  const idx = apps.findIndex(a => a.appId === app.appId);
  if (idx >= 0) apps[idx] = app;
  else apps.push(app);
  localStorage.setItem(STORE_KEYS.APPLICATIONS, JSON.stringify(apps));
}

export function saveRenewal(appId, updates) {
  const apps = getApplications();
  const idx = apps.findIndex(a => a.appId === appId);
  if (idx >= 0) {
    const existing = apps[idx];
    apps[idx] = {
      ...existing,
      status: "Renewal Submitted",
      updatedAt: new Date().toLocaleDateString("en-IN"),
      academicDetails: updates.academicDetails || existing.academicDetails,
      bankDetails: updates.bankDetails || existing.bankDetails,
      renewalDetails: {
        academicYear: updates.renewalAcademicYear,
        promotedToYear: updates.promotedToYear,
        lastYearMarks: updates.lastYearMarks,
        remarks: updates.remarks,
        files: updates.files,
      },
      timeline: [
        { step: "Renewal Submitted", date: new Date().toLocaleDateString("en-IN"), done: true },
        { step: "Institute Verification", date: "Pending", done: false },
        { step: "State NOC", date: "—", done: false },
        { step: "Ministry Approval", date: "—", done: false },
        { step: "Amount Credited", date: "—", done: false },
      ]
    };
    localStorage.setItem(STORE_KEYS.APPLICATIONS, JSON.stringify(apps));
    return true;
  }
  return false;
}

// ✅ FIXED: match by appId, mobile, or id — all possible userId formats
export function getApplicationsByUser(user) {
  if (!user) return [];
  return getApplications().filter(a =>
    a.userId === user.appId ||
    a.userId === user.id ||
    a.userId === user.mobile
  );
}

export function updateApplicationStatus(appId, status, reason = "") {
  const apps = getApplications();
  const idx = apps.findIndex(a => a.appId === appId);
  if (idx >= 0) {
    apps[idx].status = status;
    apps[idx].rejectionReason = reason;
    apps[idx].updatedAt = new Date().toLocaleDateString("en-IN");
    const stepMap = { "Submitted": 0, "Institute Verified": 1, "Under Review": 2, "Approved": 3, "Rejected": 3, "Amount Credited": 4 };
    const stepIdx = stepMap[status] ?? 0;
    apps[idx].timeline = apps[idx].timeline.map((t, i) => ({
      ...t,
      done: i <= stepIdx,
      date: i <= stepIdx ? (t.date === "Pending" || t.date === "—" ? new Date().toLocaleDateString("en-IN") : t.date) : t.date,
    }));
    localStorage.setItem(STORE_KEYS.APPLICATIONS, JSON.stringify(apps));
  }
}
// ── GRIEVANCES ──
export const GRIEVANCE_KEY = "nsp_grievances";

export function getGrievances() {
  return JSON.parse(localStorage.getItem(GRIEVANCE_KEY) || "[]");
}

export function saveGrievance(grievance) {
  const list = getGrievances();
  list.push(grievance);
  localStorage.setItem(GRIEVANCE_KEY, JSON.stringify(list));
}

export function updateGrievance(id, updates) {
  const list = getGrievances();
  const idx = list.findIndex(g => g.id === id);
  if (idx >= 0) {
    list[idx] = { ...list[idx], ...updates };
    localStorage.setItem(GRIEVANCE_KEY, JSON.stringify(list));
  }
}

export function generateGrievanceId() {
  return `GRV-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;
}