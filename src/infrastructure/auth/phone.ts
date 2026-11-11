export function normalizePhone(input: string): string {
  return input.replace(/\s+/g, "").replace(/[^\d+]/g, "");
}

export function phoneDigits(input: string): string {
  return input.replace(/\D/g, "");
}

export function phonesMatch(a: string, b: string): boolean {
  const na = normalizePhone(a);
  const nb = normalizePhone(b);
  if (na === nb) return true;
  const da = phoneDigits(a);
  const db = phoneDigits(b);
  if (da === db) return true;
  if (da.length >= 10 && db.length >= 10 && da.slice(-10) === db.slice(-10)) {
    return true;
  }
  return false;
}

export function generateOtp(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}

/** E.164 format for Firebase / international SMS (+91XXXXXXXXXX). */
export function toE164Phone(phone: string, defaultCountryCode = "91"): string {
  const digits = phoneDigits(phone);
  if (phone.trim().startsWith("+")) return `+${digits}`;
  if (digits.length === 10) return `+${defaultCountryCode}${digits}`;
  if (digits.startsWith("91") && digits.length === 12) return `+${digits}`;
  if (digits.startsWith("0") && digits.length === 11) {
    return `+${defaultCountryCode}${digits.slice(1)}`;
  }
  return `+${digits}`;
}

/** WhatsApp Cloud API expects country code without + (e.g. 919876543210). */
export function toWhatsappMobile(phone: string, defaultCountryCode = "91"): string {
  const digits = phoneDigits(phone);
  if (digits.length === 10) return `${defaultCountryCode}${digits}`;
  if (digits.startsWith("0") && digits.length === 11) {
    return `${defaultCountryCode}${digits.slice(1)}`;
  }
  return digits;
}

/** MSG91 expects Indian mobiles as 91XXXXXXXXXX (no +). */
export function toMsg91Mobile(phone: string): string {
  return toWhatsappMobile(phone);
}
