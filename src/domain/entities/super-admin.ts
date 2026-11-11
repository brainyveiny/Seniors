export interface PlatformSuperAdmin {
  id: string;
  fullName: string;
  email: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  lastLoginAt: string | null;
}

export interface SuperAdminSession {
  userId: string;
  role: "super-admin";
  email: string;
  fullName: string;
}
