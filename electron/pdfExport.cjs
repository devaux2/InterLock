// PDF export pipeline: print HTML -> Chromium printToPDF -> pdf-lib merge
// appendix PDFs -> stamp continuous footer page numbers -> write output file.
const { BrowserWindow } = require('electron');
const fs = require('fs');
const path = require('path');
const { PDFDocument, StandardFonts, rgb } = require('pdf-lib');
const storage = require('./storage.cjs');

async function htmlToPdf(html) {
  const tmpDir = storage.p('tmp');
  fs.mkdirSync(tmpDir, { recursive: true });
  const tmpFile = path.join(tmpDir, `print-${Date.now()}.html`);
  fs.writeFileSync(tmpFile, html, 'utf8');

  const win = new BrowserWindow({
    show: false,
    webPreferences: { sandbox: true, nodeIntegration: false, contextIsolation: true },
  });
  try {
    await win.loadFile(tmpFile);
    await win.webContents.executeJavaScript('document.fonts.ready.then(() => true)', true);
    await new Promise(r => setTimeout(r, 150)); // settle layout/images
    const buf = await win.webContents.printToPDF({
      pageSize: 'A4',
      printBackground: true,
      preferCSSPageSize: true,
      margins: { marginType: 'none' },
    });
    return buf;
  } finally {
    win.destroy();
    try { fs.rmSync(tmpFile); } catch { }
  }
}

// Appends appendix PDFs; returns { doc, warnings, appendixPageCounts }
async function mergeAppendices(bodyPdfBytes, appendixFiles) {
  const warnings = [];
  const doc = await PDFDocument.load(bodyPdfBytes);
  const appendixPageCounts = [];
  for (const ap of appendixFiles) {
    const abs = storage.absPath(ap.file);
    if (!abs || !fs.existsSync(abs)) {
      warnings.push(`Appendix missing on disk, skipped: ${ap.title || ap.file}`);
      appendixPageCounts.push(0);
      continue;
    }
    try {
      const bytes = fs.readFileSync(abs);
      // pdf-lib cannot decrypt: ignoreEncryption would silently embed encrypted
      // (blank/garbled) pages, so refuse password-protected files outright.
      const src = await PDFDocument.load(bytes);
      const pages = await doc.copyPages(src, src.getPageIndices());
      pages.forEach(pg => doc.addPage(pg));
      appendixPageCounts.push(pages.length);
    } catch (e) {
      const encrypted = /encrypt/i.test(e.message || '') || e.constructor?.name === 'EncryptedPDFError';
      warnings.push(encrypted
        ? `"${ap.title || path.basename(abs)}" is password-protected and was left out of the document. Remove the password and re-attach it.`
        : `Could not merge "${ap.title || path.basename(abs)}": ${e.message}. It was left out of the document, but the printed Appendices table still lists it.`);
      appendixPageCounts.push(0);
    }
  }
  return { doc, warnings, appendixPageCounts };
}

// Standard Helvetica can only encode WinAnsi (Latin-1) — strip anything else so
// an exotic character in an event name cannot fail the whole export.
function winAnsiSafe(s) {
  // Windows-1252 covers Latin-1 plus the common typographic marks below.
  return String(s || '').replace(/[^\x20-\x7E\xA0-\xFF–—‘’“”•…€™]/g, '?');
}

async function stampFooters(doc, footerLeft, appendixStartIndex, appendixLabels) {
  const font = await doc.embedFont(StandardFonts.Helvetica);
  footerLeft = winAnsiSafe(footerLeft);
  const pages = doc.getPages();
  const total = pages.length;
  const grey = rgb(0.45, 0.45, 0.45);
  pages.forEach((page, i) => {
    if (i === 0) return; // keep the cover clean
    const { width } = page.getSize();
    const pageText = `Page ${i + 1} of ${total}`;
    const size = 7.5;
    // white underlay so footers stay readable on appended PDFs with content at the bottom
    const leftW = font.widthOfTextAtSize(footerLeft, size);
    const rightW = font.widthOfTextAtSize(pageText, size);
    page.drawRectangle({ x: 28, y: 12, width: leftW + 4, height: 12, color: rgb(1, 1, 1), opacity: 0.85 });
    page.drawRectangle({ x: width - 28 - rightW - 4, y: 12, width: rightW + 4, height: 12, color: rgb(1, 1, 1), opacity: 0.85 });
    page.drawText(footerLeft, { x: 30, y: 15, size, font, color: grey });
    page.drawText(pageText, { x: width - 30 - rightW, y: 15, size, font, color: grey });
    if (appendixStartIndex != null && i >= appendixStartIndex && appendixLabels) {
      const label = appendixLabels(i);
      if (label) {
        const lw = font.widthOfTextAtSize(label, size);
        const cx = width / 2 - lw / 2;
        page.drawRectangle({ x: cx - 2, y: 12, width: lw + 4, height: 12, color: rgb(1, 1, 1), opacity: 0.85 });
        page.drawText(label, { x: cx, y: 15, size, font, color: grey });
      }
    }
  });
}

/**
 * Export an event to PDF.
 * @param {object} opts { html, eventName, appendices: [{title, file}], outPath, docTitle }
 * @returns {Promise<{path: string, warnings: string[], pageCount: number}>}
 */
async function exportPdf(opts) {
  const bodyBytes = await htmlToPdf(opts.html);
  const { doc, warnings, appendixPageCounts } = await mergeAppendices(bodyBytes, opts.appendices || []);

  // Work out which merged page belongs to which appendix, for the footer label.
  const bodyDoc = await PDFDocument.load(bodyBytes);
  const bodyCount = bodyDoc.getPageCount();
  const ranges = [];
  let cursor = bodyCount;
  (opts.appendices || []).forEach((ap, idx) => {
    const n = appendixPageCounts[idx] || 0;
    // Letter by original index so footers always match the printed Appendices
    // table, even when an earlier appendix failed to merge.
    if (n > 0) ranges.push({ start: cursor, end: cursor + n, label: `Appendix ${String.fromCharCode(65 + idx)}` });
    cursor += n;
  });
  const labelFor = (pageIdx) => {
    const r = ranges.find(r => pageIdx >= r.start && pageIdx < r.end);
    return r ? r.label : null;
  };

  doc.setTitle(opts.docTitle || `${opts.eventName} Laser Safety RAMS`);
  doc.setAuthor(opts.author || 'Paradox State International Ltd');
  doc.setCreator('Interlock (Paradox State International Ltd)');
  doc.setSubject('Laser Safety, Risk Assessment & Method Statement');

  await stampFooters(doc, `Laser Safety, Risk Assessment & Method Statement: ${opts.eventName}`, bodyCount, labelFor);

  const outBytes = await doc.save();
  fs.mkdirSync(path.dirname(opts.outPath), { recursive: true });
  fs.writeFileSync(opts.outPath, outBytes);
  return { path: opts.outPath, warnings, pageCount: doc.getPageCount() };
}

module.exports = { exportPdf };
