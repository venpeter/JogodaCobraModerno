import { useEffect, useRef, useState } from "react";
import { sfx, isMuted, setMuted } from "./audio";

/* ------------------------------------------------------------------ */
/* Constantes e tipos                                                  */
/* ------------------------------------------------------------------ */

const COLS = 21;
const ROWS = 21;
const CELL = 26;
const W = COLS * CELL;
const H = ROWS * CELL;

const BEST_KEY = "snake.best.v1";
const DIFF_KEY = "snake.diff.v1";

type Mode = "menu" | "playing" | "paused" | "over";

interface Pt {
  x: number;
  y: number;
}

interface Diff {
  id: string;
  label: string;
  tag: string;
  base: number;
  min: number;
  step: number;
  mult: number;
  hue: string;
}

const DIFFS: Diff[] = [
  { id: "facil", label: "Fácil", tag: "serena", base: 168, min: 118, step: 1.6, mult: 1, hue: "#4ade80" },
  { id: "normal", label: "Normal", tag: "clássica", base: 128, min: 84, step: 2.0, mult: 2, hue: "#facc15" },
  { id: "dificil", label: "Difícil", tag: "acelerada", base: 96, min: 60, step: 2.2, mult: 3, hue: "#fb923c" },
  { id: "extremo", label: "Extremo", tag: "turbo", base: 66, min: 42, step: 1.4, mult: 5, hue: "#f87171" },
];

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  max: number;
  size: number;
  color: string;
  grav: number;
}
interface Popup {
  x: number;
  y: number;
  text: string;
  color: string;
  life: number;
  max: number;
  big?: boolean;
}
interface Ring {
  x: number;
  y: number;
  r: number;
  max: number;
  life: number;
  color: string;
}
interface Bonus {
  x: number;
  y: number;
  ttl: number;
  total: number;
}
interface Game {
  snake: Pt[];
  prev: Pt[];
  dir: Pt;
  queue: Pt[];
  food: Pt;
  bonus: Bonus | null;
  foods: number;
  score: number;
  acc: number;
  interval: number;
  dead: boolean;
  diedAt: number;
  shake: number;
  flash: number;
  particles: Particle[];
  popups: Popup[];
  rings: Ring[];
}

function loadBests(): Record<string, number> {
  try {
    const raw = window.localStorage.getItem(BEST_KEY);
    if (raw) return JSON.parse(raw) as Record<string, number>;
  } catch {
    /* ignora */
  }
  return {};
}
function saveBests(b: Record<string, number>) {
  try {
    window.localStorage.setItem(BEST_KEY, JSON.stringify(b));
  } catch {
    /* ignora */
  }
}
function loadDiffId(): string {
  try {
    const d = window.localStorage.getItem(DIFF_KEY);
    if (d && DIFFS.some((x) => x.id === d)) return d;
  } catch {
    /* ignora */
  }
  return "normal";
}

const cx = (...c: Array<string | false | null | undefined>) => c.filter(Boolean).join(" ");

function rr(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  const rad = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rad, y);
  ctx.arcTo(x + w, y, x + w, y + h, rad);
  ctx.arcTo(x + w, y + h, x, y + h, rad);
  ctx.arcTo(x, y + h, x, y, rad);
  ctx.arcTo(x, y, x + w, y, rad);
  ctx.closePath();
}

/* ------------------------------------------------------------------ */
/* Ícones SVG                                                          */
/* ------------------------------------------------------------------ */

const I = {
  play: (
    <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4">
      <path d="M8 5.5v13l11-6.5-11-6.5z" />
    </svg>
  ),
  pause: (
    <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4">
      <path d="M7 5h4v14H7zM13 5h4v14h-4z" />
    </svg>
  ),
  restart: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" className="h-4 w-4">
      <path d="M20 12a8 8 0 1 1-2.9-6.2" />
      <path d="M20 3v5h-5" strokeLinejoin="round" />
    </svg>
  ),
  home: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
      <path d="M3 11.5 12 4l9 7.5" />
      <path d="M5.5 10.5V20h13v-9.5" />
    </svg>
  ),
  sound: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
      <path d="M4 9v6h4l6 5V4L8 9H4z" fill="currentColor" stroke="none" />
      <path d="M17 8.5a5 5 0 0 1 0 7" />
      <path d="M19.5 6a9 9 0 0 1 0 12" />
    </svg>
  ),
  mute: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
      <path d="M4 9v6h4l6 5V4L8 9H4z" fill="currentColor" stroke="none" />
      <path d="m17 9 5 6M22 9l-5 6" />
    </svg>
  ),
  crown: (
    <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4">
      <path d="M3 8.5 7.5 12 12 5l4.5 7L21 8.5 19.2 18H4.8L3 8.5zM5 19.5h14V21H5z" />
    </svg>
  ),
  up: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6">
      <path d="m5 15 7-7 7 7" />
    </svg>
  ),
  down: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6">
      <path d="m5 9 7 7 7-7" />
    </svg>
  ),
  left: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6">
      <path d="m15 5-7 7 7 7" />
    </svg>
  ),
  right: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6">
      <path d="m9 5 7 7-7 7" />
    </svg>
  ),
};

function SnakeMark({ className = "h-9 w-9" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden>
      <g fill="#2fbd6d">
        <rect x="1" y="17" width="4" height="4" rx="1" />
        <rect x="5" y="17" width="4" height="4" rx="1" />
        <rect x="9" y="17" width="4" height="4" rx="1" />
        <rect x="13" y="17" width="4" height="4" rx="1" />
        <rect x="13" y="13" width="4" height="4" rx="1" />
        <rect x="9" y="13" width="4" height="4" rx="1" />
        <rect x="5" y="13" width="4" height="4" rx="1" />
        <rect x="5" y="9" width="4" height="4" rx="1" />
        <rect x="9" y="9" width="4" height="4" rx="1" />
        <rect x="13" y="9" width="4" height="4" rx="1" />
      </g>
      <rect x="17" y="9" width="4.4" height="4" rx="1.2" fill="#0b5e35" />
      <circle cx="19.8" cy="10.4" r="0.85" fill="#eaf7ec" />
      <circle cx="20.1" cy="10.5" r="0.4" fill="#04150e" />
      <circle cx="21" cy="19" r="2.3" fill="#ff4d5e" />
      <path d="M21 15.6c.5-.8 1.5-.8 1.5-.8s0 1-.7 1.4" fill="#17a254" />
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/* Componente principal                                                */
/* ------------------------------------------------------------------ */

export default function SnakeGame() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gRef = useRef<Game | null>(null);
  const dprRef = useRef(1);
  const touchRef = useRef<{ x: number; y: number } | null>(null);

  const [mode, setModeState] = useState<Mode>("menu");
  const modeRef = useRef<Mode>("menu");
  const setMode = (m: Mode) => {
    modeRef.current = m;
    setModeState(m);
  };

  const [diffId, setDiffIdState] = useState<string>(loadDiffId);
  const diffRef = useRef(diffId);
  diffRef.current = diffId;

  const [score, setScore] = useState(0);
  const [len, setLen] = useState(3);
  const [apples, setApples] = useState(0);
  const [bests, setBests] = useState<Record<string, number>>(loadBests);
  const bestsRef = useRef(bests);
  const [isRecord, setIsRecord] = useState(false);
  const [muted, setMutedState] = useState(isMuted());
  const [showPad, setShowPad] = useState(false);

  const diff = DIFFS.find((d) => d.id === diffId) ?? DIFFS[1];
  const best = bests[diffId] ?? 0;

  /* ---------------- lógica de jogo ---------------- */

  const curDiff = (): Diff => DIFFS.find((d) => d.id === diffRef.current) ?? DIFFS[1];

  const spawnFood = (g: Game) => {
    const taken = new Set(g.snake.map((p) => `${p.x},${p.y}`));
    if (g.bonus) taken.add(`${g.bonus.x},${g.bonus.y}`);
    const free: Pt[] = [];
    for (let y = 0; y < ROWS; y++)
      for (let x = 0; x < COLS; x++) if (!taken.has(`${x},${y}`)) free.push({ x, y });
    if (free.length) g.food = free[Math.floor(Math.random() * free.length)];
  };

  const spawnBonus = (g: Game) => {
    const taken = new Set(g.snake.map((p) => `${p.x},${p.y}`));
    taken.add(`${g.food.x},${g.food.y}`);
    const free: Pt[] = [];
    for (let y = 0; y < ROWS; y++)
      for (let x = 0; x < COLS; x++) if (!taken.has(`${x},${y}`)) free.push({ x, y });
    if (!free.length) return;
    const p = free[Math.floor(Math.random() * free.length)];
    g.bonus = { x: p.x, y: p.y, ttl: 6500, total: 6500 };
  };

  const burst = (g: Game, px: number, py: number, colors: string[], n: number, speed = 5) => {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const s = (0.4 + Math.random()) * speed;
      g.particles.push({
        x: px,
        y: py,
        vx: Math.cos(a) * s,
        vy: Math.sin(a) * s,
        life: 420 + Math.random() * 380,
        max: 800,
        size: 2.5 + Math.random() * 3,
        color: colors[Math.floor(Math.random() * colors.length)],
        grav: 0.16,
      });
    }
  };

  const initGame = (d: Diff) => {
    const snake: Pt[] = [
      { x: 9, y: 10 },
      { x: 8, y: 10 },
      { x: 7, y: 10 },
    ];
    const g: Game = {
      snake,
      prev: snake.map((p) => ({ ...p })),
      dir: { x: 1, y: 0 },
      queue: [],
      food: { x: 15, y: 10 },
      bonus: null,
      foods: 0,
      score: 0,
      acc: 0,
      interval: d.base,
      dead: false,
      diedAt: 0,
      shake: 0,
      flash: 0,
      particles: [],
      popups: [],
      rings: [],
    };
    spawnFood(g);
    gRef.current = g;
    setScore(0);
    setLen(3);
    setApples(0);
    setIsRecord(false);
  };

  const setDir = (x: number, y: number) => {
    const g = gRef.current;
    if (!g || g.dead) return;
    if (modeRef.current !== "playing") return;
    const lastQ = g.queue.length ? g.queue[g.queue.length - 1] : g.dir;
    if ((x === -lastQ.x && y === -lastQ.y) || (x === lastQ.x && y === lastQ.y)) return;
    if (g.queue.length < 3) g.queue.push({ x, y });
  };

  const syncHud = (g: Game) => {
    setScore(g.score);
    setLen(g.snake.length);
    setApples(g.foods);
  };

  const tick = () => {
    const g = gRef.current;
    if (!g) return;
    const d = curDiff();

    let dir = g.dir;
    while (g.queue.length) {
      const c = g.queue.shift();
      if (c && !(c.x === -dir.x && c.y === -dir.y) && !(c.x === dir.x && c.y === dir.y)) {
        dir = c;
        break;
      }
    }
    g.dir = dir;

    g.prev = g.snake.map((p) => ({ ...p }));
    const head = { x: g.snake[0].x + dir.x, y: g.snake[0].y + dir.y };

    const die = () => {
      g.dead = true;
      g.diedAt = performance.now();
      g.acc = g.interval;
      g.shake = 15;
      g.flash = 1;
      g.queue = [];
      sfx.die();
      const segs = g.snake.slice(0, 26);
      segs.forEach((p, i) => {
        const px = (p.x + 0.5) * CELL;
        const py = (p.y + 0.5) * CELL;
        burst(g, px, py, i === 0 ? ["#ff4d5e", "#ffd166", "#2fbd6d"] : ["#2fbd6d", "#0e7a3f", "#9fe8b6"], 3, 3.4);
      });
      g.rings.push({ x: (g.snake[0].x + 0.5) * CELL, y: (g.snake[0].y + 0.5) * CELL, r: 8, max: 70, life: 480, color: "#e63946" });
    };

    if (head.x < 0 || head.y < 0 || head.x >= COLS || head.y >= ROWS) {
      die();
      return;
    }
    const eating = head.x === g.food.x && head.y === g.food.y;
    const body = eating ? g.snake : g.snake.slice(0, -1);
    if (body.some((p) => p.x === head.x && p.y === head.y)) {
      die();
      return;
    }

    g.snake = [head, ...(eating ? g.snake : g.snake.slice(0, -1))];
    const hx = (head.x + 0.5) * CELL;
    const hy = (head.y + 0.5) * CELL;

    if (eating) {
      g.foods += 1;
      const pts = 10 * d.mult;
      g.score += pts;
      g.interval = Math.max(d.min, d.base - g.foods * d.step);
      sfx.eat();
      burst(g, hx, hy, ["#e63946", "#ff8fa3", "#8ac926", "#2f9e57"], 16);
      g.rings.push({ x: hx, y: hy, r: 6, max: 34, life: 320, color: "#16a34a" });
      g.popups.push({ x: hx, y: hy - 8, text: `+${pts}`, color: "#0e7a3f", life: 750, max: 750 });
      if (g.foods % 5 === 0 && !g.bonus) spawnBonus(g);
      spawnFood(g);
      syncHud(g);
    }

    if (g.bonus && head.x === g.bonus.x && head.y === g.bonus.y) {
      const pts = 30 * d.mult;
      g.score += pts;
      sfx.bonus();
      burst(g, hx, hy, ["#ffd166", "#ffe08f", "#eab308", "#fff3c4"], 26, 6);
      g.rings.push({ x: hx, y: hy, r: 6, max: 52, life: 420, color: "#eab308" });
      g.popups.push({ x: hx, y: hy - 8, text: `+${pts}`, color: "#a16207", life: 900, max: 900, big: true });
      g.bonus = null;
      syncHud(g);
    }
  };

  const finalize = () => {
    const g = gRef.current;
    if (!g) return;
    const d = curDiff();
    const prevBest = bestsRef.current[d.id] ?? 0;
    const rec = g.score > prevBest && g.score > 0;
    if (rec) {
      const nb = { ...bestsRef.current, [d.id]: g.score };
      bestsRef.current = nb;
      setBests(nb);
      saveBests(nb);
    }
    setIsRecord(rec);
    setMode("over");
    if (rec) sfx.record();
    else sfx.over();
  };

  const startGame = (id?: string) => {
    const d = DIFFS.find((x) => x.id === (id ?? diffRef.current)) ?? DIFFS[1];
    diffRef.current = d.id;
    setDiffIdState(d.id);
    try {
      window.localStorage.setItem(DIFF_KEY, d.id);
    } catch {
      /* ignora */
    }
    initGame(d);
    setMode("playing");
    sfx.start();
    const g = gRef.current;
    if (g) g.popups.push({ x: W / 2, y: H / 2 - 10, text: "VAI!", color: "#0e7a3f", life: 900, max: 900, big: true });
  };

  const togglePause = () => {
    if (modeRef.current === "playing") {
      setMode("paused");
      sfx.pause();
    } else if (modeRef.current === "paused") {
      setMode("playing");
      sfx.resume();
    }
  };

  const restart = () => {
    if (modeRef.current !== "menu") startGame();
  };

  const backToMenu = () => {
    initGame(curDiff());
    setMode("menu");
    sfx.click();
  };

  const toggleMute = () => {
    setMutedState((m) => {
      setMuted(!m);
      if (m) sfx.click();
      return !m;
    });
  };

  /* guarda os handlers mais recentes para os listeners globais */
  const handlersRef = useRef({ startGame, togglePause, restart, setDir, toggleMute });
  handlersRef.current = { startGame, togglePause, restart, setDir, toggleMute };

  /* ---------------- efeitos: canvas, teclado, visibilidade, pad ---------------- */

  useEffect(() => {
    const cv = canvasRef.current;
    if (!cv) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    dprRef.current = dpr;
    cv.width = W * dpr;
    cv.height = H * dpr;

    initGame(curDiff());

    const onKey = (e: KeyboardEvent) => {
      const h = handlersRef.current;
      const k = e.key;
      const m = modeRef.current;
      const arrows: Record<string, [number, number]> = {
        ArrowUp: [0, -1],
        ArrowDown: [0, 1],
        ArrowLeft: [-1, 0],
        ArrowRight: [1, 0],
        w: [0, -1],
        s: [0, 1],
        a: [-1, 0],
        d: [1, 0],
        W: [0, -1],
        S: [0, 1],
        A: [-1, 0],
        D: [1, 0],
      };
      if (arrows[k]) {
        e.preventDefault();
        if (m === "playing") h.setDir(arrows[k][0], arrows[k][1]);
        return;
      }
      if (k === " ") {
        e.preventDefault();
        if (m === "menu" || m === "over") h.startGame();
        else h.togglePause();
        return;
      }
      if (k === "Enter") {
        if (m === "menu" || m === "over") h.startGame();
        return;
      }
      if (k === "p" || k === "P" || k === "Escape") {
        if (m === "playing" || m === "paused") h.togglePause();
        return;
      }
      if (k === "r" || k === "R") {
        h.restart();
        return;
      }
      if (k === "m" || k === "M") {
        h.toggleMute();
      }
    };

    const onVis = () => {
      if (document.hidden && modeRef.current === "playing") handlersRef.current.togglePause();
    };
    const onBlur = () => {
      if (modeRef.current === "playing") handlersRef.current.togglePause();
    };

    const mq = window.matchMedia("(pointer: coarse)");
    const updPad = () => setShowPad(mq.matches || window.innerWidth < 820);
    updPad();

    window.addEventListener("keydown", onKey);
    document.addEventListener("visibilitychange", onVis);
    window.addEventListener("blur", onBlur);
    window.addEventListener("resize", updPad);
    mq.addEventListener?.("change", updPad);

    /* -------- ciclo de jogo -------- */
    let raf = 0;
    let last = performance.now();

    const frame = (now: number) => {
      raf = requestAnimationFrame(frame);
      const dt = Math.min(60, now - last);
      last = now;
      const g = gRef.current;
      const ctx = cv.getContext("2d");
      if (!g || !ctx) return;

      if (modeRef.current === "playing") {
        if (!g.dead) {
          g.acc += dt;
          let guard = 0;
          while (g.acc >= g.interval && guard++ < 6) {
            g.acc -= g.interval;
            tick();
            if (g.dead) break;
          }
        } else if (now - g.diedAt > 850) {
          finalize();
        }
        if (g.bonus && !g.dead) {
          g.bonus.ttl -= dt;
          if (g.bonus.ttl <= 0) {
            burst(g, (g.bonus.x + 0.5) * CELL, (g.bonus.y + 0.5) * CELL, ["#ffd166", "#a16207"], 8, 2);
            g.bonus = null;
          }
        }
      }

      /* partículas / popups / anéis avançam sempre (suave na pausa) */
      g.particles = g.particles.filter((p) => (p.life -= dt) > 0);
      for (const p of g.particles) {
        p.x += p.vx * dt * 0.06;
        p.y += p.vy * dt * 0.06;
        p.vy += p.grav * dt * 0.06;
      }
      g.popups = g.popups.filter((p) => (p.life -= dt) > 0);
      for (const p of g.popups) p.y -= dt * 0.028;
      g.rings = g.rings.filter((r) => (r.life -= dt) > 0);
      for (const r of g.rings) r.r += dt * 0.09;

      draw(ctx, g, now);
    };
    raf = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("keydown", onKey);
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("blur", onBlur);
      window.removeEventListener("resize", updPad);
      mq.removeEventListener?.("change", updPad);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ---------------- desenho ---------------- */

  const draw = (ctx: CanvasRenderingContext2D, g: Game, now: number) => {
    const dpr = dprRef.current;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);

    let sx = 0;
    let sy = 0;
    if (g.shake > 0.4) {
      sx = (Math.random() - 0.5) * g.shake;
      sy = (Math.random() - 0.5) * g.shake;
      g.shake *= 0.88;
    } else g.shake = 0;
    ctx.translate(sx, sy);

    /* tabuleiro claro */
    ctx.save();
    rr(ctx, 0, 0, W, H, 12);
    ctx.clip();
    ctx.fillStyle = "#f4f9ec";
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = "#e8f1db";
    for (let y = 0; y < ROWS; y++)
      for (let x = 0; x < COLS; x++)
        if ((x + y) % 2 === 0) ctx.fillRect(x * CELL, y * CELL, CELL, CELL);
    const vg = ctx.createRadialGradient(W / 2, H / 2, H * 0.3, W / 2, H / 2, H * 0.78);
    vg.addColorStop(0, "rgba(23,60,38,0)");
    vg.addColorStop(1, "rgba(23,60,38,0.07)");
    ctx.fillStyle = vg;
    ctx.fillRect(0, 0, W, H);
    ctx.restore();

    rr(ctx, 1, 1, W - 2, H - 2, 11);
    ctx.strokeStyle = "rgba(14,122,63,0.28)";
    ctx.lineWidth = 2;
    ctx.stroke();

    /* comida (maçã) */
    {
      const pulse = 1 + 0.09 * Math.sin(now / 170);
      const px = (g.food.x + 0.5) * CELL;
      const py = (g.food.y + 0.55) * CELL;
      const r = CELL * 0.32 * pulse;
      ctx.save();
      ctx.shadowColor = "rgba(230,57,70,0.45)";
      ctx.shadowBlur = 10;
      const grad = ctx.createRadialGradient(px - r * 0.35, py - r * 0.4, r * 0.15, px, py, r * 1.15);
      grad.addColorStop(0, "#ff8f98");
      grad.addColorStop(0.55, "#ff4d5e");
      grad.addColorStop(1, "#d92638");
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(px, py, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      ctx.fillStyle = "rgba(255,255,255,0.65)";
      ctx.beginPath();
      ctx.arc(px - r * 0.35, py - r * 0.4, r * 0.22, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#7c4a21";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(px, py - r * 0.9);
      ctx.quadraticCurveTo(px + 1.5, py - r * 1.35, px + 3, py - r * 1.5);
      ctx.stroke();
      ctx.fillStyle = "#17a254";
      ctx.save();
      ctx.translate(px + 4, py - r * 1.25);
      ctx.rotate(-0.5);
      ctx.beginPath();
      ctx.ellipse(0, 0, 4.4, 2.2, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    /* bónus dourado */
    if (g.bonus) {
      const px = (g.bonus.x + 0.5) * CELL;
      const py = (g.bonus.y + 0.55) * CELL;
      const r = CELL * 0.3 * (1 + 0.12 * Math.sin(now / 120));
      ctx.save();
      ctx.shadowColor = "rgba(234,179,8,0.7)";
      ctx.shadowBlur = 14;
      const grad = ctx.createRadialGradient(px - r * 0.35, py - r * 0.4, r * 0.15, px, py, r * 1.15);
      grad.addColorStop(0, "#fff3c4");
      grad.addColorStop(0.55, "#ffd166");
      grad.addColorStop(1, "#d99a1d");
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(px, py, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      ctx.fillStyle = "rgba(255,255,255,0.7)";
      ctx.beginPath();
      ctx.arc(px - r * 0.32, py - r * 0.38, r * 0.2, 0, Math.PI * 2);
      ctx.fill();
      /* anel de tempo restante */
      const frac = Math.max(0, g.bonus.ttl / g.bonus.total);
      ctx.strokeStyle = "#d99a1d";
      ctx.lineWidth = 2.5;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.arc(px, py, CELL * 0.52, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * frac);
      ctx.stroke();
      /* cintilação */
      const sa = now / 260;
      ctx.fillStyle = "rgba(255,255,255,0.85)";
      for (let i = 0; i < 2; i++) {
        const a = sa + i * Math.PI;
        ctx.beginPath();
        ctx.arc(px + Math.cos(a) * CELL * 0.62, py + Math.sin(a) * CELL * 0.62, 1.6, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    /* cobra (interpolada entre ticks) */
    {
      const t = g.dead ? 1 : Math.min(1, g.acc / g.interval);
      const pts: Array<[number, number]> = g.snake.map((p, i) => {
        const from = g.prev[i] ?? p;
        return [(from.x + (p.x - from.x) * t + 0.5) * CELL, (from.y + (p.y - from.y) * t + 0.5) * CELL];
      });
      if (pts.length > 1) {
        ctx.lineJoin = "round";
        ctx.lineCap = "round";
        const path = () => {
          ctx.beginPath();
          ctx.moveTo(pts[pts.length - 1][0], pts[pts.length - 1][1]);
          for (let i = pts.length - 2; i >= 0; i--) ctx.lineTo(pts[i][0], pts[i][1]);
        };
        path();
        ctx.strokeStyle = g.dead ? "#4b6b57" : "#0b5e35";
        ctx.lineWidth = CELL * 0.8;
        ctx.stroke();
        path();
        ctx.strokeStyle = g.dead ? "#6b8a76" : "#1da45f";
        ctx.lineWidth = CELL * 0.6;
        ctx.stroke();
        path();
        ctx.strokeStyle = g.dead ? "rgba(255,255,255,0.18)" : "rgba(159,232,182,0.55)";
        ctx.lineWidth = CELL * 0.18;
        ctx.stroke();
      }
      /* cabeça + olhos */
      const [hx, hy] = pts[0];
      const d = g.dir;
      ctx.fillStyle = g.dead ? "#4b6b57" : "#0b5e35";
      ctx.beginPath();
      ctx.arc(hx, hy, CELL * 0.44, 0, Math.PI * 2);
      ctx.fill();
      const perp: [number, number] = [-d.y, d.x];
      const blink = now % 3400 < 130 && !g.dead ? 0.15 : 1;
      for (const s of [1, -1]) {
        const ex = hx + d.x * 4.5 + perp[0] * 6 * s;
        const ey = hy + d.y * 4.5 + perp[1] * 6 * s;
        if (g.dead) {
          ctx.strokeStyle = "#e63946";
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(ex - 3, ey - 3);
          ctx.lineTo(ex + 3, ey + 3);
          ctx.moveTo(ex + 3, ey - 3);
          ctx.lineTo(ex - 3, ey + 3);
          ctx.stroke();
        } else {
          ctx.fillStyle = "#ffffff";
          ctx.save();
          ctx.translate(ex, ey);
          ctx.scale(1, blink);
          ctx.beginPath();
          ctx.arc(0, 0, 3.8, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
          ctx.fillStyle = "#062b18";
          ctx.beginPath();
          ctx.arc(ex + d.x * 1.7, ey + d.y * 1.7 * blink, 1.9, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }

    /* anéis */
    for (const r of g.rings) {
      ctx.strokeStyle = r.color;
      ctx.globalAlpha = Math.max(0, r.life / 480) * 0.8;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(r.x, r.y, r.r, 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = 1;
    }

    /* partículas */
    for (const p of g.particles) {
      ctx.globalAlpha = Math.max(0, Math.min(1, p.life / p.max));
      ctx.fillStyle = p.color;
      ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
    }
    ctx.globalAlpha = 1;

    /* popups de pontos */
    for (const p of g.popups) {
      const a = Math.max(0, Math.min(1, p.life / p.max));
      ctx.globalAlpha = a;
      ctx.font = p.big ? '700 21px "Space Grotesk", sans-serif' : '700 13px "Space Grotesk", sans-serif';
      ctx.textAlign = "center";
      ctx.lineWidth = 4;
      ctx.strokeStyle = "rgba(255,255,255,0.85)";
      ctx.strokeText(p.text, p.x, p.y);
      ctx.fillStyle = p.color;
      ctx.fillText(p.text, p.x, p.y);
    }
    ctx.globalAlpha = 1;

    /* flash vermelho na morte */
    if (g.flash > 0.02) {
      ctx.fillStyle = `rgba(230,57,70,${0.22 * g.flash})`;
      ctx.fillRect(0, 0, W, H);
      g.flash *= 0.9;
    }
  };

  /* ---------------- toque: deslizar ---------------- */

  const onTouchStart = (e: React.TouchEvent) => {
    touchRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    const s = touchRef.current;
    touchRef.current = null;
    if (!s) return;
    const dx = e.changedTouches[0].clientX - s.x;
    const dy = e.changedTouches[0].clientY - s.y;
    if (Math.hypot(dx, dy) < 16) {
      if (modeRef.current === "paused") togglePause();
      return;
    }
    if (Math.abs(dx) > Math.abs(dy)) setDir(Math.sign(dx), 0);
    else setDir(0, Math.sign(dy));
  };

  /* ---------------- interface ---------------- */

  const inGame = mode === "playing" || mode === "paused";

  return (
    <div className="relative z-10 flex w-full flex-col items-center px-3 pb-6 pt-4 md:pt-6">
      {/* cabeçalho */}
      <header className="mb-3 flex w-full items-center justify-between gap-3" style={{ maxWidth: "min(94vw, 620px)" }}>
        <div className="flex items-center gap-2.5">
          <SnakeMark className="h-9 w-9 drop-shadow-[0_0_12px_rgba(52,196,108,0.5)] md:h-10 md:w-10" />
          <div>
            <h1 className="font-display text-base leading-none text-mint-300 [text-shadow:0_0_18px_rgba(52,196,108,0.55),0_3px_0_#0e7a3f] md:text-lg">
              SNAKE
            </h1>
            <p className="mt-1 text-[11px] font-medium leading-none tracking-wide text-mint-300/45">
              jogo da cobra · edição arcade
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          {inGame && (
            <>
              <button
                type="button"
                aria-label={mode === "paused" ? "Continuar" : "Pausar"}
                onClick={togglePause}
                className="btn-ghost flex h-9 w-9 items-center justify-center"
              >
                {mode === "paused" ? I.play : I.pause}
              </button>
              <button
                type="button"
                aria-label="Recomeçar"
                onClick={restart}
                className="btn-ghost flex h-9 w-9 items-center justify-center"
              >
                {I.restart}
              </button>
            </>
          )}
          <button
            type="button"
            aria-label={muted ? "Ativar som" : "Silenciar"}
            onClick={toggleMute}
            className={cx("flex h-9 w-9 items-center justify-center", inGame ? "btn-ghost" : "btn-ghost")}
          >
            {muted ? I.mute : I.sound}
          </button>
        </div>
      </header>

      {/* painel de resultados */}
      <div
        className="mb-2.5 flex w-full items-stretch justify-between gap-2 rounded-lg border border-pine-600/50 bg-pine-900/85 px-3 py-2 shadow-[0_10px_30px_rgba(0,0,0,0.35)] md:px-4"
        style={{ maxWidth: "min(94vw, 620px)" }}
      >
        <div className="flex min-w-0 flex-1 flex-col justify-center">
          <span className="text-[9px] font-bold uppercase tracking-[0.22em] text-mint-300/45">Pontos</span>
          <span key={score} className="anim-pop font-display text-sm text-mint-300 md:text-base">
            {String(score).padStart(4, "0")}
          </span>
        </div>
        <div className="w-px self-stretch bg-pine-600/50" />
        <div className="flex min-w-0 flex-1 flex-col justify-center">
          <span className="flex items-center gap-1 text-[9px] font-bold uppercase tracking-[0.22em] text-gold-400/60">
            <span className="text-gold-400">{I.crown}</span> Recorde
          </span>
          <span className="font-display text-sm text-gold-400 md:text-base">{String(best).padStart(4, "0")}</span>
        </div>
        <div className="hidden w-px self-stretch bg-pine-600/50 sm:block" />
        <div className="hidden flex-1 flex-col justify-center sm:flex">
          <span className="text-[9px] font-bold uppercase tracking-[0.22em] text-mint-300/45">Cobra</span>
          <span className="font-display text-sm text-mint-200 md:text-base">
            {len}
            <span className="ml-1.5 text-[8px] text-mint-300/40">cm</span>
          </span>
        </div>
        <div className="w-px self-stretch bg-pine-600/50" />
        <div className="flex flex-col items-end justify-center">
          <span className="text-[9px] font-bold uppercase tracking-[0.22em] text-mint-300/45">Nível</span>
          <span className="mt-1 flex items-center gap-1.5 rounded-md border border-pine-600/60 bg-pine-800/80 px-2 py-1">
            <span className="h-2 w-2 rounded-full" style={{ background: diff.hue, boxShadow: `0 0 8px ${diff.hue}` }} />
            <span className="text-[11px] font-bold leading-none text-mint-100">{diff.label}</span>
            <span className="font-display text-[7px] leading-none" style={{ color: diff.hue }}>
              ×{diff.mult}
            </span>
          </span>
        </div>
      </div>

      {/* moldura + tabuleiro */}
      <div
        className="board-frame relative rounded-xl border border-pine-600/70 bg-gradient-to-b from-pine-700 to-pine-900 p-2 shadow-[0_30px_70px_-18px_rgba(0,0,0,0.65),0_0_0_1px_rgba(4,21,14,0.8)] md:p-2.5"
      >
        <span className="absolute left-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-pine-600 shadow-inner" />
        <span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-pine-600 shadow-inner" />
        <span className="absolute bottom-1.5 left-1.5 h-1.5 w-1.5 rounded-full bg-pine-600 shadow-inner" />
        <span className="absolute bottom-1.5 right-1.5 h-1.5 w-1.5 rounded-full bg-pine-600 shadow-inner" />

        <div
          className="relative touch-none select-none overflow-hidden rounded-lg"
          onTouchStart={onTouchStart}
          onTouchEnd={onTouchEnd}
          onContextMenu={(e) => e.preventDefault()}
        >
          <canvas ref={canvasRef} width={W} height={H} className="block h-auto w-full" />

          {/* -------- MENU -------- */}
          {mode === "menu" && (
            <div
              className="anim-rise absolute inset-0 z-20 flex cursor-pointer items-center justify-center bg-pine-950/72 p-3 backdrop-blur-[2.5px]"
              onPointerUp={() => startGame()}
            >
              <div className="w-full max-w-[340px] rounded-xl border border-pine-600/60 bg-pine-900/95 px-5 py-5 text-center shadow-2xl md:px-7 md:py-6">
                <SnakeMark className="mx-auto mb-3 h-12 w-12 drop-shadow-[0_0_16px_rgba(52,196,108,0.55)]" />
                <h2 className="font-display text-2xl text-mint-300 [text-shadow:0_0_22px_rgba(52,196,108,0.6),0_4px_0_#0e7a3f] md:text-[27px]">
                  SNAKE
                </h2>
                <p className="mx-auto mt-2.5 max-w-[240px] text-[12.5px] leading-snug text-mint-200/70">
                  O clássico da cobra, reinventado. Come maçãs, cresce e não mordes a cauda.
                </p>

                <p className="mt-4 text-[9px] font-bold uppercase tracking-[0.28em] text-mint-300/45">Dificuldade</p>
                <div className="mt-2 grid grid-cols-2 gap-1.5">
                  {DIFFS.map((d) => (
                    <button
                      key={d.id}
                      type="button"
                      onPointerUp={(e) => e.stopPropagation()}
                      onClick={() => {
                        sfx.click();
                        setDiffIdState(d.id);
                        diffRef.current = d.id;
                        try {
                          window.localStorage.setItem(DIFF_KEY, d.id);
                        } catch {
                          /* ignora */
                        }
                      }}
                      className={cx(
                        "flex items-center justify-between gap-1 rounded-md border px-2.5 py-2 text-left transition-all duration-150",
                        diffId === d.id
                          ? "border-mint-500/80 bg-pine-700 shadow-[0_0_14px_rgba(52,196,108,0.25)]"
                          : "border-pine-600/50 bg-pine-800/50 hover:bg-pine-800",
                      )}
                    >
                      <span className="flex items-center gap-1.5">
                        <span
                          className="h-2 w-2 shrink-0 rounded-full"
                          style={{ background: d.hue, boxShadow: diffId === d.id ? `0 0 8px ${d.hue}` : "none" }}
                        />
                        <span className="text-[12px] font-bold leading-tight text-mint-100">{d.label}</span>
                      </span>
                      <span className="font-display text-[7px]" style={{ color: d.hue }}>
                        ×{d.mult}
                      </span>
                    </button>
                  ))}
                </div>

                <button
                  type="button"
                  onPointerUp={(e) => e.stopPropagation()}
                  onClick={() => startGame()}
                  className="btn-arcade mt-4 w-full px-5 py-3.5 text-[11px] tracking-wider"
                >
                  COMEÇAR
                </button>

                {best > 0 && (
                  <p className="mt-3 flex items-center justify-center gap-1.5 text-[11.5px] font-semibold text-gold-400/90">
                    {I.crown} Recorde em {diff.label}: {best}
                  </p>
                )}

                <div className="mt-3 hidden items-center justify-center gap-1.5 text-[10.5px] text-mint-300/50 md:flex">
                  <span className="kbd">↑↓←→</span>
                  <span className="kbd">WASD</span>
                  <span>mover</span>
                  <span className="mx-0.5 text-pine-600">·</span>
                  <span className="kbd">Espaço</span>
                  <span>pausa</span>
                  <span className="mx-0.5 text-pine-600">·</span>
                  <span className="kbd">R</span>
                  <span>reinicia</span>
                </div>
                <p className="mt-3 text-[11px] text-mint-300/50 md:hidden">Desliza no tabuleiro para mover · toca para começar</p>
              </div>
            </div>
          )}

          {/* -------- PAUSA -------- */}
          {mode === "paused" && (
            <div className="anim-rise absolute inset-0 z-20 flex items-center justify-center bg-pine-950/72 p-3 backdrop-blur-[2.5px]">
              <div className="w-full max-w-[300px] rounded-xl border border-pine-600/60 bg-pine-900/95 px-6 py-6 text-center shadow-2xl">
                <h2 className="font-display text-xl text-mint-300 [text-shadow:0_0_18px_rgba(52,196,108,0.5),0_3px_0_#0e7a3f]">
                  PAUSA
                </h2>
                <p className="mt-2 text-[12px] text-mint-200/60">A cobra está a descansar…</p>
                <button type="button" onClick={togglePause} className="btn-arcade mt-4 w-full px-5 py-3 text-[10px] tracking-wider">
                  CONTINUAR
                </button>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  <button type="button" onClick={restart} className="btn-ghost px-3 py-2.5 text-[12px]">
                    Recomeçar
                  </button>
                  <button type="button" onClick={backToMenu} className="btn-ghost flex items-center justify-center gap-1.5 px-3 py-2.5 text-[12px]">
                    {I.home} Menu
                  </button>
                </div>
                <p className="mt-3 text-[10.5px] text-mint-300/45">
                  <span className="kbd">Espaço</span> para continuar
                </p>
              </div>
            </div>
          )}

          {/* -------- FIM DE JOGO -------- */}
          {mode === "over" && (
            <div className="anim-rise absolute inset-0 z-20 flex items-center justify-center bg-pine-950/74 p-3 backdrop-blur-[2.5px]">
              <div className="w-full max-w-[320px] rounded-xl border border-pine-600/60 bg-pine-900/95 px-6 py-5 text-center shadow-2xl md:py-6">
                <h2 className="font-display text-lg text-apple-500 [text-shadow:0_0_20px_rgba(255,77,94,0.55),0_3px_0_#7f1d2b] md:text-xl">
                  FIM DE JOGO
                </h2>

                {isRecord && (
                  <p className="anim-shimmer mx-auto mt-2.5 inline-block rounded-md border border-gold-400/70 bg-gold-400/10 px-3 py-1.5 font-display text-[8px] tracking-wider text-gold-300">
                    ★ NOVO RECORDE ★
                  </p>
                )}

                <p className="mt-3 text-[9px] font-bold uppercase tracking-[0.28em] text-mint-300/45">Pontuação</p>
                <p className="font-display text-3xl text-mint-300 [text-shadow:0_0_24px_rgba(52,196,108,0.45)]">{score}</p>

                <div className="mt-3 grid grid-cols-3 gap-1.5">
                  <div className="rounded-md border border-pine-600/50 bg-pine-800/60 px-2 py-2">
                    <p className="flex items-center justify-center gap-1 text-[8.5px] font-bold uppercase tracking-widest text-gold-400/70">
                      {I.crown} Recorde
                    </p>
                    <p className="mt-1 font-display text-[10px] text-gold-400">{best}</p>
                  </div>
                  <div className="rounded-md border border-pine-600/50 bg-pine-800/60 px-2 py-2">
                    <p className="text-[8.5px] font-bold uppercase tracking-widest text-mint-300/45">Maçãs</p>
                    <p className="mt-1 font-display text-[10px] text-apple-400">{apples}</p>
                  </div>
                  <div className="rounded-md border border-pine-600/50 bg-pine-800/60 px-2 py-2">
                    <p className="text-[8.5px] font-bold uppercase tracking-widest text-mint-300/45">Tamanho</p>
                    <p className="mt-1 font-display text-[10px] text-mint-200">{len}</p>
                  </div>
                </div>

                <button type="button" onClick={() => startGame()} className="btn-arcade mt-4 w-full px-5 py-3.5 text-[10px] tracking-wider">
                  JOGAR OUTRA VEZ
                </button>
                <button type="button" onClick={backToMenu} className="btn-ghost mt-2 flex w-full items-center justify-center gap-1.5 px-3 py-2.5 text-[12px]">
                  {I.home} Mudar dificuldade
                </button>
                <p className="mt-3 hidden text-[10.5px] text-mint-300/45 md:block">
                  <span className="kbd">Espaço</span> ou <span className="kbd">R</span> para repetir
                </p>
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between px-1.5 pb-0.5 pt-1.5">
          <span className="font-display text-[6.5px] tracking-wider text-mint-300/35">SNAKE · PT</span>
          <span className="font-display text-[6.5px] tracking-wider text-mint-300/35">TABULEIRO 21×21</span>
        </div>
      </div>

      {/* ajuda de teclas (desktop) */}
      {!showPad && (
        <div className="mt-3 flex flex-wrap items-center justify-center gap-x-2 gap-y-1.5 text-[11px] text-mint-300/50">
          <span className="kbd">↑↓←→</span>
          <span className="kbd">WASD</span>
          <span>mover</span>
          <span className="text-pine-600">·</span>
          <span className="kbd">Espaço</span>
          <span>pausa</span>
          <span className="text-pine-600">·</span>
          <span className="kbd">R</span>
          <span>reiniciar</span>
          <span className="text-pine-600">·</span>
          <span className="kbd">M</span>
          <span>som</span>
        </div>
      )}

      {/* comando de toque */}
      {showPad && (
        <div
          className="mt-3 grid select-none grid-cols-3 grid-rows-3 gap-1.5"
          style={{ touchAction: "none" }}
          onContextMenu={(e) => e.preventDefault()}
        >
          <span />
          <PadBtn label="Cima" onPress={() => setDir(0, -1)} disabled={mode !== "playing"}>
            {I.up}
          </PadBtn>
          <span />
          <PadBtn label="Esquerda" onPress={() => setDir(-1, 0)} disabled={mode !== "playing"}>
            {I.left}
          </PadBtn>
          <PadBtn
            label={mode === "paused" ? "Continuar" : "Pausa"}
            onPress={togglePause}
            disabled={mode === "menu" || mode === "over"}
            accent
          >
            {mode === "paused" ? I.play : I.pause}
          </PadBtn>
          <PadBtn label="Direita" onPress={() => setDir(1, 0)} disabled={mode !== "playing"}>
            {I.right}
          </PadBtn>
          <span />
          <PadBtn label="Baixo" onPress={() => setDir(0, 1)} disabled={mode !== "playing"}>
            {I.down}
          </PadBtn>
          <span />
        </div>
      )}
      {showPad && mode === "playing" && (
        <p className="mt-2 text-center text-[11px] text-mint-300/40">Desliza no tabuleiro ou usa o comando</p>
      )}
    </div>
  );
}

function PadBtn({
  children,
  label,
  onPress,
  disabled,
  accent,
}: {
  children: React.ReactNode;
  label: string;
  onPress: () => void;
  disabled?: boolean;
  accent?: boolean;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onPointerDown={(e) => {
        e.preventDefault();
        if (!disabled) onPress();
      }}
      className={cx(
        "flex h-14 w-16 items-center justify-center rounded-lg border transition-all duration-100 sm:h-14 sm:w-20",
        accent
          ? "border-mint-500/70 bg-mint-500/15 text-mint-300 active:bg-mint-500 active:text-pine-950"
          : "border-pine-600/70 bg-pine-800/90 text-mint-300 active:border-mint-500 active:bg-pine-700",
        disabled && "opacity-35",
      )}
    >
      {children}
    </button>
  );
}
