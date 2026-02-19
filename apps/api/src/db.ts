import path from 'node:path';
import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';

// Root .env laden, wenn DATABASE_URL nicht bereits gesetzt ist (CI/Docker bleibt unangetastet)
if (!process.env.DATABASE_URL) {
  dotenv.config({ path: path.resolve(process.cwd(), '../../.env') });
}

export const prisma = new PrismaClient();