import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { readFileSync, writeFileSync } from 'node:fs';
import { WebSocketServer } from 'ws';
import { AlarmSession, MODES, STATES } from './session.js';

const port = Number(process.env.PORT || 8787);
const storeFile = new URL('./store.json', import.meta.url);

function loadPreviousPhoneOnly() {
  try {
    return JSON.parse(readFileSync(storeFile, 'utf8')).lastMode === MODES.PHONE;
  } catch {
    return false;
  }
}

let previousPhoneOnly = loadPreviousPhoneOnly();
const session = new AlarmSession({ previousPhoneOnly });
const clients = new Set();
let laptopOnline = false;

function persistCompletion() {
  if (session.state !== STATES.COMPLETE || !session.mode) return;
  previousPhoneOnly = session.mode === MODES.PHONE;
  writeFileSync(storeFile, JSON.stringify({ lastMode: session.mode }));
}

const server = http.createServer(async (request, response) => {
  const file = request.url === '/agent' ? 'public/agent.html' : 'public/index.html';
  try {
    const body = await readFile(file);
    response.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
    response.end(body);
  } catch {
    response.writeHead(404);
    response.end('Not found');
  }
});

const wss = new WebSocketServer({ server });
function broadcast() {
  const message = JSON.stringify({ type: 'state', state: session.snapshot(), laptopOnline });
  for (const client of clients) if (client.readyState === 1) client.send(message);
}

wss.on('connection', (socket) => {
  clients.add(socket);
  socket.on('message', (raw) => {
    let message;
    try { message = JSON.parse(raw); } catch { return; }
    if (message.type === 'laptop-online') {
      laptopOnline = true;
      session.laptopConnected();
    } else if (message.type === 'laptop-offline') {
      laptopOnline = false;
    } else if (message.type === 'schedule') {
      session.schedule(message.target);
      session.previousPhoneOnly = previousPhoneOnly;
    } else if (message.type === 'ring') {
      session.ring();
    } else if (message.type === 'dismiss') {
      session.dismiss();
    } else if (message.type === 'tick') {
      session.tick({ working: message.working, checkIn: message.checkIn });
    } else if (message.type === 'end') {
      session.end();
    }
    persistCompletion();
    broadcast();
  });
  socket.on('close', () => clients.delete(socket));
  socket.send(JSON.stringify({ type: 'state', state: session.snapshot(), laptopOnline }));
});

server.listen(port, () => console.log(`Offline Alarm running at http://localhost:${port}`));
