import { io, Socket } from 'socket.io-client';

const SERVER_URL = 'http://localhost:5001';
const BOT_COUNT = 30; // Number of concurrent bots simulating captures
const DURATION_MS = 10000; // Run the test for 10 seconds
const CLICK_INTERVAL_MS = 150; // Capture rate: every 150ms per bot

const bots: Socket[] = [];
let totalAttempted = 0;
let totalSucceeded = 0;
let totalFailed = 0;

console.log(`Starting real-time strategy stress test...`);
console.log(`Spawning ${BOT_COUNT} concurrent websocket bots connected to ${SERVER_URL}...`);

// Spawn bots
for (let i = 0; i < BOT_COUNT; i++) {
  const botId = `bot-${i}-${Math.random().toString(36).substring(2, 6)}`;
  const socket = io(SERVER_URL, {
    transports: ['websocket'],
    forceNew: true,
  });

  const botProfile = {
    id: botId,
    username: `StressBot_${i}`,
    avatar: '🤖',
    color: 'linear-gradient(135deg, #00F0FF, #0072FF)',
  };

  socket.on('connect', () => {
    socket.emit('join', botProfile);

    // Setup random click loops
    const clickInterval = setInterval(() => {
      const x = Math.floor(Math.random() * 100);
      const y = Math.floor(Math.random() * 100);
      const tileId = `${x},${y}`;

      totalAttempted++;
      socket.emit('capture', { tileId, userId: botId });
    }, CLICK_INTERVAL_MS);

    // Stop bot click loop after duration has elapsed
    setTimeout(() => {
      clearInterval(clickInterval);
      socket.disconnect();
    }, DURATION_MS);
  });

  socket.on('capture_success', (payload) => {
    if (payload.tile.ownerId === botId) {
      totalSucceeded++;
    }
  });

  socket.on('capture_failed', () => {
    totalFailed++;
  });

  bots.push(socket);
}

// Log stats every 1.5 seconds
const reportInterval = setInterval(() => {
  console.log(`[Status] Attempts: ${totalAttempted} | Success: ${totalSucceeded} | Conflicts/Fails: ${totalFailed}`);
}, 1500);

// Close report loggers
setTimeout(() => {
  clearInterval(reportInterval);
  console.log(`\n--- Stress Test Completed ---`);
  console.log(`Total Attempts: ${totalAttempted}`);
  console.log(`Success Captures: ${totalSucceeded}`);
  console.log(`Conflicts Handled: ${totalFailed}`);
  console.log(`Success Rate: ${((totalSucceeded / totalAttempted) * 100).toFixed(1)}%`);
  console.log(`Conflict Resolution Rate: ${((totalFailed / totalAttempted) * 100).toFixed(1)}%`);
  process.exit(0);
}, DURATION_MS + 500);
