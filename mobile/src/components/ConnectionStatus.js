import { useEffect, useRef } from 'react';
import { View, Text, Animated } from 'react-native';
import { styles } from '../theme';

export default function ConnectionStatus({ status, agentUrl }) {
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (status === 'connected') {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 0.4, duration: 800, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 800, useNativeDriver: true })
        ])
      ).start();
    } else {
      pulseAnim.setValue(1);
    }
  }, [status, pulseAnim]);

  return (
    <View style={[styles.card, styles.connectionCard]}>
      <View style={styles.row}>
        <Text style={styles.label}>LAPTOP AGENT</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Animated.View 
            style={{ 
              width: 8, height: 8, borderRadius: 4, 
              backgroundColor: status === 'connected' ? '#3e7a1f' : '#f4774c', 
              marginRight: 6, opacity: pulseAnim 
            }} 
          />
          <Text style={status === 'connected' ? styles.on : styles.off}>{status}</Text>
        </View>
      </View>
      {agentUrl ? <Text style={styles.hint}>On the laptop keep open: {agentUrl}</Text> : null}
    </View>
  );
}
