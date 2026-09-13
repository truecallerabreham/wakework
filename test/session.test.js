import test from 'node:test';
import assert from 'node:assert/strict';
import { AlarmSession, MODES, STATES } from '../src/session.js';

function clock() { let time = 0; return { now: () => time, advance: ms => { time += ms; } }; }
function started(c, previousPhoneOnly = false) { const s = new AlarmSession({ now: c.now, previousPhoneOnly }); s.schedule({target: 'write brief'}); s.ring(); s.dismiss(); return s; }

test('starts laptop monitoring when the laptop connects', () => { const c=clock(); const s=started(c); s.laptopConnected(); assert.equal(s.snapshot().mode, MODES.LAPTOP); assert.equal(s.snapshot().state, STATES.MONITORING); });
test('enters phone fallback after ten minutes without laptop', () => { const c=clock(); const s=started(c); c.advance(10*60*1000); assert.equal(s.tick().mode, MODES.PHONE); assert.equal(s.snapshot().state, STATES.PHONE_FALLBACK); });
test('a phone-only session completes after thirty minutes', () => { const c=clock(); const s=started(c); c.advance(10*60*1000); s.tick(); c.advance(30*60*1000); assert.equal(s.tick().state, STATES.COMPLETE); assert.equal(s.snapshot().mode, MODES.PHONE); });
test('requires laptop after a previous phone-only completion', () => { const c=clock(); const s=started(c, true); c.advance(10*60*1000); assert.equal(s.tick().state, STATES.RE_ALARM); assert.equal(s.snapshot().reason, 'laptop-required'); });
test('upgrades fallback to mixed mode when laptop returns', () => { const c=clock(); const s=started(c); c.advance(10*60*1000); s.tick(); s.laptopConnected(); assert.equal(s.snapshot().mode, MODES.MIXED); assert.equal(s.snapshot().state, STATES.MONITORING); });
test('rings at the scheduled alarm time', () => { const c=clock(); const s=new AlarmSession({ now: c.now }); s.schedule({target: 'study', alarmAt: 1000}); assert.equal(s.snapshot().state, STATES.SCHEDULED); c.advance(1000); s.checkAlarm(); assert.equal(s.snapshot().state, STATES.RINGING); });
test('does not ring before the alarm time', () => { const c=clock(); const s=new AlarmSession({ now: c.now }); s.schedule({target: 'study', alarmAt: 1000}); c.advance(999); s.checkAlarm(); assert.equal(s.snapshot().state, STATES.SCHEDULED); });
test('re-rings five minutes after a re-alarm', () => { const c=clock(); const s=started(c, true); c.advance(10*60*1000); s.tick(); assert.equal(s.snapshot().state, STATES.RE_ALARM); c.advance(5*60*1000); s.checkAlarm(); assert.equal(s.snapshot().state, STATES.RINGING); });
test('resumes monitoring when the user returns with the laptop online', () => { const c=clock(); const s=started(c); s.laptopConnected(); s.reAlarm('work-not-validated'); assert.equal(s.resume(true).state, STATES.MONITORING); });
test('resumes waiting without laptop and restarts the ten-minute window', () => { const c=clock(); const s=started(c, true); c.advance(10*60*1000); s.tick(); c.advance(60*1000); const snap=s.resume(false); assert.equal(snap.state, STATES.WAITING_FOR_LAPTOP); assert.equal(snap.waitingSecondsLeft, 600); });

test('snooze pushes alarm forward, max 3 times, max 15 min', () => {
  const c = clock();
  const s = new AlarmSession({ now: c.now });
  s.schedule({target: 'work', alarmAt: 1000});
  c.advance(1000);
  s.checkAlarm(); // rings
  
  s.snooze(10);
  assert.equal(s.snapshot().state, STATES.SCHEDULED);
  assert.equal(s.snapshot().alarmAt, 1000 + 10 * 60 * 1000);
  assert.equal(s.snapshot().snoozesLeft, 2);
  
  c.advance(10 * 60 * 1000);
  s.checkAlarm(); // rings
  s.snooze(20); // capped at 15
  assert.equal(s.snapshot().alarmAt, c.now() + 15 * 60 * 1000);
  assert.equal(s.snapshot().snoozesLeft, 1);
  
  c.advance(15 * 60 * 1000);
  s.checkAlarm(); // rings
  s.snooze(5);
  assert.equal(s.snapshot().snoozesLeft, 0);
  
  c.advance(5 * 60 * 1000);
  s.checkAlarm(); // rings
  s.snooze(5); // out of snoozes
  assert.equal(s.snapshot().state, STATES.RINGING);
  assert.equal(s.snapshot().snoozesLeft, 0);
  
  // reset on new schedule
  s.schedule({target: 'work2'});
  assert.equal(s.snapshot().snoozesLeft, 3);
});

test('pause and unpause logic', () => {
  const c = clock();
  const s = started(c);
  s.laptopConnected(); // state: monitoring
  
  s.pause();
  assert.equal(s.snapshot().isPaused, true);
  assert.equal(s.snapshot().pausesLeft, 2);
  
  // time passes while paused
  c.advance(2 * 60 * 1000);
  s.tick({working: true});
  assert.equal(s.snapshot().isPaused, true);
  assert.equal(s.snapshot().validatedMinutes, 0); // time not counted
  
  s.unpause();
  assert.equal(s.snapshot().isPaused, false);
  
  c.advance(1 * 60 * 1000);
  s.tick({working: true});
  assert.equal(s.snapshot().validatedMinutes, 1);
  
  // auto unpause at 5 mins
  s.pause();
  assert.equal(s.snapshot().pausesLeft, 1);
  c.advance(5 * 60 * 1000); // 5 mins later
  s.tick({working: true});
  assert.equal(s.snapshot().isPaused, false); // auto unpaused
});

test('custom duration session', () => {
  const c = clock();
  const s = new AlarmSession({ now: c.now });
  s.schedule({target: 'work', durationMinutes: 10});
  s.ring();
  s.dismiss();
  c.advance(10 * 60 * 1000); // waiting for laptop fallback -> phone fallback
  s.tick();
  
  c.advance(10 * 60 * 1000);
  s.tick(); // phone fallback for 10 mins
  assert.equal(s.snapshot().state, STATES.COMPLETE);
});

test('history recording and stats', () => {
  const c = clock();
  const s = new AlarmSession({ now: c.now });
  s.schedule({target: 'work', durationMinutes: 10});
  s.ring();
  s.dismiss();
  s.laptopConnected();
  s.tick();
  c.advance(10 * 60 * 1000);
  s.tick({working: true});
  assert.equal(s.snapshot().state, STATES.COMPLETE);
  
  const history = s.getHistory();
  assert.equal(history.length, 1);
  assert.equal(history[0].duration, 10);
  assert.equal(history[0].target, 'work');
  assert.equal(history[0].mode, MODES.LAPTOP);
  
  const stats = s.getStats();
  assert.equal(stats.totalSessions, 1);
  assert.equal(stats.averageSessionTime, 10);
  assert.equal(stats.streaks, 1);
  assert.equal(stats.modeDistribution[MODES.LAPTOP], 1);
});
