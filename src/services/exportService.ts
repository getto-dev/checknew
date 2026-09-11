import { Estimate, EstimateItem } from '../types';
import { generateAndDownloadVectorPDF, getEstimateNumber } from './pdfExportService';
import { formatQuantity } from '../utils/quantity';
import { isValidEstimate, MAX_ESTIMATE_ITEMS } from '../utils/validation';

export { generateAndDownloadVectorPDF };

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency: 'RUB',
    maximumFractionDigits: 0,
  }).format(Math.round(amount) || 0);
}

export function formatDate(dateString: string): string {
  if (!dateString) return new Date().toLocaleDateString('ru-RU');
  try {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return dateString;
    return d.toLocaleDateString('ru-RU', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  } catch {
    return dateString;
  }
}

function money(amount: number): string {
  return formatCurrency(amount).replace(/\u00a0/g, ' ');
}

/** Validates and restores an Estimate from JSON or an exported HTML backup. */
export async function importFromFile(file: File): Promise<Estimate> {
  const text = await file.text();
  let parsed: unknown = null;
  const lowerName = file.name.toLowerCase();
  const isHtml = lowerName.endsWith('.html') || lowerName.endsWith('.htm') || text.trim().startsWith('<');

  if (isHtml) {
    const match = text.match(/<script[^>]*id=["'](?:__ESTIMATE_DATA__|smeta-app-data|check-estimate-data|estimate-data)["'][^>]*>([\s\S]*?)<\/script>/i);
    if (match && match[1]) {
      try {
        const unescaped = match[1].replace(/<\/script/gi, '</script').replace(/<!--/g, '<!--');
        parsed = JSON.parse(unescaped);
      } catch {
        throw new Error('Не удалось прочитать встроенные данные сметы из HTML файла.');
      }
    } else {
      throw new Error('В данном HTML файле не найдены структурированные данные сметы.');
    }
  } else {
    try {
      parsed = JSON.parse(text);
    } catch {
      throw new Error('Файл не является корректным JSON или HTML документом.');
    }
  }

  if (!parsed || typeof parsed !== 'object') {
    throw new Error('Некорректная структура файла сметы.');
  }

  const p = parsed as Record<string, any>;
  const rawItems = Array.isArray(p.items) ? p.items : (p.data && Array.isArray(p.data.items) ? p.data.items : null);

  if (!rawItems) {
    throw new Error('В файле отсутствует список позиций сметы (items).');
  }

  if (rawItems.length > MAX_ESTIMATE_ITEMS) {
    throw new Error(`Смета содержит слишком много позиций. Максимум: ${MAX_ESTIMATE_ITEMS}.`);
  }

  const items: EstimateItem[] = rawItems.map((it: unknown, idx: number) => {
    const item = it && typeof it === 'object' ? it as Record<string, any> : {};
    let price = Number(item.price);
    if ((!Number.isFinite(price) || price === 0) && typeof item.priceKopecks === 'number') {
      price = Math.round(item.priceKopecks / 100);
    }
    const quantity = Number(item.quantity);

    return {
      id: typeof item.id === 'string' && item.id.trim() ? item.id : `restored-${crypto.randomUUID()}-${idx}`,
      name: String(item.name || 'Позиция без названия').slice(0, 300),
      category: String(item.category || item.categoryId || 'Общие работы'),
      unit: String(item.unit || 'шт'),
      price: Number.isFinite(price) && price >= 0 ? price : 0,
      quantity: Number.isFinite(quantity) && quantity > 0 ? quantity : 1,
      total: 0,
      description: item.description ? String(item.description).slice(0, 500) : undefined,
      type: item.type === 'product' || item.type === 'material' ? 'material' : 'work',
    };
  }).map((item) => ({
    ...item,
    total: Math.round(item.price * item.quantity),
  }));

  const subtotal = items.reduce((acc, curr) => acc + curr.total, 0);
  const discount = Math.max(0, Math.min(100, Number(p.discount ?? p.settings?.discountPercent ?? p.settings?.discount ?? 0) || 0));

  const servicesSubtotal = items
    .filter((i) => i.type === 'work' || !i.type)
    .reduce((sum, i) => sum + i.total, 0);
  const materialsSubtotal = items
    .filter((i) => i.type === 'material')
    .reduce((sum, i) => sum + i.total, 0);
  const discountAmount = Math.round((servicesSubtotal * discount) / 100);
  const total = Math.max(0, servicesSubtotal - discountAmount + materialsSubtotal);

  const restored: Estimate = {
    id: typeof p.id === 'string' && p.id.trim() ? p.id : `est-${crypto.randomUUID()}`,
    title: String(p.title || p.name || '').slice(0, 300),
    customer: String(p.customer || p.settings?.clientName || '').slice(0, 300),
    companyName: String(p.companyName || p.settings?.contractorName || '').slice(0, 300),
    date: String(p.date || p.settings?.date || new Date().toISOString().split('T')[0]),
    phone: String(p.phone || p.settings?.phone || '').slice(0, 100),
    address: String(p.address || p.settings?.address || '').slice(0, 500),
    notes: String(p.notes || p.settings?.notes || '').slice(0, 2000),
    profileId: String(p.profileId || 'plumbing'),
    profileName: String(p.profileName || ''),
    items,
    discount,
    subtotal,
    servicesSubtotal,
    materialsSubtotal,
    total,
    createdAt: Number.isFinite(Number(p.createdAt)) ? Number(p.createdAt) : Date.now(),
    updatedAt: Date.now(),
  };

  if (!isValidEstimate(restored)) {
    throw new Error('Импортированная смета не прошла проверку данных.');
  }

  return restored;
}

export const importFromJSON = importFromFile;

export function generateStandaloneHTML(estimate: Estimate): string {
  const docNumber = getEstimateNumber(estimate);
  const documentTitle = estimate.title?.trim() || `СЧЕТ №${docNumber}`;
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

  const sectionsHtml = sections.map((section) => {
    const rowsHtml = section.items.map((item) => {
      const descHtml = item.description?.trim() ? `<div class="row-description">${escapeHtml(item.description.trim())}</div>` : '';
      const qty = `${formatQuantity(item.quantity)} ${item.unit}`;
      return `<div class="row">
        <div class="row-name"><div>${escapeHtml(item.name)}</div>${descHtml}</div>
        <div class="row-values"><div>${escapeHtml(qty)}</div><div>${escapeHtml(money(item.price))}</div><div>${escapeHtml(money(Math.round(item.price * item.quantity)))}</div></div>
      </div>`;
    }).join('\n');
    return `<div class="section"><div class="section-top-line"></div><div class="table-header"><div>${escapeHtml(section.title)}</div><div>Кол.</div><div>Цена</div><div>Сумма</div></div>${rowsHtml}</div>`;
  }).join('\n');

  const objectHtml = objectAddress ? `<span class="document-object">Объект: ${escapeHtml(objectAddress)}</span>` : '';
  const contractorHtml = estimate.companyName?.trim() || estimate.phone?.trim()
    ? `<div class="document-contractor">${estimate.companyName?.trim() ? `<span class="contractor-name">${escapeHtml(estimate.companyName.trim())}</span>` : ''}${estimate.phone?.trim() ? `<span class="contractor-phone">${escapeHtml(estimate.phone.trim())}</span>` : ''}</div>`
    : '';
  const showSectionSummary = services.length > 0 && products.length > 0;
  const summaryLines = showSectionSummary ? `<div class="summary-row"><span>Работы:</span><span>${escapeHtml(money(servicesSum))}</span></div><div class="summary-row"><span>Материалы:</span><span>${escapeHtml(money(productsSum))}</span></div>` : '';
  const discountHtml = discountAmount > 0 ? `<div class="summary-row"><span>Скидка ${discountPercent}%:</span><span>−${escapeHtml(money(discountAmount))}</span></div>` : '';
  const notesHtml = estimate.notes?.trim() ? `<div class="document-notes"><div class="notes-label">Примечания к смете:</div><div class="notes-text">${escapeHtml(estimate.notes.trim())}</div></div>` : '';
  const embeddedJson = JSON.stringify(estimate).replace(/<\/script/gi, '<\\/script');

  return `<!doctype html><html lang="ru"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(documentTitle)}${objectAddress ? ` — ${escapeHtml(objectAddress)}` : ''}</title><style>
@page { size: A4; margin: 0; } * { box-sizing: border-box; } html, body { margin: 0; padding: 0; background: #fff; color: #23272b; } body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; font-size: 8pt; } .estimate-page { width: 595.28px; min-height: 841.89px; margin: 0 auto; padding: 34px; background: #fff; position: relative; } .header-line { height: 2px; background: #2388c9; width: 100%; } .document-title { margin-top: 15px; margin-bottom: 13px; min-height: 13px; display: flex; align-items: baseline; justify-content: space-between; gap: 18px; } .document-title-left { display: flex; align-items: baseline; gap: 14px; overflow: hidden; } .document-number { font-size: 10pt; line-height: 10pt; font-weight: 700; color: #23272b; white-space: nowrap; } .document-object { font-size: 8pt; line-height: 10pt; color: #697078; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; } .document-contractor { font-size: 8pt; line-height: 10pt; color: #697078; text-align: right; white-space: nowrap; display: flex; gap: 8px; } .contractor-name { font-weight: 600; color: #23272b; } .section { margin: 0; } .section-top-line { height: 1px; background: #2388c9; width: 100%; } .table-header, .row { display: grid; grid-template-columns: 346px 55px 65px 61px; } .table-header { height: 33px; align-items: start; padding-top: 13px; color: #697078; font-size: 8pt; line-height: 8pt; } .table-header > :not(:first-child) { text-align: center; } .row { min-height: 30px; align-items: center; border-bottom: 0.5px solid #d8dce0; } .row-name { grid-column: 1; padding: 7px 12px 7px 0; font-size: 9pt; line-height: 11pt; color: #23272b; } .row-description { margin-top: 2px; color: #697078; font-size: 7pt; line-height: 9pt; } .row-values { grid-column: 2 / 5; display: grid; grid-template-columns: 55px 65px 61px; align-items: center; font-size: 8pt; line-height: 8pt; text-align: center; } .row-values > div { text-align: center; color: #23272b; } .summary { margin-top: 18px; margin-left: 326px; width: 201px; } .summary-top-line { height: 1.5px; background: #2388c9; width: 100%; margin-bottom: 15px; } .summary-row { display: flex; justify-content: space-between; align-items: baseline; min-height: 13px; color: #697078; font-size: 8pt; line-height: 8pt; } .summary-row + .summary-row { margin-top: 5px; } .summary-divider { height: 0.7px; background: #d8dce0; margin-top: 4px; margin-bottom: 11px; } .grand-total { display: flex; justify-content: space-between; align-items: baseline; color: #2388c9; } .grand-total-label { font-size: 10pt; line-height: 10pt; font-weight: 700; } .grand-total-value { font-size: 13pt; line-height: 13pt; font-weight: 700; } .document-notes { margin-top: 24px; padding-top: 12px; border-top: 0.5px solid #d8dce0; font-size: 7.5pt; color: #697078; line-height: 1.4; } .notes-label { font-weight: 600; margin-bottom: 2px; color: #23272b; } .top-bar { text-align: center; margin-bottom: 16px; } .print-btn { display: inline-flex; align-items: center; gap: 6px; padding: 7px 16px; background: #2388c9; color: #fff; border: none; border-radius: 6px; font-size: 12px; font-weight: 600; cursor: pointer; } .print-btn:hover { background: #1a74ad; } @media print { body { print-color-adjust: exact; -webkit-print-color-adjust: exact; background: transparent; } .top-bar { display: none !important; } .estimate-page { margin: 0; box-shadow: none; width: 100%; min-height: auto; padding: 20mm; } } @media screen { body { padding: 24px 12px; background: #f0f2f5; display: flex; flex-direction: column; align-items: center; } .estimate-page { box-shadow: 0 4px 24px rgba(0,0,0,0.12); } }
</style></head><body><div class="top-bar"><button class="print-btn" onclick="window.print()">Распечатать смету</button></div><main class="estimate-page"><div class="header-line"></div><div class="document-title"><div class="document-title-left"><span class="document-number">${escapeHtml(documentTitle)}</span>${objectHtml}</div>${contractorHtml}</div>${sectionsHtml}<div class="summary"><div class="summary-top-line"></div>${summaryLines}${discountHtml}<div class="summary-divider"></div><div class="grand-total"><span class="grand-total-label">ИТОГО К ОПЛАТЕ:</span><span class="grand-total-value">${escapeHtml(money(grandTotal))}</span></div></div>${notesHtml}<script type="application/json" id="__ESTIMATE_DATA__">${embeddedJson}</script><script type="application/json" id="smeta-app-data">${embeddedJson}</script></main></body></html>`;
}

export function exportToHTML(estimate: Estimate): void {
  const html = generateStandaloneHTML(estimate);
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const safeCustomer = (estimate.customer || estimate.title || 'Смета').replace(/[^a-zA-Zа-яА-Я0-9_-]/g, '_');
  a.href = url;
  a.download = `Бэкап_${safeCustomer}_${estimate.date || 'date'}.html`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

export function triggerPrintPDF(estimate: Estimate): void {
  try {
    const html = generateStandaloneHTML(estimate);
    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    iframe.setAttribute('title', 'Печать сметы');
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow?.document || iframe.contentDocument;
    if (doc) {
      doc.open();
      doc.write(html);
      doc.close();
      setTimeout(() => {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
        setTimeout(() => iframe.remove(), 3000);
      }, 400);
    } else {
      exportToHTML(estimate);
    }
  } catch (err) {
    console.warn('Iframe print failed, falling back to HTML export', err);
    exportToHTML(estimate);
  }
}

function escapeHtml(text: string): string {
  if (!text) return '';
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
}
