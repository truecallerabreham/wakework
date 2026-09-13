import { useState, useEffect } from 'react';
import { View, ScrollView, Text, Pressable, Switch } from 'react-native';
import { StatusBar } from 'expo-status-bar';

import { styles } from './src/theme';
import useWebSocket from './src/hooks/useWebSocket';
import useAlarm from './src/hooks/useAlarm';

import AlarmOverlay from './src/components/AlarmOverlay';
import SessionCard from './src/components/SessionCard';
import SetupForm from './src/components/SetupForm';
import ConnectionStatus from './src/components/ConnectionStatus';
import HistoryList from './src/components/HistoryList';
import StatsCard from './src/components/StatsCard';

export default function App() {
  const [laptopIp, setLaptopIp] = useState('');
  const [savedIp, setSavedIp] = useState(null);
  
  const [time, setTime] = useState('06:30');
  const [target, setTarget] = useState('');
  const [duration, setDuration] = useState(30);
  const [scheduledAt, setScheduledAt] = useState(null);
  const [soundEnabled, setSoundEnabled] = useState(true);

  const { status, session, agentUrl, send, showRing, setShowRing } = useWebSocket(savedIp, soundEnabled);
  const { scheduleAlarmNotification, dismissAll } = useAlarm(soundEnabled);

  function onSetAlarm() {
    const [h, m] = (time || '06:30').split(':').map(Number);
    const at = new Date();
    at.setHours(h, m, 0, 0);
    if (at.getTime() <= Date.now()) at.setDate(at.getDate() + 1);
    
    setScheduledAt(at.getTime());
    scheduleAlarmNotification(at, target);
    setSavedIp(laptopIp.trim());
    send('schedule', { target, alarmAt: at.getTime(), duration });
  }

  function onDismiss() {
    send('dismiss');
    setShowRing(false);
    dismissAll();
  }

  function onSnooze(mins) {
    send('snooze', { minutes: mins });
    setShowRing(false);
    dismissAll();
    
    // Reschedule alarm for `mins` later
    const newAt = new Date(Date.now() + mins * 60000);
    setScheduledAt(newAt.getTime());
    scheduleAlarmNotification(newAt, target);
  }

  const s = session;
  const inSession = s && s.target && s.state !== 'scheduled';
  
  return (
    <View style={styles.root}>
      <StatusBar style="dark" />
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.row}>
          <View>
            <Text style={styles.eyebrow}>OFFLINE ACCOUNTABILITY</Text>
            <Text style={styles.title}>Wakework</Text>
          </View>
          <View style={{ alignItems: 'center' }}>
            <Text style={{ fontSize: 10, color: '#687169', fontWeight: '700', marginBottom: 4 }}>SOUND</Text>
            <Switch
              value={soundEnabled}
              onValueChange={setSoundEnabled}
              trackColor={{ false: '#e8e5d8', true: '#d4ef63' }}
              thumbColor={soundEnabled ? '#17211b' : '#fffdf5'}
            />
          </View>
        </View>
        
        <Text style={styles.muted}>Set the alarm. Sleep. Wake up and work {duration} real minutes.</Text>

        {!inSession && (
          <SetupForm 
            laptopIp={laptopIp} setLaptopIp={setLaptopIp}
            savedIp={savedIp} status={status}
            time={time} setTime={setTime}
            target={target} setTarget={setTarget}
            duration={duration} setDuration={setDuration}
            onSetAlarm={onSetAlarm} scheduledAt={scheduledAt}
          />
        )}

        <ConnectionStatus status={status} agentUrl={agentUrl} />

        <SessionCard session={s} status={status} onSend={send} />

        {!inSession && <StatsCard savedIp={savedIp} />}
        {!inSession && <HistoryList savedIp={savedIp} />}
        
      </ScrollView>

      <AlarmOverlay 
        visible={showRing} 
        target={s?.target || target} 
        onDismiss={onDismiss} 
        onSnooze={onSnooze}
      />
    </View>
  );
}
