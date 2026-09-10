import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { readFile } from 'node:fs/promises';
import { readFileSync, writeFileSync } from 'node:fs';
import { WebSocketServer } from 'ws';
import { AlarmSession, MODES, STATES } from './session.js';

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
if (store.alarm?.target && store.alarm?.alarmAt) {
  session.schedule(store.alarm.target, store.alarm.alarmAt);
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
  const data = { lastMode };
  if (session.state === STATES.SCHEDULED && session.target) {
    data.alarm = { target: session.target, alarmAt: session.alarmAt };
  } else {
    data.alarm = null;
  }
  try {
    writeFileSync(storeFile, JSON.stringify(data));
  } catch {}
}

const server = http.createServer(async (request, response) => {
  let urlPath = decodeURIComponent((request.url || '/').split('?')[0]);
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
      session.schedule(message.target, message.alarmAt);
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

// Server-driven loop: fires the alarm, re-alarms, and accrues time without trusting client clocks
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

server.listen(port, () => {
  console.log(`Wakework running:`);
  console.log(`  Phone  -> http://${lanIp()}:${port}`);
  console.log(`  Laptop -> ${agentUrl}`);
});