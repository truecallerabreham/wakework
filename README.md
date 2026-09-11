# Wakework — offline phone-to-laptop alarm

Phone rings → you get up → laptop monitors 30 minutes of real work. No internet, no cloud.

## Download the app (no build needed)

Get the installable Android APK from [**Releases**](https://github.com/truecallerabreham/wakework/releases/latest): download `Wakework.apk`, open it on your phone, and allow "install unknown apps" when prompted. Every push to `main` rebuilds it automatically via GitHub Actions.

Two clients:

- **Native phone app** (`mobile/`) — a real Android app (React Native / Expo) with OS-level alarm notifications that ring even when the app is closed. Runs through Expo Go over your local Wi-Fi — no browser.
- **Web fallback** — the original phone page and laptop agent console.

## Run the laptop server

```
npm install
npm start
```

Note the printed address, e.g. `http://192.168.x.x:8787`.

## Run the native phone app (Expo Go)

1. On the laptop: `cd mobile && npm install && npx expo start`
2. On the phone: install **Expo Go** from the Play Store (one-time; needs internet — everything after that is offline).
3. Connect the phone to the same Wi-Fi or hotspot as the laptop, then scan the QR code Expo prints.
4. In the app: enter the laptop IP (e.g. `192.168.x.x`), set the alarm time and work target, tap **Set alarm**.
5. On the laptop: open `http://localhost:8787/agent` and leave the tab open.

The alarm rings via an Android OS notification — it fires even when the app is closed. Dismissing in the app starts the session.

## Web fallback

- **Phone/browser:** `http://<laptop-ip>:8787`
- **Laptop agent:** `http://localhost:8787/agent`

## How it works

1. On the phone: pick an alarm time and a work target, then tap **Set alarm**.
2. At the alarm time the phone rings. Tap **I'm up** to dismiss.
3. You have **10 minutes** to connect the laptop agent.
4. Laptop connected → it monitors the session and re-checks every **5 minutes**; invalid work re-alarms the phone.
5. Laptop unavailable → **phone-only fallback**: a timed focus session labeled `phone-only`.
6. Phone-only is allowed **once**; the next session requires the laptop or the phone keeps re-alarming.
7. If the laptop returns mid-session, it upgrades automatically to `mixed-mode`.
8. **30 validated minutes** complete the session.

## Test

```
npm test            # laptop session engine
```

Native app verification: `cd mobile && npx expo export --platform android` bundles the app cleanly.