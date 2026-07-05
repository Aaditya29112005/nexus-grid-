import { createClient } from 'redis';
import { REDIS_URL } from '../config';
import { prisma } from './db';

export const redisClient = createClient({
  url: REDIS_URL,
});

redisClient.on('error', (err) => console.error('Redis Client Error', err));

export async function initRedis() {
  if (!redisClient.isOpen) {
    await redisClient.connect();
    console.log('Connected to Redis');
  }

  // Check if grid cache is populated. If not, populate it from DB or seed
  const cacheExists = await redisClient.exists('grid:tiles');
  if (!cacheExists) {
    console.log('Grid cache empty. Initializing grid state...');
    await syncRedisWithDB();
  }
}

// Sync Redis from database (and seed if DB is empty)
export async function syncRedisWithDB() {
  const dbTilesCount = await prisma.tile.count();
  
  if (dbTilesCount === 0) {
    console.log('Seeding 10,000 tiles in database...');
    const tilesData = [];
    for (let x = 0; x < 100; x++) {
      for (let y = 0; y < 100; y++) {
        tilesData.push({
          id: `${x},${y}`,
          captureCount: 0,
        });
      }
    }
    // Chunk database seeding to prevent transaction payload limits
    const chunkSize = 2000;
    for (let i = 0; i < tilesData.length; i += chunkSize) {
      const chunk = tilesData.slice(i, i + chunkSize);
      await prisma.tile.createMany({
        data: chunk,
        skipDuplicates: true,
      });
    }
    console.log('Database seeding completed.');
  }

  // Load all tiles from DB including owners
  const dbTiles = await prisma.tile.findMany({
    include: {
      owner: true,
    },
  });

  console.log(`Caching ${dbTiles.length} tiles in Redis...`);
  
  // Prepare batch for Redis hash
  const redisHash: Record<string, string> = {};
  for (const tile of dbTiles) {
    redisHash[tile.id] = JSON.stringify({
      id: tile.id,
      ownerId: tile.ownerId || null,
      username: tile.owner?.username || null,
      avatar: tile.owner?.avatar || null,
      color: tile.owner?.color || null,
      updatedAt: tile.updatedAt.toISOString(),
      captureCount: tile.captureCount,
    });
  }

  // Store in Redis HSET
  if (Object.keys(redisHash).length > 0) {
    await redisClient.hSet('grid:tiles', redisHash);
    console.log('Redis grid cache populated.');
  }
}

// Atomic lock acquisition helper
export async function acquireLock(key: string, ttlMs: number = 1000): Promise<boolean> {
  const lockKey = `lock:${key}`;
  const acquired = await redisClient.set(lockKey, 'locked', {
    NX: true,
    PX: ttlMs,
  });
  return acquired === 'OK';
}

export async function releaseLock(key: string): Promise<void> {
  const lockKey = `lock:${key}`;
  await redisClient.del(lockKey);
}
