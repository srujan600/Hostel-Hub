import crypto from "crypto";

export function generateId(): string {
  // CUID-like 25-character unique string
  return "c" + Date.now().toString(36) + crypto.randomBytes(8).toString("hex");
}

export function escapeRegex(text: string): string {
  return text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&");
}

export const baseSchemaOptions = {
  timestamps: true,
  toJSON: {
    virtuals: true,
    transform: (_doc: any, ret: any) => {
      ret.id = ret._id;
      delete ret._id;
      delete ret.__v;
      return ret;
    },
  },
  toObject: {
    virtuals: true,
    transform: (_doc: any, ret: any) => {
      ret.id = ret._id;
      delete ret._id;
      delete ret.__v;
      return ret;
    },
  },
};

export function sanitizeDoc<T = any>(doc: any): T {
  if (!doc) return doc;
  if (Array.isArray(doc)) {
    return doc.map(sanitizeDoc) as unknown as T;
  }
  if (typeof doc === "object") {
    const copy = { ...doc };
    if (copy._id && !copy.id) {
      copy.id = copy._id;
    }
    delete copy._id;
    delete copy.__v;
    return copy as T;
  }
  return doc;
}
