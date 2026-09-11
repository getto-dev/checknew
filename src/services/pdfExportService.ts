import { PDFDocument, rgb, PDFFont } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';
import { Estimate, EstimateItem } from '../types';
import { formatCurrency } from './exportService';
import { formatQuantity } from '../utils/quantity';

// Constants strictly aligned with getto-dev/check
const PAGE_WIDTH = 595.28;
const PAGE_HEIGHT = 841.89;
const MARGIN_X = 34;
const TOP = 34;
const NAME_RIGHT = 380;
const QTY_LEFT = 380;
const QTY_RIGHT = 435;
const PRICE_LEFT = 435;
const PRICE_RIGHT = 500;
const TOTAL_LEFT = 500;
const SUMMARY_LEFT = 360;

const TEXT_SIZES = {
  title: 10,
  object: 8,
  section: 8,
  name: 9,
  description: 7,
  values: 8,
  grandLabel: 10,
  grandValue: 13,
};

const ROW = {
  minHeight: 30,
  nameLineHeight: 11,
  descriptionLineHeight: 9,
};

// Signature palette from getto-dev/check
const BLUE = rgb(35 / 255, 136 / 255, 201 / 255);   // #2388c9
const TEXT = rgb(35 / 255, 39 / 255, 43 / 255);     // #23272b
const MUTED = rgb(105 / 255, 112 / 255, 120 / 255); // #697078
const BORDER = rgb(216 / 255, 220 / 255, 224 / 255); // #d8dce0

let cachedRegularFont: Uint8Array | null = null;
let cachedBoldFont: Uint8Array | null = null;

async function loadFonts(): Promise<{ regular: Uint8Array; bold: Uint8Array }> {
  if (!cachedRegularFont) {
    let res = await fetch('/fonts/Roboto-Regular.woff');
    if (!res.ok) {
      res = await fetch('/fonts/roboto-all-400-normal.woff');
    }
    if (!res.ok) {
      res = await fetch('/fonts/LiberationSans-Regular.ttf');
    }
    if (!res.ok) throw new Error('Не удалось загрузить базовый шрифт');
    cachedRegularFont = new Uint8Array(await res.arrayBuffer());
  }
  if (!cachedBoldFont) {
    let res = await fetch('/fonts/Roboto-Bold.woff');
    if (!res.ok) {
      res = await fetch('/fonts/LiberationSans-Bold.ttf');
    }
    if (!res.ok) {
      // Fallback to regular font if bold is unavailable
      cachedBoldFont = cachedRegularFont;
    } else {
      cachedBoldFont = new Uint8Array(await res.arrayBuffer());
    }
  }
  return { regular: cachedRegularFont, bold: cachedBoldFont };
}

function wrapText(
  text: string,
  font: PDFFont,
  size: number,
  maxWidth: number
): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let currentLine = '';

  for (const word of words) {
    const candidate = currentLine ? `${currentLine} ${word}` : word;
    if (font.widthOfTextAtSize(candidate, size) <= maxWidth) {
      currentLine = candidate;
    } else {
      if (currentLine) lines.push(currentLine);
      currentLine = word;
    }
  }
  if (currentLine) lines.push(currentLine);
  return lines;
}

function money(value: number): string {
  const formatted = formatCurrency(value).replace(/\u00a0/g, ' ');
  if (formatted.includes('₽') || formatted.includes('руб')) {
    return formatted;
  }
  return `${formatted} ₽`;
}

function centeredTextX(
  font: PDFFont,
  value: string,
  size: number,
  left: number,
  right: number
): number {
  return left + (right - left - font.widthOfTextAtSize(value, size)) / 2;
}

function rightTextX(
  font: PDFFont,
  value: string,
  size: number,
  right: number
): number {
  return right - font.widthOfTextAtSize(value, size);
}

export function getEstimateNumber(estimate: Estimate): string {
  const d = estimate.date ? new Date(estimate.date) : new Date();
  const year = isNaN(d.getTime()) ? new Date() : d;
  const yy = String(year.getFullYear()).slice(-2);
  const mm = String(year.getMonth() + 1).padStart(2, '0');
  const dd = String(year.getDate()).padStart(2, '0');
  return `${yy}${mm}${dd}-01`;
}

/**
 * Generates vector PDF exactly matching getto-dev/check layout, typography, lines and proportions
 */
export async function generateAndDownloadVectorPDF(estimate: Estimate): Promise<string> {
  if (typeof window === 'undefined' || !estimate.items.length) {
    throw new Error('Смета пуста');
  }

  const { regular, bold } = await loadFonts();
  const pdfDoc = await PDFDocument.create();
  pdfDoc.registerFontkit(fontkit);

  const font = await pdfDoc.embedFont(regular, { subset: true });
  const fontBold = await pdfDoc.embedFont(bold, { subset: true });

  const docNumber = getEstimateNumber(estimate);
  const documentTitle = estimate.title?.trim() || `СЧЕТ №${docNumber}`;

  // Object / Address / Customer: strictly omit if empty
  const objectParts: string[] = [];
  if (estimate.address?.trim()) objectParts.push(estimate.address.trim());
  if (estimate.customer?.trim()) objectParts.push(estimate.customer.trim());
  const objectAddress = objectParts.join(', ');

  const services = estimate.items.filter((item) => item.type === 'work' || !item.type);
  const products = estimate.items.filter((item) => item.type === 'material');

  const servicesSum = services.reduce((sum, item) => sum + Math.round(item.price * item.quantity), 0);
  const productsSum = products.reduce((sum, item) => sum + Math.round(item.price * item.quantity), 0);

  const discountPercent = Math.max(0, Math.min(100, Number(estimate.discount) || 0));
  const discountAmount = Math.round((servicesSum * discountPercent) / 100);
  const grandTotal = Math.max(0, servicesSum - discountAmount + productsSum);

  const sections = [
    { type: 'service', title: 'Наименование работ и услуг', items: services },
    { type: 'product', title: 'Наименование материалов и товаров', items: products },
  ].filter((section) => section.items.length > 0);

  let page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  let y = PAGE_HEIGHT - TOP;

  const text = (
    value: string,
    x: number,
    yy: number,
    size: number,
    color = TEXT,
    f = font
  ) => {
    page.drawText(value, { x, y: yy, size, font: f, color });
  };

  const ensureSpace = (height: number) => {
    if (y - height < 38) {
      page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
      y = PAGE_HEIGHT - TOP;
    }
  };

  const drawTable = (rows: EstimateItem[], headerLabel: string) => {
    if (!rows.length) return;
    ensureSpace(72);

    const xName = MARGIN_X;
    const right = PAGE_WIDTH - MARGIN_X;

    // Section top blue line
    page.drawLine({
      start: { x: MARGIN_X, y: y - 4 },
      end: { x: right, y: y - 4 },
      thickness: 1,
      color: BLUE,
    });

    const headerY = y - 18;
    text(headerLabel, xName, headerY, TEXT_SIZES.section, MUTED);
    text('Кол.', centeredTextX(font, 'Кол.', TEXT_SIZES.section, QTY_LEFT, QTY_RIGHT), headerY, TEXT_SIZES.section, MUTED);
    text('Цена', centeredTextX(font, 'Цена', TEXT_SIZES.section, PRICE_LEFT, PRICE_RIGHT), headerY, TEXT_SIZES.section, MUTED);
    text('Сумма', centeredTextX(font, 'Сумма', TEXT_SIZES.section, TOTAL_LEFT, right), headerY, TEXT_SIZES.section, MUTED);

    y -= 34;

    for (const item of rows) {
      const nameLines = wrapText(item.name, font, TEXT_SIZES.name, NAME_RIGHT - xName - 12);
      const descLines = item.description ? wrapText(item.description, font, TEXT_SIZES.description, NAME_RIGHT - xName - 12) : [];
      const contentHeight = nameLines.length * ROW.nameLineHeight + descLines.length * ROW.descriptionLineHeight;
      const rowHeight = Math.max(ROW.minHeight, contentHeight + 14);

      ensureSpace(rowHeight + 8);

      const blockTopY = y - 1 - (rowHeight - 8 - contentHeight) / 2;
      nameLines.forEach((line, index) => {
        text(line, xName, blockTopY - index * ROW.nameLineHeight, TEXT_SIZES.name, TEXT);
      });

      const descStartY = blockTopY - nameLines.length * ROW.nameLineHeight - 2;
      descLines.forEach((line, index) => {
        text(line, xName, descStartY - index * ROW.descriptionLineHeight, TEXT_SIZES.description, MUTED);
      });

      const qty = `${formatQuantity(item.quantity)} ${item.unit}`;
      const price = money(item.price);
      const total = money(Math.round(item.price * item.quantity));
      const valueY = y - 1 - (rowHeight - 8) / 2 + 3;

      text(qty, centeredTextX(font, qty, TEXT_SIZES.values, QTY_LEFT, QTY_RIGHT), valueY, TEXT_SIZES.values, TEXT);
      text(price, centeredTextX(font, price, TEXT_SIZES.values, PRICE_LEFT, PRICE_RIGHT), valueY, TEXT_SIZES.values, TEXT);
      text(total, centeredTextX(font, total, TEXT_SIZES.values, TOTAL_LEFT, right), valueY, TEXT_SIZES.values, TEXT);

      const lastTextY = descLines.length
        ? descStartY - (descLines.length - 1) * ROW.descriptionLineHeight
        : blockTopY - (nameLines.length - 1) * ROW.nameLineHeight;
      const lineY = lastTextY - 7;

      page.drawLine({
        start: { x: MARGIN_X, y: lineY },
        end: { x: right, y: lineY },
        thickness: 0.5,
        color: BORDER,
      });

      y -= rowHeight;
    }
  };

  const right = PAGE_WIDTH - MARGIN_X;

  // 1. Top document line (Blue, thickness 2)
  page.drawLine({
    start: { x: MARGIN_X, y },
    end: { x: right, y },
    thickness: 2,
    color: BLUE,
  });

  y -= 17;

  // 2. Document title & Object
  text(documentTitle, MARGIN_X, y, TEXT_SIZES.title, TEXT, fontBold);

  if (objectAddress) {
    const prefix = 'Объект: ';
    const objectSize = TEXT_SIZES.object;
    const titleWidth = fontBold.widthOfTextAtSize(documentTitle, TEXT_SIZES.title);
    const availableWidth = PAGE_WIDTH - MARGIN_X * 2 - titleWidth - 18;
    const fullObject = `${prefix}${objectAddress}`;
    const objectLines = wrapText(fullObject, font, objectSize, Math.max(120, availableWidth));
    const firstLine = objectLines.join(' ');
    const visibleObject = font.widthOfTextAtSize(firstLine, objectSize) <= availableWidth
      ? firstLine
      : `${prefix}${objectAddress.slice(0, Math.max(1, Math.floor(objectAddress.length * 0.72)))}…`;

    text(visibleObject, MARGIN_X + titleWidth + 18, y + 1, objectSize, MUTED, font);
  }

  y -= 13;

  // 3. Render sections
  for (const section of sections) {
    drawTable(section.items, section.title);
  }

  // 4. Summary block
  ensureSpace(65);
  y -= 10;
  const summaryRight = PAGE_WIDTH - MARGIN_X;

  page.drawLine({
    start: { x: SUMMARY_LEFT, y },
    end: { x: summaryRight, y },
    thickness: 1.5,
    color: BLUE,
  });

  y -= 15;

  const showSectionSummary = services.length > 0 && products.length > 0;
  if (showSectionSummary) {
    const serviceValue = money(servicesSum);
    text('Работы:', SUMMARY_LEFT, y, TEXT_SIZES.values, MUTED);
    text(serviceValue, rightTextX(font, serviceValue, TEXT_SIZES.values, summaryRight), y, TEXT_SIZES.values);
    y -= 13;

    const productValue = money(productsSum);
    text('Материалы:', SUMMARY_LEFT, y, TEXT_SIZES.values, MUTED);
    text(productValue, rightTextX(font, productValue, TEXT_SIZES.values, summaryRight), y, TEXT_SIZES.values);
    y -= 13;
  }

  if (discountAmount > 0) {
    text(`Скидка ${discountPercent}%:`, SUMMARY_LEFT, y, TEXT_SIZES.values, MUTED);
    const discountValue = `−${money(discountAmount)}`;
    text(discountValue, rightTextX(font, discountValue, TEXT_SIZES.values, summaryRight), y, TEXT_SIZES.values);
    y -= 15;
  } else {
    y -= 2;
  }

  page.drawLine({
    start: { x: SUMMARY_LEFT, y: y + 3 },
    end: { x: summaryRight, y: y + 3 },
    thickness: 0.7,
    color: BORDER,
  });

  y -= 11;
  text('ИТОГО К ОПЛАТЕ:', SUMMARY_LEFT, y, TEXT_SIZES.grandLabel, BLUE, fontBold);
  const grandStr = money(grandTotal);
  text(grandStr, rightTextX(fontBold, grandStr, TEXT_SIZES.grandValue, summaryRight), y - 1, TEXT_SIZES.grandValue, BLUE, fontBold);

  // 5. Download trigger
  const bytes = await pdfDoc.save();
  const arrayBuffer = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
  const blob = new Blob([arrayBuffer], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  const filename = `Smeta_${docNumber}.pdf`;

  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.target = '_blank';
  anchor.rel = 'noopener';
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 60_000);

  return url;
}
