import { z } from "zod";

export const allocateBedSchema = z.object({
  studentId: z.string().min(1, "Student ID is required"),
  bedId: z.string().min(1, "Bed ID is required"),
  academicYear: z.string().min(4, "Academic year is required (e.g. 2026-2027)"),
  remarks: z.string().max(255).optional(),
});

export const transferBedSchema = z.object({
  currentAllocationId: z.string().min(1, "Current allocation ID is required"),
  targetBedId: z.string().min(1, "Target bed ID is required"),
  reason: z.string().min(5, "Transfer reason must be at least 5 characters").max(255),
});

export const vacateBedSchema = z.object({
  allocationId: z.string().min(1, "Allocation ID is required"),
  vacateReason: z.string().min(5, "Vacate reason is required").max(255),
});

export type AllocateBedInput = z.infer<typeof allocateBedSchema>;
export type TransferBedInput = z.infer<typeof transferBedSchema>;
export type VacateBedInput = z.infer<typeof vacateBedSchema>;
