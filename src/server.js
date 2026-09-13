import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { readFile } from 'node:fs/promises';
import { readFileSync, writeFileSync } from 'node:fs';
import { WebSocketServer } from 'ws';
import { AlarmSession, MODES, STATES } from './session.js';
import { checkHealth } from './health.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const port = Number(process.env.PORT || 8787);
const storeFile = path.join(__dirname, 'store.json');
const publicDir = path.join(__dirname, '..', 'public');

const types = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon'
};

function loadStore() {
  try {
    return JSON.parse(readFileSync(storeFile, 'utf8'));
  } catch {
    return {};
  }
}

const store = loadStore();
let previousPhoneOnly = store.lastMode === MODES.PHONE;
const session = new AlarmSession({ previousPhoneOnly });
if (store.history) {
  session.history = store.history;
}
if (store.alarm?.target && store.alarm?.alarmAt) {
  session.schedule({
    target: store.alarm.target,
    alarmAt: store.alarm.alarmAt,
    durationMinutes: store.alarm.durationMinutes || 30
  });
  session.previousPhoneOnly = previousPhoneOnly;
}

const clients = new Set();
let laptopOnline = false;
let agentSocket = null;

function lanIp() {
  for (const list of Object.values(os.networkInterfaces())) {
    for (const net of list || []) {
      if (net.family === 'IPv4' && !net.internal) return net.address;
    }
  }
  return 'localhost';
}

const agentUrl = `http://${lanIp()}:${port}/agent`;

function persist() {
  const lastMode = session.state === STATES.COMPLETE && session.mode
    ? session.mode
    : store.lastMode || null;
  store.lastMode = lastMode;
  previousPhoneOnly = lastMode === MODES.PHONE;
  const data = { lastMode, history: session.history };
  if (session.state === STATES.SCHEDULED && session.target) {
    data.alarm = { target: session.target, alarmAt: session.alarmAt, durationMinutes: session.durationMinutes };
  } else {
    data.alarm = null;
  }
  try {
    writeFileSync(storeFile, JSON.stringify(data));
  } catch {}
}

function handleJson(response, data) {
  response.writeHead(200, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*'
  });
  response.end(JSON.stringify(data));
}

const server = http.createServer(async (request, response) => {
  let urlPath = decodeURIComponent((request.url || '/').split('?')[0]);
  
  if (request.method === 'OPTIONS') {
    response.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    });
    return response.end();
  }

  if (urlPath === '/api/status' && request.method === 'GET') {
    return handleJson(response, { state: session.snapshot(), laptopOnline, agentUrl });
  }
  if (urlPath === '/api/history' && request.method === 'GET') {
    return handleJson(response, session.getHistory());
  }
  if (urlPath === '/api/stats' && request.method === 'GET') {
    return handleJson(response, session.getStats());
  }
  if (urlPath === '/api/health' && request.method === 'GET') {
    const health = checkHealth();
    health.sessions = session.getStats().totalSessions;
    return handleJson(response, health);
  }
  if (urlPath === '/api/schedule' && request.method === 'POST') {
    let body = '';
    request.on('data', chunk => { body += chunk; });
    request.on('end', () => {
      try {
        const payload = JSON.parse(body);
        session.schedule({
          target: payload.target,
          alarmAt: payload.alarmAt,
          durationMinutes: payload.durationMinutes
        });
        session.previousPhoneOnly = previousPhoneOnly;
        persist();
        broadcast();
        handleJson(response, session.snapshot());
      } catch {
        response.writeHead(400);
        response.end('Bad Request');
      }
    });
    return;
  }

  if (urlPath === '/') urlPath = '/index.html';
  if (urlPath === '/agent') urlPath = '/agent.html';
  const filePath = path.join(publicDir, path.normalize(urlPath).replace(/^(\.\.[/\\])+/, ''));
  if (!filePath.startsWith(publicDir)) {
    response.writeHead(403);
    return response.end();
  }
  try {
    const body = await readFile(filePath);
    response.writeHead(200, { 'content-type': types[path.extname(filePath)] || 'application/octet-stream' });
    response.end(body);
  } catch {
    response.writeHead(404);
    response.end('Not found');
  }
});

function broadcast() {
  const message = JSON.stringify({
    type: 'state',
    state: session.snapshot(),
    laptopOnline,
    agentUrl
  });
  for (const client of clients) {
    if (client.readyState === 1) client.send(message);
  }
}

// WebSocket layer
const wss = new WebSocketServer({ server });

wss.on('connection', (socket) => {
  clients.add(socket);
  socket.on('message', (raw) => {
    let message;
    try {
      message = JSON.parse(raw);
    } catch {
      return;
    }
    if (message.type === 'laptop-online') {
      agentSocket = socket;
      laptopOnline = true;
      session.laptopConnected();
    } else if (message.type === 'laptop-offline') {
      laptopOnline = false;
    } else if (message.type === 'schedule') {
      session.schedule({
        target: message.target,
        alarmAt: message.alarmAt,
        durationMinutes: message.durationMinutes
      });
      session.previousPhoneOnly = previousPhoneOnly;
    } else if (message.type === 'ring') {
      session.ring();
    } else if (message.type === 'dismiss') {
      session.dismiss();
    } else if (message.type === 'resume') {
      session.resume(laptopOnline);
    } else if (message.type === 'tick') {
      session.tick({ working: message.working, checkIn: message.checkIn });
    } else if (message.type === 'end') {
      session.end();
    } else if (message.type === 'snooze') {
      session.snooze(message.minutes || 5);
    } else if (message.type === 'pause') {
      session.pause();
    } else if (message.type === 'unpause') {
      session.unpause();
    }
    persist();
    broadcast();
  });
  socket.on('close', () => {
    clients.delete(socket);
    if (socket === agentSocket) laptopOnline = false;
  });
  socket.send(JSON.stringify({ type: 'state', state: session.snapshot(), laptopOnline, agentUrl }));
});

// Server-driven loop
setInterval(() => {
  const before = session.snapshot();
  session.checkAlarm();
  if ([STATES.MONITORING, STATES.PHONE_FALLBACK, STATES.WAITING_FOR_LAPTOP].includes(session.state)) {
    session.tick({ working: session.state === STATES.MONITORING && laptopOnline });
  }
  const after = session.snapshot();
  if (before.state !== after.state) persist();
  broadcast();
}, 1000);

// Graceful shutdown
function shutdown() {
  persist();
  process.exit(0);
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

server.listen(port, () => {
  console.log(`Wakework running:`);
  console.log(`  Phone  -> http://${lanIp()}:${port}`);
  console.log(`  Laptop -> ${agentUrl}`);
});