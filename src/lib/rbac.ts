import { Role } from "@/types";
import { ForbiddenError, UnauthorizedError } from "./errors";

export const ROLE_HIERARCHY: Record<Role, number> = {
  STUDENT: 1,
  SECURITY: 2,
  WARDEN: 3,
  ADMIN: 4,
  SUPER_ADMIN: 5,
};

export const PERMISSIONS = {
  // Complaints
  COMPLAINT_CREATE: ["STUDENT", "WARDEN", "ADMIN", "SUPER_ADMIN"],
  COMPLAINT_ASSIGN: ["WARDEN", "ADMIN", "SUPER_ADMIN"],
  COMPLAINT_UPDATE_STATUS: ["WARDEN", "ADMIN", "SUPER_ADMIN"],
  COMPLAINT_VIEW_ALL: ["WARDEN", "ADMIN", "SUPER_ADMIN"],
  
  // Leave / Outings
  LEAVE_REQUEST_CREATE: ["STUDENT"],
  LEAVE_REQUEST_ADJUDICATE: ["WARDEN", "ADMIN", "SUPER_ADMIN"],
  LEAVE_VIEW_ALL: ["WARDEN", "ADMIN", "SUPER_ADMIN"],
  
  // Room Allocation & Management
  ROOM_MANAGE: ["ADMIN", "SUPER_ADMIN"],
  BED_ALLOCATE: ["ADMIN", "SUPER_ADMIN"],
  BED_TRANSFER: ["ADMIN", "SUPER_ADMIN"],
  BED_VACATE: ["ADMIN", "SUPER_ADMIN"],
  
  // Visitors
  VISITOR_REGISTER: ["STUDENT", "WARDEN", "ADMIN", "SUPER_ADMIN"],
  VISITOR_ADJUDICATE: ["WARDEN", "ADMIN", "SUPER_ADMIN"],
  VISITOR_CHECK_IN_OUT: ["SECURITY", "WARDEN", "ADMIN", "SUPER_ADMIN"],
  
  // Attendance
  ATTENDANCE_RECORD: ["WARDEN", "ADMIN", "SUPER_ADMIN"],
  ATTENDANCE_VIEW_ALL: ["WARDEN", "ADMIN", "SUPER_ADMIN"],
  
  // Notices
  NOTICE_PUBLISH: ["WARDEN", "ADMIN", "SUPER_ADMIN"],
  
  // Audit Logs & System
  AUDIT_LOG_VIEW: ["ADMIN", "SUPER_ADMIN"],
  USER_MANAGE: ["ADMIN", "SUPER_ADMIN"],
} as const;

export type PermissionKey = keyof typeof PERMISSIONS;

export function hasPermission(role: Role, permission: PermissionKey): boolean {
  const allowedRoles = PERMISSIONS[permission] as readonly Role[];
  return allowedRoles.includes(role);
}

export function requirePermission(role: Role, permission: PermissionKey): void {
  if (!hasPermission(role, permission)) {
    throw new ForbiddenError(`Role '${role}' is not authorized to execute permission '${permission}'`);
  }
}

export function requireRoles(currentRole: Role, allowedRoles: Role[]): void {
  if (!allowedRoles.includes(currentRole)) {
    throw new ForbiddenError(`Access denied. Required roles: ${allowedRoles.join(", ")}`);
  }
}
