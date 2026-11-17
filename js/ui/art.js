// Procedural portraits, civilization emblems and building glyphs (SVG strings).
import { PROFESSIONS } from '../data/people.js';

const SKIN = ['#f3d2b5', '#e2b48c', '#c98e62', '#a46a43', '#7a4b2c', '#5a3622'];
const HAIR = ['#2b211c', '#5a3a22', '#a8743c', '#e0c27a', '#c4552f', '#d9d4cc', '#38404f'];
const BG = ['#3b4a6b', '#4b3b5c', '#3f5a52', '#5c4a3b', '#3e4f5f'];

export function portrait(c, size = 56) {
  const L = c.look || {};
  const skin = SKIN[L.skin ?? 0];
  const hair = HAIR[L.hair ?? 0];
  const suit = PROFESSIONS[c.profession]?.color || '#999';
  const bg = BG[L.accent ?? 0];
  const faceRx = [15, 14, 16][L.face ?? 0];
  const faceRy = [17, 18, 16][L.face ?? 0];
  const styles = [
    `<path d="M17 27 Q18 11 32 11 Q46 11 47 27 Q44 18 32 18 Q20 18 17 27Z" fill="${hair}"/>`,
    `<path d="M16 30 Q15 10 32 10 Q49 10 48 30 L46 40 Q45 22 32 20 Q19 22 18 40Z" fill="${hair}"/>`,
    `<circle cx="32" cy="14" r="7" fill="${hair}"/><path d="M18 26 Q20 13 32 14 Q44 13 46 26 Q40 19 32 19 Q24 19 18 26Z" fill="${hair}"/>`,
    `<path d="M19 23 Q22 13 32 13 Q42 13 45 23 Z" fill="${hair}"/>`,
    `<path d="M16 28 Q16 9 34 10 Q48 12 48 28 Q46 20 40 18 Q30 22 18 28Z" fill="${hair}"/><path d="M46 26 Q52 40 46 50 Q47 38 44 30Z" fill="${hair}"/>`,
  ];
  return `<svg class="portrait" width="${size}" height="${size}" viewBox="0 0 64 64" role="img" aria-label="Portrait of ${escapeXml(c.name)}">
    <circle cx="32" cy="32" r="32" fill="${bg}"/>
    <path d="M8 64 Q10 46 32 45 Q54 46 56 64Z" fill="${suit}"/>
    <path d="M26 46 L32 53 L38 46" fill="none" stroke="rgba(0,0,0,.25)" stroke-width="2"/>
    <rect x="28" y="38" width="8" height="9" rx="3" fill="${skin}"/>
    <ellipse cx="32" cy="29" rx="${faceRx}" ry="${faceRy}" fill="${skin}"/>
    ${styles[L.hairStyle ?? 0]}
    <circle cx="26" cy="30" r="1.8" fill="#2a2420"/><circle cx="38" cy="30" r="1.8" fill="#2a2420"/>
    <path d="M28 37 Q32 40 36 37" fill="none" stroke="#6b3d2e" stroke-width="1.6" stroke-linecap="round"/>
    <circle cx="23" cy="34" r="2.4" fill="#e88" opacity=".18"/><circle cx="41" cy="34" r="2.4" fill="#e88" opacity=".18"/>
  </svg>`;
}

export const EMBLEM_PATHS = {
  orbit: '<circle cx="12" cy="12" r="3.2"/><ellipse cx="12" cy="12" rx="9.5" ry="4" fill="none" stroke="currentColor" stroke-width="1.6" transform="rotate(-25 12 12)"/>',
  leaf: '<path d="M5 19 C5 9 11 4 20 4 C20 13 15 19 5 19Z"/><path d="M5 19 L13 11" stroke="#1d1a17" stroke-width="1.3"/>',
  spark: '<path d="M12 2 L14 10 L22 12 L14 14 L12 22 L10 14 L2 12 L10 10Z"/>',
  wave: '<path d="M2 14 Q6 8 10 14 T18 14 T22 12 V20 H2Z"/><circle cx="17" cy="6" r="2.5"/>',
  crown: '<path d="M3 18 L4 7 L9 12 L12 5 L15 12 L20 7 L21 18Z"/>',
  key: '<circle cx="8" cy="12" r="5" fill="none" stroke="currentColor" stroke-width="2.2"/><path d="M13 11 H22 V13 H20 V16 H18 V13 H13Z"/>',
  eye: '<path d="M2 12 Q12 3 22 12 Q12 21 2 12Z"/><circle cx="12" cy="12" r="3.2" fill="#1d1a17"/>',
  tri: '<path d="M12 3 L21 19 H3Z" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="12" cy="14" r="2.6"/>',
};

export function emblem(name, color, size = 28) {
  return `<svg class="emblem" width="${size}" height="${size}" viewBox="0 0 24 24" fill="currentColor" style="color:${color}" aria-hidden="true">${EMBLEM_PATHS[name] || EMBLEM_PATHS.orbit}</svg>`;
}

// Small flat glyphs that echo each building's silhouette.
export const BUILDING_GLYPH = {
  hq: '<path d="M4 18 V12 Q4 6 12 6 Q20 6 20 12 V18Z"/><rect x="10.5" y="2" width="1.5" height="5"/>',
  extractor: '<path d="M13 3 H19 L18 18 H14Z" fill="none" stroke="currentColor" stroke-width="1.6"/><rect x="3" y="11" width="9" height="7" rx="1.5"/><path d="M16 15 L14.5 21 H17.5Z"/>',
  farm: '<path d="M3 18 V13 Q3 6 12 6 Q21 6 21 13 V18Z" fill="none" stroke="currentColor" stroke-width="1.6"/><circle cx="8" cy="15" r="2"/><circle cx="12" cy="14" r="2"/><circle cx="16" cy="15" r="2"/>',
  lab: '<rect x="3" y="12" width="14" height="7" rx="2"/><path d="M5 12 Q10 4 15 12Z"/><circle cx="19.5" cy="9" r="2.2"/>',
  solar: '<path d="M3 16 L7 8 H21 L17 16Z"/><path d="M10 16 V20 M14 16 V20" stroke="currentColor" stroke-width="1.6"/>',
  depot: '<rect x="3" y="6" width="6" height="13" rx="3"/><rect x="11" y="9" width="6" height="10" rx="3"/><rect x="18" y="14" width="4" height="5" rx="1"/>',
  habitat: '<rect x="3" y="12" width="16" height="6" rx="3"/><rect x="6" y="6" width="14" height="6" rx="3"/>',
  refinery: '<rect x="3" y="8" width="6" height="11" rx="3"/><rect x="10" y="10" width="5" height="9" rx="2.5"/><rect x="17" y="4" width="2" height="15"/><path d="M18 1 Q20 3 18 4 Q16 3 18 1Z"/>',
  spaceport: '<circle cx="12" cy="14" r="7" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M12 3 L14 10 H10Z"/>',
  observatory: '<path d="M4 19 V13 Q4 6 12 6 Q20 6 20 13 V19Z"/><rect x="11" y="4" width="6" height="2" transform="rotate(-30 14 5)"/>',
  reactor: '<circle cx="12" cy="12" r="8" fill="none" stroke="currentColor" stroke-width="1.6"/><circle cx="12" cy="12" r="3"/>',
  defense: '<path d="M12 3 L20 7 V12 Q20 18 12 21 Q4 18 4 12 V7Z"/>',
};

export function glyph(type, color = 'currentColor', size = 22) {
  return `<svg class="glyph" width="${size}" height="${size}" viewBox="0 0 24 24" fill="currentColor" style="color:${color}" aria-hidden="true">${BUILDING_GLYPH[type] || ''}</svg>`;
}

function escapeXml(s) {
  return String(s).replace(/[<>&"']/g, (ch) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&apos;' }[ch]));
}
