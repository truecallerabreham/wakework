import { useState, useEffect, useRef, useCallback } from 'react';
import { Platform, Vibration } from 'react-native';
import { SERVER_PORT, RING_PATTERN } from '../utils/constants';

export default function useWebSocket(savedIp, soundEnabled) {
  const [status, setStatus] = useState('offline');
  const [session, setSession] = useState(null);
  const [agentUrl, setAgentUrl] = useState('');
  const [showRing, setShowRing] = useState(false);
  const wsRef = useRef(null);

  const connect = useCallback((ip) => {
    if (!ip) return;
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
      
      if (!ringing) {
        Vibration.cancel();
      }
      if (ringing && Platform.OS !== 'android' && soundEnabled !== false) {
        Vibration.vibrate(RING_PATTERN, true);
      }
    };
  }, [soundEnabled]);

  useEffect(() => {
    if (!savedIp) return;
    connect(savedIp);
    const reconnect = setInterval(() => {
      if (!wsRef.current || wsRef.current.readyState > 1) connect(savedIp);
    }, 3000);
    return () => clearInterval(reconnect);
  }, [savedIp, connect]);

  const send = useCallback((type, extra = {}) => {
    const ws = wsRef.current;
    if (ws && ws.readyState === 1) ws.send(JSON.stringify({ type, ...extra }));
  }, []);

  return { status, session, agentUrl, send, connect, showRing, setShowRing };
}
