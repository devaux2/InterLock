// Theme engine: preset accent colourways, custom accent (any hex), and
// dark / light / custom theme modes. Custom mode derives a full palette from
// one base background colour. Applied as CSS variables on <html>.

export const ACCENTS = {
  green: { label: 'Laser green', accent: '#34d573', strong: '#4ae287', dim: 'rgba(52, 213, 115, 0.12)', text: '#0b2d18' },
  blue: { label: 'Ice blue', accent: '#58a6ff', strong: '#79b8ff', dim: 'rgba(88, 166, 255, 0.12)', text: '#0a1f38' },
  violet: { label: 'Violet', accent: '#a78bfa', strong: '#bda4fc', dim: 'rgba(167, 139, 250, 0.12)', text: '#221542' },
  amber: { label: 'Amber', accent: '#f5a83c', strong: '#f7b95e', dim: 'rgba(245, 168, 60, 0.12)', text: '#3a2504' },
  magenta: { label: 'Magenta', accent: '#e857c2', strong: '#ef7ad0', dim: 'rgba(232, 87, 194, 0.12)', text: '#3c0e30' },
};

export const DEFAULT_CUSTOM_ACCENT = '#34d573';
export const DEFAULT_CUSTOM_THEME = '#101820';

export const isHex = (v) => /^#[0-9a-fA-F]{6}$/.test(v || '');

// ---- colour math -----------------------------------------------------------
function hexToRgb(hex) {
  return [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16));
}
function rgbToHex([r, g, b]) {
  return '#' + [r, g, b].map(v => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, '0')).join('');
}
/** Mix `hex` toward `other` by t (0..1). */
function mix(hex, other, t) {
  const a = hexToRgb(hex);
  const b = hexToRgb(other);
  return rgbToHex(a.map((v, i) => v + (b[i] - v) * t));
}
function alpha(hex, a) {
  const [r, g, b] = hexToRgb(hex);
  return `rgba(${r}, ${g}, ${b}, ${a})`;
}
/** Perceived luminance 0..1. */
function lum(hex) {
  const [r, g, b] = hexToRgb(hex);
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255;
}

// ---- accent ----------------------------------------------------------------
export function accentVars(key, customHex) {
  if (key === 'custom' && isHex(customHex)) {
    return {
      accent: customHex,
      strong: mix(customHex, '#ffffff', 0.16),
      dim: alpha(customHex, 0.12),
      // Dark tinted text on bright accents, white on dark accents.
      text: lum(customHex) > 0.45 ? mix(customHex, '#000000', 0.82) : '#ffffff',
    };
  }
  const a = ACCENTS[key] || ACCENTS.green;
  return { accent: a.accent, strong: a.strong, dim: a.dim, text: a.text };
}

export function applyAccent(key, customHex) {
  const a = accentVars(key, customHex);
  const root = document.documentElement.style;
  root.setProperty('--accent', a.accent);
  root.setProperty('--accent-strong', a.strong);
  root.setProperty('--accent-dim', a.dim);
  root.setProperty('--accent-text', a.text);
  root.setProperty('--focus-ring', a.dim);
}

// ---- theme -----------------------------------------------------------------
const THEME_KEYS = [
  '--bg', '--chrome', '--card', '--card-2', '--border', '--border-strong',
  '--border-hover', '--text', '--text-2', '--text-3', '--scroll-thumb',
  '--scroll-thumb-hover', '--toggle-track', '--toggle-knob', '--menu-bg',
];

export function applyTheme(mode, customBg) {
  const root = document.documentElement;
  const style = root.style;
  // Clear any previous custom overrides so preset modes come from the stylesheet.
  THEME_KEYS.forEach(k => style.removeProperty(k));

  if (mode === 'custom' && isHex(customBg)) {
    const base = customBg;
    const light = lum(base) > 0.5;
    // Preset block supplies everything not overridden (hovers, overlay, shadow…).
    root.dataset.theme = light ? 'light' : 'dark';
    const on = light ? '#000000' : '#ffffff'; // direction to shade toward
    const set = (k, v) => style.setProperty(k, v);
    set('--bg', base);
    set('--chrome', light ? '#ffffff' : mix(base, on, 0.03));
    set('--card', light ? '#ffffff' : mix(base, on, 0.065));
    set('--card-2', light ? mix(base, '#ffffff', 0.5) : mix(base, on, 0.02));
    set('--border', mix(base, on, light ? 0.13 : 0.14));
    set('--border-strong', mix(base, on, light ? 0.22 : 0.22));
    set('--border-hover', mix(base, on, light ? 0.34 : 0.32));
    set('--text', light ? '#15181f' : '#e9ebf1');
    set('--text-2', mix(base, on, light ? 0.62 : 0.6));
    set('--text-3', mix(base, on, light ? 0.44 : 0.4));
    set('--scroll-thumb', mix(base, on, 0.18));
    set('--scroll-thumb-hover', mix(base, on, 0.26));
    set('--toggle-track', mix(base, on, 0.16));
    set('--toggle-knob', light ? '#ffffff' : mix(base, on, 0.6));
    set('--menu-bg', light ? '#ffffff' : mix(base, on, 0.09));
    return;
  }
  root.dataset.theme = mode === 'light' ? 'light' : 'dark';
}
