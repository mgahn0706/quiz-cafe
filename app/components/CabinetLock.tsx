import type { LockType } from "../config/cabinets";

type CabinetLockProps = { type: LockType; open?: boolean };

const chrome = "#d9d8d2";
const chromeDark = "#696965";
const outline = "#463b35";

function Shackle({ closed, opened, strokeWidth = 8 }: { closed: string; opened: string; strokeWidth?: number }) {
  return (
    <>
      <path className="lock-shackle lock-shackle--closed" d={closed} fill="none" stroke={chrome} strokeWidth={strokeWidth} strokeLinecap="round" />
      <path className="lock-shackle lock-shackle--opened" d={opened} fill="none" stroke={chrome} strokeWidth={strokeWidth} strokeLinecap="round" />
    </>
  );
}

type WordLockColor = "silver" | "red" | "blue";

const wordLockColors: Record<WordLockColor, { body: string; edge: string; dial: string }> = {
  silver: { body: chrome, edge: outline, dial: "#272729" },
  red: { body: "#e34645", edge: "#8e2028", dial: "#c92336" },
  blue: { body: "#2998e5", edge: "#155987", dial: "#0875cb" },
};

function FiveLetterLock({ color = "silver", open = false }: { color?: WordLockColor; open?: boolean }) {
  const palette = wordLockColors[color];
  const display = open ? "CAFES" : "AAAAA";
  return (
    <svg className="cabinet-lock cabinet-lock--letters" viewBox="0 0 104 72" aria-hidden="true">
      <Shackle closed="M30 32V19c0-17 44-17 44 0v13" opened="M30 32V19c0-17 44-17 44 0v2" />
      <g className="lock-body">
      <path d="M5 35 14 28h76l9 7v29l-9 5H14l-9-5Z" fill={palette.body} stroke={palette.edge} strokeWidth="4" />
      {display.split("").map((letter, index) => <g key={`${letter}-${index}`} transform={`translate(${10 + index * 17} 31)`}><rect width="17" height="36" rx="2" fill={palette.dial} stroke="#0e0e10" strokeWidth="1.5" /><path d="M1 8h15M1 28h15" stroke="#aaa" strokeWidth="1" /><text x="8.5" y="23" fill="white" fontFamily="Arial, sans-serif" fontWeight="700" fontSize="11" textAnchor="middle">{letter}</text></g>)}
      </g>
    </svg>
  );
}

type DirectionColor = "red" | "black" | "light-blue";

const directionPalettes: Record<DirectionColor, { body: string; dial: string; center: string; edge: string; arrow: string }> = {
  red: { body: "#bd2f2c", dial: "#d8413c", center: "#e95851", edge: "#532925", arrow: "#3e2725" },
  black: { body: "#24272a", dial: "#393d41", center: "#50555a", edge: "#111315", arrow: "#e1d8c7" },
  "light-blue": { body: "#75bfd0", dial: "#94d3df", center: "#b7e5ec", edge: "#315f69", arrow: "#244950" },
};

function DirectionLock({ color }: { color: DirectionColor }) {
  const palette = directionPalettes[color];
  return (
    <svg className={`cabinet-lock cabinet-lock--direction cabinet-lock--direction-${color}`} viewBox="0 0 72 90" aria-hidden="true">
      <Shackle closed="M24 35V19c0-17 24-17 24 0v16" opened="M24 35V19c0-17 24-17 24 0v2" strokeWidth={7} />
      <g className="lock-body">
      <path d="M14 39c2-8 7-11 14-11h16c7 0 12 3 14 11l3 17c3 21-7 31-25 31S8 77 11 56Z" fill={palette.body} stroke={palette.edge} strokeWidth="4" />
      <circle cx="36" cy="63" r="19" fill={palette.dial} stroke={palette.edge} strokeWidth="3" /><circle cx="36" cy="63" r="14" fill={palette.center} stroke={palette.edge} strokeWidth="2" />
      <path d="m36 45-3.5 6h7ZM36 81l-3.5-6h7ZM18 63l6-3.5v7ZM54 63l-6-3.5v7Z" fill={palette.arrow} />
      </g>
    </svg>
  );
}

function PinLock({ count }: { count: 8 | 10 }) {
  const rows = count / 2;
  const tall = count === 10;
  return (
    <svg className={`cabinet-lock cabinet-lock--pins${tall ? " cabinet-lock--ten-pins" : ""}`} viewBox={`0 0 86 ${tall ? 88 : 76}`} aria-hidden="true">
      <Shackle closed="M25 32V19c0-17 36-17 36 0v13" opened="M25 32V19c0-17 36-17 36 0v2" />
      <g className="lock-body">
      <rect x="15" y="29" width="56" height={tall ? 56 : 44} rx="5" fill={chrome} stroke={outline} strokeWidth="4" />
      {Array.from({ length: rows }, (_, row) => tall ? 38 + row * 10 : 39 + row * 9).map((y, row) => [36, 50].map((x, column) => <g key={`${row}-${column}`}><text x={column === 0 ? 24 : 62} y={y + 5} fill={chromeDark} fontFamily="Arial" fontSize="6" textAnchor="middle">{row + 1 + column * rows}</text><rect x={x - 5} y={y - 3} width="10" height="7" rx="2" fill="#85847f" stroke="#53524f" strokeWidth="1" /></g>))}
      <g className="pin-lock-latch"><rect x="36" y={tall ? 83 : 71} width="7" height="9" rx="2" fill={chromeDark} stroke={outline} strokeWidth="1.5" /><rect x="41" y={tall ? 86 : 74} width="17" height="8" rx="2.5" fill={chrome} stroke={outline} strokeWidth="1.5" /></g>
      </g>
    </svg>
  );
}

function FourNumberDialsLock() {
  return (
    <svg className="cabinet-lock cabinet-lock--side-numbers" viewBox="0 0 94 76" aria-hidden="true">
      <Shackle closed="M25 34V18c0-16 44-16 44 0v16" opened="M25 34V18c0-16 44-16 44 0v2" />
      <g className="lock-body">
      <rect x="5" y="31" width="84" height="42" rx="6" fill="#27282a" stroke={outline} strokeWidth="4" />
      {["0", "0", "0", "0"].map((digit, index) => <g key={index} transform={`translate(${11 + index * 19} 37)`}><rect width="18" height="30" rx="3" fill="#d7d8d6" stroke="#343536" strokeWidth="2" /><path d="M2 7h14M2 23h14" stroke="#92938f" strokeWidth="1" /><text x="9" y="20" fill="#252627" fontFamily="Arial" fontSize="12" fontWeight="700" textAnchor="middle">{digit}</text></g>)}
      </g>
    </svg>
  );
}

function FiveNumberDialsLock({ open = false }: { open?: boolean }) {
  const display = open ? "66566" : "00000";
  return (
    <svg className="cabinet-lock cabinet-lock--inline-numbers" viewBox="0 0 108 72" aria-hidden="true">
      <Shackle closed="M27 38V19c0-17 54-17 54 0v20" opened="M27 38V19c0-17 54-17 54 0v2" />
      <g className="lock-body">
      <path d="M5 39 16 31h79l9 8v24l-9 6H16L5 63Z" fill="#202124" stroke={outline} strokeWidth="4" />
      {display.split("").map((digit, index) => <g key={`${digit}-${index}`} transform={`translate(${25 + index * 14} 30)`}><rect width="15" height="38" rx="2" fill="#292a2d" stroke="#0d0e0f" strokeWidth="1.5" /><path d="M1 10h13M1 29h13" stroke="#777" /><text x="7.5" y="24" fill="#eee" fontFamily="Arial" fontSize="10" textAnchor="middle">{digit}</text></g>)}
      </g>
    </svg>
  );
}

function VerticalWordLock({ open = false }: { open?: boolean }) {
  const display = open ? "CAFE" : "AAAA";
  return (
    <svg className="cabinet-lock cabinet-lock--vertical-word" viewBox="0 0 88 90" aria-hidden="true">
      <Shackle closed="M26 34V18c0-17 36-17 36 0v16" opened="M26 34V18c0-17 36-17 36 0v2" />
      <g className="lock-body">
      <path d="M9 31c3-7 9-9 17-9h36c8 0 14 3 17 9v43l4 12H5l4-12Z" fill="#f0eee7" stroke={outline} strokeWidth="4" strokeLinejoin="round" />
      {display.split("").map((letter, row) => <g key={`${letter}-${row}`} transform={`translate(11 ${39 + row * 9})`}><rect width="66" height="10" rx="2" fill="#1396af" stroke="#246c79" strokeWidth="1" /><text x="33" y="8" fill="white" fontFamily="Arial" fontSize="8" fontWeight="700" textAnchor="middle">{letter}</text></g>)}
      </g>
    </svg>
  );
}

export function CabinetLock({ type, open = false }: CabinetLockProps) {
  let lock: React.ReactNode;
  switch (type) {
    case "five-letter-red": lock = <FiveLetterLock color="red" open={open} />; break;
    case "five-letter-blue": lock = <FiveLetterLock color="blue" open={open} />; break;
    case "direction-red": lock = <DirectionLock color="red" />; break;
    case "direction-black": lock = <DirectionLock color="black" />; break;
    case "direction-light-blue": lock = <DirectionLock color="light-blue" />; break;
    case "eight-pin": lock = <PinLock count={8} />; break;
    case "ten-pin": lock = <PinLock count={10} />; break;
    case "four-number-dials": lock = <FourNumberDialsLock />; break;
    case "five-number-dials": lock = <FiveNumberDialsLock open={open} />; break;
    case "vertical-word": lock = <VerticalWordLock open={open} />; break;
    case "five-letter": lock = <FiveLetterLock open={open} />; break;
  }
  return <i className={open ? "cabinet-lock-host is-open" : "cabinet-lock-host"}>{lock}</i>;
}
