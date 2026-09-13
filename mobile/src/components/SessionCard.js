import { View, Text, Pressable, Vibration } from 'react-native';
import { styles } from '../theme';
import { headline, detail } from '../utils/formatters';
import ProgressRing from './ProgressRing';

export default function SessionCard({ session: s, status, onSend }) {
  if (!s || !s.target || s.state === 'scheduled') return null;
  const ringing = s.state === 'ringing' || s.state === 're-alarm';
  if (ringing) return null;

  const targetMinutes = s.targetMinutes || 30;
  const progressPercent = Math.min(100, (s.totalMinutes / targetMinutes) * 100);

  const isPaused = s.state === 'paused';

  const pressVibrate = () => Vibration.vibrate(30);

  return (
    <View style={styles.card}>
      <View style={styles.row}>
        <Text style={styles.state}>{s.state.replaceAll('-', ' ')}</Text>
        {s.mode ? <Text style={styles.mode}>{s.mode}</Text> : null}
      </View>
      <Text style={styles.headline}>{headline(s)}</Text>
      <Text style={styles.muted}>{detail(s, status)}</Text>

      <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 20 }}>
        <ProgressRing progress={progressPercent} radius={24} strokeWidth={6} />
        <View style={{ marginLeft: 16, flex: 1 }}>
          <View style={styles.progress}>
            <View style={[styles.progressFill, { width: `${progressPercent}%` }]} />
          </View>
          <Text style={styles.minutes}>
            {s.totalMinutes}
            <Text style={styles.muted}> / {targetMinutes} validated minutes</Text>
          </Text>
        </View>
      </View>

      {s.state === 're-alarm' && (
        <Pressable style={[styles.button, styles.lime]} onPress={() => { pressVibrate(); onSend('resume'); }}>
          <Text style={styles.buttonTextDark}>I'm back at the laptop</Text>
        </Pressable>
      )}

      {isPaused ? (
        <Pressable style={[styles.button, styles.lime]} onPress={() => { pressVibrate(); onSend('unpause'); }}>
          <Text style={styles.buttonTextDark}>Resume Session</Text>
        </Pressable>
      ) : (
        <Pressable style={[styles.button]} onPress={() => { pressVibrate(); onSend('pause'); }}>
          <Text style={styles.buttonText}>Pause Session</Text>
        </Pressable>
      )}

      <Pressable style={styles.quiet} onPress={() => { pressVibrate(); onSend('end'); }}>
        <Text style={styles.quietText}>End session</Text>
      </Pressable>
    </View>
  );
}
