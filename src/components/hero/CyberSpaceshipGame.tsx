"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import styles from "./CyberSpaceshipGame.module.css";

interface CyberSpaceshipGameProps {
  onClose: () => void;
}

export function CyberSpaceshipGame({ onClose }: CyberSpaceshipGameProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);

  // Cached viewport dimensions & scale
  const boundsRef = useRef({
    width: 800,
    height: 120,
    dpr: 1,
    scale: 1,
  });

  // Game internal simulation state
  const stateRef = useRef({
    gameState: "idle" as "idle" | "playing" | "gameover",
    score: 0,
    glitchesCaught: 0,
    highScore: 0,
    speed: 4.8,
    ship: {
      x: 38,
      y: 60,
      targetY: 60,
      width: 24,
      height: 14,
      speed: 5.5,
      tilt: 0,
    },
    lasers: [] as Array<{ x: number; y: number; vx: number; width: number; height: number; color: string }>,
    enemies: [] as Array<{
      id: number;
      type: "glitch_rock" | "space_pirate";
      x: number;
      y: number;
      baseY: number;
      width: number;
      height: number;
      vx: number;
      health: number;
      maxHealth: number;
      hitFlash: number;
      sinOffset: number;
      sinSpeed: number;
      angle: number;
      rotSpeed: number;
    }>,
    particles: [] as Array<{
      x: number;
      y: number;
      vx: number;
      vy: number;
      life: number;
      maxLife: number;
      color: string;
      size: number;
    }>,
    stars: [] as Array<{ x: number; y: number; size: number; speed: number; opacity: number }>,
    keys: {
      up: false,
      down: false,
    },
    nextEnemyDistance: 140,
    distanceSinceLastEnemy: 0,
    lastTime: 0,
    nextEnemyId: 1,
  });

  // Load High Score on Mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem("codeutsava_spaceship_hi");
      if (saved) {
        stateRef.current.highScore = parseInt(saved, 10) || 0;
      }
    } catch {
      // ignore
    }
  }, []);

  // Web Audio Synth for Lasers & Explosions
  const playSound = useCallback((type: "laser" | "glitch_catch" | "pirate_destroy" | "hit" | "gameover") => {
    try {
      if (!audioCtxRef.current) {
        const AudioCtx =
          window.AudioContext ||
          (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        if (AudioCtx) audioCtxRef.current = new AudioCtx();
      }
      const ctx = audioCtxRef.current;
      if (!ctx) return;
      if (ctx.state === "suspended") ctx.resume();

      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      if (type === "laser") {
        osc.type = "sawtooth";
        osc.frequency.setValueAtTime(880, now);
        osc.frequency.exponentialRampToValueAtTime(220, now + 0.07);
        gain.gain.setValueAtTime(0.07, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.09);
      } else if (type === "glitch_catch") {
        osc.type = "sine";
        osc.frequency.setValueAtTime(659.25, now);
        osc.frequency.setValueAtTime(987.77, now + 0.05);
        gain.gain.setValueAtTime(0.09, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.14);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.16);
      } else if (type === "pirate_destroy") {
        osc.type = "square";
        osc.frequency.setValueAtTime(200, now);
        osc.frequency.exponentialRampToValueAtTime(35, now + 0.2);
        gain.gain.setValueAtTime(0.12, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.24);
      } else if (type === "hit") {
        osc.type = "triangle";
        osc.frequency.setValueAtTime(300, now);
        osc.frequency.exponentialRampToValueAtTime(100, now + 0.05);
        gain.gain.setValueAtTime(0.06, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.07);
      } else if (type === "gameover") {
        osc.type = "sawtooth";
        osc.frequency.setValueAtTime(240, now);
        osc.frequency.exponentialRampToValueAtTime(30, now + 0.35);
        gain.gain.setValueAtTime(0.15, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.42);
      }
    } catch {
      // ignore
    }
  }, []);

  // Fire Laser Action
  const fireLaser = useCallback(() => {
    const s = stateRef.current;
    if (s.gameState === "idle" || s.gameState === "gameover") {
      s.gameState = "playing";
      s.score = 0;
      s.glitchesCaught = 0;
      s.lasers = [];
      s.enemies = [];
      s.particles = [];
      s.speed = 4.8;
      s.distanceSinceLastEnemy = 0;
      s.nextEnemyDistance = 260;
      playSound("glitch_catch");
      return;
    }

    if (s.gameState === "playing") {
      const { scale } = boundsRef.current;
      s.lasers.push({
        x: s.ship.x + s.ship.width / 2,
        y: s.ship.y,
        vx: 12 * scale,
        width: 8 * scale,
        height: 2 * scale,
        color: "#00f0ff",
      });
      playSound("laser");
    }
  }, [playSound]);

  // Global Keyboard Controls (W/S and Arrow Keys for Ship Movement)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const s = stateRef.current;
      if (e.code === "ArrowUp" || e.code === "KeyW") {
        e.preventDefault();
        s.keys.up = true;
      } else if (e.code === "ArrowDown" || e.code === "KeyS") {
        e.preventDefault();
        s.keys.down = true;
      } else if (e.code === "Space" || e.code === "KeyJ" || e.code === "KeyK") {
        e.preventDefault();
        if (e.repeat) return; // Prevent continuous hold-down auto fire
        fireLaser();
      } else if (e.code === "Escape") {
        onClose();
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      const s = stateRef.current;
      if (e.code === "ArrowUp" || e.code === "KeyW") {
        s.keys.up = false;
      } else if (e.code === "ArrowDown" || e.code === "KeyS") {
        s.keys.down = false;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, [fireLaser, onClose]);

  // High-Performance 60/120fps Simulation Engine
  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;
    const ctx = canvas.getContext("2d", { alpha: false });
    if (!ctx) return;

    let animId: number;

    const updateDimensions = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = container.clientWidth || 800;
      const h = container.clientHeight || 120;
      const scale = Math.max(0.65, Math.min(1.15, h / 95));

      boundsRef.current = { width: w, height: h, dpr, scale };

      const s = stateRef.current;
      s.ship.width = Math.round(22 * scale);
      s.ship.height = Math.round(12 * scale);
      s.ship.speed = 5 * scale;
      s.ship.x = Math.round(32 * scale);

      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);

      // Starfield
      if (s.stars.length === 0) {
        for (let i = 0; i < 35; i++) {
          s.stars.push({
            x: Math.random() * w,
            y: Math.random() * h,
            size: Math.random() * 1.2 + 0.6,
            speed: Math.random() * 1.2 + 0.3,
            opacity: Math.random() * 0.6 + 0.25,
          });
        }
      }
    };

    const resizeObserver = new ResizeObserver(() => updateDimensions());
    resizeObserver.observe(container);
    updateDimensions();

    stateRef.current.lastTime = performance.now();

    const loop = (now: number) => {
      const s = stateRef.current;
      const dt = Math.min((now - s.lastTime) / 1000, 0.05);
      s.lastTime = now;
      const timeScale = dt * 60;

      const { width, height, dpr, scale } = boundsRef.current;

      ctx.save();
      ctx.scale(dpr, dpr);

      // 1. Minimal Clean Background
      ctx.fillStyle = "#050208";
      ctx.fillRect(0, 0, width, height);

      // Parallax Stars
      s.stars.forEach((star) => {
        star.x -= star.speed * (s.gameState === "playing" ? 2 : 0.6) * timeScale;
        if (star.x < 0) {
          star.x = width + Math.random() * 10;
          star.y = Math.random() * height;
        }
        ctx.fillStyle = `rgba(250, 235, 146, ${star.opacity})`;
        ctx.fillRect(Math.floor(star.x), Math.floor(star.y), star.size, star.size);
      });

      // 2. Spaceship Keyboard-Only Movement & Physics
      if (s.gameState === "playing") {
        // Pure Keyboard Movement (W/S or Arrow Keys)
        if (s.keys.up) {
          s.ship.y -= s.ship.speed * timeScale;
          s.ship.tilt = Math.max(-0.22, s.ship.tilt - 0.08 * timeScale);
        } else if (s.keys.down) {
          s.ship.y += s.ship.speed * timeScale;
          s.ship.tilt = Math.min(0.22, s.ship.tilt + 0.08 * timeScale);
        } else {
          s.ship.tilt *= Math.pow(0.82, timeScale);
        }

        // Clamp inside screen bounds
        const minY = s.ship.height / 2 + 4;
        const maxY = height - s.ship.height / 2 - 4;
        s.ship.y = Math.max(minY, Math.min(maxY, s.ship.y));

        // Minimal Thruster Particles (only while playing)
        if (Math.random() > 0.4) {
          s.particles.push({
            x: s.ship.x - s.ship.width / 2 - 2,
            y: s.ship.y + (Math.random() * 4 - 2),
            vx: -(Math.random() * 2.5 + 1.5) * scale,
            vy: (Math.random() * 1.5 - 0.75) * scale,
            life: 0,
            maxLife: 12,
            color: Math.random() > 0.5 ? "#00f0ff" : "#ff5fcf",
            size: Math.random() * 2 + 1,
          });
        }

        s.score += 0.1 * timeScale;
      }

      // Continuous Enemy Spawning (Sparse, Clean & Balanced Density)
      s.distanceSinceLastEnemy += s.speed * timeScale;
      if (s.distanceSinceLastEnemy >= s.nextEnemyDistance) {
        s.distanceSinceLastEnemy = 0;
        // Much wider spacing between obstacles (generous breathing room)
        const isIdle = s.gameState === "idle";
        s.nextEnemyDistance = isIdle
          ? (Math.floor(Math.random() * 200) + 380) * scale
          : (Math.floor(Math.random() * 180) + 260) * scale;

        const isPirate = Math.random() < 0.35;
        const enemyY = Math.random() * (height - 30 * scale) + 15 * scale;

        if (isPirate) {
          s.enemies.push({
            id: s.nextEnemyId++,
            type: "space_pirate",
            x: width + 20,
            y: enemyY,
            baseY: enemyY,
            width: Math.round(18 * scale),
            height: Math.round(12 * scale),
            vx: (Math.random() * 1.2 + 2.4) * scale,
            health: 2,
            maxHealth: 2,
            hitFlash: 0,
            sinOffset: Math.random() * Math.PI * 2,
            sinSpeed: Math.random() * 0.05 + 0.03,
            angle: 0,
            rotSpeed: 0,
          });
        } else {
          s.enemies.push({
            id: s.nextEnemyId++,
            type: "glitch_rock",
            x: width + 20,
            y: enemyY,
            baseY: enemyY,
            width: Math.round(14 * scale),
            height: Math.round(14 * scale),
            vx: (Math.random() * 1.1 + 1.9) * scale,
            health: 1,
            maxHealth: 1,
            hitFlash: 0,
            sinOffset: 0,
            sinSpeed: 0,
            angle: Math.random() * Math.PI * 2,
            rotSpeed: (Math.random() * 0.05 - 0.025),
          });
        }
      }

      // 3. Update & Draw Lasers (Always Animates)
      for (let i = s.lasers.length - 1; i >= 0; i--) {
        const laser = s.lasers[i];
        laser.x += laser.vx * timeScale;

        ctx.fillStyle = laser.color;
        ctx.fillRect(laser.x, laser.y - laser.height / 2, laser.width, laser.height);

        if (laser.x > width + 20) {
          s.lasers.splice(i, 1);
        }
      }

      // 4. Update & Draw Enemies (Always Animates smoothly across screen)
      for (let i = s.enemies.length - 1; i >= 0; i--) {
        const enemy = s.enemies[i];

        enemy.x -= enemy.vx * timeScale;

        if (enemy.type === "space_pirate") {
          enemy.sinOffset += enemy.sinSpeed * timeScale;
          enemy.y = enemy.baseY + Math.sin(enemy.sinOffset) * (12 * scale);
          enemy.y = Math.max(enemy.height / 2, Math.min(height - enemy.height / 2, enemy.y));
        } else {
          enemy.angle += enemy.rotSpeed * timeScale;
        }

        if (enemy.hitFlash > 0) enemy.hitFlash -= timeScale;

        // Collision & Hits Only Active During Playing
        if (s.gameState === "playing") {
          // Laser Hit Check
          for (let l = s.lasers.length - 1; l >= 0; l--) {
            const laser = s.lasers[l];
            const hit =
              laser.x + laser.width >= enemy.x - enemy.width / 2 &&
              laser.x <= enemy.x + enemy.width / 2 &&
              laser.y >= enemy.y - enemy.height / 2 &&
              laser.y <= enemy.y + enemy.height / 2;

            if (hit) {
              s.lasers.splice(l, 1);
              enemy.health -= 1;
              enemy.hitFlash = 5;

              if (enemy.health <= 0) {
                if (enemy.type === "glitch_rock") {
                  s.glitchesCaught += 1;
                  s.score += 25;
                  playSound("glitch_catch");

                  // Minimal Glitch Particles
                  for (let p = 0; p < 6; p++) {
                    const angle = Math.random() * Math.PI * 2;
                    const spd = Math.random() * 2.5 + 1;
                    s.particles.push({
                      x: enemy.x,
                      y: enemy.y,
                      vx: Math.cos(angle) * spd,
                      vy: Math.sin(angle) * spd,
                      life: 0,
                      maxLife: 15,
                      color: Math.random() > 0.5 ? "#faeb92" : "#ff5fcf",
                      size: Math.random() * 2 + 1,
                    });
                  }
                } else {
                  s.score += 75;
                  playSound("pirate_destroy");

                  // Pirate Explosion Particles
                  for (let p = 0; p < 10; p++) {
                    const angle = Math.random() * Math.PI * 2;
                    const spd = Math.random() * 3 + 1;
                    s.particles.push({
                      x: enemy.x,
                      y: enemy.y,
                      vx: Math.cos(angle) * spd,
                      vy: Math.sin(angle) * spd,
                      life: 0,
                      maxLife: 20,
                      color: ["#ff2b9e", "#faeb92", "#00f0ff"][Math.floor(Math.random() * 3)],
                      size: Math.random() * 2.5 + 1.5,
                    });
                  }
                }

                // Update High Score
                const curTotal = Math.floor(s.score);
                if (curTotal > s.highScore) {
                  s.highScore = curTotal;
                  try {
                    localStorage.setItem("codeutsava_spaceship_hi", curTotal.toString());
                  } catch {
                    // ignore
                  }
                }

                s.enemies.splice(i, 1);
                break;
              } else {
                playSound("hit");
              }
            }
          }

          // Player Ship Crash Check
          const shipBox = {
            x: s.ship.x - s.ship.width / 2 + 2,
            y: s.ship.y - s.ship.height / 2 + 2,
            w: s.ship.width - 4,
            h: s.ship.height - 4,
          };
          const enemyBox = {
            x: enemy.x - enemy.width / 2 + 2,
            y: enemy.y - enemy.height / 2 + 2,
            w: enemy.width - 4,
            h: enemy.height - 4,
          };

          if (
            shipBox.x < enemyBox.x + enemyBox.w &&
            shipBox.x + shipBox.w > enemyBox.x &&
            shipBox.y < enemyBox.y + enemyBox.h &&
            shipBox.y + shipBox.h > enemyBox.y
          ) {
            s.gameState = "gameover";
            playSound("gameover");

            for (let p = 0; p < 16; p++) {
              const angle = Math.random() * Math.PI * 2;
              const spd = Math.random() * 3 + 1.5;
              s.particles.push({
                x: s.ship.x,
                y: s.ship.y,
                vx: Math.cos(angle) * spd,
                vy: Math.sin(angle) * spd,
                life: 0,
                maxLife: 22,
                color: ["#00f0ff", "#ff5fcf", "#faeb92"][Math.floor(Math.random() * 3)],
                size: Math.random() * 3 + 1.5,
              });
            }
          }
        }

        // Draw Minimal Enemy
        if (enemy.type === "glitch_rock") {
          drawMinimalGlitch(ctx, enemy.x, enemy.y, enemy.width, enemy.angle, enemy.hitFlash > 0);
        } else {
          drawMinimalPirate(ctx, enemy.x, enemy.y, enemy.width, enemy.height, scale, enemy.hitFlash > 0);
        }

        if (enemy.x < -30) {
          s.enemies.splice(i, 1);
        }
      }

      // 5. Draw Minimal Player Starship (ONLY VISIBLE WHILE PLAYING)
      if (s.gameState === "playing") {
        drawMinimalShip(ctx, s.ship.x, s.ship.y, s.ship.width, s.ship.height, s.ship.tilt, scale);
      }

      // 6. Draw Particles
      for (let i = s.particles.length - 1; i >= 0; i--) {
        const p = s.particles[i];
        p.x += p.vx * timeScale;
        p.y += p.vy * timeScale;
        p.life += timeScale;

        const alpha = Math.max(0, 1 - p.life / p.maxLife);
        ctx.fillStyle = p.color;
        ctx.globalAlpha = alpha;
        ctx.fillRect(Math.floor(p.x), Math.floor(p.y), p.size, p.size);
        ctx.globalAlpha = 1;

        if (p.life >= p.maxLife) {
          s.particles.splice(i, 1);
        }
      }

      // 7. ULTRA-MINIMAL HUD (ALL ON RIGHT SIDE - ZERO OVERLAP ON LEFT!)
      const fontSize = Math.max(9, Math.round(11 * scale));
      ctx.font = `700 ${fontSize}px "Courier New", Courier, monospace`;
      ctx.textBaseline = "top";
      ctx.textAlign = "right";

      const glitchText = `GLITCHES: ${s.glitchesCaught.toString().padStart(4, "0")}`;
      const hiText = `HI ${s.highScore.toString().padStart(5, "0")}`;

      ctx.fillStyle = "#faeb92";
      ctx.fillText(glitchText, width - Math.round(100 * scale), Math.round(8 * scale));

      ctx.fillStyle = "rgba(250, 235, 146, 0.45)";
      ctx.fillText(hiText, width - Math.round(14 * scale), Math.round(8 * scale));

      // 8. Minimal Center State Prompts
      if (s.gameState === "idle") {
        ctx.textAlign = "center";
        ctx.fillStyle = "#faeb92";
        ctx.font = `700 ${Math.max(9.5, Math.round(11 * scale))}px "Courier New", Courier, monospace`;
        ctx.fillText("[ Press Space to start ]", width / 2, height / 2 - 3 * scale);
      } else if (s.gameState === "gameover") {
        ctx.textAlign = "center";
        ctx.fillStyle = "#ff2b9e";
        ctx.font = `800 ${Math.max(10, Math.round(11 * scale))}px "Courier New", Courier, monospace`;
        ctx.fillText("GAME OVER", width / 2, height / 2 - 8 * scale);
        ctx.fillStyle = "rgba(250, 235, 146, 0.85)";
        ctx.font = `700 ${Math.max(8.5, Math.round(9.5 * scale))}px "Courier New", Courier, monospace`;
        ctx.fillText("[ PRESS SPACE TO RESTART ]", width / 2, height / 2 + 5 * scale);
      }

      ctx.restore();
      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(animId);
      resizeObserver.disconnect();
    };
  }, [playSound]);

  // Touch / Mobile Detection for Android
  const [isTouch] = useState(() => 
    typeof window !== "undefined" && ("ontouchstart" in window || navigator.maxTouchPoints > 0)
  );

  return (
    <div
      className={styles.gameContainer}
      ref={containerRef}
      role="button"
      tabIndex={0}
      aria-label="Cyber Spaceship Combat Game"
      onClick={() => {
        if (stateRef.current.gameState !== "playing") {
          fireLaser();
        }
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          if (stateRef.current.gameState !== "playing") {
            fireLaser();
          }
        }
      }}
    >
      <canvas ref={canvasRef} className={styles.gameCanvas} />

      {/* Android / Touch Virtual D-Pad & Fire Controls */}
      {isTouch && (
        <div className={styles.mobileControlsLayer}>
          <div className={styles.virtualDpad}>
            <button
              type="button"
              className={styles.dpadBtn}
              onTouchStart={(e) => {
                e.stopPropagation();
                stateRef.current.keys.up = true;
              }}
              onTouchEnd={(e) => {
                e.stopPropagation();
                stateRef.current.keys.up = false;
              }}
              onMouseDown={() => (stateRef.current.keys.up = true)}
              onMouseUp={() => (stateRef.current.keys.up = false)}
              aria-label="Move Up"
            >
              ▲
            </button>
            <button
              type="button"
              className={styles.dpadBtn}
              onTouchStart={(e) => {
                e.stopPropagation();
                stateRef.current.keys.down = true;
              }}
              onTouchEnd={(e) => {
                e.stopPropagation();
                stateRef.current.keys.down = false;
              }}
              onMouseDown={() => (stateRef.current.keys.down = true)}
              onMouseUp={() => (stateRef.current.keys.down = false)}
              aria-label="Move Down"
            >
              ▼
            </button>
          </div>

          <button
            type="button"
            className={styles.virtualFireBtn}
            onTouchStart={(e) => {
              e.stopPropagation();
              fireLaser();
            }}
            onClick={(e) => {
              e.stopPropagation();
              fireLaser();
            }}
            aria-label="Fire Blaster"
          >
            FIRE
          </button>
        </div>
      )}
    </div>
  );
}

// =========================================================================
// ULTRA-MINIMAL SLEEK VECTOR GRAPHICS
// =========================================================================

// Sleek Minimal Starfighter Dart
function drawMinimalShip(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  tilt: number,
  scale: number
) {
  ctx.save();
  ctx.translate(Math.floor(x), Math.floor(y));
  ctx.rotate(tilt);

  // Minimal Neon Cyan Arrow Jet
  ctx.fillStyle = "#00f0ff";
  ctx.beginPath();
  ctx.moveTo(w / 2, 0); // Sharp nose
  ctx.lineTo(-w / 2, -h / 2);
  ctx.lineTo(-w / 4, 0);
  ctx.lineTo(-w / 2, h / 2);
  ctx.closePath();
  ctx.fill();

  // Yellow Cockpit Dot
  ctx.fillStyle = "#faeb92";
  ctx.fillRect(-2 * scale, -1.5 * scale, Math.round(4 * scale), Math.round(3 * scale));

  // Minimal Wingtips
  ctx.fillStyle = "#ff5fcf";
  ctx.fillRect(-w / 2, -h / 2, Math.round(3 * scale), Math.round(1.5 * scale));
  ctx.fillRect(-w / 2, h / 2 - 1.5 * scale, Math.round(3 * scale), Math.round(1.5 * scale));

  ctx.restore();
}

// Minimal Glowing Glitch Diamond
function drawMinimalGlitch(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  angle: number,
  hitFlash: boolean
) {
  ctx.save();
  ctx.translate(Math.floor(x), Math.floor(y));
  ctx.rotate(angle);

  const r = size / 2;
  ctx.fillStyle = hitFlash ? "#ffffff" : "#faeb92";
  ctx.strokeStyle = hitFlash ? "#ffffff" : "#ff5fcf";
  ctx.lineWidth = 1.2;

  // Clean Diamond Crystal
  ctx.beginPath();
  ctx.moveTo(0, -r);
  ctx.lineTo(r, 0);
  ctx.lineTo(0, r);
  ctx.lineTo(-r, 0);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Center Core
  ctx.fillStyle = "#050208";
  ctx.fillRect(-1.5, -1.5, 3, 3);

  ctx.restore();
}

// Minimal Space Pirate Wedge
function drawMinimalPirate(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  scale: number,
  hitFlash: boolean
) {
  ctx.save();
  ctx.translate(Math.floor(x), Math.floor(y));

  ctx.fillStyle = hitFlash ? "#ffffff" : "#ff2b9e";
  ctx.strokeStyle = hitFlash ? "#ffffff" : "#9929ea";
  ctx.lineWidth = 1.2;

  // Sharp Left-Facing Pirate Chevron
  ctx.beginPath();
  ctx.moveTo(-w / 2, 0); // Nose facing left
  ctx.lineTo(w / 2, -h / 2);
  ctx.lineTo(w / 4, 0);
  ctx.lineTo(w / 2, h / 2);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Visor Eye
  ctx.fillStyle = hitFlash ? "#ffffff" : "#faeb92";
  ctx.fillRect(-2 * scale, -1.5 * scale, Math.round(3 * scale), Math.round(3 * scale));

  ctx.restore();
}
