import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Robust environment variable resolution from server and project roots
dotenv.config({ path: path.resolve(process.cwd(), '.env') });
dotenv.config({ path: path.resolve(__dirname, '../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

let mongoMemoryServer = null;

export const connectDB = async (customUri = null) => {
  try {
    let uri = customUri || process.env.MONGO_URI;
    const isTest = process.env.NODE_ENV === 'test';
    const isProduction = process.env.NODE_ENV === 'production';

    const isPlaceholder = uri && (uri.includes('<username>') || uri.includes('<password>'));
    const isMissing = !uri || uri.trim() === '';
    const isExplicitMemory = uri === 'memory';

    if (isTest) {
      // In automated test runs, isolate in memory
      try {
        const { MongoMemoryServer } = await import('mongodb-memory-server');
        if (!mongoMemoryServer) {
          mongoMemoryServer = await MongoMemoryServer.create();
        }
        uri = mongoMemoryServer.getUri();
      } catch (err) {
        console.error('[DB Test Error] Failed to initialize in-memory test runner:', err.message);
        throw err;
      }
    } else {
      // Production mode MUST strictly require a genuine MongoDB Atlas URI
      if (isProduction) {
        if (isMissing || isPlaceholder || isExplicitMemory) {
          console.error('\n================================================================');
          console.error('[DB CONFIGURATION ERROR] MongoDB Atlas URI is required in production!');
          console.error('MONGO_URI is missing, contains placeholder values, or is set to "memory".');
          console.error('Please configure your real MongoDB Atlas connection string in your .env file:');
          console.error('MONGO_URI=mongodb+srv://<username>:<password>@cluster0.mongodb.net/ktpd_db?retryWrites=true&w=majority');
          console.error('================================================================\n');
          throw new Error('MONGO_URI must be configured with a valid MongoDB Atlas connection string in production.');
        }
      }

      // Development mode
      if (isMissing || isPlaceholder || isExplicitMemory) {
        console.warn('\n================================================================');
        console.warn('[DB PERSISTENCE NOTICE] MONGO_URI is set to in-memory sandbox ("' + (uri || 'undefined') + '").');
        console.warn('Data will NOT persist permanently across server restarts or reboots.');
        console.warn('To persist all members and custom fields permanently in MongoDB Atlas:');
        console.warn('1. Open server/.env or root .env');
        console.warn('2. Set your MongoDB Atlas URI:');
        console.warn('   MONGO_URI=mongodb+srv://<user>:<password>@cluster0.mongodb.net/ktpd_db?retryWrites=true&w=majority');
        console.warn('================================================================\n');

        const { MongoMemoryServer } = await import('mongodb-memory-server');
        if (!mongoMemoryServer) {
          mongoMemoryServer = await MongoMemoryServer.create();
        }
        uri = mongoMemoryServer.getUri();
      }
    }

    const conn = await mongoose.connect(uri, {
      autoIndex: true,
      serverSelectionTimeoutMS: 8000
    });

    const isAtlas = conn.connection.host.includes('mongodb.net');
    const isMemory = !isAtlas && (conn.connection.host === '127.0.0.1' || conn.connection.host === 'localhost');
    const dbType = isAtlas
      ? 'MongoDB Atlas (Persistent Cloud Database)'
      : (isMemory ? 'In-Memory Isolated Sandbox' : 'Local Persistent MongoDB');

    console.log(`[DB] Successfully connected to: ${dbType}`);
    console.log(`[DB] Database Name: "${conn.connection.name}"`);
    console.log(`[DB] Host: "${conn.connection.host}" (Credentials secured, never exposed)`);

    return conn;
  } catch (error) {
    console.error(`\n[DB Connection Error]: ${error.message}`);
    if (process.env.NODE_ENV !== 'test') {
      console.error('[DB Alert] Server cannot start without a working database connection.');
      console.error('[DB Alert] Please verify your network, Atlas IP Whitelist (0.0.0.0/0 or current IP), and credentials.\n');
      process.exit(1);
    }
    throw error;
  }
};

export const disconnectDB = async () => {
  try {
    await mongoose.disconnect();
    if (mongoMemoryServer) {
      await mongoMemoryServer.stop();
      mongoMemoryServer = null;
    }
  } catch (error) {
    console.error(`[DB Disconnect Error]: ${error.message}`);
  }
};

