import { View, Text, TextInput, Pressable, Vibration } from 'react-native';
import { styles } from '../theme';
import { fmtClock } from '../utils/formatters';

export default function SetupForm({ laptopIp, setLaptopIp, savedIp, status, time, setTime, target, setTarget, duration, setDuration, onSetAlarm, scheduledAt }) {
  const durations = [10, 15, 20, 30, 45, 60];

  return (
    <>
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
        
        <Text style={[styles.label, { marginTop: 16 }]}>MORNING WORK TARGET</Text>
        <TextInput style={styles.input} placeholder="e.g. finish the project brief" value={target} onChangeText={setTarget} />
        
        <Text style={[styles.label, { marginTop: 16 }]}>DURATION</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 8 }}>
          {durations.map(d => (
            <Pressable 
              key={d} 
              style={[styles.button, { marginTop: 0 }, duration === d ? styles.lime : { backgroundColor: '#f3f0e8' }]}
              onPress={() => { Vibration.vibrate(20); setDuration(d); }}
            >
              <Text style={duration === d ? styles.buttonTextDark : { color: '#17211b' }}>{d}m</Text>
            </Pressable>
          ))}
        </View>

        <Pressable style={[styles.button, { width: '100%', alignItems: 'center' }]} onPress={() => { Vibration.vibrate(40); onSetAlarm(); }}>
          <Text style={styles.buttonText}>Set alarm</Text>
        </Pressable>
        {scheduledAt && <Text style={styles.hint}>The phone will ring at {fmtClock(scheduledAt)} — even with the app closed.</Text>}
      </View>
    </>
  );
}
