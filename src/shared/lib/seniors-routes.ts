/** Legacy portal path → PDS route redirects */
export const LEGACY_PORTAL_REDIRECTS: Record<string, string> = {
  "portal/student": "student/home",
  "portal/student/learn": "student/learn",
  "portal/student/practice": "student/exam-prep",
  "portal/student/analytics": "student/progress",
  "portal/student/ai": "student/ai-doubts",
  "portal/parent": "parent/dashboard",
  "portal/parent/reports": "parent/children",
  "portal/parent/alerts": "parent/announcements",
  "portal/parent/messages": "parent/announcements",
};
