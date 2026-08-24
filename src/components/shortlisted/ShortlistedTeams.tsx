'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Unlock, RotateCcw } from 'lucide-react';
import { CyberLootboxIcon } from './CyberLootboxIcon';
import styles from './ShortlistedTeams.module.css';

interface ShortlistedSlot {
  id: number;
  name: string;
}

const SHORTLISTED_SLOTS: ShortlistedSlot[] = [
  {
    id: 1,
    name: 'ping_win'
  },
  {
    id: 2,
    name: 'Meta_Cognition'
  },
  {
    id: 3,
    name: 'WiFi & Chill'
  },
  {
    id: 4,
    name: 'CozyCoders'
  }
];

const GLITCH_GLYPHS = '!@#$%^&*<>[]{}|~_+?01X=/\\';

function ScrambleGlitchText({
  text,
  isHovered,
  className
}: {
  text: string;
  isHovered: boolean;
  className?: string;
}) {
  const [displayText, setDisplayText] = useState(text);

  useEffect(() => {
  if (!isHovered) {
    queueMicrotask(() => {
      setDisplayText(text);
    });
    return;
  }

    const interval = setInterval(() => {
      const scrambled = text
        .split('')
        .map((char) => {
          if (char === ' ' || char === '&' || char === '_') return char;
          if (Math.random() < 0.48) {
            return GLITCH_GLYPHS[Math.floor(Math.random() * GLITCH_GLYPHS.length)];
          }
          return char;
        })
        .join('');
      setDisplayText(scrambled);
    }, 45);

    return () => clearInterval(interval);
  }, [isHovered, text]);

  return <span className={className}>{isHovered ? displayText : text}</span>;
}

export function ShortlistedTeams() {
  const [openedSlots, setOpenedSlots] = useState<Record<number, boolean>>({});
  const [openingSlots, setOpeningSlots] = useState<Record<number, boolean>>({});
  const [hoveredSlot, setHoveredSlot] = useState<number | null>(null);
  const [isTouchDevice, setIsTouchDevice] = useState(false);

  useEffect(() => {
    const checkTouch = () => {
      setIsTouchDevice(
        'ontouchstart' in window ||
        navigator.maxTouchPoints > 0 ||
        window.innerWidth < 768
      );
    };
    checkTouch();
    window.addEventListener('resize', checkTouch);
    return () => window.removeEventListener('resize', checkTouch);
  }, []);

  const toggleSlot = (id: number) => {
    // Clear hover state on touch / mobile so text doesn't stay stuck in permanent glitch
    if (isTouchDevice) {
      setHoveredSlot(null);
    }

    if (openedSlots[id]) {
      // Re-seal this slot
      setOpenedSlots((prev) => ({ ...prev, [id]: false }));
      return;
    }

    if (openingSlots[id]) return;

    // Trigger fast glitch unbox sequence
    setOpeningSlots((prev) => ({ ...prev, [id]: true }));
    setTimeout(() => {
      setOpeningSlots((prev) => ({ ...prev, [id]: false }));
      setOpenedSlots((prev) => ({ ...prev, [id]: true }));
      if (isTouchDevice) setHoveredSlot(null);
    }, 350);
  };

  const unlockAll = () => {
    const allOpened: Record<number, boolean> = {};
    SHORTLISTED_SLOTS.forEach((slot) => {
      allOpened[slot.id] = true;
    });
    setOpenedSlots(allOpened);
    if (isTouchDevice) setHoveredSlot(null);
  };

  const resealAll = () => {
    setOpenedSlots({});
    if (isTouchDevice) setHoveredSlot(null);
  };

  const openedCount = Object.values(openedSlots).filter(Boolean).length;

  return (
    <section className={styles.section} id="shortlisted-teams" aria-labelledby="shortlist-title">
      {/* Heading */}
      <div className={styles.heading}>
        <p className={styles.eyebrow}>
          <span className={styles.eyebrowDot} />
          CYBERNETIC DATA VAULT // X.0
        </p>
        <h2 id="shortlist-title">TEAMS SHORTLISTED</h2>
      </div>

      {/* Master Controls Bar */}
      <div className={styles.controlsBar}>
        <div className={styles.statusIndicator}>
          <span>
            {openedCount === SHORTLISTED_SLOTS.length
              ? 'TRANSMISSION // UNLOCKED'
              : 'TRANSMISSION // ACTIVE'}
          </span>
        </div>

        <div className={styles.btnGroup}>
          {openedCount < SHORTLISTED_SLOTS.length ? (
            <button
              type="button"
              onClick={unlockAll}
              className={styles.ctrlBtn}
            >
              <Unlock size={11} />
              <span>UNLOCK ALL</span>
            </button>
          ) : null}

          {openedCount > 0 ? (
            <button
              type="button"
              onClick={resealAll}
              className={styles.ctrlBtn}
            >
              <RotateCcw size={11} />
              <span>RE-SEAL ALL</span>
            </button>
          ) : null}
        </div>
      </div>

      {/* Grid of Rectangular Lootbox Cards (3 Columns on Android/Mobile, 4 Columns on Desktop) */}
      <div className={styles.slotsGrid}>
        {SHORTLISTED_SLOTS.map((slot) => {
          const isOpen = Boolean(openedSlots[slot.id]);
          const isOpening = Boolean(openingSlots[slot.id]);
          const isHovered = !isTouchDevice && hoveredSlot === slot.id;

          return (
            <div
              key={slot.id}
              className={`${styles.slotCard} ${isHovered ? styles.slotCardHovered : ''}`}
              onClick={() => toggleSlot(slot.id)}
              onMouseEnter={() => !isTouchDevice && setHoveredSlot(slot.id)}
              onMouseLeave={() => setHoveredSlot(null)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  toggleSlot(slot.id);
                }
              }}
              aria-label={`Slot ${slot.id}: ${isOpen ? slot.name : 'Unopened Cyber Chest'}`}
            >
              <div className={styles.cardScanline} aria-hidden="true" />
              <span className={styles.cardCorner} aria-hidden="true" />

              <div className={styles.cardInner}>
                <AnimatePresence mode="wait">
                  {!isOpen ? (
                    /* UNOPENED STATE: CYBER CHEST + SCRAMBLE UNOPENED LABEL */
                    <motion.div
                      key="unopened"
                      className={styles.unopenedView}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.2 }}
                    >
                      <CyberLootboxIcon
                        isOpen={false}
                        isOpening={isOpening}
                        isHovered={isHovered}
                      />
                      <ScrambleGlitchText
                        text={isOpening ? '[ OPENING... ]' : '[ UNOPENED CHEST ]'}
                        isHovered={isHovered}
                        className={styles.unopenedLabel}
                      />
                    </motion.div>
                  ) : (
                    /* OPENED STATE: DYNAMIC REAL-TIME SCRAMBLE GLITCH TEAM NAME */
                    <motion.div
                      key="opened"
                      className={styles.openedView}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      transition={{ duration: 0.25 }}
                    >
                      <h3 className={styles.teamName}>
                        <ScrambleGlitchText
                          text={slot.name}
                          isHovered={isHovered}
                        />
                      </h3>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
