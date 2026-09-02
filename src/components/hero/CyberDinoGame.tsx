"use client";

import { useEffect, useRef, useCallback } from "react";
import styles from "./CyberDinoGame.module.css";

interface CyberDinoGameProps {
  onClose: () => void;
}

type ObstacleVariant = "small" | "large" | "double" | "triple";

export function CyberDinoGame({ onClose }: CyberDinoGameProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);

  // Cached viewport dimensions & scale factor for mobile/tablet responsive physics
  const boundsRef = useRef({
    width: 800,
    height: 120,
    dpr: 1,
    scale: 1,
    groundY: 104,
  });

  // Pure simulation state (zero React re-render overhead during 60/120fps tick)
  const stateRef = useRef({
    gameState: "idle" as "idle" | "playing" | "gameover",
    score: 0,
    highScore: 0,
    speed: 5.2,
    gravity: 0.35,
    jumpVelocity: -5.8,
    dino: {
      x: 36,
      y: 0,
      width: 20,
      height: 20,
      vy: 0,
      isGrounded: true,
      legFrame: 0,
      legTimer: 0,
    },
    obstacles: [] as Array<{
      x: number;
      width: number;
      height: number;
      variant: ObstacleVariant;
    }>,
    groundOffset: 0,
    nextObstacleDistance: 360,
    distanceSinceLastObstacle: 0,
    lastTime: 0,
    flashScoreTimer: 0,
  });

  // Load High Score on Mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem("codeutsava_dino_hi");
      if (saved) {
        stateRef.current.highScore = parseInt(saved, 10) || 0;
      }
    } catch {
      // ignore
    }
  }, []);

  // Lightweight Web Audio synthesizer
  const playSound = useCallback((type: "jump" | "score" | "crash") => {
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

      if (type === "jump") {
        osc.type = "square";
        osc.frequency.setValueAtTime(180, now);
        osc.frequency.exponentialRampToValueAtTime(460, now + 0.07);
        gain.gain.setValueAtTime(0.08, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.09);
      } else if (type === "score") {
        osc.type = "sine";
        osc.frequency.setValueAtTime(587.33, now);
        osc.frequency.setValueAtTime(880, now + 0.06);
        gain.gain.setValueAtTime(0.09, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.16);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.18);
      } else if (type === "crash") {
        osc.type = "sawtooth";
        osc.frequency.setValueAtTime(240, now);
        osc.frequency.exponentialRampToValueAtTime(30, now + 0.35);
        gain.gain.setValueAtTime(0.14, now);
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

  // Jump Action Handler
  const triggerJump = useCallback(() => {
    const s = stateRef.current;
    if (s.gameState === "idle" || s.gameState === "gameover") {
      s.gameState = "playing";
      s.score = 0;
      s.dino.y = 0;
      s.dino.vy = 0;
      s.dino.isGrounded = true;
      s.obstacles = [];
      s.distanceSinceLastObstacle = 0;
      s.nextObstacleDistance = 340;
      s.speed = 5.2 * boundsRef.current.scale;
      playSound("jump");
      return;
    }

    if (s.gameState === "playing" && s.dino.isGrounded) {
      s.dino.vy = s.jumpVelocity;
      s.dino.isGrounded = false;
      playSound("jump");
    }
  }, [playSound]);

  // Global Keyboard Controls (Space / Up / W to Jump)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === "Space" || e.code === "ArrowUp" || e.code === "KeyW") {
        e.preventDefault();
        if (e.repeat) return;
        triggerJump();
      } else if (e.code === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [triggerJump, onClose]);

  // High-Performance 60/120fps Loop
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
      const groundY = Math.floor(h - 14 * scale);

      boundsRef.current = { width: w, height: h, dpr, scale, groundY };

      const s = stateRef.current;
      s.dino.width = Math.round(18 * scale);
      s.dino.height = Math.round(18 * scale);
      s.dino.x = Math.round(36 * scale);
      s.jumpVelocity = -5.8 * Math.sqrt(scale);
      s.gravity = 0.35 * scale;
      s.speed = 5.2 * scale;

      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
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

      const { width, height, dpr, scale, groundY } = boundsRef.current;

      ctx.save();
      ctx.scale(dpr, dpr);

      // 1. Clean Minimal Dark Space Background
      ctx.fillStyle = "#07040c";
      ctx.fillRect(0, 0, width, height);

      // 2. Minimal Ground Track (Warm Retro Yellow Accent)
      ctx.strokeStyle = "rgba(250, 235, 146, 0.4)";
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(0, groundY);
      ctx.lineTo(width, groundY);
      ctx.stroke();

      // Ground Dash Marks
      if (s.gameState === "playing") {
        s.groundOffset = (s.groundOffset + s.speed * timeScale) % (24 * scale);
      }
      ctx.fillStyle = "rgba(250, 235, 146, 0.2)";
      const dashStep = Math.round(24 * scale);
      for (let x = -s.groundOffset; x < width; x += dashStep) {
        ctx.fillRect(x, groundY + 3, Math.round(6 * scale), 1);
        ctx.fillRect(x + Math.round(12 * scale), groundY + 6, Math.round(3 * scale), 1);
      }

      // 3. Physics Update
      if (s.gameState === "playing") {
        // Dino Physics
        s.dino.vy += s.gravity * timeScale;
        s.dino.y += s.dino.vy * timeScale;

        // Hard boundary: Dino strictly stays below top monitor ceiling (never clips top)
        const maxJumpHeight = -(groundY - s.dino.height - 8);
        if (s.dino.y < maxJumpHeight) {
          s.dino.y = maxJumpHeight;
          s.dino.vy = 0;
        }

        if (s.dino.y >= 0) {
          s.dino.y = 0;
          s.dino.vy = 0;
          s.dino.isGrounded = true;
        }

        // Running Legs Animation
        s.dino.legTimer += timeScale;
        if (s.dino.legTimer > 5) {
          s.dino.legFrame = (s.dino.legFrame + 1) % 2;
          s.dino.legTimer = 0;
        }

        // Score Tick
        const prevScoreInt = Math.floor(s.score);
        s.score += 0.14 * timeScale;
        const curScoreInt = Math.floor(s.score);

        // Milestone 100 Ding
        if (curScoreInt > 0 && curScoreInt % 100 === 0 && prevScoreInt % 100 !== 0) {
          playSound("score");
          s.flashScoreTimer = 16;
        }
        if (s.flashScoreTimer > 0) {
          s.flashScoreTimer -= timeScale;
        }

        // Difficulty Speed Scaling
        s.speed = Math.min(8.5 * scale, (5.2 + Math.floor(curScoreInt / 100) * 0.3) * scale);

        // High Score
        if (curScoreInt > s.highScore) {
          s.highScore = curScoreInt;
          try {
            localStorage.setItem("codeutsava_dino_hi", curScoreInt.toString());
          } catch {
            // ignore
          }
        }

        // Obstacle Spawner (Firmly Grounded Cacti & Trees)
        s.distanceSinceLastObstacle += s.speed * timeScale;
        if (s.distanceSinceLastObstacle >= s.nextObstacleDistance) {
          s.distanceSinceLastObstacle = 0;
          s.nextObstacleDistance = (Math.floor(Math.random() * 200) + 360) * scale;

          const r = Math.random();
          if (r < 0.4) {
            s.obstacles.push({
              x: width + 10,
              width: Math.round(10 * scale),
              height: Math.round(16 * scale),
              variant: "small",
            });
          } else if (r < 0.7) {
            s.obstacles.push({
              x: width + 10,
              width: Math.round(12 * scale),
              height: Math.round(20 * scale),
              variant: "large",
            });
          } else if (r < 0.9) {
            s.obstacles.push({
              x: width + 10,
              width: Math.round(18 * scale),
              height: Math.round(18 * scale),
              variant: "double",
            });
          } else {
            s.obstacles.push({
              x: width + 10,
              width: Math.round(22 * scale),
              height: Math.round(18 * scale),
              variant: "triple",
            });
          }
        }
      }

      // 4. Update & Draw Obstacles (Clean Grounded Retro Amber Trees)
      for (let i = s.obstacles.length - 1; i >= 0; i--) {
        const obs = s.obstacles[i];
        if (s.gameState === "playing") {
          obs.x -= s.speed * timeScale;
        }

        // Draw Grounded Cactus
        const cactusY = groundY - obs.height;
        drawMinimalCactus(ctx, obs.x, cactusY, obs.width, obs.height, obs.variant, scale);

        // Collision Detection
        if (s.gameState === "playing") {
          const dinoBox = {
            x: s.dino.x + 3 * scale,
            y: groundY - s.dino.height + s.dino.y + 2 * scale,
            w: s.dino.width - 6 * scale,
            h: s.dino.height - 3 * scale,
          };

          const obsBox = {
            x: obs.x + 2 * scale,
            y: groundY - obs.height + 1 * scale,
            w: obs.width - 4 * scale,
            h: obs.height - 2 * scale,
          };

          if (
            dinoBox.x < obsBox.x + obsBox.w &&
            dinoBox.x + dinoBox.w > obsBox.x &&
            dinoBox.y < obsBox.y + obsBox.h &&
            dinoBox.y + dinoBox.h > obsBox.y
          ) {
            s.gameState = "gameover";
            playSound("crash");
          }
        }

        // Cleanup offscreen
        if (obs.x < -40) {
          s.obstacles.splice(i, 1);
        }
      }

      // 5. Draw Minimal Amber Dino
      const dinoScreenY = groundY - s.dino.height + s.dino.y;
      drawMinimalDino(
        ctx,
        s.dino.x,
        dinoScreenY,
        s.dino.width,
        s.dino.height,
        s.dino.legFrame,
        s.dino.isGrounded,
        s.gameState === "gameover",
        scale
      );

      // 6. Right-Aligned Score HUD
      const fontSize = Math.max(9, Math.round(11 * scale));
      ctx.font = `700 ${fontSize}px "Courier New", Courier, monospace`;
      ctx.textBaseline = "top";
      ctx.textAlign = "right";

      const hiStr = `HI ${s.highScore.toString().padStart(5, "0")}`;
      const scoreStr = Math.floor(s.score).toString().padStart(5, "0");

      ctx.fillStyle = "rgba(250, 235, 146, 0.45)";
      ctx.fillText(hiStr, width - Math.round(68 * scale), Math.round(8 * scale));

      ctx.fillStyle = s.flashScoreTimer > 0 ? "#ffffff" : "#faeb92";
      ctx.fillText(scoreStr, width - Math.round(14 * scale), Math.round(8 * scale));

      // 7. Minimal Center Prompts
      if (s.gameState === "idle") {
        ctx.textAlign = "center";
        ctx.fillStyle = "#faeb92";
        ctx.font = `700 ${Math.max(9.5, Math.round(11 * scale))}px "Courier New", Courier, monospace`;
        ctx.fillText("[ Press Space to start ]", width / 2, height / 2 - 8 * scale);
      } else if (s.gameState === "gameover") {
        ctx.textAlign = "center";
        ctx.fillStyle = "#faeb92";
        ctx.font = `800 ${Math.max(10, Math.round(11.5 * scale))}px "Courier New", Courier, monospace`;
        ctx.fillText("GAME OVER", width / 2, height / 2 - 10 * scale);
        ctx.fillStyle = "rgba(250, 235, 146, 0.75)";
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

  return (
    <div
      className={styles.gameContainer}
      ref={containerRef}
      onPointerDown={triggerJump}
      role="region"
      aria-label="Cyber Dino Runner Game"
    >
      <canvas ref={canvasRef} className={styles.gameCanvas} />

      {/* Minimal Tactile Jump Button */}
      <button
        type="button"
        className={styles.minimalJumpBtn}
        onPointerDown={(e) => {
          e.stopPropagation();
          triggerJump();
        }}
        aria-label="Jump Button"
      >
        <span className={styles.jumpIcon}>▲</span>
        <span>JUMP</span>
      </button>
    </div>
  );
}

// =========================================================================
// MINIMAL RETRO AMBER SPRITES
// =========================================================================

function drawMinimalDino(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  legFrame: number,
  isGrounded: boolean,
  isDead: boolean,
  scale: number
) {
  ctx.save();
  ctx.translate(Math.floor(x), Math.floor(y));

  // Solid Retro Amber Dino Body
  ctx.fillStyle = isDead ? "#ff355e" : "#faeb92";

  // Head & Snout
  ctx.fillRect(Math.round(8 * scale), 0, Math.round(10 * scale), Math.round(7 * scale));
  ctx.fillRect(Math.round(12 * scale), Math.round(2 * scale), Math.round(8 * scale), Math.round(5 * scale));

  // Dark Eye Cutout
  ctx.fillStyle = "#07040c";
  ctx.fillRect(Math.round(11 * scale), Math.round(1.5 * scale), Math.round(2 * scale), Math.round(2 * scale));

  // Torso
  ctx.fillStyle = isDead ? "#ff355e" : "#faeb92";
  ctx.fillRect(Math.round(4 * scale), Math.round(6 * scale), Math.round(8 * scale), Math.round(9 * scale));

  // Tail
  ctx.fillRect(0, Math.round(8 * scale), Math.round(5 * scale), Math.round(4 * scale));
  ctx.fillRect(-Math.round(2 * scale), Math.round(6 * scale), Math.round(3 * scale), Math.round(3 * scale));

  // Forearm
  ctx.fillRect(Math.round(12 * scale), Math.round(9 * scale), Math.round(3 * scale), Math.round(2 * scale));

  // Legs
  if (!isGrounded) {
    ctx.fillRect(Math.round(5 * scale), Math.round(15 * scale), Math.round(3 * scale), Math.round(2 * scale));
    ctx.fillRect(Math.round(9 * scale), Math.round(14 * scale), Math.round(3 * scale), Math.round(2 * scale));
  } else if (legFrame === 0) {
    ctx.fillRect(Math.round(4 * scale), Math.round(15 * scale), Math.round(2.5 * scale), Math.round(4 * scale));
    ctx.fillRect(Math.round(9 * scale), Math.round(15 * scale), Math.round(2.5 * scale), Math.round(2 * scale));
  } else {
    ctx.fillRect(Math.round(4 * scale), Math.round(15 * scale), Math.round(2.5 * scale), Math.round(2 * scale));
    ctx.fillRect(Math.round(9 * scale), Math.round(15 * scale), Math.round(2.5 * scale), Math.round(4 * scale));
  }

  ctx.restore();
}

function drawMinimalCactus(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  variant: ObstacleVariant,
  scale: number
) {
  ctx.save();
  ctx.translate(Math.floor(x), Math.floor(y));
  ctx.fillStyle = "#faeb92";

  if (variant === "small") {
    // Single Small Cactus (Firmly grounded)
    const trunkW = Math.round(3.5 * scale);
    const trunkX = Math.round((w - trunkW) / 2);
    // Vertical Trunk
    ctx.fillRect(trunkX, 0, trunkW, h);
    // Left Branch
    ctx.fillRect(0, Math.round(h * 0.4), trunkX, Math.round(2 * scale));
    ctx.fillRect(0, Math.round(h * 0.2), Math.round(2 * scale), Math.round(h * 0.25));
    // Right Branch
    ctx.fillRect(trunkX + trunkW, Math.round(h * 0.45), w - (trunkX + trunkW), Math.round(2 * scale));
    ctx.fillRect(w - Math.round(2 * scale), Math.round(h * 0.25), Math.round(2 * scale), Math.round(h * 0.25));
  } else if (variant === "large") {
    // Single Large Cactus
    const trunkW = Math.round(4 * scale);
    const trunkX = Math.round((w - trunkW) / 2);
    // Vertical Trunk
    ctx.fillRect(trunkX, 0, trunkW, h);
    // Left Branch
    ctx.fillRect(0, Math.round(h * 0.35), trunkX, Math.round(2.5 * scale));
    ctx.fillRect(0, Math.round(h * 0.15), Math.round(2.5 * scale), Math.round(h * 0.25));
    // Right Branch
    ctx.fillRect(trunkX + trunkW, Math.round(h * 0.45), w - (trunkX + trunkW), Math.round(2.5 * scale));
    ctx.fillRect(w - Math.round(2.5 * scale), Math.round(h * 0.25), Math.round(2.5 * scale), Math.round(h * 0.25));
  } else if (variant === "double") {
    // Double Cactus
    const t1X = Math.round(2 * scale);
    const t1W = Math.round(3 * scale);
    // Cactus 1 (Taller)
    ctx.fillRect(t1X, 0, t1W, h);
    ctx.fillRect(0, Math.round(h * 0.4), t1X, Math.round(2 * scale));
    ctx.fillRect(0, Math.round(h * 0.2), Math.round(2 * scale), Math.round(h * 0.25));
    // Cactus 2 (Slightly shorter, anchored to ground)
    const t2X = Math.round(11 * scale);
    const t2W = Math.round(3 * scale);
    const h2 = Math.round(h * 0.8);
    const y2 = h - h2;
    ctx.fillRect(t2X, y2, t2W, h2);
    ctx.fillRect(t2X + t2W, y2 + Math.round(h2 * 0.4), Math.round(2.5 * scale), Math.round(2 * scale));
    ctx.fillRect(w - Math.round(2 * scale), y2 + Math.round(h2 * 0.2), Math.round(2 * scale), Math.round(h2 * 0.25));
  } else {
    // Triple Cactus Cluster
    const colW = Math.round(2.5 * scale);
    // 1. Left
    ctx.fillRect(Math.round(2 * scale), Math.round(h * 0.2), colW, Math.round(h * 0.8));
    ctx.fillRect(0, Math.round(h * 0.45), Math.round(2 * scale), Math.round(1.5 * scale));
    // 2. Middle (tallest)
    ctx.fillRect(Math.round(8 * scale), 0, colW + 1, h);
    ctx.fillRect(Math.round(11 * scale), Math.round(h * 0.35), Math.round(2 * scale), Math.round(1.5 * scale));
    // 3. Right
    ctx.fillRect(Math.round(15 * scale), Math.round(h * 0.15), colW, Math.round(h * 0.85));
    ctx.fillRect(w - Math.round(2 * scale), Math.round(h * 0.35), Math.round(2 * scale), Math.round(1.5 * scale));
  }

  ctx.restore();
}
