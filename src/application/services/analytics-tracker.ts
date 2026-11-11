"use client";

export interface LeadCaptureInput {
  fullName: string;
  email?: string;
  phone?: string;
  source?: string;
  courseInterest?: string;
  notes?: string;
}

/** Stores a school-site enquiry (demo booking) for the school admin. */
export async function trackLeadCapture(
  tenant: string,
  lead: LeadCaptureInput,
  eventType = "callback_requested",
): Promise<void> {
  if (!tenant) return;
  try {
    await fetch(`/api/tenants/${encodeURIComponent(tenant)}/seniors/demo-request`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ eventType, lead }),
    });
  } catch {
    // Non-blocking
  }
}
