const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const { setupGameHandlers } = require('./socket/gameHandler');

const app = express();
const server = http.createServer(app);

const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:3000',
  process.env.FRONTEND_URL
].filter(Boolean);

const io = new Server(server, {
  cors: {
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.some(allowed => origin.startsWith(allowed))) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    methods: ['GET', 'POST'],
    credentials: true
  },
});

// ─── Security Headers Middleware ──────────────────────────────────────────────
app.use((req, res, next) => {
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
  res.setHeader('Content-Security-Policy', "default-src 'self'; style-src 'self' 'unsafe-inline'; script-src 'self' 'unsafe-inline' 'unsafe-eval';");
  next();
});

// ─── IP Rate Limiter Middleware ───────────────────────────────────────────────
const rateLimitMap = new Map();
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
const MAX_REQUESTS = 100; // max 100 requests per minute

app.use((req, res, next) => {
  const ip = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress;
  const now = Date.now();

  if (!rateLimitMap.has(ip)) {
    rateLimitMap.set(ip, []);
  }

  const timestamps = rateLimitMap.get(ip).filter(t => now - t < RATE_LIMIT_WINDOW);
  timestamps.push(now);
  rateLimitMap.set(ip, timestamps);

  if (timestamps.length > MAX_REQUESTS) {
    return res.status(429).json({ error: 'Too many requests. Please try again later.' });
  }
  next();
});

const path = require('path');
const frontendDistPath = path.join(__dirname, '../frontend/dist');
app.use(express.static(frontendDistPath));

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.some(allowed => origin.startsWith(allowed))) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));
app.use(express.json());

app.get('/health', (_req, res) =>
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
);

app.post('/api/log', (req, res) => {
  const { type, message, args } = req.body;
  const prefix = type === 'error' ? '🔴 [Client Error]' : '⚪ [Client Log]';
  console.log(`${prefix} ${message}`, args ? JSON.stringify(args) : '');
  res.sendStatus(200);
});

// Fallback to React Router client index.html
app.get('/{*splat}', (req, res) => {
  res.sendFile(path.join(frontendDistPath, 'index.html'), (err) => {
    if (err) {
      res.status(200).send('ProjectChess backend is running. Build the frontend/dist folder to serve the client here.');
    }
  });
});

io.on('connection', (socket) => {
  console.log(`[Socket] + connected  ${socket.id}`);
  socket.onAny((event, ...args) => {
    console.log(`[Socket Event] received "${event}" from ${socket.id}:`, JSON.stringify(args));
  });
  setupGameHandlers(io, socket);
  socket.on('disconnect', () =>
    console.log(`[Socket] - disconnected ${socket.id}`)
  );
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`\n♟️  ProjectChess backend → http://localhost:${PORT}\n`);
});
