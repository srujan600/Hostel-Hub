import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { successResponse, errorResponse } from "@/lib/api-response";
import { BadRequestError, ForbiddenError } from "@/lib/errors";
import { AuditService } from "@/services/audit-service";

export async function GET(req: NextRequest) {
  try {
    await requireAuth(req);

    const hostels = await prisma.hostel.findMany({
      include: {
        blocks: {
          include: {
            floors: {
              include: {
                rooms: {
                  include: {
                    beds: true,
                  },
                },
              },
            },
          },
        },
      },
      orderBy: { name: "asc" },
    });

    const enrichedHostels = hostels.map((h) => {
      let totalRooms = 0;
      let totalBeds = 0;
      let occupiedBeds = 0;
      let availableBeds = 0;

      h.blocks.forEach((b) => {
        b.floors.forEach((f) => {
          totalRooms += f.rooms.length;
          f.rooms.forEach((r) => {
            totalBeds += r.beds.length;
            r.beds.forEach((bed) => {
              if (bed.status === "OCCUPIED") occupiedBeds++;
              else if (bed.status === "AVAILABLE") availableBeds++;
            });
          });
        });
      });

      return {
        id: h.id,
        code: h.code,
        name: h.name,
        description: h.description,
        address: h.address,
        genderType: h.genderType,
        status: h.status,
        totalBlocks: h.blocks.length,
        totalRooms,
        totalBeds,
        occupiedBeds,
        availableBeds,
        occupancyRate: totalBeds > 0 ? Math.round((occupiedBeds / totalBeds) * 100) : 0,
        blocks: h.blocks.map((b) => ({
          id: b.id,
          code: b.code,
          name: b.name,
          totalFloors: b.floors.length,
          totalRooms: b.floors.reduce((acc, f) => acc + f.rooms.length, 0),
        })),
      };
    });

    return successResponse(enrichedHostels);
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireAuth(req);
    if (session.role !== "ADMIN" && session.role !== "SUPER_ADMIN") {
      throw new ForbiddenError("Forbidden: Administrator privileges required to create hostels");
    }

    const body = await req.json();
    const { code, name, description, address, genderType } = body;

    if (!code || !name) {
      throw new BadRequestError("Hostel code and name are required");
    }

    const existing = await prisma.hostel.findUnique({
      where: { code: code.trim().toUpperCase() },
    });
    if (existing) {
      throw new BadRequestError(`Hostel with code ${code} already exists`);
    }

    const hostel = await prisma.hostel.create({
      data: {
        code: code.trim().toUpperCase(),
        name: name.trim(),
        description: description?.trim() || null,
        address: address?.trim() || null,
        genderType: genderType || "CO_ED",
        status: "ACTIVE",
      },
    });

    await AuditService.record({
      actorId: session.id,
      actorRole: session.role,
      actorName: session.name,
      action: "HOSTEL_CREATED",
      targetType: "Hostel",
      targetId: hostel.id,
      details: { code: hostel.code, name: hostel.name },
      ipAddress: req.headers.get("x-forwarded-for") || undefined,
    });

    return successResponse(hostel);
  } catch (error) {
    return errorResponse(error);
  }
}
