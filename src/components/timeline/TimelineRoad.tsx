'use client';

import React, { useEffect, useRef, useState } from 'react';
import { TimelineCanvas3D } from './TimelineCanvas3D';
import styles from './TimelineRoad.module.css';
import sponsorStyles from '@/components/sponsor-section/SponsorSection.module.css';
import guidelineStyles from '@/components/sections/guidelines-section.module.css';
import { retroAudio } from '@/utils/audioEffects';
import { ChevronRight, FastForward, Volume2, VolumeX, X } from 'lucide-react';

interface GlitchTextProps {
  text: string;
  className?: string;
}

const GlitchText: React.FC<GlitchTextProps> = ({ text, className = '' }) => {
  return (
    <span className={`relative inline-block ${className}`}>
      <span className="relative z-10">{text}</span>
      <span
        aria-hidden="true"
        className="absolute inset-0 text-[#FF5FCF] opacity-70 clip-path-glitch-1 animate-pulse -translate-x-px translate-y-px pointer-events-none"
      >
        {text}
      </span>
      <span
        aria-hidden="true"
        className="absolute inset-0 text-[#00F0FF] opacity-70 clip-path-glitch-2 animate-pulse translate-x-px -translate-y-px pointer-events-none"
      >
        {text}
      </span>
    </span>
  );
};

export const TimelineRoad: React.FC = () => {
  const stickyContainerRef = useRef<HTMLElement | null>(null);
  const [activeEventIndex, setActiveEventIndex] = useState<number>(0);
  const [scrollProgress, setScrollProgress] = useState<number>(0);
  const [isMuted, setIsMuted] = useState<boolean>(retroAudio.getMuted());
  const [isTimelineOpen, setIsTimelineOpen] = useState<boolean>(false);
  const [isTimelineClosing, setIsTimelineClosing] = useState<boolean>(false);
  const [isSkipping, setIsSkipping] = useState<boolean>(false);
  const closeTimerRef = useRef<number | null>(null);
  const skipTimersRef = useRef<number[]>([]);
  const touchLastYRef = useRef<number | null>(null);

  useEffect(() => retroAudio.subscribe((muted) => setIsMuted(muted)), []);

  useEffect(() => {
    if (!isTimelineOpen) return;

    const previousBodyOverflow = document.body.style.overflow;
    const previousRootOverflow = document.documentElement.style.overflow;
    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = previousBodyOverflow;
      document.documentElement.style.overflow = previousRootOverflow;
    };
  }, [isTimelineOpen]);

  useEffect(() => {
    const skipTimers = skipTimersRef.current;
    return () => {
      if (closeTimerRef.current !== null) {
        window.clearTimeout(closeTimerRef.current);
      }
      skipTimers.forEach((timer) => window.clearTimeout(timer));
    };
  }, []);

  const handleSelectEvent = React.useCallback((index: number) => {
    setActiveEventIndex((previousIndex) => previousIndex === index ? previousIndex : index);
  }, []);

  const toggleMute = () => {
    const nextMuted = retroAudio.toggleMute();
    setIsMuted(nextMuted);
    if (!nextMuted) retroAudio.playXPDing();
  };

  const handleSkipSection = () => {
    if (!stickyContainerRef.current || isSkipping) return;

    const timeline = stickyContainerRef.current;
    const nextElement = timeline.nextElementSibling as HTMLElement | null;
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const jumpDelay = reducedMotion ? 80 : 520;
    const resetDelay = reducedMotion ? 220 : 1050;

    setIsSkipping(true);
    retroAudio.playXPDing();

    const jumpTimer = window.setTimeout(() => {
      setIsTimelineOpen(false);
      setIsTimelineClosing(false);

      if (nextElement) {
        nextElement.scrollIntoView({ behavior: 'auto', block: 'start' });
      } else {
        const rect = timeline.getBoundingClientRect();
        window.scrollTo({ top: window.scrollY + rect.bottom, behavior: 'auto' });
      }
    }, jumpDelay);

    const resetTimer = window.setTimeout(() => setIsSkipping(false), resetDelay);
    skipTimersRef.current.push(jumpTimer, resetTimer);
  };

  const handleCloseTimeline = () => {
    if (isTimelineClosing) return;
    setIsTimelineClosing(true);
    retroAudio.playXPDing();
    closeTimerRef.current = window.setTimeout(() => {
      setIsTimelineOpen(false);
      setIsTimelineClosing(false);
      closeTimerRef.current = null;
    }, 360);
  };

  const handleOpenTimeline = () => {
    if (closeTimerRef.current !== null) {
      window.clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
    setScrollProgress(0);
    setIsTimelineClosing(false);
    setIsTimelineOpen(true);
    retroAudio.playXPDing();
  };

  const updateTimelineProgress = (delta: number) => {
    const nextProgress = Math.max(0, Math.min(1, scrollProgress + delta));
    setScrollProgress(nextProgress);

    if (delta > 0 && nextProgress >= 1) {
      handleCloseTimeline();
    }
  };

  const handleTimelineWheel = (event: React.WheelEvent<HTMLDivElement>) => {
    event.preventDefault();
    updateTimelineProgress(event.deltaY / (window.innerHeight * 2));
  };

  const handleTimelineTouchStart = (event: React.TouchEvent<HTMLDivElement>) => {
    touchLastYRef.current = event.touches[0]?.clientY ?? null;
  };

  const handleTimelineTouchMove = (event: React.TouchEvent<HTMLDivElement>) => {
    const currentY = event.touches[0]?.clientY;
    const lastY = touchLastYRef.current;
    if (currentY === undefined || lastY === null) return;

    event.preventDefault();
    updateTimelineProgress((lastY - currentY) / (window.innerHeight * 1.2));
    touchLastYRef.current = currentY;
  };

  const handleTimelineTouchEnd = () => {
    touchLastYRef.current = null;
  };

  return (
    <section
      id="timeline"
      ref={stickyContainerRef}
      className={`${guidelineStyles.guidelines} relative w-full flex flex-col items-center justify-center`}
      style={{ zIndex: isTimelineOpen ? 9999 : undefined }}
    >
      {isSkipping && (
        <div className={styles.skipTransition} role="status" aria-live="polite">
          <div className={styles.skipNoise} aria-hidden="true" />
          <div className={styles.skipReadout}>
            <span>FAST FORWARD // TIMELINE</span>
            <strong data-text="SIGNAL BYPASSED">SIGNAL BYPASSED</strong>
            <i aria-hidden="true" />
          </div>
        </div>
      )}

      <div className={sponsorStyles.backgroundGrid} aria-hidden="true" />
      <div className={sponsorStyles.filmGrain} aria-hidden="true" />
      <div className={sponsorStyles.glitchBursts} aria-hidden="true">
        <span />
        <span />
        <span />
      </div>

      <div className={`${sponsorStyles.heading} ${guidelineStyles.heading}`}>
        <h2 id="timeline-title" data-text="TIMELINE">TIMELINE</h2>
      </div>

      <div className={guidelineStyles.frame}>
        <span className={guidelineStyles.frameCorner} aria-hidden="true" />
        <span className={guidelineStyles.frameCorner} aria-hidden="true" />
        <span className={guidelineStyles.frameCorner} aria-hidden="true" />
        <span className={guidelineStyles.frameCorner} aria-hidden="true" />

        <div className={guidelineStyles.frameHeader} aria-hidden="true">
          <span>MODULE // CHRONOS</span>
          <span className={guidelineStyles.status}>OFFLINE</span>
        </div>

        <div className={`${guidelineStyles.content} flex flex-col items-center justify-center py-10 text-center`}>
          <p className={guidelineStyles.kicker}>SYSTEM STATUS</p>
          <h3 style={{ fontSize: 'clamp(20px, 2.5vw, 28px)' }}>Initiating Sequence</h3>

          <div className={`${guidelineStyles.rules} max-w-2xl mt-4 z-10 relative px-4`}>
            <p style={{ textAlign: 'center', color: 'rgba(250, 235, 146, 0.76)' }}>
              The <strong className="text-[#00F0FF]" style={{ textShadow: '0 0 10px rgba(0, 240, 255, 0.4)' }}>Glitchverse</strong> is expanding. Trace the sequence of events from initiation to execution in our interactive 3D timeline.
            </p>
            <div className="flex items-center justify-center gap-4 mt-8 opacity-80">
              <span className="h-px w-12 sm:w-24 bg-gradient-to-r from-transparent to-[#FF5FCF]" />
              <span className="font-mono text-[10px] sm:text-xs font-semibold tracking-[0.3em] text-[#FAEB92] animate-pulse">SYSTEM.READY // AWAITING.INPUT</span>
              <span className="h-px w-12 sm:w-24 bg-gradient-to-l from-transparent to-[#FF5FCF]" />
            </div>
          </div>

          <button
            type="button"
            onClick={handleOpenTimeline}
            className={guidelineStyles.criteriaButton}
            style={{ minWidth: '320px', minHeight: '54px', marginTop: '32px', fontSize: '16px', padding: '12px 24px' }}
            aria-label="Open timeline"
          >
            <span>OPEN TIMELINE</span>
            <ChevronRight className="h-6 w-6" aria-hidden="true" />
          </button>
        </div>

        <div className={guidelineStyles.frameFooter} aria-hidden="true">
          <span>READ // COMPILE // EXECUTE</span>
          <span>ENTER TO BEGIN</span>
        </div>
      </div>

      {isTimelineOpen && (
        <div
          className={`${styles.modalBackdrop} ${isTimelineClosing ? styles.modalBackdropClosing : ''} fixed inset-0 z-3000 flex items-center justify-center bg-black/90 p-2 sm:p-6`}
          role="presentation"
        >
          <div
            className={`${styles.modalPanel} ${isTimelineClosing ? styles.modalPanelClosing : ''} relative h-[min(92svh,900px)] w-full max-w-360 overflow-hidden rounded-2xl border border-[#FF5FCF]/60 bg-[#05040A] shadow-[0_0_0_1px_rgba(153,41,234,0.5),0_0_45px_rgba(153,41,234,0.55)] touch-none`}
            role="dialog"
            aria-modal="true"
            aria-labelledby="timeline-dialog-title"
            onWheel={handleTimelineWheel}
            onTouchStart={handleTimelineTouchStart}
            onTouchMove={handleTimelineTouchMove}
            onTouchEnd={handleTimelineTouchEnd}
          >
            <button
              type="button"
              onClick={handleCloseTimeline}
              className="absolute right-3 top-3 z-50 flex h-10 w-10 items-center justify-center rounded-lg border border-[#FF5FCF]/60 bg-[#090511]/80 text-[#FAEB92] shadow-[0_0_16px_rgba(255,95,207,0.35)] transition hover:bg-[#9929EA]/70 hover:text-white"
              aria-label="Close timeline"
              title="Close timeline"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="relative h-full w-full overflow-hidden flex flex-col justify-between select-none">
              <TimelineCanvas3D
                activeEventIndex={activeEventIndex}
                onSelectEvent={handleSelectEvent}
                scrollProgress={scrollProgress}
                setScrollProgress={setScrollProgress}
              />

              <div className="relative z-40 w-full pt-4 sm:pt-6 px-4 sm:px-10 pointer-events-none flex items-start justify-between">
                <div className="pointer-events-auto max-w-xl">
                  <h2
                    id="timeline-dialog-title"
                    className={`${styles.timelineTitle} uppercase select-none drop-shadow-[0_0_20px_rgba(0,0,0,0.8)]`}
                    style={{ fontFamily: '"Arial Narrow", "Helvetica Neue", Arial, sans-serif', fontWeight: 800 }}
                  >
                    <span className="text-white">THE </span>
                    <GlitchText text="TIMELINE" className="text-[#FAEB92]" />
                    <span className="text-white"> TO THE</span>
                    <br />
                    <span
                      className="text-[#FF5FCF] inline-block mt-1"
                      style={{
                        textShadow: '3px 3px 0 #9929EA, 0 0 20px rgba(255,95,207,0.5)',
                        filter: 'drop-shadow(0 0 15px rgba(255,95,207,0.4))',
                      }}
                    >
                      GLITCHVERSE
                    </span>
                  </h2>
                </div>

                <div className="pointer-events-auto flex items-center gap-2 sm:gap-3 fixed bottom-6 left-6 z-50 sm:static sm:z-auto sm:bottom-auto sm:left-auto sm:pr-12">
                  <button
                    type="button"
                    onClick={handleSkipSection}
                    disabled={isSkipping}
                    className={styles.skipButton}
                    title="Skip Timeline Section"
                    aria-label="Skip Timeline Section"
                  >
                    <span className={styles.skipButtonProgress} aria-hidden="true" />
                    <span>SKIP</span>
                    <FastForward className={styles.skipIcon} aria-hidden="true" />
                  </button>

                  <button
                    type="button"
                    onClick={toggleMute}
                    className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-300 cursor-pointer border ${!isMuted
                      ? 'bg-[#9929EA]/25 text-[#FF5FCF] border-[#FF5FCF]/50 hover:bg-[#9929EA]/40 hover:scale-105 shadow-[0_0_20px_rgba(153,41,234,0.4)]'
                      : 'bg-black/60 text-gray-500 border-white/10 hover:bg-black/80 hover:text-gray-300'}`}
                    title={isMuted ? 'Unmute Timeline SFX' : 'Mute Timeline SFX'}
                    aria-label={isMuted ? 'Unmute Timeline SFX' : 'Mute Timeline SFX'}
                  >
                    {!isMuted ? (
                      <Volume2 className="w-5 h-5 text-[#FF5FCF] drop-shadow-[0_0_8px_#FF5FCF]" />
                    ) : (
                      <VolumeX className="w-5 h-5 text-gray-500" />
                    )}
                  </button>
                </div>
              </div>

              <div className="relative z-40 w-full pointer-events-none pb-4" />
            </div>
          </div>
        </div>
      )}
    </section>
  );
};
