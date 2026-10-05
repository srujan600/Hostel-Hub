import { z } from "zod";

export const createComplaintSchema = z.object({
  category: z.enum([
    "ELECTRICAL",
    "PLUMBING",
    "CARPENTRY",
    "CLEANLINESS",
    "INTERNET_WIFI",
    "MESS_FOOD",
    "DISCIPLINE",
    "SECURITY",
    "OTHER",
  ]),
  title: z.string().min(5, "Title must be at least 5 characters").max(100),
  description: z.string().min(10, "Description must be at least 10 characters").max(2000),
  location: z.string().min(2, "Location is required").max(100),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).default("MEDIUM"),
  attachmentUrl: z.string().url().optional().or(z.literal("")),
});

export const updateComplaintStatusSchema = z.object({
  status: z.enum(["SUBMITTED", "ASSIGNED", "IN_PROGRESS", "RESOLVED", "CLOSED"]),
  assignedStaffId: z.string().optional(),
  comment: z.string().max(1000).optional(),
});

export type CreateComplaintInput = z.infer<typeof createComplaintSchema>;
export type UpdateComplaintStatusInput = z.infer<typeof updateComplaintStatusSchema>;
