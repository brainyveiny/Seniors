import {
  ACADEMY_IMAGE_MAX_BYTES,
  ACADEMY_IMAGE_MAX_MB,
  isAllowedAcademyImageMime,
} from "@/shared/lib/academy-image-limits";

const PDF_MAX_BYTES = 15 * 1024 * 1024;
const PDF_MAX_MB = 15;

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") resolve(reader.result);
      else reject(new Error("Could not read file"));
    };
    reader.onerror = () => reject(reader.error ?? new Error("Could not read file"));
    reader.readAsDataURL(file);
  });
}

function isPdfFile(file: File) {
  return file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
}

export function validateSeniorsDiagramFile(file: File): string | null {
  if (!isAllowedAcademyImageMime(file.type)) {
    return "Use JPG, PNG, WebP, or GIF only.";
  }
  if (file.size > ACADEMY_IMAGE_MAX_BYTES) {
    return `Image must be ${ACADEMY_IMAGE_MAX_MB} MB or smaller.`;
  }
  if (file.size === 0) {
    return "Empty file.";
  }
  return null;
}

export function validateSeniorsNotesFile(file: File): string | null {
  if (!isPdfFile(file) && !isAllowedAcademyImageMime(file.type)) {
    return "Use PDF, JPG, PNG, WebP, or GIF.";
  }
  const maxBytes = isPdfFile(file) ? PDF_MAX_BYTES : ACADEMY_IMAGE_MAX_BYTES;
  const maxMb = isPdfFile(file) ? PDF_MAX_MB : ACADEMY_IMAGE_MAX_MB;
  if (file.size > maxBytes) {
    return `File must be ${maxMb} MB or smaller.`;
  }
  if (file.size === 0) {
    return "Empty file.";
  }
  return null;
}

async function uploadSeniorsMedia(tenant: string, file: File): Promise<string> {
  if (!tenant.trim()) {
    throw new Error("Tenant not loaded");
  }

  const formData = new FormData();
  formData.set("file", file);

  const res = await fetch(
    `/api/tenants/${encodeURIComponent(tenant)}/seniors/media/upload`,
    { method: "POST", body: formData },
  );

  const data = (await res.json()) as { url?: string; error?: string; code?: string };

  // Legacy fallback for images only when cloud storage is missing
  if (
    res.status === 503 &&
    (data.code === "R2_NOT_CONFIGURED" || data.code === "STORAGE_NOT_CONFIGURED")
  ) {
    if (isPdfFile(file)) {
      throw new Error(
        "PDF upload needs cloud storage. Configure R2_* or Firebase Storage, then redeploy.",
      );
    }
    return fileToDataUrl(file);
  }

  if (!res.ok || !data.url) {
    throw new Error(data.error ?? "Upload failed");
  }

  return data.url;
}

/** Upload one diagram image; stores URL only (not embedded in topic PATCH body). */
export async function uploadSeniorsDiagram(tenant: string, file: File): Promise<string> {
  const validationError = validateSeniorsDiagramFile(file);
  if (validationError) {
    throw new Error(validationError);
  }
  return uploadSeniorsMedia(tenant, file);
}

/** Upload homework / notes PDF or image attachment. */
export async function uploadSeniorsAttachment(tenant: string, file: File): Promise<string> {
  return uploadSeniorsNotesFile(tenant, file);
}

/** Upload a notes PDF (or image attachment) for topic content. */
export async function uploadSeniorsNotesFile(tenant: string, file: File): Promise<string> {
  const validationError = validateSeniorsNotesFile(file);
  if (validationError) {
    throw new Error(validationError);
  }
  return uploadSeniorsMedia(tenant, file);
}
