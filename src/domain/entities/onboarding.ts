export type UserType = "individual" | "institute" | "school";

export type BrandColorId =
  | "indigo"
  | "lavender"
  | "pink"
  | "orange"
  | "green"
  | "sky"
  | "red"
  | "teal";

export interface OnboardingState {
  userType: UserType | null;
  ownerName: string;
  platformName: string;
  subdomain: string;
  /** Generated slug e.g. `akhil-academy-x7k2` -used in tenant URL */
  tenantSlug: string;
  /** Preset id (legacy) or hex e.g. #4F46E5 */
  brandColor: string;
  teachingSubjects: string[];
}

export const ONBOARDING_TOTAL_STEPS = 5;

export const DEFAULT_ONBOARDING_STATE: OnboardingState = {
  userType: null,
  ownerName: "",
  platformName: "",
  subdomain: "",
  tenantSlug: "",
  brandColor: "#4F46E5",
  teachingSubjects: [],
};
