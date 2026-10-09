import { NextRequest } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { Hostel, Block, Floor, Room, Bed } from "@/models";
import { requireAuth } from "@/lib/auth";
import { successResponse, errorResponse } from "@/lib/api-response";
import { BadRequestError, ForbiddenError } from "@/lib/errors";
import { AuditService } from "@/services/audit-service";

export async function GET(req: NextRequest) {
  try {
    await requireAuth(req);
    await connectToDatabase();

    const hostels = await Hostel.find().sort({ name: 1 }).lean();

    const enrichedHostels = await Promise.all(
      hostels.map(async (h) => {
        const blocks = await Block.find({ hostelId: h._id }).lean();
        const blockIds = blocks.map((b) => b._id);

        const floors = await Floor.find({ blockId: { $in: blockIds } }).lean();
        const floorIds = floors.map((f) => f._id);

        const rooms = await Room.find({ floorId: { $in: floorIds } }).lean();
        const roomIds = rooms.map((r) => r._id);

        const beds = await Bed.find({ roomId: { $in: roomIds } }).lean();

        let occupiedBeds = 0;
        let availableBeds = 0;

        beds.forEach((bed) => {
          if (bed.status === "OCCUPIED") occupiedBeds++;
          else if (bed.status === "AVAILABLE") availableBeds++;
        });

        const totalRooms = rooms.length;
        const totalBeds = beds.length;

        const blocksWithCounts = blocks.map((b) => {
          const bFloors = floors.filter((f) => f.blockId === b._id);
          const bFloorIds = bFloors.map((f) => f._id);
          const bRooms = rooms.filter((r) => bFloorIds.includes(r.floorId));
          return {
            id: b._id,
            code: b.code,
            name: b.name,
            totalFloors: bFloors.length,
            totalRooms: bRooms.length,
          };
        });

        return {
          id: h._id,
          code: h.code,
          name: h.name,
          description: h.description,
          address: h.address,
          genderType: h.genderType,
          status: h.status,
          totalBlocks: blocks.length,
          totalRooms,
          totalBeds,
          occupiedBeds,
          availableBeds,
          occupancyRate: totalBeds > 0 ? Math.round((occupiedBeds / totalBeds) * 100) : 0,
          blocks: blocksWithCounts,
        };
      })
    );

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

    await connectToDatabase();

    const existing = await Hostel.findOne({ code: code.trim().toUpperCase() });
    if (existing) {
      throw new BadRequestError(`Hostel with code ${code} already exists`);
    }

    const hostel = await Hostel.create({
      code: code.trim().toUpperCase(),
      name: name.trim(),
      description: description?.trim() || null,
      address: address?.trim() || null,
      genderType: genderType || "CO_ED",
      status: "ACTIVE",
    });

    await AuditService.record({
      actorId: session.id,
      actorRole: session.role,
      actorName: session.name,
      action: "HOSTEL_CREATED",
      targetType: "Hostel",
      targetId: hostel._id,
      details: { code: hostel.code, name: hostel.name },
      ipAddress: req.headers.get("x-forwarded-for") || undefined,
    });

    return successResponse(hostel.toJSON());
  } catch (error) {
    return errorResponse(error);
  }
}
