'use client';

import { useState, useEffect } from 'react';
import { CheckCircle2 } from 'lucide-react';
import {
  fetchShortlistedTeams,
  FALLBACK_SHORTLISTED_TEAMS,
  type ParsedShortlistedTeam,
} from '@/lib/shortlisted-api';
import { ShortlistedTeamModal } from './ShortlistedTeamModal';
import styles from './ShortlistedTeams.module.css';

export function ShortlistedTeams() {
  const [teams, setTeams] = useState<ParsedShortlistedTeam[]>(FALLBACK_SHORTLISTED_TEAMS);
  const [selectedTeam, setSelectedTeam] = useState<ParsedShortlistedTeam | null>(null);
  const [hoveredSlot, setHoveredSlot] = useState<string | number | null>(null);
  const [isTouchDevice, setIsTouchDevice] = useState(false);

  useEffect(() => {
    let isMounted = true;
    fetchShortlistedTeams().then((data) => {
      if (isMounted && data && data.length > 0) {
        setTeams(data);
      }
    });

    const checkTouch = () => {
      setIsTouchDevice(
        'ontouchstart' in window ||
        navigator.maxTouchPoints > 0 ||
        window.innerWidth < 768
      );
    };
    checkTouch();
    window.addEventListener('resize', checkTouch);
    return () => {
      isMounted = false;
      window.removeEventListener('resize', checkTouch);
    };
  }, []);

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

      {/* Master Controls Bar - Decrypted State */}
      <div className={styles.controlsBar}>
        <div className={styles.statusIndicator}>
          <span>TRANSMISSION // DECRYPTED</span>
        </div>

        <div className={styles.btnGroup}>
          <div className={styles.lockedBadge}>
            <CheckCircle2 size={12} className={styles.lockIcon} />
            <span>LIVE</span>
          </div>
        </div>
      </div>

      {/* Grid of Rectangular Cards displaying Only Clean Team Names */}
      <div className={styles.slotsGrid}>
        {teams.map((team) => {
          const isHovered = !isTouchDevice && hoveredSlot === team.id;

          return (
            <div
              key={team.id}
              className={`${styles.slotCard} ${isHovered ? styles.slotCardHovered : ''}`}
              onMouseEnter={() => !isTouchDevice && setHoveredSlot(team.id)}
              onMouseLeave={() => setHoveredSlot(null)}
              onClick={() => setSelectedTeam(team)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  setSelectedTeam(team);
                }
              }}
              aria-label={`View dossier for ${team.teamName}`}
            >
              <div className={styles.cardScanline} aria-hidden="true" />
              <span className={styles.cardCorner} aria-hidden="true" />

              <div className={styles.cardInner}>
                <div className={styles.openedView}>
                  <h3 className={styles.teamName}>
                    {team.teamName}
                  </h3>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Glitchy Windows XP Title Box Modal */}
      <ShortlistedTeamModal
        team={selectedTeam}
        onClose={() => setSelectedTeam(null)}
      />
    </section>
  );
}
