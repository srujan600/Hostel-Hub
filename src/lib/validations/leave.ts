import { z } from "zod";

export const createLeaveRequestSchema = z
  .object({
    leaveType: z.enum(["DAY_OUTING", "OVERNIGHT", "VACATION", "EMERGENCY"]),
    startDate: z.string().datetime({ message: "Invalid start date format (ISO 8601 expected)" }),
    endDate: z.string().datetime({ message: "Invalid return date format (ISO 8601 expected)" }),
    reason: z.string().min(10, "Reason must be at least 10 characters").max(500),
    destination: z.string().min(3, "Destination is required").max(200),
    emergencyContact: z.string().min(10, "Emergency contact phone is required").max(15),
  })
  .refine(
    (data) => {
      const start = new Date(data.startDate).getTime();
      const end = new Date(data.endDate).getTime();
      return end > start;
    },
    {
      message: "Return date must be strictly after departure date",
      path: ["endDate"],
    }
  );

export const adjudicateLeaveSchema = z.object({
  status: z.enum(["APPROVED", "REJECTED"]),
  reviewRemarks: z.string().max(500).optional(),
});

export type CreateLeaveRequestInput = z.infer<typeof createLeaveRequestSchema>;
export type AdjudicateLeaveInput = z.infer<typeof adjudicateLeaveSchema>;
