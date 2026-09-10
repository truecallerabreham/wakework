# Wakework — offline phone-to-laptop alarm

Phone rings → you get up → laptop monitors 30 minutes of real work. No internet, no cloud.

## Run (on the laptop)

```
npm install
npm start
```

- **Phone:** open `http://<laptop-ip>:8787` (the address is printed when the server starts, and shown on the phone page)
- **Laptop:** open `http://localhost:8787/agent` and leave the tab open

Both devices must share the same Wi-Fi network or phone hotspot. No internet needed.

## How it works

1. On the phone: pick an alarm time and a work target, then tap **Set alarm**.
2. At the alarm time the phone rings (sound + vibration). Tap **I'm up** to dismiss.
3. You have **10 minutes** to connect the laptop agent.
4. Laptop connected → it monitors the session and re-checks every **5 minutes**; invalid work re-alarms the phone.
5. Laptop unavailable → **phone-only fallback**: a timed focus session labeled `phone-only`.
6. Phone-only is allowed **once**; the next session requires the laptop or the phone keeps re-alarming.
7. If the laptop returns mid-session, it upgrades automatically to `mixed-mode`.
8. **30 validated minutes** complete the session.

## Test

```
npm test
```