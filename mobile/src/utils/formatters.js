export function fmtClock(at) {
  if (!at) return '';
  return new Date(at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export function headline(s) {
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
    case 'paused': return 'Session paused.';
    default: return '';
  }
}

export function detail(s, status) {
  if (!s) return 'Enter the laptop IP shown when the server starts.';
  if (s.state === 'complete') return `Result: ${s.mode}`;
  if (s.state === 're-alarm') return s.reason === 'laptop-required'
    ? 'Phone-only was used last time. Connect the laptop to continue.'
    : 'Your work was not validated. Get back within 5 minutes.';
  if (s.state === 'monitoring') return status === 'connected' ? 'The laptop is validating your work.' : 'Laptop signal lost.';
  if (s.state === 'phone-fallback') return 'Laptop unavailable. Finish your target — this counts.';
  if (s.state === 'paused') return `You have ${s.pausesRemaining ?? 0} pauses left.`;
  return 'Your morning is queued.';
}
