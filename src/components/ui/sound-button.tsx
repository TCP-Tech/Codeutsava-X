"use client";

import { useEffect, useState } from "react";
import { cyberSoundtrack } from "@/utils/cyberSoundtrack";
import styles from "./sound-button.module.css";

export function SoundButton() {
  const [isPlaying, setIsPlaying] = useState<boolean>(cyberSoundtrack.getIsPlaying());

  useEffect(() => {
    return cyberSoundtrack.subscribe((playing) => setIsPlaying(playing));
  }, []);

  const toggleMusic = () => {
    const isMuted = cyberSoundtrack.toggleMute();
    setIsPlaying(!isMuted);
  };

  return (
    <button
      type="button"
      onClick={toggleMusic}
      className={styles.musicButton}
      title={isPlaying ? "Mute Background Music" : "Play Background Music"}
      aria-label={isPlaying ? "Mute Background Music" : "Play Background Music"}
    >
      {isPlaying ? (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" suppressHydrationWarning>
          <path d="M11 5L6 9H2v6h4l5 4V5z" />
          <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07" />
        </svg>
      ) : (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" suppressHydrationWarning>
          <path d="M11 5L6 9H2v6h4l5 4V5z" />
          <line x1="23" y1="9" x2="17" y2="15" />
          <line x1="17" y1="9" x2="23" y2="15" />
        </svg>
      )}
    </button>
  );
}
