"use client";

import { useRouter } from "next/navigation";
import { Fragment, useCallback, useEffect, useRef, useState } from "react";
import { GlitchButton } from "@/components/ui/glitch-button";
import { counterPhase, createStartPayload, csrfTokenFromCookie, remainingSeconds, type CounterSnapshot } from "@/lib/countdown";
import styles from "./LiveTimer.module.css";

const POLL_INTERVAL = 5000;
const dateFormat = new Intl.DateTimeFormat("en-IN", {
  timeZone: "Asia/Kolkata", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", hour12: true,
});

export function LiveTimer({ demo = false, allowStart = false, redirectOnStart }: {
  demo?: boolean; allowStart?: boolean; redirectOnStart?: string;
}) {
  const router = useRouter();
  const [snapshot, setSnapshot] = useState<CounterSnapshot | null>(null);
  const [now, setNow] = useState(0);
  const [error, setError] = useState("");
  const [actionError, setActionError] = useState("");
  const [busy, setBusy] = useState(false);
  const [disconnected, setDisconnected] = useState(false);
  const anchor = useRef({ serverTime: 0, performanceTime: 0 });
  const pending = useRef(false);
  const version = useRef(0);
  const mounted = useRef(false);
  const actionController = useRef<AbortController | null>(null);
  const endpoint = demo ? "/api/countdown/demo" : "/api/countdown";

  useEffect(() => {
    if (redirectOnStart && snapshot?.counter.flag) router.replace(redirectOnStart);
  }, [redirectOnStart, snapshot?.counter.flag, router]);

  const applySnapshot = useCallback((next: CounterSnapshot, startedAt: number) => {
    const receivedAt = performance.now();
    const serverTime = next.serverTime + (receivedAt - startedAt) / 2;
    anchor.current = { serverTime, performanceTime: receivedAt };
    setSnapshot(next);
    setNow(serverTime);
  }, []);

  const readSnapshot = useCallback(async (signal?: AbortSignal) => {
    const startedAt = performance.now();
    const response = await fetch(endpoint, {
      cache: "no-store",
      signal: signal ? AbortSignal.any([signal, AbortSignal.timeout(12000)]) : AbortSignal.timeout(12000),
    });
    const body = await response.json();
    if (!response.ok) throw new Error(body.error ?? "Unable to read the countdown. Please retry.");
    return { next: body as CounterSnapshot, startedAt };
  }, [endpoint]);

  useEffect(() => {
    mounted.current = true;
    const controller = new AbortController();
    let reading = false;
    const refresh = async () => {
      if (reading || pending.current || controller.signal.aborted) return;
      reading = true;
      const readVersion = version.current;
      try {
        const { next, startedAt } = await readSnapshot(controller.signal);
        if (!controller.signal.aborted && readVersion === version.current) { applySnapshot(next, startedAt); setError(""); }
      } catch (failure) {
        if (!controller.signal.aborted && readVersion === version.current) setError(failure instanceof Error ? failure.message : "Unable to sync. Please retry.");
      } finally { reading = false; }
    };
    void refresh();
    const polling = window.setInterval(() => { if (document.visibilityState === "visible") void refresh(); }, POLL_INTERVAL);
    const tick = window.setInterval(() => {
      if (anchor.current.serverTime) setNow(anchor.current.serverTime + performance.now() - anchor.current.performanceTime);
    }, 250);
    const onVisible = () => { if (document.visibilityState === "visible") void refresh(); };
    window.addEventListener("focus", onVisible);
    window.addEventListener("online", onVisible);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      mounted.current = false;
      controller.abort();
      actionController.current?.abort();
      window.clearInterval(polling); window.clearInterval(tick);
      window.removeEventListener("focus", onVisible); window.removeEventListener("online", onVisible);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [readSnapshot, applySnapshot]);

  const performAction = async (action: "start" | "reset" | "finish" | "disconnect" | "reconnect" | "retry") => {
    if (pending.current) return;
    pending.current = true;
    version.current += 1;
    setBusy(true); setError(""); setActionError("");
    const controller = new AbortController();
    actionController.current = controller;
    const signal = AbortSignal.any([controller.signal, AbortSignal.timeout(15000)]);
    try {
      if (action !== "retry") {
        if (demo) {
          const response = await fetch(endpoint, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action }), signal });
          const body = await response.json();
          if (!response.ok) throw new Error(body.error ?? "Unable to update the demo.");
          if (action === "disconnect") { setDisconnected(true); setError("Demo connection lost. Restore connection to resume syncing."); return; }
          setDisconnected(false);
        } else {
          const { next, startedAt } = await readSnapshot(signal);
          if (next.counter.flag) { applySnapshot(next, startedAt); return; }
          const syncedNow = next.serverTime + (performance.now() - startedAt) / 2;
          const token = csrfTokenFromCookie(document.cookie);
          const headers: Record<string, string> = { "Content-Type": "application/json" };
          if (token) headers["X-CSRFToken"] = token;
          const response = await fetch("/server/setcounter/", {
            method: "POST", headers, credentials: "include", signal,
            body: JSON.stringify(createStartPayload(syncedNow)),
          });
          if (!response.ok) throw new Error(response.status === 403 || response.status === 401
            ? "Start was not authorized. Sign in to the CodeUtsava admin on this browser, then retry."
            : "Start could not be confirmed. Retry to check the shared timer.");
        }
      }
      const { next, startedAt } = await readSnapshot(signal);
      if (action === "start" && !next.counter.flag) throw new Error("Start was not confirmed by the countdown service. Retry sync before starting again.");
      if (mounted.current) applySnapshot(next, startedAt);
    } catch (failure) {
      if (mounted.current) setActionError(failure instanceof Error ? failure.message : "Unable to sync the timer. Please retry.");
    } finally {
      pending.current = false;
      if (mounted.current) setBusy(false);
    }
  };

  const counter = snapshot?.counter;
  const visibleError = actionError || error;
  const phase = counter ? counterPhase(counter, now) : "loading";
  const seconds = counter ? remainingSeconds(counter, now) : null;
  const parts = seconds === null ? ["--", "--", "--"] : [Math.floor(seconds / 3600), Math.floor(seconds / 60) % 60, seconds % 60].map((value) => String(value).padStart(2, "0"));
  const status = phase === "ready" ? "Ready for the opening ceremony" : phase === "running" ? "The hackathon is live" : phase === "complete" ? "Time’s up. The hackathon is complete." : "Connecting to the hackathon clock…";

  return (
    <div className={styles.countdown}>
      {demo && <p className={styles.demoNotice}>Local rehearsal · your changes affect this demo only.</p>}
      <p className={styles.status} role="status">{status}</p>
      <div className={styles.timerWrapper} role="timer" aria-live="off" aria-label={seconds === null ? "Countdown loading" : `${parts[0]} hours, ${parts[1]} minutes, ${parts[2]} seconds remaining`}>
        {parts.map((part, index) => (
          <Fragment key={index}>
            {index > 0 && <span className={styles.timerSeparator} aria-hidden="true">:</span>}
            <div className={styles.timerBlock} aria-hidden="true">
              <span className={styles.timerValue} data-text={part}>{part}</span>
              <span className={styles.timerLabel}>{["HRS", "MINS", "SECS"][index]}</span>
            </div>
          </Fragment>
        ))}
      </div>
      {counter?.flag && <p className={styles.schedule}>Started {dateFormat.format(counter.startTime)} · Ends {dateFormat.format(counter.endTime)} IST</p>}
      {allowStart && phase === "ready" && <p className={styles.hint}>The guest starts one 28-hour countdown for everyone.</p>}
      {visibleError && <div className={styles.error} role="alert"><p>{visibleError}</p><GlitchButton label="RETRY SYNC" variant="secondary" onClick={() => void performAction("retry")} disabled={busy} /></div>}
      {allowStart && phase === "ready" && !visibleError && <GlitchButton className={styles.startButton} label={busy ? "STARTING…" : "START COUNTDOWN"} onClick={() => void performAction("start")} disabled={busy} />}
      {demo && allowStart && <div className={styles.demoControls} aria-label="Local rehearsal controls">
        <GlitchButton className={styles.controlButton} label="RESET DEMO" variant="secondary" disabled={busy} onClick={() => void performAction("reset")} />
        <GlitchButton className={styles.controlButton} label="FINISH DEMO NOW" variant="secondary" disabled={busy || phase !== "running"} onClick={() => void performAction("finish")} />
        <GlitchButton className={styles.controlButton} label={disconnected || error.includes("Demo connection lost") ? "RESTORE CONNECTION" : "SIMULATE CONNECTION LOSS"} variant="secondary" disabled={busy} onClick={() => void performAction(disconnected || error.includes("Demo connection lost") ? "reconnect" : "disconnect")} />
      </div>}
    </div>
  );
}
