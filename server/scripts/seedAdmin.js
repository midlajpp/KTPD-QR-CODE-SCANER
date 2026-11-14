import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(process.cwd(), '.env') });
dotenv.config({ path: path.resolve(__dirname, '../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

import mongoose from 'mongoose';
import Admin from '../models/Admin.js';
import { connectDB, disconnectDB } from '../config/db.js';

const seedAdmin = async () => {
  try {
    console.log('[Seed] Connecting to database...');
    await connectDB();

    const username = (process.env.ADMIN_USERNAME || 'admin').trim().toLowerCase();
    const email = (process.env.ADMIN_EMAIL || '').trim().toLowerCase();
    const password = process.env.ADMIN_PASSWORD || '';

    if (!email || !password) {
      console.error('[Seed Error] ADMIN_EMAIL and ADMIN_PASSWORD must be configured in environment variables (.env).');
      await disconnectDB();
      process.exit(1);
    }

    console.log(`[Seed] Checking Super Admin account (${username} / ${email})...`);

    const existingAdmin = await Admin.findOne({ email });

    if (existingAdmin) {
      console.log(`[Seed] Super Admin account already exists: ${email}. Preserving existing account.`);
    } else {
      const passwordHash = await Admin.hashPassword(password);
      await Admin.create({
        username,
        email,
        passwordHash,
        role: 'superadmin',
        fullName: process.env.ADMIN_FULL_NAME || 'Super Admin',
        status: 'active'
      });
      console.log(`[Seed] Successfully created initial Super Admin account: ${email}`);
    }

    console.log('[Seed] Initial Super Admin setup complete.');
    console.log(`-----------------------------------------------`);
    console.log(`Username: ${username}`);
    console.log(`Email:    ${email}`);
    console.log(`Role:     superadmin`);
    console.log(`Password: [PROTECTED - Stored securely via bcrypt]`);
    console.log(`-----------------------------------------------`);

    await disconnectDB();
    process.exit(0);
  } catch (error) {
    console.error('[Seed Error]', error);
    await disconnectDB();
    process.exit(1);
  }
};

seedAdmin();
