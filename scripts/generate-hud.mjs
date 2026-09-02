#!/usr/bin/env node
/**
 * Cyberpunk HUD panels that sit with the contribution skyline.
 */

const FIELD = "#001744";
const ACCENT = "#F41B4D";
const TEXT = "#e8eef8";
const MUTED = "#8ea0c8";
const FONT =
  "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, Liberation Mono, monospace";

function esc(s) {
  return String(s)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function scanlines(width, height) {
  const lines = [];
  for (let y = 0; y < height; y += 3) {
    lines.push(
      `<rect x="0" y="${y}" width="${width}" height="1" fill="#ffffff" opacity="0.035"/>`,
    );
  }
  return lines.join("");
}

function corners(x, y, w, h, len = 14) {
  const c = ACCENT;
  return `
    <path d="M${x} ${y + len} V${y} H${x + len}" fill="none" stroke="${c}" stroke-width="1.6"/>
    <path d="M${x + w - len} ${y} H${x + w} V${y + len}" fill="none" stroke="${c}" stroke-width="1.6"/>
    <path d="M${x} ${y + h - len} V${y + h} H${x + len}" fill="none" stroke="${c}" stroke-width="1.6"/>
    <path d="M${x + w - len} ${y + h} H${x + w} V${y + h - len}" fill="none" stroke="${c}" stroke-width="1.6"/>
  `;
}

export function renderHud({ total = 0 } = {}) {
  const count = Number(total).toLocaleString("en-US");
  const w = 900;
  const h = 148;
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" role="img" aria-label="saksham.sharma status monitor">
  <title>saksham.sharma // uplink</title>
  <style>
    .pulse { animation: pulse 1.8s ease-in-out infinite; }
    .scan { animation: scan 5.5s linear infinite; }
    @keyframes pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.35; }
    }
    @keyframes scan {
      from { transform: translateY(-30px); }
      to { transform: translateY(${h}px); }
    }
  </style>
  <rect width="${w}" height="${h}" rx="4" fill="${FIELD}"/>
  ${corners(8, 8, w - 16, h - 16)}
  <rect x="8" y="8" width="${w - 16}" height="${h - 16}" fill="none" stroke="${ACCENT}" stroke-opacity="0.28" stroke-width="1"/>
  ${scanlines(w, h)}
  <rect class="scan" x="10" y="10" width="${w - 20}" height="10" fill="${ACCENT}" opacity="0.08"/>

  <text x="28" y="36" fill="${MUTED}" font-size="11" letter-spacing="3.2" font-family="${FONT}">NODE // SAKSHAM.SHARMA</text>
  <circle class="pulse" cx="848" cy="31" r="5" fill="${ACCENT}"/>
  <text x="860" y="36" fill="${ACCENT}" font-size="11" letter-spacing="2.4" font-family="${FONT}">ONLINE</text>

  <text x="28" y="72" fill="${TEXT}" font-size="28" font-weight="700" letter-spacing="1.6" font-family="${FONT}">24 Y.O. SOFTWARE ENGINEER</text>
  <text x="28" y="96" fill="${MUTED}" font-size="13" letter-spacing="1.4" font-family="${FONT}">CTO @ ULTRASSURE  ·  TORONTO  ·  WATERLOO CS / AI</text>
  <text x="28" y="122" fill="${TEXT}" font-size="12" letter-spacing="1.8" font-family="${FONT}">UPLINK  ${esc(count)} COMMITS   I MAKE RANDOM COOL STUFF</text>
</svg>
`;
}

export function renderOps() {
  const w = 900;
  const h = 268;
  const modules = [
    ["TYPESCRIPT", 0.92],
    ["PYTHON", 0.84],
    ["C / ESP32", 0.72],
    ["REACT / NEXT", 0.9],
    ["NODE", 0.86],
    ["AWS", 0.78],
    ["POSTGRES", 0.74],
    ["LLM / AI", 0.82],
  ];
  const units = [
    ["ULTRASSURE", "INSURANCE.CONTRACT.AI", "LIVE"],
    ["HERMES", "ESP32.GIT.DECK", "LAB"],
    ["THEMIS", "DOCUMENT.REDLINE", "LAB"],
    ["WHY-BUDDY", "FEYNMAN.AGENTS", "LAB"],
    ["SAKSHAM.PRO", "NEWTON.OS.PORTFOLIO", "LIVE"],
  ];

  const moduleRows = modules
    .map(([name, level], i) => {
      const y = 62 + i * 24;
      const barW = 210 * level;
      return `
        <text x="28" y="${y}" fill="${MUTED}" font-size="11" letter-spacing="1.6" font-family="${FONT}">${name}</text>
        <rect x="168" y="${y - 11}" width="210" height="10" fill="#0a2258"/>
        <rect x="168" y="${y - 11}" width="${barW.toFixed(1)}" height="10" fill="${ACCENT}"/>
        <text x="388" y="${y}" fill="${ACCENT}" font-size="10" letter-spacing="1.2" font-family="${FONT}">${Math.round(level * 100)}%</text>
      `;
    })
    .join("");

  const unitRows = units
    .map(([name, klass, state], i) => {
      const y = 62 + i * 36;
      const live = state === "LIVE";
      return `
        <text x="470" y="${y}" fill="${TEXT}" font-size="13" letter-spacing="1.4" font-family="${FONT}">${name}</text>
        <text x="470" y="${y + 16}" fill="${MUTED}" font-size="10" letter-spacing="1.6" font-family="${FONT}">${klass}</text>
        <circle cx="820" cy="${y}" r="4" fill="${live ? ACCENT : MUTED}"/>
        <text x="832" y="${y + 4}" fill="${live ? ACCENT : MUTED}" font-size="11" letter-spacing="2" font-family="${FONT}">${state}</text>
      `;
    })
    .join("");

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" role="img" aria-label="systems and stack monitor">
  <title>ops monitor</title>
  <rect width="${w}" height="${h}" rx="4" fill="${FIELD}"/>
  ${corners(8, 8, w - 16, h - 16)}
  <rect x="8" y="8" width="${w - 16}" height="${h - 16}" fill="none" stroke="${ACCENT}" stroke-opacity="0.28" stroke-width="1"/>
  ${scanlines(w, h)}
  <line x1="450" y1="22" x2="450" y2="${h - 22}" stroke="${ACCENT}" stroke-opacity="0.35"/>

  <text x="28" y="38" fill="${ACCENT}" font-size="12" letter-spacing="3" font-family="${FONT}">SYS.MODULES</text>
  <text x="470" y="38" fill="${ACCENT}" font-size="12" letter-spacing="3" font-family="${FONT}">DEPLOYED.UNITS</text>
  ${moduleRows}
  ${unitRows}
</svg>
`;
}

export async function writeHudAssets({ total }) {
  const fs = await import("node:fs/promises");
  const hudPath = new URL("../assets/hud.svg", import.meta.url);
  const opsPath = new URL("../assets/ops.svg", import.meta.url);
  await fs.mkdir(new URL("../assets/", import.meta.url), { recursive: true });
  await fs.writeFile(hudPath, renderHud({ total }));
  await fs.writeFile(opsPath, renderOps());
  console.log(`Wrote ${hudPath.pathname}`);
  console.log(`Wrote ${opsPath.pathname}`);
}

