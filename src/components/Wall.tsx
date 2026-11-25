import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { N_CHUTES, SLOTS, slotColor, slotLabel } from '../game/config';
import type { BallColor, GameSegment } from '../game/types';

interface Props {
  phase: 'pick' | 'drop' | 'result';
  segment: GameSegment;
  chute: number | null;
  ballColor: BallColor | null;
  teamName: string;
  teamColor: string;
  lastDelta: number | null;
  isFinalRound: boolean;
  ballsPerTurn: number;
  ballIndex: number;
  turnDeltaTotal: number;
  onPick: (chute: number) => void;
  onDrop: () => void;
  onLand: (slot: number) => void;
  onNext: () => void;
}

interface Ball {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  glow: string;
  landed: boolean;
  chute: number;
  restFrames: number;
  landSent: boolean;
  stuckFrames: number;
  aliveFrames: number;
}
interface Peg { x: number; y: number; lit: number }
interface Particle { x: number; y: number; vx: number; vy: number; life: number; max: number; color: string; r: number }

interface Geom {
  W: number;
  H: number;
  TOP: number;
  slotTop: number;
  playTop: number;
  playBottom: number;
  innerL: number;
  innerR: number;
  archTop: number;
  slotL: number;
  slotR: number;
  sw: number;
  gravityScale: number;
}

const BALL_R = 11;
const TUBE_W = BALL_R * 2 + 8;
const PEG_R = 7;
const PEG_SPACING = 74;
const DIV_R = 8;
const REST_FRAMES = 22;
const LAND_DELAY_MS = 950;
const DROP_START_DELAY_MS = 900;
const DROP_SPEED = 2.05;
const CHUTE_STRIP_H = 72;
const BOARD_FOOTER_H = 88;

function chuteStripVisible(phase: Props['phase'], chute: number | null): boolean {
  return phase === 'pick' || phase === 'drop' || (phase === 'result' && chute !== null);
}

function boardScrollMetrics(
  g: Geom,
  areaH: number,
  phase: Props['phase'],
  chute: number | null,
) {
  const chuteOff = chuteStripVisible(phase, chute) ? CHUTE_STRIP_H : 0;
  const contentH = chuteOff + g.H + BOARD_FOOTER_H;
  const maxScroll = Math.max(0, contentH - areaH);
  return { chuteOff, contentH, maxScroll };
}

function scrollForCanvasY(
  canvasY: number,
  areaH: number,
  g: Geom,
  phase: Props['phase'],
  chute: number | null,
  anchor: number,
) {
  const { chuteOff, maxScroll } = boardScrollMetrics(g, areaH, phase, chute);
  const target = chuteOff + canvasY - areaH * anchor;
  return Math.max(0, Math.min(maxScroll, target));
}

const WALL_INSET = 10; // wall curve sits just inside the neon frame
const WALL_CYAN = '#22d3ff';
const WALL_CYAN_GLOW = 'rgba(34,211,255,0.75)';
const WALL_ARCH = '#00b8e8';

// drop chute X as fraction of board width (matches inner playfield)
const BOARD_MAX_W = 860;
const BOARD_REF_H = 2100;

interface BoardProfile {
  portrait: boolean;
  scrollLeadAnchor: number;
  scrollFloorAnchor: number;
  scrollEaseActive: number;
  scrollEaseSettled: number;
  gravityScale: number;
}

const DEFAULT_PROFILE: BoardProfile = {
  portrait: false,
  scrollLeadAnchor: 0.38,
  scrollFloorAnchor: 0.78,
  scrollEaseActive: 0.055,
  scrollEaseSettled: 0.12,
  gravityScale: 1,
};

function isPortraitViewport(): boolean {
  return window.innerHeight >= window.innerWidth;
}

/** Board height + scroll/physics tuning for landscape vs portrait (e.g. 1080×1920 rotated). */
function computeBoardLayout(W: number, areaH: number): { H: number; profile: BoardProfile } {
  const portrait = isPortraitViewport();

  if (portrait) {
    const reserved = CHUTE_STRIP_H + BOARD_FOOTER_H;
    const fitH = areaH > 0 ? areaH - reserved : W * 1.05;
    const H = Math.round(Math.max(fitH, 680));
    return {
      H,
      profile: {
        portrait: true,
        scrollLeadAnchor: 0.5,
        scrollFloorAnchor: 0.94,
        scrollEaseActive: 0.14,
        scrollEaseSettled: 0.2,
        gravityScale: Math.min(1.65, Math.max(1.05, BOARD_REF_H / H)),
      },
    };
  }

  const vh = window.innerHeight || 1080;
  const scrollH = areaH > 0 ? areaH : Math.round(vh * 0.82);
  const H = Math.max(Math.round(scrollH * 2.55), Math.round(vh * 2.35), 1700);
  return { H, profile: DEFAULT_PROFILE };
}

const chuteLeftPct = (i: number, boardW = BOARD_MAX_W) => {
  const innerL = boardW * 0.11;
  const innerR = boardW * 0.89;
  const slotL = innerL + 6;
  const slotR = innerR - 6;
  const sw = (slotR - slotL) / SLOTS.length;
  return ((slotL + (i + 0.5) * sw) / boardW) * 100;
};

function slotCenterX(g: Geom, slotIndex: number): number {
  return g.slotL + (slotIndex + 0.5) * g.sw;
}

function chuteSpawnPoint(g: Geom, chuteIndex: number): { x: number; y: number } {
  const tube = dropTube(g);
  return {
    x: slotCenterX(g, chuteIndex),
    y: tube.top + BALL_R + 2,
  };
}

/** Funnel at the box mouth — balls enter the arch here. */
function dropTube(g: Geom) {
  const bottom = g.TOP - 12;
  return {
    top: g.TOP - 58,
    bottom,
    releaseY: g.TOP + 8,
  };
}

function ChuteStrip({
  phase,
  chute,
  boardW,
  onPick,
}: {
  phase: 'pick' | 'drop' | 'result';
  chute: number | null;
  boardW: number;
  onPick: (i: number) => void;
}) {
  const pickable = phase === 'pick';
  const showAll = pickable;
  const slots = showAll
    ? Array.from({ length: N_CHUTES }, (_, i) => i)
    : chute !== null
      ? [chute]
      : [];

  if (slots.length === 0) return null;

  return (
    <div
      data-testid="chute-strip"
      className="relative h-[72px] w-full shrink-0"
    >
      {slots.map((i) => {
        const selected = chute === i;
        const inner = (
          <>
            <span
              className={`grid h-11 w-11 place-items-center rounded-full border-2 text-lg font-black text-white shadow-[0_0_12px_rgba(34,211,255,0.25)] ${
                selected || pickable
                  ? 'border-[#22d3ff]/80 bg-[#0a1a30]'
                  : 'border-[#22d3ff]/40 bg-[#0a1a30]/80'
              }`}
            >
              {i + 1}
            </span>
            <span className="text-[10px] leading-none text-[#22d3ff]/80">▼</span>
          </>
        );
        return pickable ? (
          <button
            key={i}
            type="button"
            onClick={() => onPick(i)}
            aria-label={`Chute ${i + 1}`}
            className="group absolute flex -translate-x-1/2 flex-col items-center gap-0.5 border-0 bg-transparent p-0 transition hover:brightness-125"
            style={{ left: `${chuteLeftPct(i, boardW)}%`, top: 4 }}
          >
            {inner}
          </button>
        ) : (
          <div
            key={i}
            className="absolute flex -translate-x-1/2 flex-col items-center gap-0.5"
            style={{ left: `${chuteLeftPct(i, boardW)}%`, top: 4 }}
          >
            {inner}
          </div>
        );
      })}
    </div>
  );
}

export default function Wall({
  phase,
  segment,
  chute,
  ballColor,
  teamName,
  teamColor,
  lastDelta,
  isFinalRound,
  ballsPerTurn,
  ballIndex,
  turnDeltaTotal,
  onPick,
  onDrop,
  onLand,
  onNext,
}: Props) {
  const areaRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const geom = useRef<Geom | null>(null);
  const pegs = useRef<Peg[]>([]);
  const balls = useRef<Ball[]>([]);
  const particles = useRef<Particle[]>([]);
  const slotFlash = useRef<{ slot: number; t: number } | null>(null);
  const landRing = useRef<{ x: number; y: number; t: number; color: string } | null>(null);
  const scrollY = useRef(0);
  const onLandRef = useRef(onLand);
  const chuteRef = useRef(chute);
  const phaseRef = useRef(phase);
  const ballsPerTurnRef = useRef(ballsPerTurn);
  const isFinalRoundRef = useRef(isFinalRound);
  const boardProfileRef = useRef<BoardProfile>(DEFAULT_PROFILE);
  onLandRef.current = onLand;
  chuteRef.current = chute;
  phaseRef.current = phase;
  ballsPerTurnRef.current = ballsPerTurn;
  isFinalRoundRef.current = isFinalRound;

  const [layout, setLayout] = useState({
    boardH: 1500,
    boardW: BOARD_MAX_W,
    areaH: 0,
    topPx: 118,
    portrait: false,
  });

  /* ---------- measure + build board ---------- */
  useLayoutEffect(() => {
    const canvas = canvasRef.current;
    const area = areaRef.current;
    if (!canvas || !area) return;
    const ctx = canvas.getContext('2d')!;

    const measure = () => {
      const portrait = isPortraitViewport();
      const W = Math.min(area.clientWidth || BOARD_MAX_W, BOARD_MAX_W);
      const areaH = area.clientHeight || Math.round(window.innerHeight * 0.82);
      const { H, profile } = computeBoardLayout(W, areaH);
      boardProfileRef.current = profile;
      const dpr = window.devicePixelRatio || 1;
      canvas.width = W * dpr;
      canvas.height = H * dpr;
      canvas.style.width = W + 'px';
      canvas.style.height = H + 'px';
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      const innerL = W * 0.11;
      const innerR = W * 0.89;
      const archTop = 42;
      const TOP = 118;
      const slotTop = H - 168;
      const playTop = TOP + 36;
      const playBottom = slotTop - 48;
      const slotL = innerL + 6;
      const slotR = innerR - 6;
      const sw = (slotR - slotL) / SLOTS.length;

      geom.current = {
        W,
        H,
        TOP,
        slotTop,
        playTop,
        playBottom,
        innerL,
        innerR,
        archTop,
        slotL,
        slotR,
        sw,
        gravityScale: profile.gravityScale,
      };
      buildPegs(geom.current);
      setLayout((l) =>
        l.boardH === H && l.boardW === W && l.areaH === areaH && l.topPx === TOP && l.portrait === portrait
          ? l
          : { boardH: H, boardW: W, areaH, topPx: TOP, portrait },
      );
    };

    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(area);
    window.addEventListener('resize', measure);
    window.addEventListener('orientationchange', measure);
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', measure);
      window.removeEventListener('orientationchange', measure);
    };
  }, []);

  function buildPegs(g: Geom) {
    const out: Peg[] = [];
    const left = g.innerL + WALL_INSET + 6;
    const right = g.innerR - WALL_INSET - 6;
    const playW = right - left;
    const cols = Math.max(7, Math.round(playW / PEG_SPACING));
    const gapX = playW / cols;
    const rowGapY = gapX * 0.86;
    const rows = Math.max(10, Math.floor((g.playBottom - g.playTop) / rowGapY));
    for (let r = 0; r < rows; r++) {
      const y = g.playTop + r * rowGapY;
      const even = r % 2 === 0;
      const off = even ? 0 : gapX / 2;
      const n = even ? cols : cols - 1;
      for (let c = 0; c <= n; c++) {
        const x = left + c * gapX + off;
        if (x < g.innerL + WALL_INSET || x > g.innerR - WALL_INSET) continue;
        out.push({ x, y, lit: 0 });
      }
    }
    pegs.current = out;
  }

  /* ---------- spawn on drop ---------- */
  useEffect(() => {
    const g = geom.current;
    if (phase === 'drop' && chute !== null && ballColor && g) {
      balls.current = [];
      particles.current = [];
      slotFlash.current = null;
      landRing.current = null;
      scrollY.current = 0;

      const id = window.setTimeout(() => {
        const gg = geom.current;
        if (!gg || chute === null || !ballColor) return;
        const spawn = chuteSpawnPoint(gg, chute);
        const color = ballColor === 'green' ? '#2ee88a' : '#ff5a6a';
        const glow = ballColor === 'green' ? 'rgba(46,232,138,.75)' : 'rgba(255,90,106,.75)';
        const count = Math.max(1, ballsPerTurnRef.current);
        balls.current = Array.from({ length: count }, (_, i) => ({
          x: spawn.x,
          y: spawn.y - i * 4,
          vx: 0,
          vy: 0.18 * DROP_SPEED,
          color,
          glow,
          landed: false,
          chute,
          restFrames: 0,
          landSent: false,
          stuckFrames: 0,
          aliveFrames: 0,
        }));
      }, DROP_START_DELAY_MS);

      return () => window.clearTimeout(id);
    } else if (phase === 'pick') {
      balls.current = [];
      particles.current = [];
      slotFlash.current = null;
      areaRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
      scrollY.current = 0;
    }
  }, [phase, chute, ballColor, ballsPerTurn]);

  useEffect(() => {
    const g = geom.current;
    const area = areaRef.current;
    if (phase !== 'result' || !g || !area || balls.current.length === 0) return;
    const floorY = Math.max(...balls.current.map((b) => b.y));
    const { scrollFloorAnchor } = boardProfileRef.current;
    const target = scrollForCanvasY(floorY, area.clientHeight, g, phase, chute, scrollFloorAnchor);
    scrollY.current = target;
    area.scrollTo({ top: target, behavior: 'smooth' });
  }, [phase, chute, lastDelta]);

  /* ---------- animation loop ---------- */
  useEffect(() => {
    const canvas = canvasRef.current;
    const area = areaRef.current;
    if (!canvas || !area) return;
    const ctx = canvas.getContext('2d')!;
    let raf = 0;

    const physics = () => {
      const g = geom.current;
      for (const p of particles.current) {
        p.vy += 0.35;
        p.x += p.vx;
        p.y += p.vy;
        p.life -= 1;
      }
      particles.current = particles.current.filter((p) => p.life > 0);
      for (const pg of pegs.current) if (pg.lit > 0) pg.lit -= 0.05;
      if (slotFlash.current) {
        slotFlash.current.t -= 0.016;
        if (slotFlash.current.t <= 0) slotFlash.current = null;
      }
      if (landRing.current) {
        landRing.current.t += 0.028;
        if (landRing.current.t >= 1) landRing.current = null;
      }

      if (!g || balls.current.length === 0) return;

      for (const b of balls.current) {
        if (b.landed) continue;
        simulateBall(b, g, pegs.current, (slot) => {
          slotFlash.current = { slot, t: 1 };
          landRing.current = { x: b.x, y: b.y, t: 0, color: b.color };
          for (let k = 0; k < 46; k++) {
            const ang = Math.random() * Math.PI - Math.PI;
            const sp = 2.5 + Math.random() * 6.5;
            particles.current.push({
              x: b.x,
              y: b.y,
              vx: Math.cos(ang) * sp,
              vy: -Math.abs(Math.sin(ang) * sp) - 1.5,
              life: 36 + Math.random() * 30,
              max: 66,
              color: Math.random() < 0.4 ? '#ffffff' : b.color,
              r: 2 + Math.random() * 3.5,
            });
          }
          if (!b.landSent) {
            b.landSent = true;
            window.setTimeout(() => onLandRef.current(slot), LAND_DELAY_MS);
          }
        });
      }

      separateBalls(balls.current, dropTube(g).releaseY);

      const tube = dropTube(g);
      for (const b of balls.current) {
        if (b.landed || b.y >= tube.releaseY) continue;
        b.x = slotCenterX(g, b.chute);
        b.vx = 0;
      }

      const active = balls.current.filter((b) => !b.landed);
      const phaseNow = phaseRef.current;
      const chuteNow = chuteRef.current;
      let targetScroll: number | null = null;

      const profile = boardProfileRef.current;

      if (active.length > 0) {
        const leadY = Math.max(...active.map((b) => b.y));
        targetScroll = scrollForCanvasY(
          leadY,
          area.clientHeight,
          g,
          phaseNow,
          chuteNow,
          profile.scrollLeadAnchor,
        );
      } else if (balls.current.some((b) => b.landed)) {
        const floorY = Math.max(...balls.current.map((b) => b.y));
        targetScroll = scrollForCanvasY(
          floorY,
          area.clientHeight,
          g,
          phaseNow,
          chuteNow,
          profile.scrollFloorAnchor,
        );
      }

      if (targetScroll !== null) {
        const ease = active.length > 0 ? profile.scrollEaseActive : profile.scrollEaseSettled;
        scrollY.current += (targetScroll - scrollY.current) * ease;
        area.scrollTop = scrollY.current;
      }
    };

    const draw = () => {
      const g = geom.current;
      if (!g) return;
      const { W, H, TOP, slotTop, innerL, innerR, archTop, slotL, sw } = g;

      // stage backdrop — blue-tinted, no harsh black gutters
      const stage = ctx.createLinearGradient(0, 0, 0, H);
      stage.addColorStop(0, '#061228');
      stage.addColorStop(0.45, '#050f24');
      stage.addColorStop(1, '#040a18');
      ctx.fillStyle = stage;
      ctx.fillRect(0, 0, W, H);

      // floor spotlight (like the TV stage)
      const spot = ctx.createRadialGradient(W / 2, H, 0, W / 2, H, W * 0.55);
      spot.addColorStop(0, 'rgba(0,180,255,0.12)');
      spot.addColorStop(0.5, 'rgba(0,80,160,0.06)');
      spot.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = spot;
      ctx.fillRect(0, slotTop, W, H - slotTop);

      // filled playfield inside the arch (blue panel + side gutters)
      fillPlayfield(ctx, g);

      // neon arch frame (same curve as physics)
      ctx.save();
      ctx.lineWidth = 5;
      ctx.strokeStyle = WALL_ARCH;
      ctx.shadowColor = WALL_CYAN_GLOW;
      ctx.shadowBlur = 28;
      traceArchFrame(ctx, g);
      ctx.stroke();
      ctx.lineWidth = 2;
      ctx.shadowBlur = 14;
      ctx.strokeStyle = 'rgba(255,255,255,0.35)';
      ctx.stroke();
      ctx.restore();

      // subtle grid glow behind pegs
      ctx.save();
      ctx.strokeStyle = 'rgba(34,211,255,0.04)';
      ctx.lineWidth = 1;
      for (let y = TOP; y < slotTop; y += 48) {
        ctx.beginPath();
        ctx.moveTo(innerL + 10, y);
        ctx.lineTo(innerR - 10, y);
        ctx.stroke();
      }
      ctx.restore();

      // chute labels live in HTML above the box — canvas only draws the drop funnel
      if (phaseRef.current === 'drop' && chuteRef.current !== null) {
        const tx = slotCenterX(g, chuteRef.current);
        const tube = dropTube(g);
        const tubeX = tx - TUBE_W / 2;
        ctx.save();
        const tg = ctx.createLinearGradient(tx, tube.top, tx, tube.bottom);
        tg.addColorStop(0, 'rgba(255,255,255,0.35)');
        tg.addColorStop(0.55, 'rgba(34,211,255,0.22)');
        tg.addColorStop(1, 'rgba(34,211,255,0.08)');
        ctx.fillStyle = tg;
        roundRect(ctx, tubeX, tube.top, TUBE_W, tube.bottom - tube.top, 7);
        ctx.fill();
        ctx.strokeStyle = 'rgba(255,255,255,0.5)';
        ctx.lineWidth = 2;
        roundRect(ctx, tubeX, tube.top, TUBE_W, tube.bottom - tube.top, 7);
        ctx.stroke();
        ctx.restore();
      }

      // glowing blue pegs
      for (const p of pegs.current) {
        const glow = 0.35 + p.lit * 0.65;
        ctx.save();
        ctx.shadowColor = WALL_CYAN_GLOW;
        ctx.shadowBlur = 6 + 22 * p.lit;
        const grad = ctx.createRadialGradient(p.x - 2, p.y - 2, 0, p.x, p.y, PEG_R);
        grad.addColorStop(0, '#e8fbff');
        grad.addColorStop(0.45, WALL_CYAN);
        grad.addColorStop(1, '#0066aa');
        ctx.beginPath();
        ctx.arc(p.x, p.y, PEG_R + p.lit * 2, 0, Math.PI * 2);
        ctx.fillStyle = grad;
        ctx.globalAlpha = glow;
        ctx.fill();
        ctx.restore();
      }

      // scoring bins + tall dividers (aligned to inner playfield, not full canvas)
      const doubledSlots = isFinalRoundRef.current;
      for (let i = 0; i < SLOTS.length; i++) {
        const x0 = slotL + i * sw,
          v = SLOTS[i],
          display = slotLabel(i, doubledSlots),
          c = slotColor(v);
        const flash = slotFlash.current?.slot === i ? slotFlash.current.t : 0;
        const sg = ctx.createLinearGradient(0, slotTop, 0, H);
        sg.addColorStop(0, c + (flash > 0 ? 'dd' : '35'));
        sg.addColorStop(0.35, c + (flash > 0 ? '99' : '18'));
        sg.addColorStop(1, '#0a1020');
        ctx.fillStyle = sg;
        if (flash > 0) {
          ctx.save();
          ctx.shadowColor = c;
          ctx.shadowBlur = 40 * flash;
        }
        roundRect(ctx, x0 + 1, slotTop + 2, sw - 2, H - slotTop - 6, 4);
        ctx.fill();
        if (flash > 0) ctx.restore();

        ctx.save();
        ctx.fillStyle = flash > 0 ? '#ffffff' : c;
        ctx.font = `900 ${Math.round(28 + flash * 18)}px system-ui`;
        if (v === 3 || flash > 0) {
          ctx.shadowColor = c;
          ctx.shadowBlur = flash > 0 ? 24 : 10;
        }
        ctx.fillText(String(display), x0 + sw / 2, slotTop + (H - slotTop) * 0.42);
        ctx.restore();
      }

      for (let i = 1; i < SLOTS.length; i++) {
        const xi = slotL + i * sw;
        const dg = ctx.createLinearGradient(0, slotTop, 0, H);
        dg.addColorStop(0, '#f0f4ff');
        dg.addColorStop(0.15, '#9aa8d8');
        dg.addColorStop(1, '#3a4878');
        ctx.fillStyle = dg;
        roundRect(ctx, xi - 3, slotTop - 2, 6, H - slotTop + 4, 3);
        ctx.fill();
        ctx.save();
        ctx.shadowColor = WALL_CYAN_GLOW;
        ctx.shadowBlur = 14;
        const cg = ctx.createRadialGradient(xi - 2, slotTop - 3, 1, xi, slotTop, DIV_R);
        cg.addColorStop(0, '#ffffff');
        cg.addColorStop(1, '#66ccff');
        ctx.beginPath();
        ctx.arc(xi, slotTop, DIV_R, 0, Math.PI * 2);
        ctx.fillStyle = cg;
        ctx.fill();
        ctx.restore();
      }

      for (const b of balls.current) {
        ctx.save();
        ctx.shadowColor = b.glow;
        ctx.shadowBlur = 32;
        const bgrad = ctx.createRadialGradient(b.x - 2, b.y - 2, 1, b.x, b.y, BALL_R);
        bgrad.addColorStop(0, '#ffffff');
        bgrad.addColorStop(0.3, b.color);
        bgrad.addColorStop(1, b.color);
        ctx.beginPath();
        ctx.arc(b.x, b.y, BALL_R, 0, Math.PI * 2);
        ctx.fillStyle = bgrad;
        ctx.fill();
        ctx.restore();
      }
      for (const p of particles.current) {
        const a = Math.max(0, p.life / p.max);
        ctx.globalAlpha = a;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.fill();
      }
      ctx.globalAlpha = 1;

      const lr = landRing.current;
      if (lr) {
        const ease = 1 - Math.pow(1 - lr.t, 2);
        for (let k = 0; k < 2; k++) {
          const tt = Math.max(0, lr.t - k * 0.15);
          if (tt <= 0) continue;
          const e = 1 - Math.pow(1 - tt, 2);
          ctx.globalAlpha = (1 - tt) * 0.9;
          ctx.lineWidth = 4 * (1 - tt) + 1;
          ctx.strokeStyle = lr.color;
          ctx.beginPath();
          ctx.arc(lr.x, lr.y, 14 + e * 130, 0, Math.PI * 2);
          ctx.stroke();
        }
        ctx.globalAlpha = (1 - ease) * 0.8;
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(lr.x, lr.y, 10 * (1 - ease) + 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
      }
    };

    const loop = () => {
      physics();
      draw();
      raf = requestAnimationFrame(loop);
    };
    loop();
    return () => cancelAnimationFrame(raf);
  }, []);

  const multiBall = ballsPerTurn > 1;
  const bonusGreen = segment === 'bonus-green';
  const bonusRed = segment === 'bonus-red';
  const showChuteStrip = chuteStripVisible(phase, chute);
  const scrollContentH =
    layout.portrait && layout.areaH > 0
      ? layout.areaH
      : layout.boardH + (showChuteStrip ? CHUTE_STRIP_H : 0) + BOARD_FOOTER_H;

  const head =
    phase === 'pick' ? (
      <>
        {bonusGreen && (
          <span className="mr-1 rounded bg-pgreen/20 px-1.5 py-px text-[9px] font-black tracking-wide text-pgreen">
            BONUS
          </span>
        )}
        {isFinalRound && (
          <span className="mr-1 rounded bg-gold/20 px-1.5 py-px text-[9px] font-black tracking-wide text-gold">
            FINAL
          </span>
        )}
        <span className="font-extrabold" style={{ color: teamColor }}>{teamName}</span>
        {bonusRed ? (
          <> — locked chute · tap Drop</>
        ) : bonusGreen ? (
          <> — pick chute · 3 green balls</>
        ) : isFinalRound ? (
          <> — pick chute · hard · 2× slots</>
        ) : multiBall ? (
          <> — pick chute · {ballsPerTurn} balls</>
        ) : (
          <> — pick chute</>
        )}
      </>
    ) : phase === 'drop' ? (
      <>
        {bonusRed && (
          <span className="mr-1 rounded bg-pred/20 px-1.5 py-px text-[9px] font-black tracking-wide text-pred">
            BONUS
          </span>
        )}
        <span className="font-extrabold" style={{ color: teamColor }}>{teamName}</span>
        {' — '}
        {bonusRed ? (
          <>3 red balls · same chute</>
        ) : (
          <>
            {multiBall ? `${ballsPerTurn} balls · ` : ''}
            {ballColor === 'green' ? 'CORRECT · green' : 'WRONG · red'}
          </>
        )}
      </>
    ) : (
      <>
        {(bonusGreen || bonusRed) && (
          <span
            className={`mr-1 rounded px-1.5 py-px text-[9px] font-black tracking-wide ${
              bonusGreen ? 'bg-pgreen/20 text-pgreen' : 'bg-pred/20 text-pred'
            }`}
          >
            BONUS
          </span>
        )}
        <span className="font-extrabold" style={{ color: teamColor }}>{teamName}</span>
        {' — '}
        {bonusGreen || bonusRed ? 'bonus result' : multiBall ? 'final turn result' : 'result'}
      </>
    );

  return (
    <div
      className={`relative flex min-h-0 flex-1 flex-col ${layout.portrait ? 'px-2 py-1' : 'px-5 py-2'}`}
    >
      <div className="flex flex-none items-center justify-center overflow-hidden px-1 py-0.5">
        <div
          className={`max-w-full overflow-hidden text-ellipsis whitespace-nowrap text-center leading-tight text-dim ${
            layout.portrait ? 'text-[11px]' : 'text-sm'
          }`}
        >
          {head}
        </div>
      </div>

      {/* bordered board scrolls as one unit — chutes sit above canvas inside the box */}
      <div
        className={`relative mx-auto flex min-h-0 w-full flex-1 flex-col ${layout.portrait ? 'max-w-[980px]' : 'max-w-[860px]'}`}
      >
        <div
          ref={areaRef}
          className={`relative min-h-0 w-full flex-1 overflow-x-hidden rounded-2xl border border-[#22d3ff]/25 shadow-[0_0_60px_rgba(34,211,255,0.12)] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden ${
            layout.portrait ? 'overflow-y-hidden' : 'overflow-y-auto'
          }`}
        >
          <div
            className="relative w-full"
            style={{ height: scrollContentH }}
          >
            {showChuteStrip && (
              <ChuteStrip
                phase={
                  segment === 'bonus-red' && phase === 'pick' ? 'drop' : phase === 'pick' ? 'pick' : 'drop'
                }
                chute={chute}
                boardW={layout.boardW}
                onPick={onPick}
              />
            )}
            <div className="relative w-full" style={{ height: layout.boardH }}>
              <canvas ref={canvasRef} className="absolute inset-0" />
            </div>

            <div className="flex items-center justify-center gap-5 px-4 py-4">
              <div className="flex flex-wrap justify-center gap-x-5 gap-y-1 text-xs text-dim">
                <span><b className="text-pgreen">● Green</b> adds slot points</span>
                <span><span className="text-pred">● Red</span> subtracts slot points</span>
              </div>
              {segment === 'bonus-red' && phase === 'pick' && chute !== null && (
                <button
                  onClick={onDrop}
                  data-testid="bonus-red-drop"
                  className="rounded-xl bg-gradient-to-r from-[#ff4d5e] to-pred px-7 py-3 text-lg font-extrabold text-white transition hover:brightness-110"
                >
                  Drop 3 red balls ▶
                </button>
              )}
              {phase === 'result' && (
                <button
                  onClick={onNext}
                  className="rounded-xl bg-gradient-to-r from-[#5b4dff] to-neon px-7 py-3 text-lg font-extrabold text-white transition hover:brightness-110"
                >
                  Next team ▶
                </button>
              )}
            </div>
          </div>
        </div>

        {phase === 'result' && lastDelta !== null && (
          <div
            className={`animate-pop pointer-events-none absolute left-1/2 top-[38%] z-10 w-[min(92%,420px)] -translate-x-1/2 -translate-y-1/2 rounded-2xl border-2 bg-panel/95 px-8 py-5 text-center backdrop-blur ${
              (multiBall ? turnDeltaTotal : lastDelta) >= 0
                ? 'border-pgreen text-pgreen shadow-[0_0_60px_rgba(33,208,122,.5)]'
                : 'border-pred text-pred shadow-[0_0_60px_rgba(255,77,94,.5)]'
            }`}
          >
            <div className="text-2xl font-black sm:text-3xl">
              {lastDelta >= 0 ? '🟢 GREEN' : '🔴 RED'}
              {multiBall && <> · {ballsPerTurn} balls</>}
            </div>
            {multiBall ? (
              <div className="mt-1 text-4xl font-black sm:text-5xl">
                Turn total: {turnDeltaTotal >= 0 ? '+' : ''}
                {turnDeltaTotal} pts
              </div>
            ) : (
              <div className="mt-1 text-4xl font-black sm:text-5xl">
                {lastDelta >= 0 ? '+' : ''}
                {lastDelta} pts
              </div>
            )}
            {multiBall && (
              <div className="mt-2 text-sm font-bold text-dim">
                Last ball: {lastDelta >= 0 ? '+' : ''}
                {lastDelta} pts
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

interface Pt {
  x: number;
  y: number;
}

function quadAt(p0: Pt, p1: Pt, p2: Pt, t: number): Pt {
  const u = 1 - t;
  return {
    x: u * u * p0.x + 2 * u * t * p1.x + t * t * p2.x,
    y: u * u * p0.y + 2 * u * t * p1.y + t * t * p2.y,
  };
}

function quadTan(p0: Pt, p1: Pt, p2: Pt, t: number): Pt {
  const u = 1 - t;
  return {
    x: 2 * u * (p1.x - p0.x) + 2 * t * (p2.x - p1.x),
    y: 2 * u * (p1.y - p0.y) + 2 * t * (p2.y - p1.y),
  };
}

function archCurve(g: Geom, side: 'left' | 'right') {
  const { W, innerL, innerR, archTop, slotTop, TOP } = g;
  const edgeL = innerL + WALL_INSET;
  const edgeR = innerR - WALL_INSET;
  if (side === 'left') {
    return {
      p0: { x: edgeL, y: slotTop + 8 },
      p1: { x: edgeL - W * 0.045, y: (TOP + slotTop) * 0.52 },
      p2: { x: edgeL + 5, y: archTop },
    };
  }
  return {
    p0: { x: edgeR, y: slotTop + 8 },
    p1: { x: edgeR + W * 0.045, y: (TOP + slotTop) * 0.52 },
    p2: { x: edgeR - 5, y: archTop },
  };
}

function archBoundaryX(g: Geom, side: 'left' | 'right', y: number): number {
  const { p0, p1, p2 } = archCurve(g, side);
  if (y >= p0.y) return p0.x;
  if (y <= p2.y) return p2.x;
  let lo = 0;
  let hi = 1;
  for (let i = 0; i < 28; i++) {
    const mid = (lo + hi) * 0.5;
    if (quadAt(p0, p1, p2, mid).y > y) lo = mid;
    else hi = mid;
  }
  return quadAt(p0, p1, p2, (lo + hi) * 0.5).x;
}

function archBoundaryNormal(g: Geom, side: 'left' | 'right', y: number): Pt {
  const { p0, p1, p2 } = archCurve(g, side);
  const yClamped = Math.max(p2.y, Math.min(p0.y, y));
  let lo = 0;
  let hi = 1;
  for (let i = 0; i < 28; i++) {
    const mid = (lo + hi) * 0.5;
    if (quadAt(p0, p1, p2, mid).y > yClamped) lo = mid;
    else hi = mid;
  }
  const t = (lo + hi) * 0.5;
  const tan = quadTan(p0, p1, p2, t);
  const len = Math.hypot(tan.x, tan.y) || 1;
  let nx = tan.y / len;
  let ny = -tan.x / len;
  if (side === 'left' && nx < 0) {
    nx = -nx;
    ny = -ny;
  }
  if (side === 'right' && nx > 0) {
    nx = -nx;
    ny = -ny;
  }
  return { x: nx, y: ny };
}

function traceArchFrame(ctx: CanvasRenderingContext2D, g: Geom) {
  const l = archCurve(g, 'left');
  const r = archCurve(g, 'right');
  ctx.beginPath();
  ctx.moveTo(l.p0.x, l.p0.y);
  ctx.quadraticCurveTo(l.p1.x, l.p1.y, l.p2.x, l.p2.y);
  ctx.lineTo(r.p2.x, r.p2.y);
  ctx.quadraticCurveTo(r.p1.x, r.p1.y, r.p0.x, r.p0.y);
}

function fillPlayfield(ctx: CanvasRenderingContext2D, g: Geom) {
  const { W, H, TOP, slotTop, innerL, innerR } = g;
  const l = archCurve(g, 'left');
  const r = archCurve(g, 'right');

  const gutter = ctx.createLinearGradient(0, TOP, 0, H);
  gutter.addColorStop(0, '#0a1e42');
  gutter.addColorStop(0.5, '#081530');
  gutter.addColorStop(1, '#050d22');
  ctx.fillStyle = gutter;
  ctx.fillRect(0, TOP - 20, innerL + 2, H - TOP + 24);
  ctx.fillRect(innerR - 2, TOP - 20, W - innerR + 2, H - TOP + 24);

  const panel = ctx.createLinearGradient(0, TOP - 14, 0, H);
  panel.addColorStop(0, '#0c1e42');
  panel.addColorStop(0.35, '#081530');
  panel.addColorStop(1, '#050d22');
  ctx.fillStyle = panel;
  ctx.beginPath();
  ctx.moveTo(l.p0.x, l.p0.y);
  ctx.quadraticCurveTo(l.p1.x, l.p1.y, l.p2.x, l.p2.y);
  ctx.lineTo(r.p2.x, r.p2.y);
  ctx.quadraticCurveTo(r.p1.x, r.p1.y, r.p0.x, r.p0.y);
  ctx.lineTo(r.p0.x, H);
  ctx.lineTo(l.p0.x, H);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = 'rgba(34,211,255,0.06)';
  ctx.fillRect(l.p0.x, TOP, r.p0.x - l.p0.x, slotTop - TOP);
}

function separateBalls(list: Ball[], tubeReleaseY: number) {
  for (let i = 0; i < list.length; i++) {
    for (let j = i + 1; j < list.length; j++) {
      const a = list[i];
      const b = list[j];
      if (a.landed || b.landed) continue;
      if (a.y < tubeReleaseY || b.y < tubeReleaseY) continue;
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const dist = Math.hypot(dx, dy);
      const min = BALL_R * 2;
      if (dist >= min || dist <= 0) continue;
      const nx = dx / dist;
      const ny = dy / dist;
      const ov = (min - dist) / 2;
      a.x -= nx * ov;
      a.y -= ny * ov;
      b.x += nx * ov;
      b.y += ny * ov;
    }
  }
}

function simulateBall(
  b: Ball,
  g: Geom,
  pegs: Peg[],
  onSettle: (slot: number) => void,
) {
  b.aliveFrames += 1;
  const VY_CAP = 3.2 * Math.sqrt(g.gravityScale * DROP_SPEED);
  const grav = 0.12 * g.gravityScale * DROP_SPEED;
  b.vy += grav;
  if (b.vy > VY_CAP) b.vy = VY_CAP;
  b.vx *= 0.992;
  b.vy *= 0.999;
  b.x += b.vx;
  b.y += b.vy;

  const tube = dropTube(g);
  const inDropTube = b.y < tube.releaseY;
  if (inDropTube) {
    b.x = slotCenterX(g, b.chute);
    b.vx = 0;
  } else {
    resolveWallBounds(b, g);
  }

  for (const p of pegs) {
    const dx = b.x - p.x;
    const dy = b.y - p.y;
    const dist = Math.hypot(dx, dy);
    const min = PEG_R + BALL_R;
    if (dist < min) {
      const nx = dx / (dist || 1);
      const ny = dy / (dist || 1);
      const ov = min - dist;
      b.x += nx * ov;
      b.y += ny * ov;
      const dot = b.vx * nx + b.vy * ny;
      b.vx = (b.vx - 2 * dot * nx) * 0.76 + (Math.random() * 0.9 - 0.45);
      b.vy = (b.vy - 2 * dot * ny) * 0.76;
      if (ny < -0.3 && b.vy < 0) b.vy -= 0.35;
      if (b.vy < 0.25 && b.vy >= 0) b.vy = 0.28;
      p.lit = 1;
    }
  }

  const { slotL, sw } = g;
  const binTop = g.slotTop;
  for (let i = 1; i < SLOTS.length; i++) {
    const xi = slotL + i * sw;
    const dx = b.x - xi;
    const dy = b.y - binTop;
    const dist = Math.hypot(dx, dy);
    const min = DIV_R + BALL_R;
    if (b.y < binTop + DIV_R && dist < min) {
      const nx = dx / (dist || 1);
      const ny = dy / (dist || 1);
      const ov = min - dist;
      b.x += nx * ov;
      b.y += ny * ov;
      const dot = b.vx * nx + b.vy * ny;
      b.vx = (b.vx - 2 * dot * nx) * 0.8 + (Math.random() * 1.4 - 0.7);
      b.vy = (b.vy - 2 * dot * ny) * 0.8;
    }
    if (b.y > binTop && Math.abs(b.x - xi) < BALL_R) {
      const side = b.x < xi ? -1 : 1;
      b.x = xi + side * BALL_R;
      b.vx = side * Math.abs(b.vx) * 0.5;
    }
  }

  const floorY = g.H - BALL_R - 5;
  if (b.y > floorY) {
    b.y = floorY;
    b.vy = -b.vy * 0.38;
    b.vx *= 0.72;
    if (Math.abs(b.vy) < 0.35) b.vy = 0;
  }

  if (b.y < g.slotTop - BALL_R) {
    if (Math.hypot(b.vx, b.vy) < 0.85) {
      b.stuckFrames += 1;
      if (b.stuckFrames > 28) {
        b.vy += 1.6;
        b.vx += (Math.random() * 2 - 1) * 1.6;
        b.stuckFrames = 0;
      }
    } else {
      b.stuckFrames = 0;
    }
  } else {
    b.stuckFrames = 0;
  }

  if (!b.landed && b.aliveFrames > 1400 && b.y < floorY - 2) {
    b.y = floorY;
    b.vy = 0;
    b.vx *= 0.5;
  }

  const inBin = b.y >= binTop + BALL_R * 0.6;
  const onFloor = b.y >= floorY - 1;
  const slow = Math.abs(b.vy) < 0.28 && Math.abs(b.vx) < 0.35;
  const notRising = b.vy >= -0.08;
  const settled = inBin && onFloor && slow && notRising;
  b.restFrames = settled ? b.restFrames + 1 : 0;
  if (!b.landed && b.restFrames > REST_FRAMES) {
    b.landed = true;
    let si = Math.floor((b.x - slotL) / sw);
    si = Math.max(0, Math.min(SLOTS.length - 1, si));
    onSettle(si);
  }
}

function resolveWallBounds(b: Ball, g: Geom) {
  const ySample = Math.max(g.archTop, Math.min(g.slotTop + 8, b.y));
  const leftX = archBoundaryX(g, 'left', ySample);
  const rightX = archBoundaryX(g, 'right', ySample);

  if (b.x < leftX + BALL_R) {
    const n = archBoundaryNormal(g, 'left', ySample);
    const ov = leftX + BALL_R - b.x;
    b.x += n.x * ov;
    b.y += n.y * ov;
    const dot = b.vx * n.x + b.vy * n.y;
    if (dot < 0) {
      b.vx = (b.vx - 2 * dot * n.x) * 0.7 + 0.35;
      b.vy = (b.vy - 2 * dot * n.y) * 0.7;
    }
  }

  if (b.x > rightX - BALL_R) {
    const n = archBoundaryNormal(g, 'right', ySample);
    const ov = b.x - (rightX - BALL_R);
    b.x += n.x * ov;
    b.y += n.y * ov;
    const dot = b.vx * n.x + b.vy * n.y;
    if (dot < 0) {
      b.vx = (b.vx - 2 * dot * n.x) * 0.7 - 0.35;
      b.vy = (b.vy - 2 * dot * n.y) * 0.7;
    }
  }

  if (b.y < g.archTop + BALL_R && b.x > leftX && b.x < rightX) {
    b.y = g.archTop + BALL_R;
    b.vy = Math.abs(b.vy) * 0.62;
    b.vx *= 0.9;
  }

  if (b.y >= g.slotTop) {
    if (b.x < g.slotL + BALL_R) {
      b.x = g.slotL + BALL_R;
      b.vx = Math.abs(b.vx) * 0.65 + 0.25;
    }
    if (b.x > g.slotR - BALL_R) {
      b.x = g.slotR - BALL_R;
      b.vx = -Math.abs(b.vx) * 0.65 - 0.25;
    }
  }
}
