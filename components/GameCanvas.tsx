import React, { useEffect, useRef, useCallback } from 'react';
import { GameState, EntityType, DRONE_COLORS } from '../types';

interface GameCanvasProps {
  gameState: GameState;
  setGameState: (state: GameState) => void;
  setScore: (score: number) => void;
  addCoins: (amount: number) => void;
  playerColor: string;
}

// --- CONSTANTS ---
const GRAVITY_FORCE = 2800; 
const SPEED_BASE = 500; // Pixels per second
const SPEED_INCREASE = 25; // Speed ramps up faster now
const OBSTACLE_SPAWN_DIST = 400; 

interface Entity {
  id: number;
  type: EntityType;
  x: number;
  y: number;
  width: number;
  height: number;
  vx: number;
  vy: number;
  rotation: number;
  color: string;
  markedForDeletion: boolean;
  life?: number;
  maxLife?: number;
  // Rooster Specifics
  tier?: 1 | 2 | 3; // 1: Weak, 2: Medium, 3: Strong
  bobOffset?: number;
}

const GameCanvas: React.FC<GameCanvasProps> = ({
  gameState,
  setGameState,
  setScore,
  addCoins,
  playerColor,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const requestRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);
  
  const scoreRef = useRef<number>(0);
  const speedRef = useRef<number>(SPEED_BASE);

  const playerRef = useRef<Entity>({
    id: 1,
    type: EntityType.PLAYER,
    x: 100,
    y: 0,
    width: 48,
    height: 48,
    vx: 0,
    vy: 0,
    rotation: 0,
    color: playerColor,
    markedForDeletion: false,
  });

  const entitiesRef = useRef<Entity[]>([]);
  const gravityDirRef = useRef<number>(1);
  const isGameOverRef = useRef<boolean>(false);
  const difficultyTimerRef = useRef<number>(0);
  const spawnTimerRef = useRef<number>(0);
  
  // Input State
  const touchStartY = useRef<number>(0);
  
  // Parallax State
  const bgOffsetRef = useRef<number>(0);
  
  const audioCtxRef = useRef<AudioContext | null>(null);
  const shakeRef = useRef<number>(0);
  
  const prevGameStateRef = useRef<GameState>(GameState.MENU);

  // --- AUDIO ---
  const initAudio = () => {
    if (!audioCtxRef.current) {
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioContext) {
        audioCtxRef.current = new AudioContext();
      }
    }
    if (audioCtxRef.current && audioCtxRef.current.state === 'suspended') {
      audioCtxRef.current.resume();
    }
  };

  const playSound = (type: 'jump' | 'coin' | 'die') => {
    if (!audioCtxRef.current) return;
    const ctx = audioCtxRef.current;
    const now = ctx.currentTime;
    
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    osc.connect(gain);
    gain.connect(ctx.destination);

    if (type === 'jump') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(300, now);
      osc.frequency.exponentialRampToValueAtTime(600, now + 0.15);
      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
      osc.start(now);
      osc.stop(now + 0.15);
    } else if (type === 'coin') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(1500, now);
      osc.frequency.exponentialRampToValueAtTime(2000, now + 0.3);
      gain.gain.setValueAtTime(0.1, now);
      gain.gain.linearRampToValueAtTime(0, now + 0.3);
      osc.start(now);
      osc.stop(now + 0.3);
    } else if (type === 'die') {
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(200, now);
      osc.frequency.exponentialRampToValueAtTime(50, now + 0.4);
      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.4);
      osc.start(now);
      osc.stop(now + 0.4);
    }
  };

  const triggerHaptic = (style: 'light' | 'medium' | 'heavy') => {
    if (navigator.vibrate) {
      if (style === 'light') navigator.vibrate(8);
      if (style === 'medium') navigator.vibrate(15);
      if (style === 'heavy') navigator.vibrate([20, 40, 20]);
    }
  };

  // --- GAME LOGIC ---
  const initGame = useCallback(() => {
    scoreRef.current = 0;
    setScore(0);
    entitiesRef.current = [];
    speedRef.current = SPEED_BASE;
    isGameOverRef.current = false;
    gravityDirRef.current = 1;
    difficultyTimerRef.current = 0;
    spawnTimerRef.current = 0;
    shakeRef.current = 0;
    bgOffsetRef.current = 0;
    lastTimeRef.current = performance.now();
    
    const startY = window.innerHeight / 2;
    playerRef.current = {
      ...playerRef.current,
      y: startY,
      vy: 0,
      rotation: 0,
      color: playerColor,
    };
  }, [playerColor, setScore]);

  const handleInput = useCallback((forceDirection?: number) => {
    initAudio();
    if (gameState !== GameState.PLAYING) return;
    
    if (forceDirection !== undefined) {
      if (gravityDirRef.current === forceDirection) return;
      gravityDirRef.current = forceDirection;
    } else {
      gravityDirRef.current *= -1;
    }

    playerRef.current.vy = gravityDirRef.current * 300; 
    
    triggerHaptic('light');
    playSound('jump');
  }, [gameState]);

  // --- TOUCH HANDLERS ---
  const onTouchStart = (e: React.TouchEvent) => {
    touchStartY.current = e.touches[0].clientY;
    initAudio(); 
  };

  const onTouchEnd = (e: React.TouchEvent) => {
    if (gameState !== GameState.PLAYING) return;

    const touchEndY = e.changedTouches[0].clientY;
    const deltaY = touchEndY - touchStartY.current;
    
    if (Math.abs(deltaY) > 30) {
      if (deltaY < 0) handleInput(-1); // Swipe Up
      else handleInput(1); // Swipe Down
    } else {
      handleInput(); // Tap
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space') handleInput();
      else if (e.code === 'ArrowUp') handleInput(-1);
      else if (e.code === 'ArrowDown') handleInput(1);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleInput]);

  // --- RENDERERS ---

  // 1. Player
  const drawPlayer = (ctx: CanvasRenderingContext2D, p: Entity) => {
    ctx.save();
    ctx.translate(p.x, p.y);
    
    const skin = DRONE_COLORS.find(c => c.hex === p.color) || DRONE_COLORS[0];
    const gradientColors = skin.gradient || ['#ffffff', '#000000'];
    const size = p.width;

    ctx.shadowBlur = 20;
    ctx.shadowColor = skin.hex;

    const grad = ctx.createRadialGradient(-size/4, -size/4, size/10, 0, 0, size/2);
    grad.addColorStop(0, '#FFFFFF'); 
    grad.addColorStop(0.3, gradientColors[0]);
    grad.addColorStop(1, gradientColors[1]);

    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(0, 0, size/2, 0, Math.PI * 2);
    ctx.fill();

    ctx.shadowBlur = 0;

    // Rings
    ctx.rotate(p.rotation);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.ellipse(0, 0, size/1.8, size/2.2, 0, 0, Math.PI * 2);
    ctx.stroke();

    ctx.restore();
  };

  // 2. Obstacle: ROOSTER (Tiered)
  const drawChicken = (ctx: CanvasRenderingContext2D, e: Entity) => {
    ctx.save();
    ctx.translate(e.x, e.y);
    
    // Bobbing intensity based on Tier
    const tier = e.tier || 1;
    const bobSpeed = tier === 3 ? 200 : (tier === 2 ? 150 : 100);
    const bobAmp = tier === 3 ? 12 : (tier === 2 ? 8 : 5);
    const bob = Math.sin(Date.now() / bobSpeed + (e.bobOffset || 0)) * bobAmp;
    
    ctx.translate(0, bob);
    ctx.scale(-1, 1); // Face left

    const size = e.width;
    
    // Colors based on Tier
    let bodyColor = '#FFFFFF'; // Tier 1: White Leghorn
    let wingColor = '#E2E8F0';
    let tailColor = '#F8FAFC';
    
    if (tier === 2) { 
        // Tier 2: Rhode Island Red (Brown/Rust)
        bodyColor = '#8B4513'; // SaddleBrown
        wingColor = '#A0522D'; // Sienna
        tailColor = '#CD853F'; // Peru
    } else if (tier === 3) {
        // Tier 3: Black Australorp (Iridescent Black)
        bodyColor = '#1a1a1a'; 
        wingColor = '#2d2d2d'; 
        tailColor = '#0f172a';
    }

    // Body
    ctx.shadowBlur = 5;
    ctx.shadowColor = 'rgba(0,0,0,0.2)';
    ctx.fillStyle = bodyColor;
    ctx.beginPath();
    ctx.ellipse(0, 0, size/2, size/2.5, 0, 0, Math.PI*2);
    ctx.fill();
    ctx.shadowBlur = 0;

    // Wing (Fast Flap)
    // Faster flap for higher tiers
    const flapSpeed = tier === 3 ? 20 : 40;
    const flap = Math.sin(Date.now() / flapSpeed) * 0.4;
    ctx.save();
    ctx.translate(-5, 5);
    ctx.rotate(flap);
    ctx.fillStyle = wingColor;
    ctx.beginPath();
    ctx.ellipse(0, 0, size/3, size/4, 0, 0, Math.PI*2);
    ctx.fill();
    ctx.stroke(); // Outline for visibility
    ctx.restore();

    // Tail Feathers
    ctx.fillStyle = tailColor;
    ctx.beginPath();
    ctx.moveTo(size/2, 0);
    ctx.lineTo(size/1.2, -size/3);
    ctx.lineTo(size/1.1, 0);
    ctx.lineTo(size/1.2, size/3);
    ctx.fill();

    // Comb (Red for all, maybe darker for Tier 3)
    ctx.fillStyle = tier === 3 ? '#991B1B' : '#DC2626';
    ctx.beginPath();
    ctx.moveTo(size/4, -size/3);
    ctx.bezierCurveTo(size/2, -size/1.2, size/8, -size/1.2, 0, -size/3);
    ctx.fill();

    // Beak
    ctx.fillStyle = '#F59E0B';
    ctx.beginPath();
    ctx.moveTo(size/3, -4);
    ctx.lineTo(size/1.4, 2);
    ctx.lineTo(size/3, 6);
    ctx.fill();

    // Eye (Red eye for strong rooster?)
    ctx.fillStyle = tier === 3 ? '#FCA5A5' : '#0F172A';
    ctx.beginPath();
    ctx.arc(size/5, -4, 2.5, 0, Math.PI*2);
    ctx.fill();

    ctx.restore();
  };

  // 3. Coin
  const drawCoin = (ctx: CanvasRenderingContext2D, e: Entity) => {
    ctx.save();
    ctx.translate(e.x, e.y);
    const bob = Math.sin(Date.now() / 200) * 3;
    ctx.translate(0, bob);
    
    ctx.fillStyle = '#FCD34D'; // Gold
    ctx.shadowColor = '#F59E0B';
    ctx.shadowBlur = 15;
    
    ctx.beginPath();
    ctx.arc(0, 0, e.width / 2, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.strokeStyle = '#B45309';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.fillStyle = '#F59E0B';
    ctx.font = 'bold 20px Inter';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('☾', 0, 1);

    ctx.restore();
  };

  const drawParticle = (ctx: CanvasRenderingContext2D, p: Entity) => {
    if (!p.life || !p.maxLife) return;
    const opacity = p.life / p.maxLife;
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.fillStyle = p.color;
    ctx.globalAlpha = opacity;
    ctx.beginPath();
    ctx.arc(0, 0, p.width/2, 0, Math.PI*2);
    ctx.fill();
    ctx.restore();
  };

  // --- BACKGROUND & GARDEN ---
  const drawBackground = (ctx: CanvasRenderingContext2D, width: number, height: number, dt: number) => {
    // 1. Sky Gradient (Sunny Garden)
    const skyGrad = ctx.createLinearGradient(0, 0, 0, height);
    skyGrad.addColorStop(0, '#38BDF8'); // Sky Blue
    skyGrad.addColorStop(0.5, '#BAE6FD'); // Light Blue
    skyGrad.addColorStop(1, '#E0F2FE'); // Very light
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, width, height);

    // 2. Parallax Clouds
    const cloudSpeed = speedRef.current * 0.1;
    const cloudOffset = (bgOffsetRef.current * 0.1) % width;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
    
    // Draw a few clouds
    const drawCloud = (cx: number, cy: number, scale: number) => {
        ctx.beginPath();
        ctx.arc(cx, cy, 30 * scale, 0, Math.PI * 2);
        ctx.arc(cx + 25 * scale, cy - 10 * scale, 35 * scale, 0, Math.PI * 2);
        ctx.arc(cx + 50 * scale, cy, 30 * scale, 0, Math.PI * 2);
        ctx.fill();
    };
    
    // Wrapping clouds logic simplified for parallax
    drawCloud(((width * 0.2) - cloudOffset + width) % width, height * 0.2, 1.5);
    drawCloud(((width * 0.7) - cloudOffset + width) % width, height * 0.15, 1.2);

    // 3. Parallax Trees/Bushes (Far Layer)
    const treeSpeed = speedRef.current * 0.2;
    const treeOffset = (bgOffsetRef.current * 0.2) % 400;
    
    ctx.fillStyle = '#4ADE80'; // Green 400
    for(let i = -1; i < width/400 + 2; i++) {
        const x = i * 400 - treeOffset;
        
        // Top Trees (Gravity flip world)
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.arc(x + 100, 40, 60, 0, Math.PI, false);
        ctx.arc(x + 250, 60, 80, 0, Math.PI, false);
        ctx.lineTo(x + 400, 0);
        ctx.fill();

        // Bottom Trees
        ctx.beginPath();
        ctx.moveTo(x, height);
        ctx.arc(x + 150, height - 40, 70, 0, Math.PI, true);
        ctx.arc(x + 300, height - 50, 60, 0, Math.PI, true);
        ctx.lineTo(x + 400, height);
        ctx.fill();
    }

    // 4. Grass Verges (Near Layer)
    const padding = 80; // Road boundary
    ctx.fillStyle = '#16A34A'; // Green 600
    ctx.fillRect(0, 0, width, padding); // Top Grass
    ctx.fillRect(0, height - padding, width, padding); // Bottom Grass

    // Add some flowers to grass
    const flowerOffset = (bgOffsetRef.current * 0.8) % 300;
    for(let i = -1; i < width/300 + 2; i++) {
        const x = i * 300 - flowerOffset;
        
        // Simple flowers
        const drawFlower = (fx: number, fy: number, color: string) => {
            ctx.fillStyle = color;
            ctx.beginPath();
            ctx.arc(fx, fy, 4, 0, Math.PI*2);
            ctx.fill();
        };

        drawFlower(x + 50, padding - 15, '#F472B6'); // Pink
        drawFlower(x + 120, padding - 25, '#FACC15'); // Yellow
        
        drawFlower(x + 80, height - padding + 15, '#A78BFA'); // Purple
        drawFlower(x + 200, height - padding + 20, '#FB7185'); // Rose
    }

    // 5. Realistic Road (Asphalt)
    ctx.fillStyle = '#334155'; // Slate 700 (Dark Asphalt)
    ctx.fillRect(0, padding, width, height - padding * 2);
    
    // Road Border Lines (White)
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(0, padding + 2);
    ctx.lineTo(width, padding + 2);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(0, height - padding - 2);
    ctx.lineTo(width, height - padding - 2);
    ctx.stroke();

    // Dashed Center Line
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.lineWidth = 4;
    ctx.setLineDash([40, 60]);
    ctx.lineDashOffset = -bgOffsetRef.current; // Move lines
    ctx.beginPath();
    ctx.moveTo(0, height / 2);
    ctx.lineTo(width, height / 2);
    ctx.stroke();
    ctx.setLineDash([]); // Reset
    
    // Road Texture Grain (Simple noise)
    // Removed for performance on mobile, plain dark color looks cleaner 
  };

  // --- MAIN LOOP ---
  const loop = useCallback((timestamp: number) => {
    if (!canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) return;

    if (!lastTimeRef.current) lastTimeRef.current = timestamp;
    const dt = Math.min((timestamp - lastTimeRef.current) / 1000, 0.1); 
    lastTimeRef.current = timestamp;

    const viewWidth = canvas.width / (window.devicePixelRatio || 1);
    const viewHeight = canvas.height / (window.devicePixelRatio || 1);

    if (gameState === GameState.PLAYING) {
        bgOffsetRef.current += speedRef.current * dt;
    }

    drawBackground(ctx, viewWidth, viewHeight, dt);

    ctx.save();

    if (shakeRef.current > 0) {
      const mag = shakeRef.current;
      ctx.translate((Math.random() - 0.5) * mag, (Math.random() - 0.5) * mag);
      shakeRef.current = Math.max(0, shakeRef.current - 30 * dt);
    }

    const padding = 80;
    const barHeight = 0; // Integrated into road

    if (gameState === GameState.PLAYING) {
      scoreRef.current += dt * 10;
      setScore(Math.floor(scoreRef.current));

      const player = playerRef.current;
      const gravity = gravityDirRef.current * GRAVITY_FORCE;
      
      player.vy += gravity * dt;
      const maxVy = 1200;
      player.vy = Math.max(-maxVy, Math.min(maxVy, player.vy));
      player.y += player.vy * dt;
      player.rotation += (speedRef.current * 0.01) * dt;

      const floorY = viewHeight - padding - player.height/2;
      const ceilY = padding + player.height/2;

      if (player.y > floorY) {
        player.y = floorY;
        player.vy = 0;
      } else if (player.y < ceilY) {
        player.y = ceilY;
        player.vy = 0;
      }

      // Trail Particles
      if (Math.random() < 30 * dt) {
        entitiesRef.current.push({
          id: Math.random(),
          type: EntityType.PARTICLE,
          x: player.x,
          y: player.y,
          width: 6,
          height: 6,
          vx: -speedRef.current * 0.8,
          vy: (Math.random() - 0.5) * 50,
          rotation: 0,
          color: player.color,
          life: 0.5,
          maxLife: 0.5,
          markedForDeletion: false
        });
      }

      spawnTimerRef.current += speedRef.current * dt;
      if (spawnTimerRef.current > OBSTACLE_SPAWN_DIST) {
        spawnTimerRef.current = 0; 
        
        if (Math.random() > 0.3) {
            // ROOSTER SPAWN LOGIC
            const isTop = Math.random() > 0.5;
            const yPos = isTop ? padding + 40 : viewHeight - padding - 40;
            
            // Determine Tier based on speed/difficulty
            let tier: 1 | 2 | 3 = 1;
            const currentSpeed = speedRef.current;
            
            if (currentSpeed > 750) {
                // High speed: Mix of all, mostly strong
                const r = Math.random();
                if (r > 0.6) tier = 3;
                else if (r > 0.3) tier = 2;
                else tier = 1;
            } else if (currentSpeed > 600) {
                // Medium speed: Mix of 1 and 2
                tier = Math.random() > 0.5 ? 2 : 1;
            } else {
                tier = 1;
            }

            // Adjust speed based on Tier
            let speedMult = 1.0;
            if (tier === 2) speedMult = 1.2;
            if (tier === 3) speedMult = 1.4;

            entitiesRef.current.push({
              id: Math.random(),
              type: EntityType.OBSTACLE,
              x: viewWidth + 100,
              y: yPos,
              width: tier === 3 ? 55 : 50, // Strong ones bigger
              height: 50,
              vx: -speedRef.current * 1.1 * speedMult, 
              vy: 0,
              rotation: 0,
              color: '#FFFFFF',
              markedForDeletion: false,
              tier: tier,
              bobOffset: Math.random() * 100
            });
        } else {
             entitiesRef.current.push({
              id: Math.random(),
              type: EntityType.COIN,
              x: viewWidth + 100,
              y: viewHeight / 2 + (Math.random() * 200 - 100),
              width: 35,
              height: 35,
              vx: -speedRef.current,
              vy: 0,
              rotation: 0,
              color: '#F59E0B',
              markedForDeletion: false
            });
        }
      }

      difficultyTimerRef.current += dt;
      if (difficultyTimerRef.current > 10) {
        speedRef.current += SPEED_INCREASE;
        difficultyTimerRef.current = 0;
        shakeRef.current = 8;
        // Don't vibrate every time, gets annoying.
      }

      entitiesRef.current.forEach(e => {
        e.x += e.vx * dt;
        e.y += e.vy * dt;
        
        if (e.type === EntityType.PARTICLE && e.life !== undefined) {
          e.life -= dt;
          if (e.life <= 0) e.markedForDeletion = true;
        }

        if (e.x < -100) e.markedForDeletion = true;

        if (!e.markedForDeletion && (e.type === EntityType.OBSTACLE || e.type === EntityType.COIN)) {
            const dx = player.x - e.x;
            const dy = player.y - e.y;
            const dist = Math.sqrt(dx*dx + dy*dy);
            const hitDist = (player.width/2 + e.width/2) * 0.7; 

            if (dist < hitDist) {
              if (e.type === EntityType.OBSTACLE) {
                 triggerHaptic('heavy');
                 playSound('die');
                 
                 // Feathers based on rooster color
                 const featherColor = e.tier === 2 ? '#8B4513' : (e.tier === 3 ? '#1a1a1a' : '#FFFFFF');
                 
                 for(let i=0; i<15; i++) {
                     entitiesRef.current.push({
                         id: Math.random(),
                         type: EntityType.PARTICLE,
                         x: player.x,
                         y: player.y,
                         width: 8,
                         height: 8,
                         vx: (Math.random() - 0.5) * 400,
                         vy: (Math.random() - 0.5) * 400,
                         rotation: 0,
                         color: featherColor,
                         life: 1.0,
                         maxLife: 1.0,
                         markedForDeletion: false
                     });
                 }
                 isGameOverRef.current = true;
                 setGameState(GameState.GAME_OVER);
              } else if (e.type === EntityType.COIN) {
                 triggerHaptic('light');
                 playSound('coin');
                 addCoins(10);
                 e.markedForDeletion = true;
                 for(let i=0; i<8; i++) {
                    entitiesRef.current.push({
                        id: Math.random(),
                        type: EntityType.PARTICLE,
                        x: e.x,
                        y: e.y,
                        width: 5,
                        height: 5,
                        vx: (Math.random() - 0.5) * 200,
                        vy: (Math.random() - 0.5) * 200,
                        rotation: 0,
                        color: '#FCD34D',
                        life: 0.4,
                        maxLife: 0.4,
                        markedForDeletion: false
                    });
                }
              }
            }
        }
      });
      
      entitiesRef.current = entitiesRef.current.filter(e => !e.markedForDeletion);
    }

    // --- DRAW ENTITIES ---
    entitiesRef.current.forEach(e => {
        if (e.type === EntityType.PARTICLE) drawParticle(ctx, e);
        if (e.type === EntityType.OBSTACLE) drawChicken(ctx, e); 
        if (e.type === EntityType.COIN) drawCoin(ctx, e);
    });

    if (gameState !== GameState.GAME_OVER) {
       drawPlayer(ctx, playerRef.current);
    }

    ctx.restore();
    requestRef.current = requestAnimationFrame(loop);

  }, [gameState, setScore, setGameState, addCoins, playerColor]);

  useEffect(() => {
    if (gameState === GameState.PLAYING && (prevGameStateRef.current === GameState.GAME_OVER || prevGameStateRef.current === GameState.MENU)) {
        initGame();
    }
    prevGameStateRef.current = gameState;
  }, [gameState, initGame]);

  useEffect(() => {
    const handleResize = () => {
      if (canvasRef.current) {
        const canvas = canvasRef.current;
        const dpr = window.devicePixelRatio || 1;
        canvas.width = window.innerWidth * dpr;
        canvas.height = window.innerHeight * dpr;
        const ctx = canvas.getContext('2d');
        if (ctx) ctx.scale(dpr, dpr);
      }
    };
    window.addEventListener('resize', handleResize);
    handleResize();
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    requestRef.current = requestAnimationFrame(loop);
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [loop]);

  return (
    <canvas
      ref={canvasRef}
      className="absolute top-0 left-0 w-full h-full z-0 touch-none block"
      style={{ touchAction: 'none' }} 
      onMouseDown={() => handleInput()} 
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    />
  );
};

export default GameCanvas;