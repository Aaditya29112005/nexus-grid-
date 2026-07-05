import { Request, Response, Router } from 'express';
import { prisma } from '../services/db';
import { redisClient } from '../services/redis';

export const apiRouter = Router();

// Store startup time to calculate uptime
const startupTime = Date.now();

// GET /api/grid - Returns the complete cached grid board state
apiRouter.get('/grid', async (req: Request, res: Response) => {
  try {
    const cachedTiles = await redisClient.hGetAll('grid:tiles');
    
    // Parse tile values
    const tilesList = Object.values(cachedTiles).map((tileJson) => JSON.parse(tileJson));
    
    res.json(tilesList);
  } catch (error) {
    console.error('Error fetching grid state:', error);
    res.status(500).json({ error: 'Failed to fetch grid state' });
  }
});

// GET /api/leaderboard - Returns top users
apiRouter.get('/leaderboard', async (req: Request, res: Response) => {
  try {
    const topUsers = await prisma.user.findMany({
      orderBy: { score: 'desc' },
      take: 20,
      select: {
        id: true,
        username: true,
        avatar: true,
        color: true,
        score: true,
      },
    });
    res.json(topUsers);
  } catch (error) {
    console.error('Error fetching leaderboard:', error);
    res.status(500).json({ error: 'Failed to fetch leaderboard' });
  }
});

// GET /api/history - Returns last 100 captures (or all for replay mode)
apiRouter.get('/history', async (req: Request, res: Response) => {
  try {
    const history = await prisma.history.findMany({
      orderBy: { timestamp: 'asc' }, // Order by time ascending for replay timeline sequencing
      take: 1000,
      include: {
        oldOwner: {
          select: { username: true },
        },
        newOwner: {
          select: { username: true },
        },
      },
    });

    const formattedHistory = history.map((record) => ({
      id: record.id,
      tileId: record.tileId,
      timestamp: record.timestamp,
      oldOwnerName: record.oldOwner?.username || null,
      newOwnerName: record.newOwner.username,
    }));

    res.json(formattedHistory);
  } catch (error) {
    console.error('Error fetching history:', error);
    res.status(500).json({ error: 'Failed to fetch history' });
  }
});

// GET /api/stats - Developer dashboard statistics
apiRouter.get('/stats', async (req: Request, res: Response) => {
  try {
    const totalUsers = await prisma.user.count();
    const totalCaptures = await prisma.history.count();
    const activeCount = await redisClient.sCard('online:users');
    
    // Calculate total active captures in past 10 seconds for heat estimation
    const activeRegions = await prisma.tile.count({
      where: {
        updatedAt: {
          gte: new Date(Date.now() - 10000),
        },
      },
    });

    res.json({
      uptime: Math.floor((Date.now() - startupTime) / 1000),
      totalUsers,
      totalCaptures,
      activeUsers: activeCount,
      activeCapturesTenSecs: activeRegions,
    });
  } catch (error) {
    console.error('Error fetching analytics stats:', error);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});
