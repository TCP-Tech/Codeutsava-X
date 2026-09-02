"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import styles from "./CyberBrickBreaker.module.css";

interface CyberBrickBreakerProps {
  onClose: () => void;
}

type PowerUpType = "multiball" | "expand" | "fireball" | "life";

interface Brick {
  id: number;
  x: number;
  y: number;
  w: number;
  h: number;
  color: string;
  hits: number;
  maxHits: number;
  isBomb?: boolean;
  powerUp?: PowerUpType;
}

interface Ball {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  speed: number;
  trail: Array<{ x: number; y: number; alpha: number; color?: string }>;
}

interface PowerUpItem {
  id: number;
  x: number;
  y: number;
  vx: number;
  type: PowerUpType;
  label: string;
  color: string;
  radius: number;
}

export function CyberBrickBreaker({ onClose }: CyberBrickBreakerProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);

  const boundsRef = useRef({
    width: 800,
    height: 120,
    dpr: 1,
    scale: 1,
  });

  // Pure simulation state (zero React overhead during 60/120fps loop)
  const stateRef = useRef({
    gameState: "idle" as "idle" | "playing" | "gameover" | "victory",
    lives: 3,
    maxLives: 3,
    combo: 0,
    screenShake: 0,
    // Strict Single-Ability System (Mutual Exclusivity)
    activeAbility: "none" as "none" | "expand" | "fireball",
    abilityTimer: 0,
    paddle: {
      x: 24,
      y: 40,
      width: 6,
      height: 30,
      baseHeight: 30,
      targetY: 40,
    },
    balls: [] as Ball[],
    bricks: [] as Brick[],
    powerUps: [] as PowerUpItem[],
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
    keys: {
      up: false,
      down: false,
    },
    nextPowerUpId: 1,
    lastTime: 0,
  });

  // Web Audio Synthesizer
  const playSound = useCallback((type: "paddle" | "brick" | "bomb" | "powerup" | "wall" | "lose" | "win", step = 0) => {
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

      if (type === "paddle") {
        osc.type = "triangle";
        osc.frequency.setValueAtTime(360, now);
        osc.frequency.exponentialRampToValueAtTime(580, now + 0.05);
        gain.gain.setValueAtTime(0.12, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.07);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.08);
      } else if (type === "brick") {
        osc.type = "sine";
        const freq = 480 + Math.min(12, step) * 35;
        osc.frequency.setValueAtTime(freq, now);
        osc.frequency.exponentialRampToValueAtTime(freq * 1.3, now + 0.06);
        gain.gain.setValueAtTime(0.1, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.09);
      } else if (type === "bomb") {
        osc.type = "sawtooth";
        osc.frequency.setValueAtTime(160, now);
        osc.frequency.exponentialRampToValueAtTime(35, now + 0.22);
        gain.gain.setValueAtTime(0.16, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.26);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.28);
      } else if (type === "powerup") {
        [587.33, 739.99, 880].forEach((f, i) => {
          const o = ctx.createOscillator();
          const g = ctx.createGain();
          o.type = "sine";
          o.frequency.setValueAtTime(f, now + i * 0.05);
          g.gain.setValueAtTime(0.09, now + i * 0.05);
          g.gain.exponentialRampToValueAtTime(0.001, now + i * 0.05 + 0.08);
          o.connect(g);
          g.connect(ctx.destination);
          o.start(now + i * 0.05);
          o.stop(now + i * 0.05 + 0.09);
        });
      } else if (type === "wall") {
        osc.type = "sine";
        osc.frequency.setValueAtTime(240, now);
        gain.gain.setValueAtTime(0.04, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.05);
      } else if (type === "lose") {
        osc.type = "sawtooth";
        osc.frequency.setValueAtTime(260, now);
        osc.frequency.exponentialRampToValueAtTime(50, now + 0.3);
        gain.gain.setValueAtTime(0.14, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.36);
      } else if (type === "win") {
        [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => {
          const o = ctx.createOscillator();
          const g = ctx.createGain();
          o.type = "triangle";
          o.frequency.setValueAtTime(f, now + i * 0.07);
          g.gain.setValueAtTime(0.09, now + i * 0.07);
          g.gain.exponentialRampToValueAtTime(0.001, now + i * 0.07 + 0.14);
          o.connect(g);
          g.connect(ctx.destination);
          o.start(now + i * 0.07);
          o.stop(now + i * 0.07 + 0.16);
        });
      }
    } catch {
      // Intentionally ignored
    }
  }, []);

  // Initialize Bricks Grid (55% Width Coverage with Pixel-Perfect Alignment)
  const initBricks = useCallback((w: number, h: number, scale: number) => {
    const bricks: Brick[] = [];
    let id = 1;

    const rowColors = [
      "#ff2b9e", // Row 0: Neon Magenta
      "#ff5fcf", // Row 1: Hot Pink
      "#9929ea", // Row 2: Cyber Purple
      "#00f0ff", // Row 3: Neon Cyan
      "#00e5a3", // Row 4: Mint Emerald
      "#faeb92", // Row 5: Retro Amber Gold
    ];

    const rows = 6;
    const rowGap = 2;
    const colGap = 2;

    const marginY = Math.round(8 * scale);
    const availableH = h - marginY * 2;
    const brickH = Math.floor((availableH - (rows - 1) * rowGap) / rows);
    const totalGridH = rows * brickH + (rows - 1) * rowGap;
    const startY = Math.floor((h - totalGridH) / 2);

    const wallTargetWidth = Math.floor(w * 0.54);
    const rightMargin = Math.round(12 * scale);
    
    const targetBrickW = Math.max(12, Math.round(15 * scale));
    const cols = Math.floor((wallTargetWidth + colGap) / (targetBrickW + colGap));
    const totalGridW = cols * targetBrickW + (cols - 1) * colGap;
    const startX = Math.floor(w - rightMargin - totalGridW);

    const powerUpTypes: PowerUpType[] = ["multiball", "expand", "fireball", "life"];

    for (let c = 0; c < cols; c++) {
      const isBackColumn = c >= cols - 2; // Last 2 columns take 2 hits
      const isFrontColumn = c <= 3; // First 4 columns give frequent early abilities

      for (let r = 0; r < rows; r++) {
        const color = rowColors[r % rowColors.length];
        const isBomb = Math.random() < 0.04 && c > 1 && c < cols - 2;

        // Frequent 24% in front, 16% in mid columns so abilities arrive quickly
        const dropChance = isFrontColumn ? 0.24 : 0.16;
        let powerUp: PowerUpType | undefined = undefined;
        if (!isBomb && Math.random() < dropChance) {
          powerUp = powerUpTypes[Math.floor(Math.random() * powerUpTypes.length)];
        }

        bricks.push({
          id: id++,
          x: Math.floor(startX + c * (targetBrickW + colGap)),
          y: Math.floor(startY + r * (brickH + rowGap)),
          w: targetBrickW,
          h: brickH,
          color: isBomb ? "#ff3b30" : color,
          hits: isBackColumn ? 2 : 1,
          maxHits: isBackColumn ? 2 : 1,
          isBomb,
          powerUp,
        });
      }
    }
    return bricks;
  }, []);

  // Launch / Restart Game (Well Paced Speed)
  const launchGame = useCallback(() => {
    const s = stateRef.current;
    const { width, height, scale } = boundsRef.current;

    if (s.gameState === "idle" || s.gameState === "gameover" || s.gameState === "victory") {
      s.gameState = "playing";
      s.combo = 0;
      s.lives = 3;
      s.bricks = initBricks(width, height, scale);
      s.particles = [];
      s.powerUps = [];
      s.activeAbility = "none";
      s.abilityTimer = 0;
      s.paddle.height = s.paddle.baseHeight;
      s.paddle.y = height / 2 - s.paddle.height / 2;
      s.paddle.targetY = s.paddle.y;

      // Calibrated Approachable Initial Ball Speed
      const speed = 4.5 * scale;
      const angle = (Math.random() * 0.12 - 0.06) * Math.PI; // Straight, predictable forward launch
      s.balls = [
        {
          x: s.paddle.x + s.paddle.width + 6 * scale,
          y: s.paddle.y + s.paddle.height / 2,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          radius: Math.max(3, Math.round(3.5 * scale)),
          speed,
          trail: [],
        },
      ];
      playSound("paddle");
    }
  }, [initBricks, playSound]);

  // Keyboard Controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const s = stateRef.current;
      if (e.code === "Space" || e.code === "KeyJ" || e.code === "KeyK") {
        e.preventDefault();
        if (e.repeat) return;
        launchGame();
      } else if (e.code === "ArrowUp" || e.code === "KeyW") {
        e.preventDefault();
        s.keys.up = true;
      } else if (e.code === "ArrowDown" || e.code === "KeyS") {
        e.preventDefault();
        s.keys.down = true;
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
  }, [launchGame, onClose]);

  // Main 60/120fps Loop
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
      s.paddle.width = Math.round(6.5 * scale);
      s.paddle.baseHeight = Math.round(36 * scale);
      s.paddle.height = s.activeAbility === "expand" ? Math.round(50 * scale) : s.paddle.baseHeight;
      s.paddle.x = Math.round(24 * scale);

      if (s.gameState === "idle" && s.bricks.length === 0) {
        s.bricks = initBricks(w, h, scale);
      }

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

      const { width, height, dpr, scale } = boundsRef.current;

      ctx.save();
      ctx.scale(dpr, dpr);

      // Micro Screen Shake
      if (s.screenShake > 0) {
        const shakeX = (Math.random() - 0.5) * s.screenShake;
        const shakeY = (Math.random() - 0.5) * s.screenShake;
        ctx.translate(shakeX, shakeY);
        s.screenShake = Math.max(0, s.screenShake - 0.6 * timeScale);
      }

      // 1. Deep Space Dark Canvas
      ctx.fillStyle = "#06030a";
      ctx.fillRect(0, 0, width, height);

      // Cyber Grid
      ctx.strokeStyle = "rgba(250, 235, 146, 0.035)";
      ctx.lineWidth = 1;
      const gridStep = Math.round(20 * scale);
      for (let x = 0; x < width; x += gridStep) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }
      for (let y = 0; y < height; y += gridStep) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }

      // Top & Bottom Boundary Lines
      ctx.strokeStyle = "rgba(250, 235, 146, 0.22)";
      ctx.beginPath();
      ctx.moveTo(0, 1);
      ctx.lineTo(width, 1);
      ctx.moveTo(0, height - 1);
      ctx.lineTo(width, height - 1);
      ctx.stroke();

      // 2. Strict Single Ability Timer
      if (s.abilityTimer > 0) {
        s.abilityTimer -= timeScale;
        if (s.abilityTimer <= 0) {
          s.activeAbility = "none";
          s.paddle.height = s.paddle.baseHeight;
        }
      }

      if (s.activeAbility === "expand") {
        s.paddle.height = Math.round(50 * scale);
      } else {
        s.paddle.height = s.paddle.baseHeight;
      }

      // PURE KEYBOARD STEERING (W/S or ArrowUp/ArrowDown)
      const moveSpeed = 6.8 * scale;
      if (s.keys.up) s.paddle.y -= moveSpeed * timeScale;
      if (s.keys.down) s.paddle.y += moveSpeed * timeScale;

      const minY = 3 * scale;
      const maxY = height - s.paddle.height - 3 * scale;
      s.paddle.y = Math.max(minY, Math.min(maxY, s.paddle.y));

      // Function to handle brick destroy logic (Bomb explosions & Victory)
      function handleBrickDestroy(br: Brick, index: number) {
        s.bricks.splice(index, 1);

        // Power-Up Drop
        if (br.powerUp) {
          let label = "+1●";
          let color = "#00f0ff";
          if (br.powerUp === "expand") { label = "EXP"; color = "#faeb92"; }
          else if (br.powerUp === "fireball") { label = "FIRE"; color = "#ff3b30"; }
          else if (br.powerUp === "life") { label = "+1♥"; color = "#ff2b9e"; }

          s.powerUps.push({
            id: s.nextPowerUpId++,
            x: br.x,
            y: br.y + br.h / 2,
            vx: -(Math.random() * 0.8 + 3.6) * scale, // Rapid float (reaches paddle in ~1.2s!)
            type: br.powerUp,
            label,
            color,
            radius: Math.round(7.5 * scale),
          });
        }

        // Controlled Bomb Chain Explosion
        if (br.isBomb) {
          playSound("bomb");
          s.screenShake = 3.5;
          const blastRadius = 22 * scale;

          for (let p = 0; p < 14; p++) {
            const angle = Math.random() * Math.PI * 2;
            const spd = Math.random() * 3 + 1.5;
            s.particles.push({
              x: br.x + br.w / 2,
              y: br.y + br.h / 2,
              vx: Math.cos(angle) * spd,
              vy: Math.sin(angle) * spd,
              life: 0,
              maxLife: 16,
              color: ["#ff3b30", "#faeb92", "#ff2b9e"][Math.floor(Math.random() * 3)],
              size: Math.random() * 3 + 1,
            });
          }

          // Damage nearby adjacent bricks
          for (let nb = s.bricks.length - 1; nb >= 0; nb--) {
            const neighbor = s.bricks[nb];
            const dist = Math.hypot(neighbor.x - br.x, neighbor.y - br.y);
            if (dist < blastRadius) {
              neighbor.hits -= 1;
              if (neighbor.hits <= 0) {
                handleBrickDestroy(neighbor, nb);
              }
            }
          }
        }

        // Victory Check
        if (s.bricks.length === 0) {
          s.gameState = "victory";
          playSound("win");
        }
      }

      // 3. Update & Draw Power-Up Drops (Fast float with subtle magnetic attraction)
      for (let pIndex = s.powerUps.length - 1; pIndex >= 0; pIndex--) {
        const item = s.powerUps[pIndex];
        const p = s.paddle;

        if (s.gameState === "playing") {
          item.x += item.vx * timeScale;

          // Magnetic attraction towards paddle when within 90px
          const distToPaddle = item.x - (p.x + p.width);
          if (distToPaddle > 0 && distToPaddle < 90 * scale) {
            const paddleCenterY = p.y + p.height / 2;
            item.y += (paddleCenterY - item.y) * 0.09 * timeScale;
          }
        }

        // Draw Power-Up Token Capsule
        ctx.fillStyle = item.color;
        ctx.shadowColor = item.color;
        ctx.shadowBlur = 6;
        ctx.beginPath();
        ctx.roundRect(item.x - item.radius, item.y - item.radius / 1.5, item.radius * 2, item.radius * 1.3, 3);
        ctx.fill();
        ctx.shadowBlur = 0;

        // Label
        ctx.fillStyle = "#06030a";
        ctx.font = `800 ${Math.max(7.5, Math.round(8 * scale))}px "Courier New", monospace`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(item.label, item.x, item.y);

        // Catch with Paddle
        if (
          item.x - item.radius <= p.x + p.width + 6 * scale &&
          item.x + item.radius >= p.x - 6 * scale &&
          item.y >= p.y - 8 * scale &&
          item.y <= p.y + p.height + 8 * scale
        ) {
          playSound("powerup");
          s.powerUps.splice(pIndex, 1);

          // Apply single active ability
          if (item.type === "multiball") {
            if (s.balls.length < 2) {
              const src = s.balls[0] || { x: p.x + p.width + 6 * scale, y: p.y + p.height / 2, speed: 4.8 * scale };
              s.balls.push({
                x: src.x,
                y: src.y,
                vx: 4.8 * scale,
                vy: (Math.random() > 0.5 ? 1 : -1) * 2.8 * scale,
                radius: Math.max(3, Math.round(3.5 * scale)),
                speed: 4.8 * scale,
                trail: [],
              });
            }
          } else if (item.type === "expand") {
            s.activeAbility = "expand";
            s.abilityTimer = 420; // 7 seconds
          } else if (item.type === "fireball") {
            s.activeAbility = "fireball";
            s.abilityTimer = 240; // 4 seconds
          } else if (item.type === "life") {
            s.lives = Math.min(s.maxLives, s.lives + 1);
          }
          continue;
        }

        // Offscreen cleanup
        if (item.x < -20) {
          s.powerUps.splice(pIndex, 1);
        }
      }

      // 4. Update & Draw Balls
      const isFireballActive = s.activeAbility === "fireball";

      for (let bIndex = s.balls.length - 1; bIndex >= 0; bIndex--) {
        const ball = s.balls[bIndex];

        if (s.gameState === "playing") {
          ball.x += ball.vx * timeScale;
          ball.y += ball.vy * timeScale;

          // Trail
          ball.trail.push({
            x: ball.x,
            y: ball.y,
            alpha: 1,
            color: isFireballActive ? "#ff3b30" : "#00f0ff",
          });
          if (ball.trail.length > 6) ball.trail.shift();

          // Wall Bounces
          if (ball.y - ball.radius <= 2) {
            ball.y = 2 + ball.radius;
            ball.vy = Math.abs(ball.vy);
            playSound("wall");
          } else if (ball.y + ball.radius >= height - 2) {
            ball.y = height - 2 - ball.radius;
            ball.vy = -Math.abs(ball.vy);
            playSound("wall");
          }

          if (ball.x + ball.radius >= width - 2) {
            ball.x = width - 2 - ball.radius;
            ball.vx = -Math.abs(ball.vx);
            playSound("wall");
          }

          // FORGIVING & INTUITIVE PADDLE COLLISION
          const p = s.paddle;
          const paddleLeft = p.x - 3 * scale;
          const paddleRight = p.x + p.width + 4 * scale;
          const paddleTop = p.y - 4 * scale;
          const paddleBottom = p.y + p.height + 4 * scale;

          if (
            ball.x - ball.radius <= paddleRight &&
            ball.x + ball.radius >= paddleLeft &&
            ball.y >= paddleTop &&
            ball.y <= paddleBottom &&
            ball.vx < 0
          ) {
            ball.x = paddleRight + ball.radius;

            // Segmented deflection: Center is straight forward, tips give angled smash
            const hitOffset = (ball.y - (p.y + p.height / 2)) / (p.height / 2); // -1 to +1
            let bounceAngle = 0;
            if (Math.abs(hitOffset) < 0.25) {
              bounceAngle = hitOffset * 0.4 * ((Math.PI / 180) * 20); // Center: Straight forward
            } else {
              bounceAngle = Math.sign(hitOffset) * (0.1 + (Math.abs(hitOffset) - 0.25) * 1.1) * ((Math.PI / 180) * 45); // Tips: Angled deflection
            }

            // Gentle gradual speed increase (capped at 6.8x scale)
            ball.speed = Math.min(6.8 * scale, ball.speed + 0.035);
            ball.vx = Math.cos(bounceAngle) * ball.speed;
            ball.vy = Math.sin(bounceAngle) * ball.speed;

            s.combo = 0;
            playSound("paddle");

            // Sparks
            for (let i = 0; i < 5; i++) {
              s.particles.push({
                x: ball.x,
                y: ball.y,
                vx: Math.random() * 2.5 + 1,
                vy: (Math.random() - 0.5) * 3,
                life: 0,
                maxLife: 10,
                color: "#faeb92",
                size: Math.random() * 2 + 1,
              });
            }
          }

          // Left Wall (Ball Lost)
          if (ball.x < -10) {
            s.balls.splice(bIndex, 1);

            if (s.balls.length === 0) {
              s.lives -= 1;
              s.screenShake = 4;
              s.activeAbility = "none";
              s.abilityTimer = 0;
              playSound("lose");

              if (s.lives <= 0) {
                s.gameState = "gameover";
              } else {
                // Respawn Ball gently
                const speed = 4.5 * scale;
                const angle = (Math.random() * 0.12 - 0.06) * Math.PI;
                s.balls.push({
                  x: p.x + p.width + 6 * scale,
                  y: p.y + p.height / 2,
                  vx: Math.cos(angle) * speed,
                  vy: Math.sin(angle) * speed,
                  radius: Math.max(3, Math.round(3.5 * scale)),
                  speed,
                  trail: [],
                });
              }
            }
            continue;
          }

          // Brick Collision Check
          for (let i = s.bricks.length - 1; i >= 0; i--) {
            const br = s.bricks[i];

            if (
              ball.x + ball.radius >= br.x &&
              ball.x - ball.radius <= br.x + br.w &&
              ball.y + ball.radius >= br.y &&
              ball.y - ball.radius <= br.y + br.h
            ) {
              if (!isFireballActive) {
                const prevX = ball.x - ball.vx * timeScale;
                
                if (prevX + ball.radius <= br.x || prevX - ball.radius >= br.x + br.w) {
                  ball.vx = -ball.vx;
                } else {
                  ball.vy = -ball.vy;
                }
              }

              br.hits -= 1;
              s.combo += 1;
              s.screenShake = 2;

              playSound("brick", s.combo);

              // Shatter Particles
              for (let p = 0; p < 6; p++) {
                const angle = Math.random() * Math.PI * 2;
                const spd = Math.random() * 3 + 1;
                s.particles.push({
                  x: br.x + br.w / 2,
                  y: br.y + br.h / 2,
                  vx: Math.cos(angle) * spd,
                  vy: Math.sin(angle) * spd,
                  life: 0,
                  maxLife: 12,
                  color: br.color,
                  size: Math.random() * 2 + 1,
                });
              }

              if (br.hits <= 0) {
                handleBrickDestroy(br, i);
              }
              break;
            }
          }
        }

        // Draw Ball Trail
        for (let t = 0; t < ball.trail.length; t++) {
          const pt = ball.trail[t];
          const a = ((t + 1) / ball.trail.length) * 0.35;
          ctx.fillStyle = pt.color || "#00f0ff";
          ctx.globalAlpha = a;
          ctx.beginPath();
          ctx.arc(pt.x, pt.y, ball.radius * 0.85, 0, Math.PI * 2);
          ctx.fill();
          ctx.globalAlpha = 1;
        }

        // Draw Glowing Cyber Ball
        ctx.fillStyle = isFireballActive ? "#ff3b30" : "#ffffff";
        ctx.shadowColor = isFireballActive ? "#ff3b30" : "#00f0ff";
        ctx.shadowBlur = 6;
        ctx.beginPath();
        ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
      }

      // 5. Draw Bricks (With Pixel-Perfect Bevels)
      for (const br of s.bricks) {
        ctx.fillStyle = br.color;
        ctx.fillRect(br.x, br.y, br.w, br.h);

        // Highlight
        ctx.fillStyle = "rgba(255, 255, 255, 0.25)";
        ctx.fillRect(br.x, br.y, br.w, 1.5);
        ctx.fillRect(br.x, br.y, 1.5, br.h);

        // Shadow
        ctx.fillStyle = "rgba(0, 0, 0, 0.4)";
        ctx.fillRect(br.x, br.y + br.h - 1.5, br.w, 1.5);
        ctx.fillRect(br.x + br.w - 1.5, br.y, 1.5, br.h);

        // Bomb Core
        if (br.isBomb) {
          ctx.fillStyle = "#faeb92";
          ctx.shadowColor = "#ff3b30";
          ctx.shadowBlur = 5;
          ctx.beginPath();
          ctx.arc(br.x + br.w / 2, br.y + br.h / 2, Math.round(2.5 * scale), 0, Math.PI * 2);
          ctx.fill();
          ctx.shadowBlur = 0;
        } else if (br.powerUp) {
          ctx.fillStyle = "rgba(255, 255, 255, 0.75)";
          ctx.fillRect(br.x + br.w / 2 - 1, br.y + br.h / 2 - 1, 2, 2);
        } else if (br.maxHits > 1 && br.hits > 1) {
          ctx.fillStyle = "#faeb92";
          ctx.fillRect(br.x + br.w / 2 - 1, br.y + br.h / 2 - 1, 2, 2);
        }
      }

      // 6. Draw Player Paddle
      const p = s.paddle;
      ctx.fillStyle = s.activeAbility === "expand" ? "#00f0ff" : "#faeb92";
      ctx.shadowColor = s.activeAbility === "expand" ? "#00f0ff" : "rgba(250, 235, 146, 0.5)";
      ctx.shadowBlur = 6;

      const radius = p.width / 2;
      ctx.beginPath();
      ctx.roundRect(p.x, p.y, p.width, p.height, radius);
      ctx.fill();
      ctx.shadowBlur = 0;

      // 7. Draw Particles
      for (let i = s.particles.length - 1; i >= 0; i--) {
        const pt = s.particles[i];
        pt.x += pt.vx * timeScale;
        pt.y += pt.vy * timeScale;
        pt.life += timeScale;

        const alpha = Math.max(0, 1 - pt.life / pt.maxLife);
        ctx.fillStyle = pt.color;
        ctx.globalAlpha = alpha;
        ctx.fillRect(Math.floor(pt.x), Math.floor(pt.y), pt.size, pt.size);
        ctx.globalAlpha = 1;

        if (pt.life >= pt.maxLife) {
          s.particles.splice(i, 1);
        }
      }

      // 8. BOTTOM-LEFT 3 LIVES INDICATOR
      const lifeX = Math.round(14 * scale);
      const lifeY = height - Math.round(14 * scale);
      const heartSize = Math.max(8, Math.round(9 * scale));

      ctx.textBaseline = "middle";
      ctx.textAlign = "left";
      ctx.font = `800 ${heartSize}px "Courier New", monospace`;

      for (let l = 0; l < s.maxLives; l++) {
        const isAlive = l < s.lives;
        ctx.fillStyle = isAlive ? "#ff2b9e" : "rgba(255, 43, 158, 0.25)";
        if (isAlive) {
          ctx.shadowColor = "#ff2b9e";
          ctx.shadowBlur = 6;
        }
        ctx.fillText("♥", lifeX + l * (heartSize + 4 * scale), lifeY);
        ctx.shadowBlur = 0;
      }

      // Active Ability Badge (Strictly single badge)
      const badgeOffset = lifeX + s.maxLives * (heartSize + 4 * scale) + 8 * scale;
      if (s.activeAbility === "expand") {
        ctx.fillStyle = "#00f0ff";
        ctx.font = `700 ${Math.max(7, Math.round(8 * scale))}px "Courier New", monospace`;
        ctx.fillText("[ EXPAND ]", badgeOffset, lifeY);
      } else if (s.activeAbility === "fireball") {
        ctx.fillStyle = "#ff3b30";
        ctx.font = `700 ${Math.max(7, Math.round(8 * scale))}px "Courier New", monospace`;
        ctx.fillText("[ FIREBALL ]", badgeOffset, lifeY);
      }

      // 9. Status & Start Prompts (Centered cleanly in the open left court)
      const minBrickX = s.bricks.length > 0 ? Math.min(...s.bricks.map((b) => b.x)) : width * 0.46;
      const openZoneCenterX = Math.round((s.paddle.x + s.paddle.width + minBrickX) / 2);

      if (s.gameState === "idle") {
        ctx.textAlign = "center";
        ctx.fillStyle = "#faeb92";
        ctx.font = `700 ${Math.max(9, Math.round(10 * scale))}px "Courier New", Courier, monospace`;
        ctx.fillText("[ Press Space to Start ]", openZoneCenterX, height / 2);
      } else if (s.gameState === "gameover") {
        ctx.textAlign = "center";
        ctx.fillStyle = "#ff2b9e";
        ctx.font = `800 ${Math.max(10, Math.round(11.5 * scale))}px "Courier New", Courier, monospace`;
        ctx.fillText("GAME OVER", openZoneCenterX, height / 2 - 8 * scale);
        ctx.fillStyle = "rgba(250, 235, 146, 0.85)";
        ctx.font = `700 ${Math.max(8.5, Math.round(9.5 * scale))}px "Courier New", Courier, monospace`;
        ctx.fillText("[ PRESS SPACE TO RESTART ]", openZoneCenterX, height / 2 + 6 * scale);
      } else if (s.gameState === "victory") {
        ctx.textAlign = "center";
        ctx.fillStyle = "#00f0ff";
        ctx.font = `800 ${Math.max(10, Math.round(11.5 * scale))}px "Courier New", Courier, monospace`;
        ctx.fillText("SECTOR CLEARED!", openZoneCenterX, height / 2 - 8 * scale);
        ctx.fillStyle = "#faeb92";
        ctx.font = `700 ${Math.max(8.5, Math.round(9.5 * scale))}px "Courier New", Courier, monospace`;
        ctx.fillText("[ PRESS SPACE TO PLAY AGAIN ]", openZoneCenterX, height / 2 + 6 * scale);
      }

      ctx.restore();
      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(animId);
      resizeObserver.disconnect();
    };
  }, [initBricks, playSound]);

  // Touch / Mobile Detection for Android
  const [isTouch] = useState(() => 
    typeof window !== "undefined" && ("ontouchstart" in window || navigator.maxTouchPoints > 0)
  );

  // Handle touch drag on mobile
  const handleTouchMove = (e: React.TouchEvent) => {
    if (!containerRef.current) return;
    const touch = e.touches[0];
    if (!touch) return;
    const rect = containerRef.current.getBoundingClientRect();
    const clientY = touch.clientY - rect.top;
    const s = stateRef.current;
    const { scale, height } = boundsRef.current;
    const targetY = clientY - s.paddle.height / 2;
    s.paddle.y = Math.max(3 * scale, Math.min(height - s.paddle.height - 3 * scale, targetY));
  };

  return (
    <div
      className={styles.gameContainer}
      ref={containerRef}
      role="button"
      tabIndex={0}
      aria-label="Cyber Horizontal Ball & Brick Breaker Game"
      onTouchMove={isTouch ? handleTouchMove : undefined}
      onClick={() => {
        if (stateRef.current.gameState !== "playing") {
          launchGame();
        }
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          if (stateRef.current.gameState !== "playing") {
            launchGame();
          }
        }
      }}
    >
      <canvas ref={canvasRef} className={styles.gameCanvas} />

      {/* Android / Touch Virtual D-Pad & Launch Controls */}
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
              aria-label="Move Paddle Up"
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
              aria-label="Move Paddle Down"
            >
              ▼
            </button>
          </div>

          <button
            type="button"
            className={styles.virtualLaunchBtn}
            onTouchStart={(e) => {
              e.stopPropagation();
              launchGame();
            }}
            onClick={(e) => {
              e.stopPropagation();
              launchGame();
            }}
            aria-label="Launch Ball"
          >
            LAUNCH
          </button>
        </div>
      )}
    </div>
  );
}
