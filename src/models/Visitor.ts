import mongoose, { Schema, Model } from "mongoose";
import { generateId, baseSchemaOptions } from "./_utils";

export interface IVisitor {
  _id: string;
  id?: string;
  studentId: string;
  name: string;
  phone: string;
  relationship: string;
  idProofType?: string | null;
  idProofNumber?: string | null;
  address?: string | null;
  createdAt?: Date;
  updatedAt?: Date;
}

const VisitorSchema = new Schema<IVisitor>(
  {
    _id: { type: String, default: generateId },
    studentId: { type: String, required: true, ref: "Student", index: true },
    name: { type: String, required: true, trim: true },
    phone: { type: String, required: true, trim: true },
    relationship: { type: String, required: true },
    idProofType: { type: String, default: null },
    idProofNumber: { type: String, default: null },
    address: { type: String, default: null },
  },
  baseSchemaOptions
);

export const Visitor: Model<IVisitor> =
  mongoose.models.Visitor || mongoose.model<IVisitor>("Visitor", VisitorSchema);

export default Visitor;
