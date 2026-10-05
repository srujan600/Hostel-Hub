import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { ForbiddenError, BadRequestError } from "@/lib/errors";

export async function GET(req: NextRequest) {
  try {
    const session = await requireAuth(req);
    if (session.role !== "ADMIN" && session.role !== "SUPER_ADMIN" && session.role !== "WARDEN") {
      throw new ForbiddenError("Forbidden: Staff authorization required to export reports");
    }

    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type") || "occupancy";
    const dateStr = new Date().toISOString().split("T")[0];

    let csvContent = "";
    let filename = `hostelhub_${type}_report_${dateStr}.csv`;

    if (type === "occupancy") {
      const beds = await prisma.bed.findMany({
        include: {
          room: {
            include: {
              floor: {
                include: {
                  block: {
                    include: {
                      hostel: true,
                    },
                  },
                },
              },
            },
          },
          allocations: {
            where: { status: "ACTIVE" },
            include: { student: true },
          },
        },
        orderBy: [
          { room: { roomNumber: "asc" } },
          { bedNumber: "asc" },
        ],
      });

      const rows = [
        ["Hostel", "Block", "Floor", "Room Number", "Room Type", "Bed Number", "Bed Status", "Resident Name", "Resident Roll ID", "Allocated Date"],
        ...beds.map((b) => {
          const alloc = b.allocations[0];
          return [
            `"${b.room.floor.block.hostel.name}"`,
            `"${b.room.floor.block.name}"`,
            `"${b.room.floor.name}"`,
            `"${b.room.roomNumber}"`,
            `"${b.room.roomType}"`,
            `"${b.bedNumber}"`,
            `"${b.status}"`,
            `"${alloc?.student?.name || ""}"`,
            `"${alloc?.student?.studentId || ""}"`,
            `"${alloc ? new Date(alloc.allocatedAt).toLocaleDateString() : ""}"`,
          ];
        }),
      ];
      csvContent = rows.map((r) => r.join(",")).join("\n");
    } else if (type === "complaints") {
      const complaints = await prisma.complaint.findMany({
        include: {
          student: true,
          assignedStaff: true,
        },
        orderBy: { createdAt: "desc" },
      });

      const rows = [
        ["Ticket Code", "Title", "Category", "Priority", "Status", "Resident Name", "Roll ID", "Location", "Assigned Staff", "Created Date", "Resolved Date"],
        ...complaints.map((c) => [
          `"${c.complaintCode}"`,
          `"${c.title.replace(/"/g, '""')}"`,
          `"${c.category}"`,
          `"${c.priority}"`,
          `"${c.status}"`,
          `"${c.student.name}"`,
          `"${c.student.studentId}"`,
          `"${c.location}"`,
          `"${c.assignedStaff?.name || "Unassigned"}"`,
          `"${new Date(c.createdAt).toLocaleDateString()}"`,
          `"${c.resolvedAt ? new Date(c.resolvedAt).toLocaleDateString() : ""}"`,
        ]),
      ];
      csvContent = rows.map((r) => r.join(",")).join("\n");
    } else if (type === "attendance") {
      const records = await prisma.attendance.findMany({
        include: { student: true },
        orderBy: { date: "desc" },
        take: 500,
      });

      const rows = [
        ["Date", "Resident Name", "Roll ID", "Status", "Remarks"],
        ...records.map((a) => [
          `"${a.date}"`,
          `"${a.student.name}"`,
          `"${a.student.studentId}"`,
          `"${a.status}"`,
          `"${(a.remarks || "").replace(/"/g, '""')}"`,
        ]),
      ];
      csvContent = rows.map((r) => r.join(",")).join("\n");
    } else if (type === "visitors") {
      const passes = await prisma.visitorPass.findMany({
        include: {
          visitor: {
            include: { student: true },
          },
        },
        orderBy: { visitDate: "desc" },
      });

      const rows = [
        ["Pass Code", "Visitor Name", "Phone", "Relationship", "Host Resident", "Roll ID", "Visit Date", "Status", "Gate In", "Gate Out"],
        ...passes.map((p) => [
          `"${p.passCode}"`,
          `"${p.visitor.name}"`,
          `"${p.visitor.phone}"`,
          `"${p.visitor.relationship}"`,
          `"${p.visitor.student.name}"`,
          `"${p.visitor.student.studentId}"`,
          `"${new Date(p.visitDate).toLocaleDateString()}"`,
          `"${p.status}"`,
          `"${p.actualEntryTime ? new Date(p.actualEntryTime).toLocaleTimeString() : ""}"`,
          `"${p.actualExitTime ? new Date(p.actualExitTime).toLocaleTimeString() : ""}"`,
        ]),
      ];
      csvContent = rows.map((r) => r.join(",")).join("\n");
    } else if (type === "leaves") {
      const leaves = await prisma.leaveRequest.findMany({
        include: { student: true },
        orderBy: { createdAt: "desc" },
      });

      const rows = [
        ["Request Code", "Resident Name", "Roll ID", "Leave Type", "Destination", "Start Date", "End Date", "Status", "Reason"],
        ...leaves.map((l) => [
          `"${l.requestCode}"`,
          `"${l.student.name}"`,
          `"${l.student.studentId}"`,
          `"${l.leaveType}"`,
          `"${l.destination}"`,
          `"${new Date(l.startDate).toLocaleDateString()}"`,
          `"${new Date(l.endDate).toLocaleDateString()}"`,
          `"${l.status}"`,
          `"${l.reason.replace(/"/g, '""')}"`,
        ]),
      ];
      csvContent = rows.map((r) => r.join(",")).join("\n");
    } else {
      throw new BadRequestError(`Invalid export report type: ${type}`);
    }

    return new NextResponse(csvContent, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: error.statusCode || 500 });
  }
}
