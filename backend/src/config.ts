import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

export const PORT = process.env.PORT || 5001;
export const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';
export const NODE_ENV = process.env.NODE_ENV || 'development';
