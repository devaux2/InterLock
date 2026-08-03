// Small shared helpers (no React).

export const todayIso = () => {
  const d = new Date();
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
};

/** ISO date -> DD.MM.YYYY (empty string when not a valid ISO date). */
export function fmtDate(iso) {
  if (!/^\d{4}-\d{2}-\d{2}/.test(iso || '')) return '';
  const [y, m, d] = iso.slice(0, 10).split('-');
  return `${d}.${m}.${y}`;
}

export function fileName(p) {
  return String(p || '').split(/[\\/]/).pop() || '';
}

export function isImagePath(p) {
  return /\.(png|jpe?g|gif|webp|bmp|svg)$/i.test(p || '');
}

export function isPdfPath(p) {
  return /\.pdf$/i.test(p || '');
}

/** api.pickAsset may return a string path or an object; normalise to a path string. */
export function assetPath(res) {
  if (!res) return null;
  if (typeof res === 'string') return res;
  return res.path || res.file || res.asset || null;
}

/** camelCase key -> human label ("effectsTemplate" -> "Effects template"). */
export function labelize(key) {
  const s = String(key || '')
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/[_-]+/g, ' ')
    .toLowerCase();
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export const clone = (o) => JSON.parse(JSON.stringify(o));

/** Compute the export filename shown on the Check step.
 *  Must mirror defaultExportName() in electron/main.cjs (same sanitising). */
export function exportFilename(event) {
  const name = (event?.details?.eventName || 'RAMS')
    .replace(/[\\/:*?"<>|]/g, '').replace(/\s+/g, ' ').trim() || 'RAMS';
  const date = fmtDate(event?.details?.eventDateStart);
  return date ? `${name}_${date}.pdf` : `${name}.pdf`;
}
