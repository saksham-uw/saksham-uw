#!/usr/bin/env node
/**
 * Builds an isometric contribution skyline SVG, then lets Kirby wander it.
 *
 * GitHub README images can't run JS, so the wander is baked in at generate
 * time. Each run picks a new path (idle, local hops, leaps) so it feels alive
 * instead of touring the year in order.
 */

const USERNAME = process.env.USERNAME || "saksham-uw";
const OUT_PATH = new URL("../assets/contributions.svg", import.meta.url);

const TILE_W = 18;
const TILE_H = 9;
const BLOCK = 0.78;
const BASE_H = 2.2;
const MAX_H = 92;
const PLATFORM_Z = 12;
const WANDER_STEPS = 64;
const KIRBY_R = 6.4;
const KIRBY_BODY = "#ffc2e9";
const KIRBY_EYE = "#3e4e65";
const FIELD = "#001744";
const ACCENT = "#F41B4D";

const LEVEL_TOP = {
  0: "#27040c",
  1: "#53091a",
  2: "#7f0e28",
  3: "#b51439",
  4: ACCENT,
};

const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

function makeRng(seedText) {
  if (!seedText) {
    return Math.random;
  }
  let h = 2166136261;
  for (const ch of String(seedText)) {
    h ^= ch.charCodeAt(0);
    h = Math.imul(h, 16777619);
  }
  let t = h >>> 0;
  return () => {
    t += 0x6d2b79f5;
    let r = t;
    r = Math.imul(r ^ (r >>> 15), r | 1);
    r ^= r + Math.imul(r ^ (r >>> 7), r | 61);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

function shade(hex, factor) {
  const n = parseInt(hex.slice(1), 16);
  const clamp = (v) => Math.max(0, Math.min(255, Math.round(v)));
  const r = clamp(((n >> 16) & 255) * factor);
  const g = clamp(((n >> 8) & 255) * factor);
  const b = clamp((n & 255) * factor);
  return `#${[r, g, b].map((v) => v.toString(16).padStart(2, "0")).join("")}`;
}

function project(x, y, z) {
  return {
    x: (x - y) * (TILE_W / 2),
    y: (x + y) * (TILE_H / 2) - z,
  };
}

function fmt(n) {
  return Number(n).toFixed(2);
}

function poly(points, fill) {
  const d = points.map((p) => `${fmt(p.x)},${fmt(p.y)}`).join(" ");
  return `<polygon points="${d}" fill="${fill}"/>`;
}

function vecLen(v) {
  return Math.hypot(v[0], v[1], v[2]) || 1;
}

function vecNorm(v) {
  const l = vecLen(v);
  return [v[0] / l, v[1] / l, v[2] / l];
}

function vecAdd(a, b) {
  return [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
}

function vecSub(a, b) {
  return [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
}

function vecCross(a, b) {
  return [
    a[1] * b[2] - a[2] * b[1],
    a[2] * b[0] - a[0] * b[2],
    a[0] * b[1] - a[1] * b[0],
  ];
}

function vecDot(a, b) {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}

function icosphere(subdiv) {
  const t = (1 + Math.sqrt(5)) / 2;
  let verts = [
    [-1, t, 0],
    [1, t, 0],
    [-1, -t, 0],
    [1, -t, 0],
    [0, -1, t],
    [0, 1, t],
    [0, -1, -t],
    [0, 1, -t],
    [t, 0, -1],
    [t, 0, 1],
    [-t, 0, -1],
    [-t, 0, 1],
  ].map(vecNorm);
  let faces = [
    [0, 11, 5],
    [0, 5, 1],
    [0, 1, 7],
    [0, 7, 10],
    [0, 10, 11],
    [1, 5, 9],
    [5, 11, 4],
    [11, 10, 2],
    [10, 7, 6],
    [7, 1, 8],
    [3, 9, 4],
    [3, 4, 2],
    [3, 2, 6],
    [3, 6, 8],
    [3, 8, 9],
    [4, 9, 5],
    [2, 4, 11],
    [6, 2, 10],
    [8, 6, 7],
    [9, 8, 1],
  ];
  const midCache = new Map();
  const midpoint = (a, b) => {
    const key = a < b ? `${a}:${b}` : `${b}:${a}`;
    if (midCache.has(key)) return midCache.get(key);
    const i = verts.length;
    verts.push(vecNorm(vecAdd(verts[a], verts[b])));
    midCache.set(key, i);
    return i;
  };
  for (let s = 0; s < subdiv; s++) {
    const next = [];
    for (const [a, b, c] of faces) {
      const ab = midpoint(a, b);
      const bc = midpoint(b, c);
      const ca = midpoint(c, a);
      next.push([a, ab, ca], [b, bc, ab], [c, ca, bc], [ab, bc, ca]);
    }
    faces = next;
    midCache.clear();
  }
  return { verts, faces };
}

function rotateX(v, angle) {
  const c = Math.cos(angle);
  const s = Math.sin(angle);
  return [v[0], v[1] * c - v[2] * s, v[1] * s + v[2] * c];
}

function lowPolySphere(cx, cy, cz, radius, hex, subdiv) {
  const { verts, faces } = icosphere(subdiv);
  const light = vecNorm([-0.42, 0.78, 0.46]);
  const tilt = -0.32;
  const tris = [];
  for (const [ia, ib, ic] of faces) {
    const a = rotateX(
      [verts[ia][0] * radius + cx, verts[ia][1] * radius + cy, verts[ia][2] * radius + cz],
      tilt,
    );
    const b = rotateX(
      [verts[ib][0] * radius + cx, verts[ib][1] * radius + cy, verts[ib][2] * radius + cz],
      tilt,
    );
    const c = rotateX(
      [verts[ic][0] * radius + cx, verts[ic][1] * radius + cy, verts[ic][2] * radius + cz],
      tilt,
    );
    const n = vecNorm(vecCross(vecSub(b, a), vecSub(c, a)));
    if (n[2] < 0.02) continue;
    const lit = 0.74 + 0.34 * Math.max(0, vecDot(n, light));
    const z = (a[2] + b[2] + c[2]) / 3;
    tris.push({
      z,
      fill: shade(hex, lit),
      points: [
        { x: a[0], y: -a[1] },
        { x: b[0], y: -b[1] },
        { x: c[0], y: -c[1] },
      ],
    });
  }
  tris.sort((left, right) => left.z - right.z);
  return tris.map((tri) => poly(tri.points, tri.fill)).join("");
}

function isoBox(x0, y0, x1, y1, z0, z1, top) {
  const T = (x, y, z) => project(x, y, z);
  const left = shade(top, 0.7);
  const right = shade(top, 0.46);
  return [
    poly([T(x0, y1, z1), T(x1, y1, z1), T(x1, y1, z0), T(x0, y1, z0)], left),
    poly([T(x1, y0, z1), T(x1, y1, z1), T(x1, y1, z0), T(x1, y0, z0)], right),
    poly([T(x0, y0, z1), T(x1, y0, z1), T(x1, y1, z1), T(x0, y1, z1)], top),
  ].join("");
}

function parseUtc(date) {
  return new Date(`${date}T00:00:00Z`);
}

async function fetchContributions(user) {
  const url = `https://github-contributions-api.jogruber.de/v4/${user}?y=last`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Contribution API failed: ${res.status} ${url}`);
  }
  return res.json();
}

function toWeeks(days) {
  const weeks = [];
  for (let i = 0; i < days.length; i += 7) {
    weeks.push(days.slice(i, i + 7));
  }
  return weeks;
}

function monthLabels(weeks) {
  const labels = [];
  let lastMonth = -1;
  weeks.forEach((week, i) => {
    const first = week.find(Boolean);
    if (!first) return;
    const month = parseUtc(first.date).getUTCMonth();
    if (month !== lastMonth) {
      labels.push({ week: i, month: MONTHS[month] });
      lastMonth = month;
    }
  });
  return labels.slice(-11);
}

function escapeXml(s) {
  return String(s)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function expandBounds(bounds, x, y, z) {
  const p = project(x, y, z);
  bounds.minX = Math.min(bounds.minX, p.x);
  bounds.minY = Math.min(bounds.minY, p.y);
  bounds.maxX = Math.max(bounds.maxX, p.x);
  bounds.maxY = Math.max(bounds.maxY, p.y);
}

function pickWeighted(items, weightFn, random) {
  if (items.length === 0) return null;
  let total = 0;
  const weights = items.map((item) => {
    const w = Math.max(0.02, weightFn(item));
    total += w;
    return w;
  });
  let r = random() * total;
  for (let i = 0; i < items.length; i++) {
    r -= weights[i];
    if (r <= 0) return items[i];
  }
  return items[items.length - 1];
}

function neighbors(grid, cell, radius) {
  const out = [];
  for (let dw = -radius; dw <= radius; dw++) {
    for (let dd = -radius; dd <= radius; dd++) {
      if (dw === 0 && dd === 0) continue;
      const next = grid[cell.w + dw]?.[cell.d + dd];
      if (next) out.push(next);
    }
  }
  return out;
}

function wander(grid, random) {
  const flat = grid.flat();
  const grassy = flat.filter((c) => c.count > 0);
  const recent = grassy.filter((c) => c.w >= grid.length * 0.35);
  const start =
    pickWeighted(
      recent.length ? recent : grassy.length ? grassy : flat,
      (c) => (c.count + 1) ** 1.35,
      random,
    ) || flat[0];

  const steps = [{ cell: start, kind: "start" }];
  let current = start;
  const recentIds = [];

  for (let i = 0; i < WANDER_STEPS; i++) {
    const roll = random();
    if (roll < 0.26) {
      steps.push({ cell: current, kind: "idle", wait: 1.4 + random() * 2.1 });
      continue;
    }
    if (roll < 0.32) {
      steps.push({ cell: current, kind: "boing" });
      continue;
    }

    const leap = roll > 0.84;
    const radius = leap ? 2 + Math.floor(random() * 4) : 1;
    let candidates = neighbors(grid, current, radius);
    if (!leap) {
      candidates = candidates.filter(
        (c) => Math.max(Math.abs(c.w - current.w), Math.abs(c.d - current.d)) === 1,
      );
      if (candidates.length === 0) {
        candidates = neighbors(grid, current, 2);
      }
    }
    if (candidates.length === 0) {
      steps.push({ cell: current, kind: "idle", wait: 0.6 });
      continue;
    }

    const next = pickWeighted(
      candidates,
      (c) => {
        const revisit = recentIds.includes(`${c.w}:${c.d}`) ? 0.25 : 1;
        const grass = (c.count + 1) ** (leap ? 1.6 : 1.15);
        return grass * revisit;
      },
      random,
    );
    steps.push({ cell: next, kind: leap ? "leap" : "hop" });
    current = next;
    recentIds.push(`${current.w}:${current.d}`);
    if (recentIds.length > 8) recentIds.shift();
  }

  if (steps[steps.length - 1].cell !== start) {
    steps.push({ cell: start, kind: "leap" });
  }
  return steps;
}

function kirbyPose(x, y, face, stretchX, stretchY) {
  return `translate(${fmt(x)}px, ${fmt(y)}px) scale(${fmt(face * stretchX)}, ${fmt(stretchY)})`;
}

function shadowPose(x, y, s) {
  return `translate(${fmt(x)}px, ${fmt(y)}px) scale(${fmt(s)})`;
}

function apexBetween(a, b, lift) {
  return {
    x: (a.x + b.x) / 2,
    y: Math.min(a.y, b.y) - lift,
  };
}

function buildKirbyTimeline(steps, random) {
  const frames = [];
  let t = 0;
  let face = 1;
  const first = steps[0].cell;

  const push = (dt, kirby, shadow) => {
    t += dt;
    frames.push({ t, kirby, shadow });
  };

  push(0, kirbyPose(first.x, first.y, face, 1, 1), shadowPose(first.x, first.y, 1));

  for (let i = 1; i < steps.length; i++) {
    const from = steps[i - 1].cell;
    const to = steps[i].cell;
    const kind = steps[i].kind;

    if (kind === "idle") {
      const wait = steps[i].wait ?? 0.8;
      const bobs = 1 + Math.floor(random() * 2);
      for (let b = 0; b < bobs; b++) {
        push(
          wait / (bobs * 2),
          kirbyPose(to.x, to.y - 1.1, face, 1.03, 0.97),
          shadowPose(to.x, to.y, 0.94),
        );
        push(
          wait / (bobs * 2),
          kirbyPose(to.x, to.y, face, 1, 1),
          shadowPose(to.x, to.y, 1),
        );
      }
      continue;
    }

    const dx = to.x - from.x;
    const dist = Math.hypot(dx, to.y - from.y);
    if (Math.abs(dx) > 0.4) face = dx >= 0 ? 1 : -1;

    const inPlace = kind === "boing" || (to.w === from.w && to.d === from.d);
    const lift = inPlace
      ? 8 + random() * 4
      : (kind === "leap" ? 18 : 10) + dist * 0.18 + Math.abs(from.h - to.h) * 0.08;
    const air = inPlace ? 0.42 + random() * 0.12 : 0.48 + Math.min(0.55, dist / 160);
    const peak = inPlace
      ? { x: from.x, y: from.y - lift }
      : apexBetween(from, to, lift);

    push(0.14, kirbyPose(from.x, from.y, face, 1.08, 0.9), shadowPose(from.x, from.y, 1.06));
    push(
      air,
      kirbyPose(peak.x, peak.y, face, 0.94, 1.08),
      shadowPose((from.x + to.x) / 2, (from.y + to.y) / 2, 0.7),
    );
    push(air, kirbyPose(to.x, to.y, face, 1.1, 0.9), shadowPose(to.x, to.y, 1.06));
    push(0.18, kirbyPose(to.x, to.y, face, 1, 1), shadowPose(to.x, to.y, 1));
  }

  push(0.8, kirbyPose(first.x, first.y, face, 1, 1), shadowPose(first.x, first.y, 1));
  return { frames, duration: t };
}

function keyframes(name, frames, pick) {
  const total = frames[frames.length - 1].t || 1;
  const lines = [];
  let lastPct = -1;
  for (const frame of frames) {
    let pct = (frame.t / total) * 100;
    if (pct - lastPct < 0.04) pct = lastPct + 0.04;
    if (pct > 100) pct = 100;
    lastPct = pct;
    lines.push(`    ${fmt(pct)}% { transform: ${pick(frame)}; }`);
  }
  return `@keyframes ${name} {\n${lines.join("\n")}\n  }`;
}

function kirbyGraphic() {
  const r = KIRBY_R;
  const body = lowPolySphere(0, 0.2, 0, r, KIRBY_BODY, 2);
  const armL = lowPolySphere(-r * 0.78, r * 0.22, -r * 0.12, r * 0.42, KIRBY_BODY, 1);
  const armR = lowPolySphere(r * 0.74, r * 0.24, -r * 0.12, r * 0.42, KIRBY_BODY, 1);
  const eyeW = r * 0.155;
  const eyeH = r * 0.44;
  const eyeX = r * 0.24;
  const eyeY = -r * 0.02;
  return `
  <g id="kirby-shadow">
    <ellipse cx="0" cy="1.2" rx="${fmt(r * 0.78)}" ry="${fmt(r * 0.32)}" fill="#000000" opacity="0.26"/>
  </g>
  <g id="kirby-walker">
    <g transform="translate(0 ${fmt(-r)})">
      <g id="kirby-sprite">
        ${armL}${armR}${body}
        <g id="kirby-eyes">
          <ellipse cx="${fmt(-eyeX)}" cy="${fmt(eyeY)}" rx="${fmt(eyeW)}" ry="${fmt(eyeH)}" fill="${KIRBY_EYE}" transform="rotate(9 ${fmt(-eyeX)} ${fmt(eyeY)})"/>
          <ellipse cx="${fmt(eyeX)}" cy="${fmt(eyeY)}" rx="${fmt(eyeW)}" ry="${fmt(eyeH)}" fill="${KIRBY_EYE}" transform="rotate(-9 ${fmt(eyeX)} ${fmt(eyeY)})"/>
        </g>
      </g>
    </g>
  </g>`;
}

function render(data, random) {
  const days = data.contributions;
  const weeks = toWeeks(days);
  const weekCount = weeks.length;
  const maxCount = Math.max(1, ...days.map((d) => d.count));
  const total = days.reduce((sum, d) => sum + d.count, 0);
  const heightOf = (count) => {
    if (count <= 0) return BASE_H;
    return BASE_H + (Math.sqrt(count) / Math.sqrt(maxCount)) * MAX_H;
  };

  const inset = (1 - BLOCK) / 2;
  const parts = [];
  const bounds = {
    minX: Infinity,
    minY: Infinity,
    maxX: -Infinity,
    maxY: -Infinity,
  };

  expandBounds(bounds, -1.2, -1.2, -PLATFORM_Z);
  expandBounds(bounds, weekCount + 0.2, 8.4, -PLATFORM_Z);
  expandBounds(bounds, -1.2, 8.4, MAX_H);
  expandBounds(bounds, weekCount + 0.2, -1.2, MAX_H);

  parts.push(
    isoBox(-0.9, -0.9, weekCount + 0.9, 7.9, -PLATFORM_Z, 0, FIELD),
  );

  const grid = weeks.map((week, w) =>
    week.map((cell, d) => {
      const h = heightOf(cell.count);
      const top = project(w + 0.5, d + 0.5, h);
      const x0 = w + inset;
      const y0 = d + inset;
      const x1 = w + 1 - inset;
      const y1 = d + 1 - inset;
      parts.push(isoBox(x0, y0, x1, y1, 0, h, LEVEL_TOP[cell.level] ?? LEVEL_TOP[0]));
      return { w, d, h, x: top.x, y: top.y, count: cell.count, level: cell.level };
    }),
  );

  const walk = wander(grid, random);
  const timeline = buildKirbyTimeline(walk, random);
  const start = walk[0].cell;
  bounds.minY = Math.min(bounds.minY, start.y - 56);

  for (const label of monthLabels(weeks)) {
    const p = project(label.week + 0.35, 8.35, 0);
    parts.push(
      `<text x="${fmt(p.x)}" y="${fmt(p.y + 16)}" fill="#8ea0c8" font-size="12" font-family="ui-sans-serif, system-ui, -apple-system, Segoe UI, sans-serif">${label.month}</text>`,
    );
    bounds.maxY = Math.max(bounds.maxY, p.y + 24);
  }

  const weekdayMarks = [
    { day: 1, text: "Mon" },
    { day: 3, text: "Wed" },
    { day: 5, text: "Fri" },
  ];
  for (const mark of weekdayMarks) {
    const p = project(-0.35, mark.day + 0.5, 0);
    parts.push(
      `<text x="${fmt(p.x - 8)}" y="${fmt(p.y + 3)}" text-anchor="end" fill="#6d7da3" font-size="10" font-family="ui-sans-serif, system-ui, -apple-system, Segoe UI, sans-serif">${mark.text}</text>`,
    );
    bounds.minX = Math.min(bounds.minX, p.x - 36);
  }

  const padX = 36;
  const padTop = 56;
  const padBottom = 16;
  const minX = bounds.minX - padX;
  const minY = bounds.minY - padTop;
  const width = bounds.maxX - bounds.minX + padX * 2;
  const height = bounds.maxY - bounds.minY + padTop + padBottom;
  const countLabel = escapeXml(
    `${total.toLocaleString("en-US")} contributions in the last year`,
  );
  const dur = fmt(timeline.duration);

  const legend = [0, 1, 2, 3, 4]
    .map((level, i) => {
      const x = minX + width - 28 - (5 - i) * 14;
      const y = minY + 18;
      return `<rect x="${fmt(x)}" y="${fmt(y)}" width="11" height="11" rx="2" fill="${LEVEL_TOP[level]}"/>`;
    })
    .join("");

  const css = `
  #kirby-shadow {
    transform: ${shadowPose(start.x, start.y, 1)};
    animation: kirby-shadow ${dur}s linear infinite;
    transform-origin: 0px 0px;
  }
  #kirby-walker {
    transform: ${kirbyPose(start.x, start.y, 1, 1, 1)};
    animation: kirby-walk ${dur}s linear infinite;
    transform-origin: 0px 0px;
  }
  #kirby-sprite {
    animation: kirby-breathe 2.6s ease-in-out infinite;
    transform-box: fill-box;
    transform-origin: center bottom;
  }
  #kirby-eyes {
    animation: kirby-blink 5.2s ease-in-out infinite;
    transform-box: fill-box;
    transform-origin: center;
  }
  ${keyframes("kirby-walk", timeline.frames, (f) => f.kirby)}
  ${keyframes("kirby-shadow", timeline.frames, (f) => f.shadow)}
  @keyframes kirby-breathe {
    0%, 100% { transform: translateY(0) scale(1, 1); }
    50% { transform: translateY(0.35px) scale(1.03, 0.97); }
  }
  @keyframes kirby-blink {
    0%, 90%, 97%, 100% { transform: scaleY(1); }
    93%, 95% { transform: scaleY(0.08); }
  }`;

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="${fmt(minX)} ${fmt(minY)} ${fmt(width)} ${fmt(height)}" role="img" aria-label="${countLabel}">
  <title>Kirby hopping a random path across the contribution skyline</title>
  <style>${css}
  </style>
  <rect x="${fmt(minX)}" y="${fmt(minY)}" width="${fmt(width)}" height="${fmt(height)}" rx="18" fill="${FIELD}"/>
  <text x="${fmt(minX + 28)}" y="${fmt(minY + 28)}" fill="#e8eef8" font-size="15" font-weight="600" font-family="ui-sans-serif, system-ui, -apple-system, Segoe UI, sans-serif">${countLabel}</text>
  ${legend}
  ${parts.join("\n  ")}
  ${kirbyGraphic()}
</svg>
`;
}

const random = makeRng(process.env.SEED);
const data = await fetchContributions(USERNAME);
const svg = render(data, random);
const fs = await import("node:fs/promises");
await fs.mkdir(new URL("../assets/", import.meta.url), { recursive: true });
await fs.writeFile(OUT_PATH, svg);
console.log(`Wrote ${OUT_PATH.pathname} (${svg.length} bytes)`);
