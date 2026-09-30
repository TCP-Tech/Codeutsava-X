"use client";

import {
  useEffect,
  useRef,
  useState,
  useCallback,
  type CSSProperties,
  type ReactNode,
} from "react";
import styles from "./ExperienceShell.module.css";
import { retroAudio } from "@/utils/audioEffects";
import { introSoundtrack } from "@/utils/introSoundtrack";
import { cyberSoundtrack } from "@/utils/cyberSoundtrack";
import { BackgroundVideo } from "../layout/BackgroundVideo";

const GLYPHS = [..."CODEUTSAVA", " ", ..."X", ".O"];

export function ExperienceShell({ children }: { children: ReactNode }) {
  const [entered, setEntered] = useState(false);
  const [heroMounted, setHeroMounted] = useState(false);
  const [ready, setReady] = useState(false);
  const [entering, setEntering] = useState(false);
  const [returningToHero, setReturningToHero] = useState(false);
  const skipIntroRef = useRef(false);
  const reducedMotionRef = useRef(false);
  const transitionTimerRef = useRef<number | null>(null);

  useEffect(() => {
    const skipIntro =
      !!window.location.hash ||
      document.documentElement.dataset.heroReturn === "true";
    skipIntroRef.current = skipIntro;

    if (!skipIntro) return;

    const frame = window.requestAnimationFrame(() => {
      reducedMotionRef.current = window.matchMedia(
        "(prefers-reduced-motion: reduce)",
      ).matches;
      setHeroMounted(true);
      setReady(true);
      setReturningToHero(true);
      setEntering(true);
      window.scrollTo({ top: 0, left: 0, behavior: "auto" });

      transitionTimerRef.current = window.setTimeout(() => {
        setEntered(true);
        setReturningToHero(false);
        delete document.documentElement.dataset.heroReturn;
        transitionTimerRef.current = null;
      }, reducedMotionRef.current ? 180 : 960);
    });

    return () => window.cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    if (skipIntroRef.current) return;

    const idleWindow = window as Window & {
      requestIdleCallback?: (callback: () => void, options?: { timeout: number }) => number;
      cancelIdleCallback?: (handle: number) => void;
    };
    let fallbackTimer: number | null = null;
    const idleHandle = idleWindow.requestIdleCallback?.(
      () => setHeroMounted(true),
      { timeout: 1200 },
    );

    if (idleHandle === undefined) {
      fallbackTimer = window.setTimeout(() => setHeroMounted(true), 350);
    }

    return () => {
      if (idleHandle !== undefined) idleWindow.cancelIdleCallback?.(idleHandle);
      if (fallbackTimer !== null) window.clearTimeout(fallbackTimer);
    };
  }, []);

  useEffect(() => {
    if (skipIntroRef.current) return;

    const compactQuery = window.matchMedia('(max-width: 760px), (hover: none) and (pointer: coarse)');
    const reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const compact = compactQuery.matches || reducedMotionQuery.matches;

    reducedMotionRef.current = reducedMotionQuery.matches;
    const timer = window.setTimeout(() => setReady(true), compact ? 400 : 1200);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (entered) return;
    const previousBodyOverflow = document.body.style.overflow;
    const previousRootOverflow = document.documentElement.style.overflow;
    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousBodyOverflow;
      document.documentElement.style.overflow = previousRootOverflow;
    };
  }, [entered]);

  useEffect(() => {
    return () => {
      if (transitionTimerRef.current !== null) {
        window.clearTimeout(transitionTimerRef.current);
      }
    };
  }, []);

  const [isIntroMusicPlaying, setIsIntroMusicPlaying] = useState<boolean>(introSoundtrack.getIsPlaying());

  useEffect(() => {
    return introSoundtrack.subscribe((playing) => setIsIntroMusicPlaying(playing));
  }, []);

  useEffect(() => {
    const handleFirstInteraction = () => {
      if (isIntroMusicPlaying && !introSoundtrack.getIsPlaying()) {
        introSoundtrack.start(true);
      }
    };
    window.addEventListener("pointerdown", handleFirstInteraction, { once: true });
    window.addEventListener("keydown", handleFirstInteraction, { once: true });
    return () => {
      window.removeEventListener("pointerdown", handleFirstInteraction);
      window.removeEventListener("keydown", handleFirstInteraction);
    };
  }, [isIntroMusicPlaying]);

  const enter = useCallback(() => {
    if (!ready || entering) return;
    setHeroMounted(true);
    setEntering(true);

    retroAudio.playIntroPortalSound();
    introSoundtrack.fadeOutAndStop(0.4);

    // Synchronously start website background music on user gesture so audio context is unlocked immediately
    cyberSoundtrack.start(true);

    transitionTimerRef.current = window.setTimeout(() => {
      setEntered(true);
      transitionTimerRef.current = null;
    }, reducedMotionRef.current ? 180 : 960);
  }, [ready, entering]);

  useEffect(() => {
    if (!ready || entered || entering) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        enter();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [ready, entered, entering, isIntroMusicPlaying, enter]);

  return (
    <div
      className={`${styles.experience} ${entering ? styles.entering : ""} ${entered ? styles.entered : ""} ${returningToHero ? styles.returning : ""}`}
    >
      <BackgroundVideo />
      <div className={styles.site}>{heroMounted ? children : null}</div>
      {!entered && (
        <div className={styles.transitionStage} aria-live="polite">
          <div className={styles.bootViewport}>
            <div className={styles.bloom} aria-hidden="true" />
            <div className={styles.scanlines} aria-hidden="true" />
            <div className={styles.noise} aria-hidden="true" />


            <section
              className={styles.bios}
              data-intro-content
              aria-label="Codeutsava X.0 startup screen"
            >
              <div className={styles.brand}>

                <h1
                  className={styles.brandTitle}
                  data-text="CODEUTSAVA X.0"
                  aria-label="Codeutsava X.0"
                >
                  {GLYPHS.map((glyph, index) => (
                    <span
                      className={glyph === " " ? styles.wordSpace : undefined}
                      style={{ "--glyph-index": index } as CSSProperties}
                      key={`${glyph}-${index}`}
                    >
                      {glyph}
                    </span>
                  ))}
                </h1>
              </div>

              <div className={styles.actionSlot}>
                {!ready ? (
                  <div
                    className={styles.loader}
                    aria-label="Initializing creative systems"
                  >
                    {Array.from({ length: 18 }, (_, index) => (
                      <span
                        key={index}
                        style={{ "--segment-index": index } as CSSProperties}
                      />
                    ))}
                  </div>
                ) : (
                  <button
                    className={styles.enterButton}
                    type="button"
                    onClick={enter}
                  >
                    <span>ENTER THE GLITCHVERSE</span>
                  </button>
                )}
              </div>
              <p className={styles.copyright}>
                Copyright (C) Turing Club of Programmers, 2026. All Rights
                Reserved.
              </p>
            </section>

            <div className={styles.glitchBars} aria-hidden="true">
              {Array.from({ length: 9 }, (_, index) => (
                <span
                  key={index}
                  style={{
                    "--bar-index": index,
                    "--tear-a": `${(index - 4) * 7}px`,
                    "--tear-b": `${(4 - index) * 11}px`,
                    "--tear-c": `${(index - 5) * 15}px`,
                    "--tear-d": `${(5 - index) * 13}px`,
                  } as CSSProperties}
                />
              ))}
            </div>
          </div>
          <div className={styles.flash} aria-hidden="true" />
        </div>
      )}
    </div>
  );
}
