export type Role = "STUDENT" | "WARDEN" | "ADMIN" | "SUPER_ADMIN" | "SECURITY";

export interface UserSession {
  id: string;
  username: string;
  name: string;
  email: string;
  role: Role;
  status: "ACTIVE" | "INACTIVE" | "SUSPENDED";
  studentId?: string;
  staffId?: string;
  hostelId?: string;
}

export type ComplaintStatus = "SUBMITTED" | "ASSIGNED" | "IN_PROGRESS" | "RESOLVED" | "CLOSED";
export type ComplaintPriority = "LOW" | "MEDIUM" | "HIGH" | "URGENT";

export type LeaveStatus = "DRAFT" | "SUBMITTED" | "APPROVED" | "REJECTED" | "COMPLETED";
export type LeaveType = "DAY_OUTING" | "OVERNIGHT" | "VACATION" | "EMERGENCY";

export type VisitorStatus = "PENDING" | "APPROVED" | "CHECKED_IN" | "CHECKED_OUT" | "REJECTED" | "EXPIRED";

export type AttendanceStatus = "PRESENT" | "ABSENT" | "LATE" | "EXCUSED";

export type BedStatus = "AVAILABLE" | "OCCUPIED" | "MAINTENANCE" | "RESERVED";

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  meta?: {
    total?: number;
    page?: number;
    pageSize?: number;
    timestamp: string;
  };
}
