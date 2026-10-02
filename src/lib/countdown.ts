export const COUNTDOWN_DURATION = 28 * 60 * 60 * 1000;

export interface Counter {
  flag: boolean;
  startTime: number;
  endTime: number;
}

export interface CounterSnapshot {
  counter: Counter;
  serverTime: number;
}

export function parseCounter(payload: unknown): Counter {
  const envelope = payload as { data?: unknown } | null;
  const data = envelope?.data ?? payload;
  const candidate = (Array.isArray(data) ? data[0] : data) as Partial<Counter> | null;
  if (!candidate || typeof candidate.flag !== "boolean") {
    throw new Error("The countdown service returned an invalid counter.");
  }
  if (!candidate.flag) return { flag: false, startTime: 0, endTime: 0 };
  const startTime = Number(candidate.startTime);
  const endTime = Number(candidate.endTime);
  if (!Number.isSafeInteger(startTime) || !Number.isSafeInteger(endTime) || startTime <= 0 || endTime <= startTime) {
    throw new Error("The countdown service returned invalid timestamps.");
  }
  return { flag: true, startTime, endTime };
}

export function createStartPayload(now: number): Counter {
  return { flag: true, startTime: Math.round(now), endTime: Math.round(now) + COUNTDOWN_DURATION };
}

export function remainingSeconds(counter: Counter, now: number): number {
  if (!counter.flag) return COUNTDOWN_DURATION / 1000;
  return Math.ceil(Math.max(0, Math.min(counter.endTime - counter.startTime, counter.endTime - now)) / 1000);
}

export function counterPhase(counter: Counter, now: number): "ready" | "running" | "complete" {
  return !counter.flag ? "ready" : now >= counter.endTime ? "complete" : "running";
}

export function csrfTokenFromCookie(cookie: string): string | undefined {
  const value = cookie.split(";").map((part) => part.trim()).find((part) => part.startsWith("csrftoken="))?.slice("csrftoken=".length);
  if (!value) return undefined;
  try { return decodeURIComponent(value); } catch { return undefined; }
}
