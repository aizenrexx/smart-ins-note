"use client";

type P = { size?: number };

/*
  ══════════════════════════════════════════════════════════════
   Toy-like 3D SVG Icons
   — Glossy plastic / clay style
   — Radial-gradient body + specular gloss + cast shadow
   — viewBox 32×32, output size controlled via `size` prop
  ══════════════════════════════════════════════════════════════
*/

function ToyBase({
  size, id, c1, c2, dark, children,
}: {
  size: number; id: string; c1: string; c2: string; dark: string; children?: React.ReactNode;
}) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <radialGradient id={`g_${id}`} cx="30%" cy="22%" r="85%" gradientUnits="objectBoundingBox">
          <stop offset="0%" stopColor={c1} />
          <stop offset="100%" stopColor={dark} />
        </radialGradient>
        <radialGradient id={`gl_${id}`} cx="26%" cy="16%" r="52%" gradientUnits="objectBoundingBox">
          <stop offset="0%" stopColor="white" stopOpacity="0.72" />
          <stop offset="48%" stopColor="white" stopOpacity="0.09" />
          <stop offset="100%" stopColor="white" stopOpacity="0" />
        </radialGradient>
        <clipPath id={`cp_${id}`}>
          <rect x="1.5" y="1.5" width="29" height="29" rx="9" />
        </clipPath>
        <filter id={`f_${id}`} x="-25%" y="-15%" width="150%" height="150%">
          <feDropShadow dx="0" dy="3" stdDeviation="3.5" floodColor={dark} floodOpacity="0.52" />
        </filter>
      </defs>

      {/* Cast shadow on ground */}
      <ellipse cx="16" cy="30.5" rx="10.5" ry="1.6" fill={dark} opacity="0.28" />

      {/* Body */}
      <rect x="1.5" y="1.5" width="29" height="29" rx="9" fill={`url(#g_${id})`} filter={`url(#f_${id})`} />

      {/* Inner bottom depth + gloss + icon, all clipped */}
      <g clipPath={`url(#cp_${id})`}>
        <rect x="1.5" y="22" width="29" height="8.5" fill="black" fillOpacity="0.11" />
        <rect x="1.5" y="1.5" width="29" height="29" fill={`url(#gl_${id})`} />
        {children}
      </g>
    </svg>
  );
}


/* ══════════════════════════════════════════════
   SIDEBAR NAV ICONS
   ══════════════════════════════════════════════ */

/* Notes — purple file with dog-ear */
export function ClayNotes({ size = 28 }: P) {
  return (
    <ToyBase size={size} id="notes" c1="#c4b5fd" c2="#7c3aed" dark="#4c1d95">
      {/* File body */}
      <path d="M10 7h8l4 4.5V25H10V7z" fill="white" fillOpacity="0.92" />
      {/* Dog-ear fold triangle */}
      <path d="M18 7l4 4.5h-4V7z" fill="#4c1d95" fillOpacity="0.45" />
      {/* Text lines */}
      <rect x="12" y="14" width="7" height="1.5" rx="0.75" fill="#6d28d9" fillOpacity="0.6" />
      <rect x="12" y="17" width="6" height="1.5" rx="0.75" fill="#6d28d9" fillOpacity="0.45" />
      <rect x="12" y="20" width="4.5" height="1.5" rx="0.75" fill="#6d28d9" fillOpacity="0.3" />
    </ToyBase>
  );
}

/* Pin — red map pin */
export function ClayPin({ size = 28 }: P) {
  return (
    <ToyBase size={size} id="pin" c1="#fca5a5" c2="#dc2626" dark="#7f1d1d">
      {/* Pin drop shape */}
      <path d="M16 6c-3.314 0-6 2.686-6 6 0 4.5 6 14 6 14s6-9.5 6-14c0-3.314-2.686-6-6-6z"
        fill="white" fillOpacity="0.92" />
      {/* Inner circle cutout */}
      <circle cx="16" cy="12" r="2.5" fill="#dc2626" fillOpacity="0.55" />
      {/* Highlight */}
      <ellipse cx="14.2" cy="9.5" rx="1.5" ry="1" fill="white" fillOpacity="0.6" transform="rotate(-20,14.2,9.5)" />
    </ToyBase>
  );
}

/* Star — gold 5-point */
export function ClayStar({ size = 28 }: P) {
  return (
    <ToyBase size={size} id="star" c1="#fde68a" c2="#d97706" dark="#78350f">
      {/* Star polygon */}
      <polygon
        points="16,6 18.47,12.18 25.22,12.36 20.11,16.68 21.99,23.22 16,19.5 10.01,23.22 11.89,16.68 6.78,12.36 13.53,12.18"
        fill="white" fillOpacity="0.93" />
      {/* Inner star glow highlight */}
      <polygon
        points="16,8.5 17.7,13.1 22.6,13.3 18.8,16.2 20.2,21.1 16,18.5 11.8,21.1 13.2,16.2 9.4,13.3 14.3,13.1"
        fill="#fef3c7" fillOpacity="0.35" />
    </ToyBase>
  );
}

/* Archive — blue box with lid */
export function ClayArchive({ size = 28 }: P) {
  return (
    <ToyBase size={size} id="archive" c1="#93c5fd" c2="#2563eb" dark="#1e3a8a">
      {/* Box body */}
      <rect x="7" y="14" width="18" height="12" rx="2" fill="white" fillOpacity="0.92" />
      {/* Box lid */}
      <rect x="6" y="10" width="20" height="5" rx="1.5" fill="white" fillOpacity="0.78" />
      {/* Lid divider */}
      <rect x="6" y="14.5" width="20" height="0.8" fill="#1e3a8a" fillOpacity="0.18" />
      {/* Down arrow in box */}
      <path d="M16 17v5m0 0l-2.5-2.5M16 22l2.5-2.5"
        stroke="#2563eb" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      {/* Lid clasp */}
      <rect x="13.5" y="11.5" width="5" height="2" rx="1" fill="#1e3a8a" fillOpacity="0.28" />
    </ToyBase>
  );
}

/* Trash — rose trash can */
export function ClayTrash({ size = 28 }: P) {
  return (
    <ToyBase size={size} id="trash" c1="#fda4af" c2="#e11d48" dark="#9f1239">
      {/* Can body */}
      <rect x="8" y="11.5" width="16" height="13.5" rx="2.5" fill="white" fillOpacity="0.92" />
      {/* Lid bar */}
      <rect x="6.5" y="9" width="19" height="3.5" rx="1.75" fill="white" fillOpacity="0.82" />
      {/* Handle on lid */}
      <path d="M13 9V7.5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1V9"
        stroke="white" strokeWidth="1.5" strokeLinecap="round" fill="none" />
      {/* Can lines */}
      <rect x="12" y="14" width="1.5" height="8" rx="0.75" fill="#e11d48" fillOpacity="0.5" />
      <rect x="15.25" y="14" width="1.5" height="8" rx="0.75" fill="#e11d48" fillOpacity="0.5" />
      <rect x="18.5" y="14" width="1.5" height="8" rx="0.75" fill="#e11d48" fillOpacity="0.5" />
    </ToyBase>
  );
}

/* Hash / Tag — emerald # */
export function ClayHash({ size = 28 }: P) {
  return (
    <ToyBase size={size} id="hash" c1="#6ee7b7" c2="#059669" dark="#064e3b">
      <path d="M12 7L10 25" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M20 7L18 25" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M8 13.5h16" stroke="white" strokeWidth="2.2" strokeLinecap="round" />
      <path d="M7.5 19.5h16" stroke="white" strokeWidth="2.2" strokeLinecap="round" />
    </ToyBase>
  );
}

/* Settings — slate gear */
export function ClaySettings({ size = 28 }: P) {
  return (
    <ToyBase size={size} id="settings" c1="#e2e8f0" c2="#475569" dark="#1e293b">
      {/* Gear teeth via polygon approximation */}
      <path d="M16 9.5a6.5 6.5 0 1 0 0 13 6.5 6.5 0 0 0 0-13z" fill="white" fillOpacity="0.9" />
      {/* Gear teeth */}
      {[0, 45, 90, 135, 180, 225, 270, 315].map((deg, i) => {
        const r = Math.PI / 180 * deg;
        const cos = Math.cos(r), sin = Math.sin(r);
        const cx = 16 + 7.2 * cos, cy = 16 + 7.2 * sin;
        const w = 1.6;
        return (
          <rect
            key={i}
            x={cx - w / 2} y={cy - w / 2}
            width={w} height={w + 2.4}
            rx="0.8"
            fill="white" fillOpacity="0.9"
            transform={`rotate(${deg},${cx},${cy})`}
          />
        );
      })}
      {/* Center axle hole */}
      <circle cx="16" cy="16" r="2.8" fill="#475569" fillOpacity="0.55" />
      <circle cx="16" cy="16" r="1.4" fill="white" fillOpacity="0.7" />
    </ToyBase>
  );
}

/* Keyboard — indigo keys */
export function ClayKeyboard({ size = 28 }: P) {
  return (
    <ToyBase size={size} id="keyboard" c1="#c7d2fe" c2="#4338ca" dark="#312e81">
      {/* Body */}
      <rect x="5" y="9" width="22" height="15" rx="3" fill="white" fillOpacity="0.9" />
      {/* Key rows */}
      {[8, 11.5, 14.5].map((x, row) =>
        [x, x + 3.2, x + 6.4, x + 9.6, x + 12.8].slice(0, row === 2 ? 4 : 5).map((kx, ki) => (
          <rect key={`${row}-${ki}`} x={kx} y={11.5 + row * 3.2} width="2.5" height="2.2" rx="0.6"
            fill="#4338ca" fillOpacity={0.35 - row * 0.06} />
        ))
      )}
      {/* Space bar */}
      <rect x="9" y="20.2" width="14" height="2.2" rx="0.8" fill="#4338ca" fillOpacity="0.3" />
    </ToyBase>
  );
}

/* Home — violet house */
export function ClayHome({ size = 28 }: P) {
  return (
    <ToyBase size={size} id="home" c1="#ddd6fe" c2="#7c3aed" dark="#4c1d95">
      {/* Roof */}
      <path d="M16 6L5 15h3v11h16V15h3L16 6z" fill="white" fillOpacity="0.92" />
      {/* Door */}
      <rect x="13" y="19" width="6" height="7" rx="1.5" fill="#7c3aed" fillOpacity="0.4" />
      {/* Window */}
      <rect x="9" y="16" width="4" height="3.5" rx="1" fill="#7c3aed" fillOpacity="0.35" />
      {/* Roof shadow */}
      <path d="M16 6L5 15h3l8-7.5 8 7.5h3L16 6z" fill="white" fillOpacity="0.22" />
    </ToyBase>
  );
}

/* Sun — amber with rays */
export function ClaySun({ size = 28 }: P) {
  return (
    <ToyBase size={size} id="sun" c1="#fef08a" c2="#f59e0b" dark="#92400e">
      {/* Rays */}
      {[0, 45, 90, 135, 180, 225, 270, 315].map((deg, i) => {
        const r = Math.PI / 180 * deg;
        const x1 = 16 + 7.5 * Math.cos(r), y1 = 16 + 7.5 * Math.sin(r);
        const x2 = 16 + 10.5 * Math.cos(r), y2 = 16 + 10.5 * Math.sin(r);
        return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeOpacity="0.9" />;
      })}
      {/* Sun disc */}
      <circle cx="16" cy="16" r="5.5" fill="white" fillOpacity="0.95" />
      {/* Inner highlight */}
      <circle cx="14.5" cy="14" r="2" fill="white" fillOpacity="0.45" />
    </ToyBase>
  );
}

/* Moon — dark blue crescent */
export function ClayMoon({ size = 28 }: P) {
  return (
    <ToyBase size={size} id="moon" c1="#bfdbfe" c2="#1d4ed8" dark="#1e3a8a">
      {/* Crescent: big circle minus smaller offset circle */}
      <path d="M21 16.5a8 8 0 1 1-11-7.5 6 6 0 0 0 11 7.5z" fill="white" fillOpacity="0.92" />
      {/* Stars */}
      <circle cx="21" cy="9" r="1.1" fill="white" fillOpacity="0.7" />
      <circle cx="24" cy="13" r="0.7" fill="white" fillOpacity="0.55" />
      <circle cx="22.5" cy="18" r="0.8" fill="white" fillOpacity="0.5" />
    </ToyBase>
  );
}

/* Book — teal open book */
export function ClayBook({ size = 28 }: P) {
  return (
    <ToyBase size={size} id="book" c1="#2dd4bf" c2="#0d9488" dark="#134e4a">
      {/* Left page */}
      <path d="M7 8h8v17H7a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1z" fill="white" fillOpacity="0.92" />
      {/* Right page */}
      <path d="M25 8h-8v17h8a1 1 0 0 0 1-1V9a1 1 0 0 0-1-1z" fill="white" fillOpacity="0.82" />
      {/* Spine */}
      <rect x="14.5" y="8" width="3" height="17" fill="#0d9488" fillOpacity="0.3" />
      {/* Lines on left */}
      <rect x="9" y="12" width="4" height="1.2" rx="0.6" fill="#0d9488" fillOpacity="0.35" />
      <rect x="9" y="15" width="4" height="1.2" rx="0.6" fill="#0d9488" fillOpacity="0.28" />
      <rect x="9" y="18" width="3" height="1.2" rx="0.6" fill="#0d9488" fillOpacity="0.22" />
      {/* Lines on right */}
      <rect x="19" y="12" width="4" height="1.2" rx="0.6" fill="#0d9488" fillOpacity="0.28" />
      <rect x="19" y="15" width="4" height="1.2" rx="0.6" fill="#0d9488" fillOpacity="0.22" />
    </ToyBase>
  );
}

/* Plus — green cross */
export function ClayPlus({ size = 22 }: P) {
  return (
    <ToyBase size={size} id="plus" c1="#86efac" c2="#16a34a" dark="#14532d">
      <rect x="14" y="8.5" width="4" height="15" rx="2" fill="white" fillOpacity="0.92" />
      <rect x="8.5" y="14" width="15" height="4" rx="2" fill="white" fillOpacity="0.92" />
    </ToyBase>
  );
}

/* Brain / AI — pink brain */
export function ClayBrain({ size = 28 }: P) {
  return (
    <ToyBase size={size} id="brain" c1="#f0abfc" c2="#a21caf" dark="#701a75">
      <path d="M16 7c-1.6 0-3 0.7-4 1.8a4.5 4.5 0 0 0-4.5 4.2c-1 0.6-1.5 1.7-1.5 2.8 0 1.5 0.8 2.8 2 3.4 0 2.3 1.8 4 4 4h1l1 2h2l1-2h1c2.2 0 4-1.7 4-4 1.2-0.6 2-1.9 2-3.4 0-1.1-0.5-2.2-1.5-2.8A4.5 4.5 0 0 0 20 8.8C19 7.7 17.6 7 16 7z"
        fill="white" fillOpacity="0.92" />
      {/* Brain folds */}
      <path d="M13 13c0 1.5 0.7 2.5 2 3" stroke="#a21caf" strokeWidth="1.1" strokeLinecap="round" fill="none" strokeOpacity="0.5" />
      <path d="M19 13c0 1.5-0.7 2.5-2 3" stroke="#a21caf" strokeWidth="1.1" strokeLinecap="round" fill="none" strokeOpacity="0.5" />
      <path d="M12 17.5h8" stroke="#a21caf" strokeWidth="1" strokeLinecap="round" fill="none" strokeOpacity="0.35" />
    </ToyBase>
  );
}

/* Sparkles — purple magic star */
export function ClaySparkles({ size = 28 }: P) {
  return (
    <ToyBase size={size} id="sparkles" c1="#e879f9" c2="#9333ea" dark="#581c87">
      {/* Big 4-point star */}
      <path d="M16 6l2 8 8 2-8 2-2 8-2-8-8-2 8-2 2-8z" fill="white" fillOpacity="0.93" />
      {/* Small stars */}
      <path d="M24 6l0.8 2.2 2.2 0.8-2.2 0.8L24 12l-0.8-2.2L21 9l2.2-0.8L24 6z"
        fill="white" fillOpacity="0.7" />
      <circle cx="8.5" cy="22.5" r="1.8" fill="white" fillOpacity="0.6" />
      <circle cx="24" cy="22" r="1.2" fill="white" fillOpacity="0.5" />
    </ToyBase>
  );
}

/* Collapse — slate left chevron */
export function ClayCollapse({ size = 28 }: P) {
  return (
    <ToyBase size={size} id="collapse" c1="#f1f5f9" c2="#64748b" dark="#334155">
      <path d="M19 8.5L12 16l7 7.5" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </ToyBase>
  );
}

/* ══════════════════════════════════════════════
   ACTION / TOOLBAR ICONS
   ══════════════════════════════════════════════ */

/* Search — blue magnifying glass */
export function ClaySearch({ size = 20 }: P) {
  return (
    <ToyBase size={size} id="search" c1="#7dd3fc" c2="#0284c7" dark="#0c4a6e">
      {/* Glass lens */}
      <circle cx="14.5" cy="13.5" r="5.5" fill="white" fillOpacity="0.92" />
      <circle cx="14.5" cy="13.5" r="3.5" fill="#0284c7" fillOpacity="0.28" />
      {/* Highlight on lens */}
      <ellipse cx="12.5" cy="11.5" rx="1.8" ry="1.2" fill="white" fillOpacity="0.55" transform="rotate(-30,12.5,11.5)" />
      {/* Handle */}
      <path d="M18.5 18.5L23.5 23.5" stroke="white" strokeWidth="3" strokeLinecap="round" />
    </ToyBase>
  );
}

/* StarFill — filled star (used when starred) */
export function ClayStarFill({ size = 20 }: P) {
  return (
    <ToyBase size={size} id="starfill" c1="#fde68a" c2="#f59e0b" dark="#78350f">
      <polygon
        points="16,6.5 18.4,12.2 24.6,12.4 20,16.3 21.8,22.6 16,19.2 10.2,22.6 12,16.3 7.4,12.4 13.6,12.2"
        fill="white" fillOpacity="0.95" />
    </ToyBase>
  );
}

/* Restore — teal restore arrows */
export function ClayRestore({ size = 20 }: P) {
  return (
    <ToyBase size={size} id="restore" c1="#5eead4" c2="#0d9488" dark="#134e4a">
      <path d="M10 16a6 6 0 1 1 1.5 4" stroke="white" strokeWidth="2.5" strokeLinecap="round" fill="none" />
      <polyline points="7,12 10,16 14,13" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </ToyBase>
  );
}

/* Download — green download arrow */
export function ClayDownload({ size = 20 }: P) {
  return (
    <ToyBase size={size} id="download" c1="#86efac" c2="#16a34a" dark="#14532d">
      <path d="M16 8v13" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
      <polyline points="11,17 16,22 21,17" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <path d="M9 25h14" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
    </ToyBase>
  );
}

/* Type / WordCount — slate "T" */
export function ClayType({ size = 20 }: P) {
  return (
    <ToyBase size={size} id="type" c1="#e2e8f0" c2="#64748b" dark="#1e293b">
      <path d="M8 9h16v3h-6.5v13h-3V12H8V9z" fill="white" fillOpacity="0.92" />
    </ToyBase>
  );
}

/* Maximize (zen on) — purple expand */
export function ClayMaximize({ size = 20 }: P) {
  return (
    <ToyBase size={size} id="maximize" c1="#c084fc" c2="#7c3aed" dark="#4c1d95">
      <path d="M19 8h5v5M13 24H8v-5" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <path d="M24 8l-7 7M8 24l7-7" stroke="white" strokeWidth="2.2" strokeLinecap="round" fill="none" />
    </ToyBase>
  );
}

/* Minimize (zen off) — purple compress */
export function ClayMinimize({ size = 20 }: P) {
  return (
    <ToyBase size={size} id="minimize" c1="#c084fc" c2="#7c3aed" dark="#4c1d95">
      <path d="M19 13h5M19 13v-5" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <path d="M13 19H8M13 19v5" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <path d="M19 13l-6 6" stroke="white" strokeWidth="2.2" strokeLinecap="round" fill="none" />
    </ToyBase>
  );
}

/* ZoomIn — blue + magnifier */
export function ClayZoomIn({ size = 20 }: P) {
  return (
    <ToyBase size={size} id="zoomin" c1="#93c5fd" c2="#2563eb" dark="#1e3a8a">
      <circle cx="14" cy="13.5" r="5.5" fill="white" fillOpacity="0.88" />
      <path d="M14 10.5v6M11 13.5h6" stroke="#2563eb" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M18.5 18.5L23 23" stroke="white" strokeWidth="3" strokeLinecap="round" />
    </ToyBase>
  );
}

/* ZoomOut — blue - magnifier */
export function ClayZoomOut({ size = 20 }: P) {
  return (
    <ToyBase size={size} id="zoomout" c1="#93c5fd" c2="#2563eb" dark="#1e3a8a">
      <circle cx="14" cy="13.5" r="5.5" fill="white" fillOpacity="0.88" />
      <path d="M11 13.5h6" stroke="#2563eb" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M18.5 18.5L23 23" stroke="white" strokeWidth="3" strokeLinecap="round" />
    </ToyBase>
  );
}

/* Close / X — red cross */
export function ClayClose({ size = 18 }: P) {
  return (
    <ToyBase size={size} id="close" c1="#fda4af" c2="#e11d48" dark="#9f1239">
      <path d="M10 10l12 12M22 10L10 22" stroke="white" strokeWidth="2.8" strokeLinecap="round" />
    </ToyBase>
  );
}

/* FileText — blue document with lines */
export function ClayFileText({ size = 24 }: P) {
  return (
    <ToyBase size={size} id="filetext" c1="#bfdbfe" c2="#3b82f6" dark="#1e3a8a">
      <path d="M9 6h9.5l5 5.5V26H9V6z" fill="white" fillOpacity="0.92" />
      <path d="M18.5 6l5 5.5h-5V6z" fill="#1e3a8a" fillOpacity="0.4" />
      <rect x="11.5" y="14" width="8" height="1.4" rx="0.7" fill="#3b82f6" fillOpacity="0.55" />
      <rect x="11.5" y="17" width="7" height="1.4" rx="0.7" fill="#3b82f6" fillOpacity="0.42" />
      <rect x="11.5" y="20" width="5" height="1.4" rx="0.7" fill="#3b82f6" fillOpacity="0.3" />
    </ToyBase>
  );
}

/* PinFill — pin for inline badge */
export function ClayPinFill({ size = 18 }: P) {
  return (
    <ToyBase size={size} id="pinfill" c1="#fca5a5" c2="#dc2626" dark="#7f1d1d">
      <path d="M16 6c-3.314 0-6 2.686-6 6 0 4.5 6 14 6 14s6-9.5 6-14c0-3.314-2.686-6-6-6z"
        fill="white" fillOpacity="0.92" />
      <circle cx="16" cy="12" r="2.5" fill="#dc2626" fillOpacity="0.5" />
    </ToyBase>
  );
}

/* StickyNote — amber sticky note (empty state) */
export function ClayStickyNote({ size = 48 }: P) {
  return (
    <ToyBase size={size} id="stickynote" c1="#fde68a" c2="#f59e0b" dark="#92400e">
      <rect x="7" y="6" width="18" height="20" rx="2.5" fill="white" fillOpacity="0.92" />
      <path d="M19 6v6l6 0" fill="none" stroke="white" strokeWidth="1.3" strokeLinejoin="round" />
      <path d="M25 12l-6-6" fill="none" stroke="white" strokeWidth="1.3" strokeLinecap="round" />
      <rect x="10" y="11" width="8" height="1.3" rx="0.65" fill="#f59e0b" fillOpacity="0.5" />
      <rect x="10" y="14" width="7" height="1.3" rx="0.65" fill="#f59e0b" fillOpacity="0.38" />
      <rect x="10" y="17" width="5" height="1.3" rx="0.65" fill="#f59e0b" fillOpacity="0.28" />
    </ToyBase>
  );
}

/* AI/Loader spinner — violet sparkle ring */
export function ClayAI({ size = 20 }: P) {
  return (
    <ToyBase size={size} id="ai" c1="#e879f9" c2="#9333ea" dark="#581c87">
      <path d="M16 7l1.8 7 7 1.8-7 1.8L16 25l-1.8-7-7-1.8 7-1.8L16 7z" fill="white" fillOpacity="0.92" />
      <circle cx="23" cy="8" r="1.6" fill="white" fillOpacity="0.65" />
      <circle cx="9.5" cy="23" r="1.2" fill="white" fillOpacity="0.55" />
    </ToyBase>
  );
}

/* Analyze — teal bar chart with magnifying glass */
export function ClayAnalyze({ size = 48 }: P) {
  return (
    <ToyBase size={size} id="analyze" c1="#22d3ee" c2="#0891b2" dark="#164e63">
      <rect x="7"  y="18" width="4" height="8"  rx="1.5" fill="white" fillOpacity="0.90" />
      <rect x="13" y="13" width="4" height="13" rx="1.5" fill="white" fillOpacity="0.90" />
      <rect x="19" y="9"  width="4" height="17" rx="1.5" fill="white" fillOpacity="0.90" />
      <circle cx="23" cy="10" r="4.5" fill="none" stroke="white" strokeWidth="1.8" strokeOpacity="0.88" />
      <line x1="26.2" y1="13.2" x2="28.5" y2="15.5" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeOpacity="0.88" />
    </ToyBase>
  );
}
