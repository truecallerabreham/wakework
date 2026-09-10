export const MODES = Object.freeze({
  LAPTOP: 'laptop-validated',
  PHONE: 'phone-only',
  MIXED: 'mixed-mode'
});

export const STATES = Object.freeze({
  SCHEDULED: 'scheduled',
  RINGING: 'ringing',
  WAITING_FOR_LAPTOP: 'waiting-for-laptop',
  MONITORING: 'monitoring',
  PHONE_FALLBACK: 'phone-fallback',
  RE_ALARM: 're-alarm',
  COMPLETE: 'complete',
  ENDED: 'ended'
});

const FIVE_MINUTES = 5 * 60 * 1000;
const RECOVERY_WINDOW = 10 * 60 * 1000;
const SESSION_LENGTH = 30 * 60 * 1000;

export class AlarmSession {
  constructor({ now = Date.now, previousPhoneOnly = false } = {}) {
    this.now = now;
    this.previousPhoneOnly = previousPhoneOnly;
    this.reset();
  }

  reset() {
    this.state = STATES.SCHEDULED;
    this.mode = null;
    this.target = '';
    this.startedAt = null;
    this.validatedMs = 0;
    this.phoneMs = 0;
    this.lastTick = null;
    this.lastCheck = null;
    this.nextAlarmAt = null;
    this.reason = null;
  }

  schedule(target) {
    if (!target?.trim()) throw new Error('A work target is required');
    this.reset();
    this.target = target.trim();
    this.state = STATES.SCHEDULED;
    return this.snapshot();
  }

  ring() {
    if (![STATES.SCHEDULED, STATES.RE_ALARM].includes(this.state)) return this.snapshot();
    this.state = STATES.RINGING;
    return this.snapshot();
  }

  dismiss() {
    if (this.state !== STATES.RINGING) return this.snapshot();
    this.startedAt ??= this.now();
    this.state = STATES.WAITING_FOR_LAPTOP;
    return this.snapshot();
  }

  laptopConnected() {
    if (this.state === STATES.WAITING_FOR_LAPTOP) {
      this.state = STATES.MONITORING;
      this.mode = this.phoneMs > 0 ? MODES.MIXED : MODES.LAPTOP;
    } else if (this.state === STATES.PHONE_FALLBACK) {
      this.state = STATES.MONITORING;
      this.mode = MODES.MIXED;
    }
    return this.snapshot();
  }

  tick({ working = false, checkIn = false } = {}) {
    const now = this.now();
    if (!this.lastTick) this.lastTick = now;
    const elapsed = Math.max(0, now - this.lastTick);
    this.lastTick = now;

    if (this.state === STATES.WAITING_FOR_LAPTOP) {
      if (now - this.startedAt >= RECOVERY_WINDOW) {
        if (this.previousPhoneOnly) return this.reAlarm('laptop-required');
        this.state = STATES.PHONE_FALLBACK;
        this.mode = MODES.PHONE;
        this.lastTick = now;
      }
    } else if (this.state === STATES.MONITORING) {
      if (working || checkIn) this.validatedMs += elapsed;
      else if (elapsed >= FIVE_MINUTES) return this.reAlarm('work-not-validated');
    } else if (this.state === STATES.PHONE_FALLBACK) {
      this.phoneMs += elapsed;
    }

    if (this.totalCreditMs() >= SESSION_LENGTH) {
      this.state = STATES.COMPLETE;
      this.nextAlarmAt = null;
    }
    return this.snapshot();
  }

  reAlarm(reason) {
    this.state = STATES.RE_ALARM;
    this.reason = reason;
    this.nextAlarmAt = this.now() + FIVE_MINUTES;
    return this.snapshot();
  }

  end() {
    this.state = STATES.ENDED;
    this.nextAlarmAt = null;
    return this.snapshot();
  }

  totalCreditMs() {
    return this.validatedMs + this.phoneMs;
  }

  snapshot() {
    return {
      state: this.state,
      mode: this.mode,
      target: this.target,
      validatedMinutes: Math.floor(this.validatedMs / 60000),
      phoneMinutes: Math.floor(this.phoneMs / 60000),
      totalMinutes: Math.floor(this.totalCreditMs() / 60000),
      remainingMinutes: Math.max(0, 30 - Math.floor(this.totalCreditMs() / 60000)),
      reason: this.reason,
      nextAlarmAt: this.nextAlarmAt
    };
  }
}
