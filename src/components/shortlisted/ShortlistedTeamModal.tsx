'use client';

import React, { useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Minus, Square, Terminal } from 'lucide-react';
import type { ParsedShortlistedTeam } from '@/lib/shortlisted-api';
import styles from './ShortlistedTeamModal.module.css';

interface ShortlistedTeamModalProps {
  team: ParsedShortlistedTeam | null;
  onClose: () => void;
}

const emptySubscribe = () => () => {};

function useIsMounted() {
  return React.useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  );
}

export function ShortlistedTeamModal({ team, onClose }: ShortlistedTeamModalProps) {
  const mounted = useIsMounted();

  // Synthesize retro open audio tone
  useEffect(() => {
    if (team) {
      try {
        const AudioCtx =
          window.AudioContext ||
          (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        if (AudioCtx) {
          const ctx = new AudioCtx();
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'square';
          osc.frequency.setValueAtTime(520, ctx.currentTime);
          osc.frequency.setValueAtTime(780, ctx.currentTime + 0.04);
          osc.frequency.setValueAtTime(1040, ctx.currentTime + 0.08);
          gain.gain.setValueAtTime(0.08, ctx.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.16);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(ctx.currentTime);
          osc.stop(ctx.currentTime + 0.18);
        }
      } catch (err) {
        // AudioContext is optional and might be blocked by browser autoplay policy
        console.debug('Audio tone blocked or unavailable:', err);
      }
    }
  }, [team]);

  // Synthesize retro glitch power-down audio tone on close
  const playCloseSound = useCallback(() => {
    try {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        const ctx = new AudioCtx();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(840, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(70, ctx.currentTime + 0.2);
        gain.gain.setValueAtTime(0.06, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.22);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.24);
      }
    } catch (err) {
      // AudioContext is optional and might be blocked by browser autoplay policy
      console.debug('Close audio tone blocked or unavailable:', err);
    }
  }, []);

  const handleClose = useCallback(() => {
    playCloseSound();
    onClose();
  }, [onClose, playCloseSound]);

  // Handle ESC key to close & scroll lock
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleClose();
      }
    };
    if (team) {
      window.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [team, handleClose]);

  const handleBackdropClick = useCallback(
    (e: React.MouseEvent) => {
      if (e.target === e.currentTarget) {
        handleClose();
      }
    },
    [handleClose]
  );

  if (!mounted) return null;

  return createPortal(
    <AnimatePresence mode="wait">
      {team && (
        <motion.div
          className={styles.backdrop}
          onClick={handleBackdropClick}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.32, ease: 'easeInOut' }}
        >
          {/* Windows XP / Cyberpunk Glitchy Dialog Shell with Glitch Close Exit Animation */}
          <motion.div
            className={styles.windowShell}
            initial={{ scale: 0.88, opacity: 0, y: 16 }}
            animate={{
              scale: 1,
              opacity: 1,
              y: 0,
              x: 0,
              scaleX: 1,
              scaleY: 1,
              skewX: 0,
              filter: 'none',
              transition: { duration: 0.24, ease: [0.16, 1, 0.3, 1] },
            }}
            exit={{
              scaleX: [1, 1.08, 0.94, 1.16, 1.35, 0.04, 0],
              scaleY: [1, 0.94, 1.04, 0.55, 0.12, 0.02, 0],
              x: [0, -10, 14, -8, 16, -12, 0],
              y: [0, 3, -5, 6, -3, 1, 0],
              skewX: [0, -12, 14, -9, 18, -14, 0],
              opacity: [1, 0.9, 0.95, 0.7, 0.85, 0.2, 0],
              filter: [
                'none',
                'hue-rotate(45deg) contrast(160%) drop-shadow(-6px 0 0 #ff5fcf)',
                'hue-rotate(-60deg) contrast(200%) drop-shadow(6px 0 0 #faeb92)',
                'invert(70%) contrast(250%) drop-shadow(-10px 0 0 #9929ea)',
                'brightness(220%) saturate(300%) drop-shadow(8px 0 0 #ff5fcf)',
                'brightness(0%) contrast(300%)',
                'brightness(0%)',
              ],
              transition: {
                duration: 0.34,
                ease: [0.22, 1, 0.36, 1],
                times: [0, 0.14, 0.28, 0.46, 0.68, 0.88, 1],
              },
            }}
            role="dialog"
            aria-modal="true"
            aria-labelledby="modal-team-title"
          >
            {/* Scanline and CRT overlay effects */}
            <div className={styles.windowScanlines} aria-hidden="true" />
            <div className={styles.windowGlow} aria-hidden="true" />

            {/* Retro Windows XP Title Bar */}
            <div className={styles.titleBar}>
              <div className={styles.titleLeft}>
                <Terminal size={13} className={styles.terminalIcon} />
                <span className={styles.windowTitle}>
                  TEAM_SHORTLISTED // {team.teamName.replace(/\s+/g, '_').toUpperCase()}
                </span>
              </div>

              {/* Windows XP Control Buttons */}
              <div className={styles.windowControls}>
                <button
                  type="button"
                  className={styles.winBtn}
                  onClick={handleClose}
                  title="Minimize"
                  aria-label="Minimize"
                >
                  <Minus size={11} strokeWidth={2.5} />
                </button>
                <button
                  type="button"
                  className={styles.winBtn}
                  onClick={handleClose}
                  title="Maximize"
                  aria-label="Maximize"
                >
                  <Square size={10} strokeWidth={2.2} />
                </button>
                <button
                  type="button"
                  className={`${styles.winBtn} ${styles.winBtnClose}`}
                  onClick={handleClose}
                  title="Close"
                  aria-label="Close dialog"
                >
                  <X size={12} strokeWidth={2.6} />
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className={styles.windowBody}>
              {/* Top Banner Plaque (Team Name & College only) */}
              <div className={styles.teamPlaque}>
                <div className={styles.plaqueInner}>
                  <h2 id="modal-team-title" className={styles.plaqueTeamName}>
                    {team.teamName}
                  </h2>
                  <p className={styles.plaqueCollege}>{team.college}</p>
                </div>
              </div>

              {/* Roster Table */}
              <div className={styles.tableWrapper}>
                <table className={styles.rosterTable}>
                  <thead>
                    <tr>
                      <th scope="col" className={styles.thMember}>
                        Team Member
                      </th>
                      <th scope="col" className={styles.thName}>
                        Name
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {team.members.map((memberName, idx) => (
                      <tr key={idx} className={styles.tableRow}>
                        <td className={styles.tdMember}>
                          <span className={styles.memberNumberBadge}>{idx + 1}</span>
                        </td>
                        <td className={styles.tdName}>{memberName}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}

