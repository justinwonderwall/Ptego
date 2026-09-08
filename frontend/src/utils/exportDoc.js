import {
  Document, Packer, Paragraph, TextRun, HeadingLevel, ImageRun,
  Table, TableRow, TableCell, WidthType, ExternalHyperlink, AlignmentType, BorderStyle,
} from 'docx';

const HEADING_MAP = {
  H1: HeadingLevel.HEADING_1,
  H2: HeadingLevel.HEADING_2,
  H3: HeadingLevel.HEADING_3,
  H4: HeadingLevel.HEADING_4,
  H5: HeadingLevel.HEADING_5,
  H6: HeadingLevel.HEADING_6,
};

const MAX_IMAGE_WIDTH = 560;

// Word "Normal" margin preset: 1 inch (2.54cm) on every side.
const PAGE_MARGIN = 1440;
const BODY_FONT = { ascii: 'Calibri', hAnsi: 'Calibri', eastAsia: '宋体' };
const HEADING_FONT = { ascii: '微软雅黑', hAnsi: '微软雅黑', eastAsia: '微软雅黑' };
const HEADING_SIZES = { title: 44, heading1: 32, heading2: 28, heading3: 26, heading4: 24, heading5: 24, heading6: 24 };

function download(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

async function loadImage(src) {
  const res = await fetch(src);
  const blob = await res.blob();
  const buffer = await blob.arrayBuffer();
  const dims = await new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
    img.onerror = reject;
    img.src = URL.createObjectURL(blob);
  });
  let { width, height } = dims;
  if (width > MAX_IMAGE_WIDTH) {
    height = Math.round((height * MAX_IMAGE_WIDTH) / width);
    width = MAX_IMAGE_WIDTH;
  }
  const type = blob.type.includes('png') ? 'png'
    : blob.type.includes('gif') ? 'gif'
    : blob.type.includes('bmp') ? 'bmp'
    : 'jpg';
  return { data: buffer, type, width: Math.max(1, width), height: Math.max(1, height) };
}

function textRuns(node, marks = {}) {
  if (node.nodeType === Node.TEXT_NODE) {
    const text = node.textContent;
    if (!text) return [];
    return [new TextRun({ text, bold: marks.bold, italics: marks.italic, underline: marks.underline ? {} : undefined })];
  }
  if (node.nodeType !== Node.ELEMENT_NODE) return [];

  const tag = node.tagName;
  if (tag === 'BR') return [new TextRun({ text: '', break: 1 })];

  const nextMarks = { ...marks };
  if (tag === 'STRONG' || tag === 'B') nextMarks.bold = true;
  if (tag === 'EM' || tag === 'I') nextMarks.italic = true;
  if (tag === 'U') nextMarks.underline = true;
  if (tag === 'CODE') nextMarks.code = true;

  const children = Array.from(node.childNodes).flatMap(c => textRuns(c, nextMarks));

  if (tag === 'A') {
    return [new ExternalHyperlink({
      link: node.getAttribute('href') || '',
      children: children.length ? children : [new TextRun({ text: node.textContent || '' })],
    })];
  }
  return children;
}

async function blockToParagraphs(node) {
  if (node.nodeType === Node.TEXT_NODE) {
    const text = node.textContent.trim();
    return text ? [new Paragraph({ children: [new TextRun(text)] })] : [];
  }
  if (node.nodeType !== Node.ELEMENT_NODE) return [];

  const tag = node.tagName;

  if (HEADING_MAP[tag]) {
    return [new Paragraph({ heading: HEADING_MAP[tag], children: textRuns(node), spacing: { before: 240, after: 120 } })];
  }

  if (tag === 'P') {
    return [new Paragraph({ children: textRuns(node), spacing: { after: 160 } })];
  }

  if (tag === 'BLOCKQUOTE') {
    const lines = Array.from(node.childNodes).filter(n => n.nodeType === Node.ELEMENT_NODE || n.textContent.trim());
    return lines.map(line => new Paragraph({
      children: textRuns(line, { italic: true }),
      indent: { left: 480 },
      border: { left: { style: BorderStyle.SINGLE, size: 12, color: 'CCCCCC', space: 8 } },
      spacing: { after: 120 },
    }));
  }

  if (tag === 'UL' || tag === 'OL') {
    const items = Array.from(node.children).filter(c => c.tagName === 'LI');
    const out = [];
    items.forEach((li) => {
      out.push(new Paragraph({
        children: textRuns(li),
        bullet: tag === 'UL' ? { level: 0 } : undefined,
        numbering: tag === 'OL' ? { reference: 'export-numbering', level: 0 } : undefined,
        spacing: { after: 80 },
      }));
    });
    return out;
  }

  if (tag === 'HR') {
    return [new Paragraph({ border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: 'AAAAAA' } }, spacing: { after: 200 } })];
  }

  if (tag === 'PRE') {
    return [new Paragraph({ children: [new TextRun({ text: node.textContent, font: 'Consolas' })], spacing: { after: 160 } })];
  }

  if (tag === 'IMG') {
    try {
      const img = await loadImage(node.getAttribute('src'));
      return [new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [new ImageRun({ data: img.data, type: img.type, transformation: { width: img.width, height: img.height } })],
        spacing: { after: 200 },
      })];
    } catch {
      return [];
    }
  }

  if (tag === 'TABLE') {
    const rows = Array.from(node.querySelectorAll('tr')).map(tr => {
      const cells = Array.from(tr.children).map(td => new TableCell({
        children: [new Paragraph({ children: textRuns(td) })],
        width: { size: 100 / tr.children.length, type: WidthType.PERCENTAGE },
      }));
      return new TableRow({ children: cells });
    });
    if (!rows.length) return [];
    return [new Table({ rows, width: { size: 100, type: WidthType.PERCENTAGE } }), new Paragraph({ text: '' })];
  }

  const out = [];
  for (const child of Array.from(node.childNodes)) {
    out.push(...await blockToParagraphs(child));
  }
  return out;
}

async function blocksToParagraphs(nodes) {
  const out = [];
  for (const node of nodes) {
    out.push(...await blockToParagraphs(node));
  }
  return out;
}

export async function exportToDocx(title, containerEl) {
  const source = containerEl.querySelector('[contenteditable="true"]') || containerEl.querySelector('.prose') || containerEl;
  const children = await blocksToParagraphs(Array.from(source.childNodes));

  const headingStyle = (key) => ({
    run: { font: HEADING_FONT, bold: true, color: '000000', size: HEADING_SIZES[key] },
    paragraph: { spacing: { before: 240, after: 120 } },
  });

  const doc = new Document({
    styles: {
      default: {
        document: {
          run: { font: BODY_FONT, size: 24 },
          paragraph: { spacing: { line: 360, after: 160 } },
        },
        title: { ...headingStyle('title'), paragraph: { alignment: AlignmentType.CENTER, spacing: { after: 300 } } },
        heading1: headingStyle('heading1'),
        heading2: headingStyle('heading2'),
        heading3: headingStyle('heading3'),
        heading4: headingStyle('heading4'),
        heading5: headingStyle('heading5'),
        heading6: headingStyle('heading6'),
      },
    },
    numbering: {
      config: [{
        reference: 'export-numbering',
        levels: [{ level: 0, format: 'decimal', text: '%1.', alignment: AlignmentType.START }],
      }],
    },
    sections: [{
      properties: {
        page: {
          size: { width: 11906, height: 16838 }, // A4 in twips
          margin: { top: PAGE_MARGIN, right: PAGE_MARGIN, bottom: PAGE_MARGIN, left: PAGE_MARGIN },
        },
      },
      children: [
        new Paragraph({ text: title, heading: HeadingLevel.TITLE }),
        ...children,
      ],
    }],
  });

  const blob = await Packer.toBlob(doc);
  download(blob, `${title || '未命名'}.docx`);
}

export function exportToPdf(title, containerEl) {
  const source = containerEl.querySelector('[contenteditable="true"]') || containerEl.querySelector('.prose') || containerEl;
  const html = source.innerHTML;

  const iframe = document.createElement('iframe');
  iframe.style.position = 'fixed';
  iframe.style.right = '0';
  iframe.style.bottom = '0';
  iframe.style.width = '0';
  iframe.style.height = '0';
  iframe.style.border = '0';
  document.body.appendChild(iframe);

  const doc = iframe.contentWindow.document;
  doc.open();
  doc.write(`<!doctype html>
<html>
<head>
<meta charset="utf-8">
<title>${title || '未命名'}</title>
<style>
  @page { size: A4; margin: 2.54cm; }
  body {
    font-family: "SimSun", "Songti SC", "PingFang SC", Calibri, sans-serif;
    font-size: 12pt;
    line-height: 1.5;
    color: #000;
  }
  h1, h2, h3, h4, h5, h6 {
    font-family: "Microsoft YaHei", "PingFang SC", "SimHei", sans-serif;
    font-weight: 700;
    color: #000;
    break-after: avoid;
  }
  .doc-title { font-size: 22pt; text-align: center; margin: 0 0 20pt; }
  h1 { font-size: 16pt; margin: 16pt 0 8pt; }
  h2 { font-size: 14pt; margin: 14pt 0 7pt; }
  h3 { font-size: 13pt; margin: 12pt 0 6pt; }
  h4, h5, h6 { font-size: 12pt; margin: 10pt 0 6pt; }
  p { margin: 0 0 8pt; }
  ul, ol { margin: 0 0 8pt; padding-left: 2em; }
  li { margin-bottom: 4pt; }
  img { max-width: 100%; display: block; margin: 10pt auto; break-inside: avoid; }
  table { border-collapse: collapse; width: 100%; margin: 0 0 10pt; }
  td, th { border: 1px solid #999; padding: 6px 10px; }
  blockquote { border-left: 3px solid #ccc; margin: 0 0 8pt; padding-left: 12pt; color: #555; }
  pre, code { font-family: Consolas, "Courier New", monospace; }
  pre { background: #f5f5f5; padding: 8pt; border-radius: 4px; overflow-x: auto; }
</style>
</head>
<body>
<h1 class="doc-title">${title || ''}</h1>
${html}
</body>
</html>`);
  doc.close();

  const cleanup = () => setTimeout(() => iframe.remove(), 500);
  iframe.contentWindow.onafterprint = cleanup;

  const images = Array.from(doc.images);
  const ready = images.length
    ? Promise.all(images.map(img => img.complete ? Promise.resolve() : new Promise(res => { img.onload = img.onerror = res; })))
    : Promise.resolve();

  ready.then(() => {
    iframe.contentWindow.focus();
    iframe.contentWindow.print();
    cleanup();
  });
}
