# Wakework — offline phone-to-laptop alarm

Phone rings → you get up → laptop monitors real work. No internet, no cloud.

## Download the app (no build needed)

Get the installable Android APK from [**Releases**](https://github.com/truecallerabreham/wakework/releases/latest): download `Wakework.apk`, open it on your phone, and allow "install unknown apps" when prompted. Every push to `main` rebuilds it automatically via GitHub Actions.

Two clients:

- **Native phone app** (`mobile/`) — a real Android app (React Native / Expo) with OS-level alarm notifications that ring even when the app is closed. Runs through Expo Go over your local Wi-Fi — no browser.
- **Web fallback** — the original phone page and laptop agent console.

## Features

### Core
- **Alarm scheduling** — set an alarm time and a work target from the phone
- **Laptop monitoring** — laptop agent validates real work every 5 minutes
- **Phone-only fallback** — if the laptop isn't available within 10 minutes, phone-only mode counts focus time
- **Re-alarm** — if work isn't validated, the phone re-alarms every 5 minutes
- **Mixed mode** — if the laptop reconnects mid-session, it upgrades to mixed-mode

### New in v1.0
- **Snooze** — snooze the alarm 5/10/15 minutes (max 3 snoozes per alarm)
- **Pause/Resume** — pause the session up to 3 times, 5 minutes each; auto-resumes
- **Custom duration** — choose session length: 10, 15, 20, 30, 45, or 60 minutes
- **Session history** — tracks completed sessions with timestamps, modes, and targets
- **Statistics** — streak tracking, total sessions, average duration, mode distribution
- **REST API** — JSON endpoints for status, history, stats, health, and scheduling
- **Sound toggle** — mute/unmute alarm sounds on both phone and web
- **Dark mode** — web pages support system dark mode preference
- **Auto-validation** — laptop agent can auto-send "working" ticks every 5 minutes
- **Keyboard shortcuts** — press W (working) or A (away) on the laptop agent page
- **Activity log** — scrolling event log on the laptop agent console
- **Toast notifications** — state change notifications on web pages
- **Graceful shutdown** — server persists state on SIGINT/SIGTERM

## Run the laptop server

```
npm install
npm start
```

Note the printed address, e.g. `http://192.168.x.x:8787`.

## REST API

All endpoints return JSON with CORS enabled.

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/status` | Current session snapshot + connection state |
| GET | `/api/history` | Array of completed sessions |
| GET | `/api/stats` | Total sessions, streaks, average duration, mode distribution |
| GET | `/api/health` | Server status, uptime, version |
| POST | `/api/schedule` | Schedule a new alarm (JSON body: `{ target, alarmAt, durationMinutes }`) |

## Run the native phone app (Expo Go)

1. On the laptop: `cd mobile && npm install && npx expo start`
2. On the phone: install **Expo Go** from the Play Store (one-time; needs internet — everything after that is offline).
3. Connect the phone to the same Wi-Fi or hotspot as the laptop, then scan the QR code Expo prints.
4. In the app: enter the laptop IP (e.g. `192.168.x.x`), set the alarm time, choose duration, and tap **Set alarm**.
5. On the laptop: open `http://localhost:8787/agent` and leave the tab open.

The alarm rings via an Android OS notification — it fires even when the app is closed. Dismissing in the app starts the session.

## Web fallback

- **Phone/browser:** `http://<laptop-ip>:8787`
- **Laptop agent:** `http://localhost:8787/agent`

## How it works

1. On the phone: pick an alarm time, work target, and session duration, then tap **Set alarm**.
2. At the alarm time the phone rings. Tap **I'm up** to dismiss, or snooze (+5/10/15 min, max 3 times).
3. You have **10 minutes** to connect the laptop agent.
4. Laptop connected → it monitors the session and re-checks every **5 minutes**; invalid work re-alarms the phone.
5. Laptop unavailable → **phone-only fallback**: a timed focus session labeled `phone-only`.
6. Phone-only is allowed **once**; the next session requires the laptop or the phone keeps re-alarming.
7. If the laptop returns mid-session, it upgrades automatically to `mixed-mode`.
8. **Pause** the session up to 3 times (5 min max each) — paused time doesn't count.
9. Once validated minutes reach the configured duration, the session completes.

## Mobile app structure

```
mobile/
├── App.js                          # Main orchestrator
├── src/
│   ├── components/
│   │   ├── AlarmOverlay.js         # Full-screen alarm ring + snooze
│   │   ├── ConnectionStatus.js     # Animated connection indicator
│   │   ├── HistoryList.js          # Recent sessions list
│   │   ├── ProgressRing.js         # Circular progress indicator
│   │   ├── SessionCard.js          # Active session monitoring card
│   │   ├── SetupForm.js            # Alarm + duration setup form
│   │   └── StatsCard.js            # Statistics dashboard
│   ├── hooks/
│   │   ├── useAlarm.js             # Notification scheduling
│   │   └── useWebSocket.js         # Server connection management
│   ├── utils/
│   │   ├── constants.js            # Colors, ports, patterns
│   │   └── formatters.js           # Text formatting helpers
│   └── theme.js                    # Design tokens & StyleSheet
├── app.json                        # Expo config
└── package.json
```

## Test

```
npm test            # laptop session engine (14 tests)
```

Native app verification: `cd mobile && npx expo export --platform android` bundles the app cleanly.