import mongoose from "mongoose";
import { logger } from "./logger";

interface MongooseCache {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
}

declare global {
  // eslint-disable-next-line no-var
  var mongooseCache: MongooseCache | undefined;
}

let cached: MongooseCache = global.mongooseCache || { conn: null, promise: null };

if (!global.mongooseCache) {
  global.mongooseCache = cached;
}

// Connection event listeners (attach once)
if (!mongoose.connection.listenerCount("connected")) {
  mongoose.connection.on("connected", () => {
    logger.info("MongoDB: Connection established successfully");
  });

  mongoose.connection.on("error", (err) => {
    logger.error("MongoDB: Connection error encountered", err);
  });

  mongoose.connection.on("disconnected", () => {
    logger.warn("MongoDB: Connection disconnected");
  });
}

// Handle graceful shutdown on process termination
let shutdownRegistered = false;
function registerGracefulShutdown() {
  if (shutdownRegistered || typeof process === "undefined") return;
  shutdownRegistered = true;

  const handleShutdown = async (signal: string) => {
    try {
      if (mongoose.connection.readyState !== 0) {
        logger.info(`MongoDB: Closing connection due to ${signal}...`);
        await mongoose.connection.close();
        logger.info("MongoDB: Connection closed gracefully");
      }
    } catch (err) {
      logger.error("MongoDB: Error during shutdown closure", err);
    }
  };

  process.once("SIGINT", () => handleShutdown("SIGINT"));
  process.once("SIGTERM", () => handleShutdown("SIGTERM"));
}

registerGracefulShutdown();

export async function connectToDatabase(): Promise<typeof mongoose> {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error(
      "MONGODB_URI is not defined in environment variables. Please check your .env configuration."
    );
  }

  if (cached.conn && mongoose.connection.readyState === 1) {
    return cached.conn;
  }

  if (!cached.promise) {
    const maxPoolSize = process.env.MONGODB_MAX_POOL_SIZE
      ? parseInt(process.env.MONGODB_MAX_POOL_SIZE, 10)
      : 10;
    const minPoolSize = process.env.MONGODB_MIN_POOL_SIZE
      ? parseInt(process.env.MONGODB_MIN_POOL_SIZE, 10)
      : 2;
    const serverSelectionTimeoutMS = process.env.MONGODB_SERVER_SELECTION_TIMEOUT_MS
      ? parseInt(process.env.MONGODB_SERVER_SELECTION_TIMEOUT_MS, 10)
      : 5000;
    const socketTimeoutMS = process.env.MONGODB_SOCKET_TIMEOUT_MS
      ? parseInt(process.env.MONGODB_SOCKET_TIMEOUT_MS, 10)
      : 45000;

    const opts: mongoose.ConnectOptions = {
      serverSelectionTimeoutMS,
      socketTimeoutMS,
      connectTimeoutMS: 5000,
      maxPoolSize,
      minPoolSize,
      maxIdleTimeMS: 30000,
      bufferCommands: false,
      autoIndex: false, // CRITICAL: Never run index builds during runtime requests
      ...(process.env.MONGODB_DB_NAME ? { dbName: process.env.MONGODB_DB_NAME } : {}),
    };

    cached.promise = mongoose
      .connect(uri, opts)
      .then((m) => {
        cached.conn = m;
        return m;
      })
      .catch((err) => {
        cached.promise = null;
        cached.conn = null;
        logger.error("MongoDB: Failed to connect to database", err);
        throw err;
      });
  }

  try {
    cached.conn = await cached.promise;
  } catch (e) {
    cached.promise = null;
    cached.conn = null;
    throw e;
  }

  return cached.conn;
}

export function isDatabaseConnected(): boolean {
  return mongoose.connection.readyState === 1;
}

export async function disconnectDatabase(): Promise<void> {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.connection.close();
    cached.conn = null;
    cached.promise = null;
  }
}

export default connectToDatabase;
