// =========================================================================
// MINIMAL & SOOTHING CYBER AMBIENT SOUNDTRACK ENGINE
// Ethereal Chillwave / Cyber Lo-Fi Ambient Synthesizer
// 100% Offline Web Audio API | Zero Audio File Overhead | 98 BPM
// =========================================================================

class CyberSoundtrackEngine {
  private audio: HTMLAudioElement | null = null;
  private isPlaying: boolean = false;
  private isMuted: boolean = true;
  private listeners: Set<(playing: boolean) => void> = new Set();

  private getAudio(): HTMLAudioElement | null {
    if (typeof window === 'undefined') return null;
    if (!this.audio) {
      this.audio = new Audio('/bgm.mpeg');
      this.audio.loop = true;
      this.audio.volume = 0.2; // Set volume to 20%
    }
    return this.audio;
  }

  public subscribe(cb: (playing: boolean) => void): () => void {
    this.listeners.add(cb);
    return () => {
      this.listeners.delete(cb);
    };
  }

  private notify() {
    this.listeners.forEach((cb) => cb(this.isPlaying && !this.isMuted));
  }

  public getIsPlaying(): boolean {
    return this.isPlaying && !this.isMuted;
  }

  public getMuted(): boolean {
    return this.isMuted;
  }

  public toggleMute(): boolean {
    this.isMuted = !this.isMuted;
    if (!this.isMuted) {
      this.start(false);
    } else {
      this.pause();
    }
    this.notify();
    return this.isMuted;
  }

  public start(fromBeginning: boolean = true) {
    const audio = this.getAudio();
    if (!audio) return;

    this.isMuted = false;
    this.isPlaying = true;

    if (fromBeginning) {
      audio.currentTime = 0;
    }

    audio.play().catch((e) => console.log('Audio playback prevented by browser:', e));
    this.notify();
  }

  public pause() {
    const audio = this.getAudio();
    if (!audio) return;

    this.isPlaying = false;
    audio.pause();
    this.notify();
  }
}

export const cyberSoundtrack = new CyberSoundtrackEngine();
