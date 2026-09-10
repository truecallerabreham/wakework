import test from 'node:test';
import assert from 'node:assert/strict';
import { AlarmSession, MODES, STATES } from '../src/session.js';

function clock() { let time = 0; return { now: () => time, advance: ms => { time += ms; } }; }
function started(c, previousPhoneOnly = false) { const s = new AlarmSession({ now: c.now, previousPhoneOnly }); s.schedule('write brief'); s.ring(); s.dismiss(); return s; }

test('starts laptop monitoring when the laptop connects', () => { const c=clock(); const s=started(c); s.laptopConnected(); assert.equal(s.snapshot().mode, MODES.LAPTOP); assert.equal(s.snapshot().state, STATES.MONITORING); });
test('enters phone fallback after ten minutes without laptop', () => { const c=clock(); const s=started(c); c.advance(10*60*1000); assert.equal(s.tick().mode, MODES.PHONE); assert.equal(s.snapshot().state, STATES.PHONE_FALLBACK); });
test('a phone-only session completes after thirty minutes', () => { const c=clock(); const s=started(c); c.advance(10*60*1000); s.tick(); c.advance(30*60*1000); assert.equal(s.tick().state, STATES.COMPLETE); assert.equal(s.snapshot().mode, MODES.PHONE); });
test('requires laptop after a previous phone-only completion', () => { const c=clock(); const s=started(c, true); c.advance(10*60*1000); assert.equal(s.tick().state, STATES.RE_ALARM); assert.equal(s.snapshot().reason, 'laptop-required'); });
test('upgrades fallback to mixed mode when laptop returns', () => { const c=clock(); const s=started(c); c.advance(10*60*1000); s.tick(); s.laptopConnected(); assert.equal(s.snapshot().mode, MODES.MIXED); assert.equal(s.snapshot().state, STATES.MONITORING); });
test('rings at the scheduled alarm time', () => { const c=clock(); const s=new AlarmSession({ now: c.now }); s.schedule('study', 1000); assert.equal(s.snapshot().state, STATES.SCHEDULED); c.advance(1000); s.checkAlarm(); assert.equal(s.snapshot().state, STATES.RINGING); });
test('does not ring before the alarm time', () => { const c=clock(); const s=new AlarmSession({ now: c.now }); s.schedule('study', 1000); c.advance(999); s.checkAlarm(); assert.equal(s.snapshot().state, STATES.SCHEDULED); });
test('re-rings five minutes after a re-alarm', () => { const c=clock(); const s=started(c, true); c.advance(10*60*1000); s.tick(); assert.equal(s.snapshot().state, STATES.RE_ALARM); c.advance(5*60*1000); s.checkAlarm(); assert.equal(s.snapshot().state, STATES.RINGING); });
test('resumes monitoring when the user returns with the laptop online', () => { const c=clock(); const s=started(c); s.laptopConnected(); s.reAlarm('work-not-validated'); assert.equal(s.resume(true).state, STATES.MONITORING); });
test('resumes waiting without laptop and restarts the ten-minute window', () => { const c=clock(); const s=started(c, true); c.advance(10*60*1000); s.tick(); c.advance(60*1000); const snap=s.resume(false); assert.equal(snap.state, STATES.WAITING_FOR_LAPTOP); assert.equal(snap.waitingSecondsLeft, 600); });
