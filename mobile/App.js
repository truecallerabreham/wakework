import { useEffect, useRef, useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, Vibration, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import * as Notifications from 'expo-notifications';

const SERVER_PORT = 8787;
const RING_PATTERN = [400, 250, 400, 250, 800, 600];

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowListBanner: true,
    shouldPlaySound: true,
    shouldSetBadge: false
  })
});

async function ensureAndroidChannel() {
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync('alarm', {
    name: 'Wakework alarms',
    importance: Notifications.AndroidImportance.MAX,
    sound: 'default',
    vibrationPattern: RING_PATTERN,
    lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC
  });
}

async function scheduleAlarmNotification(date, body) {
  await Notifications.cancelAllScheduledNotificationsAsync();
  return Notifications.scheduleNotificationAsync({
    content: {
      title: 'Wakework — time to work',
      body: body || 'Get up and start your session.',
      sound: 'default'
    },
    trigger: { type: 'date', date, channelId: 'alarm' }
  });
}

function fmtClock(at) {
  if (!at) return '';
  return new Date(at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export default function App() {
  const [laptopIp, setLaptopIp] = useState('');
  const [time, setTime] = useState('06:30');
  const [target, setTarget] = useState('');
  const [status, setStatus] = useState('offline');
  const [session, setSession] = useState(null);
  const [agentUrl, setAgentUrl] = useState('');
  const [scheduledAt, setScheduledAt] = useState(null);
  const [showRing, setShowRing] = useState(false);
  const [savedIp, setSavedIp] = useState(null);
  const wsRef = useRef(null);
  const ringRef = useRef(null);

  useEffect(() => {
    ensureAndroidChannel();
    const sub = Notifications.addNotificationReceivedListener(() => {
      setShowRing(true);
      Vibration.vibrate(RING_PATTERN, true);
    });
    return () => sub.remove();
  }, []);

  useEffect(() => {
    if (showRing) Vibration.vibrate(RING_PATTERN, true);
    else Vibration.cancel();
  }, [showRing]);

  useEffect(() => {
    if (!savedIp) return;
    connect(savedIp);
    const reconnect = setInterval(() => {
      if (!wsRef.current || wsRef.current.readyState > 1) connect(savedIp);
    }, 3000);
    return () => clearInterval(reconnect);
  }, [savedIp]);

  function send(type, extra = {}) {
    const ws = wsRef.current;
    if (ws && ws.readyState === 1) ws.send(JSON.stringify({ type, ...extra }));
  }

  function connect(ip) {
    const ws = new WebSocket(`ws://${ip}:${SERVER_PORT}`);
    wsRef.current = ws;
    ws.onopen = () => setStatus('connected');
    ws.onclose = () => setStatus('offline');
    ws.onerror = () => setStatus('offline');
    ws.onmessage = event => {
      const data = JSON.parse(event.data);
      if (data.type !== 'state') return;
      setSession(data.state);
      setAgentUrl(data.agentUrl || '');
      const state = data.state;
      const ringing = state.state === 'ringing' || state.state === 're-alarm';
      setShowRing(ringing);
      if (!ringing) Vibration.cancel();
      if (ringing && Platform.OS !== 'android') Vibration.vibrate(RING_PATTERN, true);
    };
  }

  function onSetAlarm() {
    const [h, m] = (time || '06:30').split(':').map(Number);
    const at = new Date();
    at.setHours(h, m, 0, 0);
    if (at.getTime() <= Date.now()) at.setDate(at.getDate() + 1);
    setScheduledAt(at.getTime());
    scheduleAlarmNotification(at, target);
    setSavedIp(laptopIp.trim());
    send('schedule', { target, alarmAt: at.getTime() });
  }

  function onDismiss() {
    send('dismiss');
    setShowRing(false);
    Notifications.dismissAllNotificationsAsync();
  }

  const s = session;
  const inSession = s && s.target && s.state !== 'scheduled';
  const ringing = s && (s.state === 'ringing' || s.state === 're-alarm');

  function headline() {
    if (!s) return 'Connect to the laptop to begin.';
    switch (s.state) {
      case 'complete': return 'Session complete. Nice work.';
      case 're-alarm': return s.reason === 'laptop-required'
        ? 'The laptop is required today.'
        : 'Come back to work.';
      case 'phone-fallback': return 'Phone-only focus — keep going.';
      case 'waiting-for-laptop': return `Waiting for the laptop… ${s.waitingSecondsLeft ?? 600}s left.`;
      case 'monitoring': return 'Monitoring — stay with it.';
      case 'ringing': return 'Alarm!';
      case 'scheduled': return `Alarm set for ${fmtClock(s.alarmAt)}.`;
      default: return '';
    }
  }

  function detail() {
    if (!s) return 'Enter the laptop IP shown when the server starts.';
    if (s.state === 'complete') return `Result: ${s.mode}`;
    if (s.state === 're-alarm') return s.reason === 'laptop-required'
      ? 'Phone-only was used last time. Connect the laptop to continue.'
      : 'Your work was not validated. Get back within 5 minutes.';
    if (s.state === 'monitoring') return status === 'connected' ? 'The laptop is validating your work.' : 'Laptop signal lost.';
    if (s.state === 'phone-fallback') return 'Laptop unavailable. Finish your target — this counts.';
    return 'Your morning is queued.';
  }

  return (
    <View style={styles.root}>
      <StatusBar style="dark" />
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.eyebrow}>OFFLINE ACCOUNTABILITY</Text>
        <Text style={styles.title}>Wakework</Text>
        <Text style={styles.muted}>Set the alarm. Sleep. Wake up and work 30 real minutes.</Text>

        <View style={styles.card}>
          <Text style={styles.label}>LAPTOP IP</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. 192.168.43.101"
            autoCapitalize="none"
            keyboardType="numbers-and-punctuation"
            value={laptopIp}
            editable={!savedIp}
            onChangeText={setLaptopIp}
          />
          <Text style={styles.hint}>
            {savedIp
              ? `Saved. ${status === 'connected' ? 'Connected locally.' : 'Offline — retrying over Wi-Fi.'}`
              : 'Shown on the laptop when the server starts. Same Wi-Fi or hotspot.'}
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.label}>ALARM TIME</Text>
          <TextInput style={styles.input} placeholder="06:30" keyboardType="numbers-and-punctuation" value={time} onChangeText={setTime} />
          <Text style={styles.label}>MORNING WORK TARGET</Text>
          <TextInput style={styles.input} placeholder="e.g. finish the project brief" value={target} onChangeText={setTarget} />
          <Pressable style={styles.button} onPress={onSetAlarm}>
            <Text style={styles.buttonText}>Set alarm</Text>
          </Pressable>
          {scheduledAt && <Text style={styles.hint}>The phone will ring at {fmtClock(scheduledAt)} — even with the app closed.</Text>}
        </View>

        <View style={[styles.card, styles.connectionCard]}>
          <View style={styles.row}>
            <Text style={styles.label}>LAPTOP AGENT</Text>
            <Text style={status === 'connected' ? styles.on : styles.off}>{status}</Text>
          </View>
          {agentUrl ? <Text style={styles.hint}>On the laptop keep open: {agentUrl}</Text> : null}
        </View>

        {inSession && !ringing && (
          <View style={styles.card}>
            <View style={styles.row}>
              <Text style={styles.state}>{s.state.replaceAll('-', ' ')}</Text>
              {s.mode ? <Text style={styles.mode}>{s.mode}</Text> : null}
            </View>
            <Text style={styles.headline}>{headline()}</Text>
            <Text style={styles.muted}>{detail()}</Text>
            <View style={styles.progress}>
              <View style={[styles.progressFill, { width: `${Math.min(100, (s.totalMinutes / 30) * 100)}%` }]} />
            </View>
            <Text style={styles.minutes}>
              {s.totalMinutes}
              <Text style={styles.muted}> / 30 validated minutes</Text>
            </Text>
            {s.state === 're-alarm' && (
              <Pressable style={[styles.button, styles.lime]} onPress={() => send('resume')}>
                <Text style={styles.buttonText}>I'm back at the laptop</Text>
              </Pressable>
            )}
            <Pressable style={[styles.button, styles.quiet]} onPress={() => send('end')}>
              <Text style={styles.quietText}>End session</Text>
            </Pressable>
          </View>
        )}
      </ScrollView>

      {showRing && (
        <View style={styles.ring}>
          <Text style={styles.ringEyebrow}>WAKE UP</Text>
          <Text style={styles.ringTitle}>Time to work</Text>
          {s && s.target ? <Text style={styles.ringTarget}>{s.target}</Text> : null}
          <Pressable style={styles.bigButton} onPress={onDismiss}>
            <Text style={styles.bigButtonText}>I'm up — start my session</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#f3f0e8' },
  scroll: { padding: 24, paddingTop: 64, paddingBottom: 48 },
  eyebrow: { fontSize: 11, letterSpacing: 2, color: '#f4774c', fontWeight: '600' },
  title: { fontSize: 64, fontWeight: '800', letterSpacing: -3, color: '#17211b', marginVertical: 8 },
  muted: { color: '#687169', lineHeight: 22, fontSize: 15 },
  card: {
    backgroundColor: '#fffdf5',
    borderRadius: 22,
    padding: 20,
    marginTop: 24,
    shadowColor: '#dcd8c9',
    shadowOffset: { width: 6, height: 6 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 3
  },
  connectionCard: { backgroundColor: '#f9f6ec' },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  label: { fontSize: 11, letterSpacing: 2, color: '#17211b', fontWeight: '700', marginBottom: 10 },
  input: {
    borderBottomWidth: 2,
    borderBottomColor: '#17211b',
    fontSize: 22,
    paddingVertical: 10,
    color: '#17211b',
    marginBottom: 8
  },
  hint: { fontSize: 12, color: '#687169', marginTop: 6, lineHeight: 18 },
  on: { color: '#3e7a1f', fontWeight: '700' },
  off: { color: '#f4774c', fontWeight: '700' },
  button: { backgroundColor: '#17211b', borderRadius: 999, paddingVertical: 14, paddingHorizontal: 22, marginTop: 16, alignSelf: 'flex-start' },
  lime: { backgroundColor: '#d4ef63' },
  quiet: { backgroundColor: 'transparent', alignSelf: 'flex-start', marginTop: 8 },
  buttonText: { color: '#fffdf5', fontWeight: '700' },
  quietText: { color: '#687169', fontWeight: '600' },
  state: { color: '#f4774c', fontWeight: '700', textTransform: 'uppercase', fontSize: 12, letterSpacing: 1 },
  mode: { color: '#687169', fontWeight: '600', fontSize: 12 },
  headline: { fontSize: 28, fontWeight: '800', letterSpacing: -1, color: '#17211b', marginTop: 12 },
  progress: { height: 12, backgroundColor: '#e8e5d8', borderRadius: 10, marginTop: 20, overflow: 'hidden' },
  progressFill: { height: 12, backgroundColor: '#d4ef63', borderRadius: 10 },
  minutes: { fontSize: 12, marginTop: 8, color: '#17211b', fontWeight: '700' },
  ring: {
    position: 'absolute',
    left: 0, right: 0, top: 0, bottom: 0,
    backgroundColor: '#d4ef63',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 28
  },
  ringEyebrow: { fontSize: 13, letterSpacing: 3, fontWeight: '700', color: '#17211b' },
  ringTitle: { fontSize: 58, fontWeight: '900', letterSpacing: -3, color: '#17211b', marginVertical: 10 },
  ringTarget: { fontSize: 17, color: '#17211b', textAlign: 'center' },
  bigButton: { backgroundColor: '#17211b', borderRadius: 999, paddingVertical: 18, paddingHorizontal: 26, marginTop: 30 },
  bigButtonText: { color: '#fffdf5', fontWeight: '800', fontSize: 17 }
});
