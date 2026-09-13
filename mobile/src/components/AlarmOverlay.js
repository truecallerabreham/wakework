import { View, Text, Pressable, Vibration } from 'react-native';
import { styles } from '../theme';

export default function AlarmOverlay({ visible, target, onDismiss, onSnooze }) {
  if (!visible) return null;

  return (
    <View style={styles.ring}>
      <Text style={styles.ringEyebrow}>WAKE UP</Text>
      <Text style={styles.ringTitle}>Time to work</Text>
      {target ? <Text style={styles.ringTarget}>{target}</Text> : null}
      <Pressable 
        style={styles.bigButton} 
        onPress={() => {
          Vibration.vibrate(50);
          onDismiss();
        }}>
        <Text style={styles.bigButtonText}>I'm up — start my session</Text>
      </Pressable>

      <View style={styles.snoozeRow}>
        {[5, 10, 15].map(mins => (
          <Pressable
            key={mins}
            style={styles.snoozeButton}
            onPress={() => {
              Vibration.vibrate(30);
              onSnooze(mins);
            }}
          >
            <Text style={styles.snoozeText}>+{mins}m</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}
