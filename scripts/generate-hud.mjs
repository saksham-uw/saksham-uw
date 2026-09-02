#!/usr/bin/env node
/**
 * One continuous terminal: navy screen, command prompts, skyline + ops as stdout.
 */

const FIELD = "#001744";
const TITLE = "#000d2a";
const ACCENT = "#F41B4D";
const TEXT = "#e8eef8";
const MUTED = "#8ea0c8";
const CYAN = "#7ec8ff";
const BAR_TRACK = "#0a2258";
const FONT =
  "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, Liberation Mono, monospace";

const LEVEL_TOP = {
  0: "#27040c",
  1: "#53091a",
  2: "#7f0e28",
  3: "#b51439",
  4: ACCENT,
};

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
      `<rect x="0" y="${y}" width="${width}" height="1" fill="#ffffff" opacity="0.028"/>`,
    );
  }
  return lines.join("");
}

function prompt(x, y, cmd) {
  return `<text x="${x}" y="${y}" font-size="13" font-family="${FONT}">
      <tspan fill="${ACCENT}">saksham@uw</tspan>
      <tspan fill="${MUTED}">:</tspan>
      <tspan fill="${CYAN}">~</tspan>
      <tspan fill="${TEXT}">$ ${esc(cmd)}</tspan>
    </text>`;
}

function renderTerminal(scene) {
  const W = 920;
  const PAD = 28;
  const innerW = W - PAD * 2;
  const scale = innerW / scene.width;
  const skyH = scene.height * scale;
  const line = 18;
  const gap = 16;

  let y = 38;
  y += 22;
  const whoamiPrompt = y;
  y += line + 6;
  const whoamiOut = y;
  y += 4 * line + gap;

  const gitPrompt = y;
  y += line + 10;
  const skyY = y;
  y += skyH + 8;
  const countY = y;
  y += line + gap;

  const psPrompt = y;
  y += line + 8;
  const psHead = y;
  y += 20;
  const psBody = y;
  const procs = [
    ["saksham", "2049", "41.0", "LIVE", "ultrassure --contract-ai"],
    ["saksham", "4412", "8.2", "LAB", "hermes --esp32-git-deck"],
    ["saksham", "5107", "6.4", "LAB", "themis --document-redline"],
    ["saksham", "6621", "4.1", "LAB", "why-buddy --feynman-agents"],
    ["saksham", "8080", "2.8", "LIVE", "saksham.pro --newton-os"],
  ];
  y += procs.length * 20 + gap;

  const modPrompt = y;
  y += line + 8;
  const modY = y;
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
  const modRows = Math.ceil(modules.length / 2);
  y += modRows * 22 + 20;

  const cursorY = y;
  y += 32;
  const H = Math.round(y);

  const whoamiLines = [
    "saksham",
    "24 y.o. software engineer  ᕙ(`▿´)ᕗ",
    "CTO @ Ultrassure · Toronto · Waterloo CS / AI",
    "I make random cool stuff",
  ];

  const whoamiMarkup = whoamiLines
    .map(
      (row, i) =>
        `<text x="${PAD}" y="${whoamiOut + i * line}" fill="${TEXT}" font-size="13" font-family="${FONT}">${esc(row)}</text>`,
    )
    .join("\n  ");

  const legend = [0, 1, 2, 3, 4]
    .map((level, i) => {
      const x = PAD + innerW - 72 + i * 14;
      return `<rect x="${x}" y="${countY - 10}" width="11" height="11" rx="2" fill="${LEVEL_TOP[level]}"/>`;
    })
    .join("");

  const psHeader = `<text y="${psHead}" fill="${MUTED}" font-size="12" font-family="${FONT}">
      <tspan x="${PAD}">USER</tspan>
      <tspan x="${PAD + 108}">PID</tspan>
      <tspan x="${PAD + 168}">%CPU</tspan>
      <tspan x="${PAD + 220}">STAT</tspan>
      <tspan x="${PAD + 278}">COMMAND</tspan>
    </text>`;
  const psMarkup = procs
    .map(([user, pid, cpu, stat, cmd], i) => {
      const rowY = psBody + i * 20;
      const live = stat === "LIVE";
      return `<text y="${rowY}" font-size="12" font-family="${FONT}">
      <tspan x="${PAD}" fill="${TEXT}">${esc(user)}</tspan>
      <tspan x="${PAD + 108}" fill="${MUTED}">${esc(pid)}</tspan>
      <tspan x="${PAD + 168}" fill="${MUTED}">${esc(cpu)}</tspan>
      <tspan x="${PAD + 220}" fill="${live ? ACCENT : MUTED}">${esc(stat)}</tspan>
      <tspan x="${PAD + 278}" fill="${TEXT}">${esc(cmd)}</tspan>
    </text>`;
    })
    .join("\n  ");

  const colW = innerW / 2;
  const barW = 168;
  const moduleMarkup = modules
    .map(([name, level], i) => {
      const col = i % 2;
      const row = Math.floor(i / 2);
      const x = PAD + col * colW;
      const rowY = modY + row * 22;
      const filled = barW * level;
      return `
    <text x="${x}" y="${rowY}" fill="${MUTED}" font-size="11" font-family="${FONT}">${esc(name)}</text>
    <rect x="${x + 118}" y="${rowY - 10}" width="${barW}" height="8" fill="${BAR_TRACK}"/>
    <rect x="${x + 118}" y="${rowY - 10}" width="${filled.toFixed(1)}" height="8" fill="${ACCENT}"/>
    <text x="${x + 118 + barW + 8}" y="${rowY}" fill="${ACCENT}" font-size="11" font-family="${FONT}">${Math.round(level * 100)}%</text>`;
    })
    .join("");

  const skyTransform = `translate(${PAD} ${skyY}) scale(${scale}) translate(${-scene.minX} ${-scene.minY})`;

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" role="img" aria-label="saksham@uw terminal">
  <title>saksham@uw — zsh</title>
  <style>
    ${scene.css}
    .cursor { animation: blink 1.1s step-end infinite; }
    .scan { animation: scan 7s linear infinite; }
    @keyframes blink {
      50% { opacity: 0; }
    }
    @keyframes scan {
      from { transform: translateY(-24px); }
      to { transform: translateY(${H}px); }
    }
  </style>
  <rect width="${W}" height="${H}" fill="${FIELD}"/>
  <rect width="${W}" height="38" fill="${TITLE}"/>
  <circle cx="22" cy="19" r="5.5" fill="${ACCENT}"/>
  <circle cx="40" cy="19" r="5.5" fill="#3d5a99"/>
  <circle cx="58" cy="19" r="5.5" fill="#3d5a99"/>
  <text x="80" y="24" fill="${MUTED}" font-size="12" font-family="${FONT}">saksham@uw — zsh — ~</text>
  <line x1="0" y1="38" x2="${W}" y2="38" stroke="${ACCENT}" stroke-opacity="0.35" stroke-width="1"/>

  ${prompt(PAD, whoamiPrompt, "whoami")}
  ${whoamiMarkup}

  ${prompt(PAD, gitPrompt, "git skyline --year last --kirby")}
  <clipPath id="sky-clip">
    <rect x="${PAD}" y="${skyY}" width="${innerW}" height="${skyH}"/>
  </clipPath>
  <g clip-path="url(#sky-clip)">
    <g transform="${skyTransform}">
      ${scene.inner}
    </g>
  </g>
  <text x="${PAD}" y="${countY}" fill="${MUTED}" font-size="12" font-family="${FONT}">${esc(scene.countLabel)}</text>
  ${legend}

  ${prompt(PAD, psPrompt, "ps aux | grep shipping")}
  ${psHeader}
  ${psMarkup}

  ${prompt(PAD, modPrompt, "cat /proc/modules")}
  ${moduleMarkup}

  ${prompt(PAD, cursorY, "")}
  <rect class="cursor" x="${PAD + 118}" y="${cursorY - 12}" width="8" height="14" fill="${ACCENT}"/>

  ${scanlines(W, H)}
  <rect class="scan" x="0" y="0" width="${W}" height="12" fill="${ACCENT}" opacity="0.06"/>
</svg>
`;
}

export async function writeTerminal(scene) {
  const fs = await import("node:fs/promises");
  const outPath = new URL("../assets/terminal.svg", import.meta.url);
  await fs.mkdir(new URL("../assets/", import.meta.url), { recursive: true });
  const svg = renderTerminal(scene);
  await fs.writeFile(outPath, svg);
  console.log(`Wrote ${outPath.pathname} (${svg.length} bytes)`);
}
