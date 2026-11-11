/**
 * Verified Unsplash IDs (return HTTP 200 with ?auto=format&fit=crop).
 * Broken legacy IDs were removed -do not re-add without testing HEAD request.
 */
import { resolveAcademyImageUrl } from "@/shared/lib/academy-media-url";
const PHOTO = {
  classroom: "photo-1524178232363-1fb2b075b655",
  students: "photo-1522202176988-66273c2fd55f",
  professional: "photo-1454165804606-c3d57bc86b40",
  study: "photo-1523240795612-9a054b0db644",
  team: "photo-1551434678-e076c223a692",
  teacherA: "photo-1560250097-0b93528c311a",
  teacherB: "photo-1573496359142-b8d87734a5a2",
  teacherC: "photo-1472099645785-5658abf4ff4e",
} as const;

export type CoachingPhotoKey = keyof typeof PHOTO;

/** Same URL shape as landing page (known working in this project). */
export function coachingImage(key: CoachingPhotoKey, width = 1200): string {
  return `https://images.unsplash.com/${PHOTO[key]}?auto=format&fit=crop&w=${width}&q=85`;
}

export const COACHING_STOCK_IMAGES = {
  hero: {
    classic: coachingImage("classroom", 1200),
    vibrant: coachingImage("classroom", 1200),
    emerald: coachingImage("professional", 1200),
    bold: coachingImage("students", 1600),
    showcase: coachingImage("teacherA", 1200),
    signature: coachingImage("students", 1200),
    default: coachingImage("classroom", 1200),
  },
  banner: {
    darkEnrollment: coachingImage("team", 1920),
    default: coachingImage("team", 1600),
  },
  section: {
    classroom: coachingImage("classroom", 1920),
    library: coachingImage("study", 1920),
    study: coachingImage("study", 1920),
    lecture: coachingImage("classroom", 1920),
    campus: coachingImage("students", 1920),
    mentor: coachingImage("classroom", 1920),
  },
  course: {
    default: coachingImage("students", 800),
    exam: coachingImage("professional", 800),
    online: coachingImage("team", 800),
  },
  enrollment: {
    mock: coachingImage("professional", 900),
    live: coachingImage("classroom", 900),
  },
  instructors: [
    coachingImage("teacherA", 600),
    coachingImage("teacherB", 600),
    coachingImage("teacherC", 600),
  ],
  cta: coachingImage("students", 1600),
  about: coachingImage("classroom", 1920),
  app: coachingImage("team", 1600),
} as const;

/** Last-resort placeholder if Unsplash is unreachable */
export const COACHING_IMAGE_PLACEHOLDER =
  "https://images.unsplash.com/photo-1524178232363-1fb2b075b655?auto=format&fit=crop&w=1200&q=85";

const COURSE_FALLBACKS = [
  COACHING_STOCK_IMAGES.course.default,
  COACHING_STOCK_IMAGES.course.exam,
  COACHING_STOCK_IMAGES.course.online,
  COACHING_STOCK_IMAGES.section.campus,
];

const CATEGORY_FALLBACKS = [
  coachingImage("professional", 700),
  coachingImage("students", 700),
  coachingImage("study", 700),
  coachingImage("classroom", 700),
];

export function getInstructorPhotoUrl(index: number): string {
  return COACHING_STOCK_IMAGES.instructors[index % COACHING_STOCK_IMAGES.instructors.length]!;
}

export function getCategoryPhotoUrl(index: number): string {
  return CATEGORY_FALLBACKS[index % CATEGORY_FALLBACKS.length]!;
}

export function getCourseCoverUrl(productIndex = 0, productImage?: string): string {
  const resolved = resolveAcademyImageUrl(productImage);
  if (resolved) return resolved;
  return COURSE_FALLBACKS[productIndex % COURSE_FALLBACKS.length]!;
}

export function resolveCoachingImageUrl(
  url: string | undefined | null,
  fallback: string,
): string {
  const trimmed = url?.trim();
  if (!trimmed) return fallback;
  if (trimmed.startsWith("data:")) return trimmed;

  const resolved = resolveAcademyImageUrl(trimmed);
  if (resolved) return resolved;

  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    return trimmed;
  }
  return fallback;
}
