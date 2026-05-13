import Constants from 'expo-constants';
import * as Print from 'expo-print';
import { Share } from 'react-native';
import { APP_DISPLAY_NAME } from '@/constants/appInfo';
import { t } from '@/i18n/strings';
import { formatPeso } from '@/utils/currency';
import { formatDateTime } from '@/utils/date';

/**
 * Receipt print layout lives in this file only: `buildUtangPageReceiptHtml` + `receiptThermalCss`.
 * Tuned for ~58mm thermal rolls (~48mm printable width); expo-print renders this HTML to a PDF/graphic
 * for the system print dialog (including Bluetooth thermal printers).
 */
const RECEIPT_PAPER_MM = 58;
const RECEIPT_CONTENT_MM = 48;

function receiptThermalCss() {
  return `<style>
  @page { margin: 0; size: ${RECEIPT_PAPER_MM}mm auto; }
  * { box-sizing: border-box; }
  html { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  body {
    margin: 2mm auto;
    padding: 2.5mm 2mm 4mm;
    max-width: ${RECEIPT_CONTENT_MM}mm;
    width: 100%;
    border: 1px solid #000;
    font-family: ui-monospace, 'Liberation Mono', 'DejaVu Sans Mono', Menlo, Consolas, monospace;
    font-size: 10px;
    line-height: 1.35;
    color: #000;
    background: #fff;
  }
  .row { margin: 4px 0; font-size: 10px; word-break: break-word; }
  h1 {
    font-size: 14px;
    text-align: center;
    margin: 0 0 2px;
    font-weight: 800;
    letter-spacing: -0.02em;
    word-break: break-word;
  }
  .sub { font-size: 9px; text-align: center; color: #333; margin: 0 0 8px; line-height: 1.3; }
  .hint { color: #555; }
  .paid {
    font-size: 15px;
    font-weight: 900;
    text-align: center;
    margin: 8px 0 2px;
    letter-spacing: 0.04em;
  }
  .sec { font-weight: 700; font-size: 10px; margin: 6px 0 3px; }
  table {
    width: 100%;
    border-collapse: collapse;
    font-size: 9px;
    margin: 4px 0 8px;
    table-layout: fixed;
  }
  th {
    text-align: left;
    font-size: 8px;
    color: #222;
    border-bottom: 1px solid #000;
    padding: 2px 1px;
    word-break: break-word;
  }
  td {
    border-bottom: 1px solid #bbb;
    padding: 3px 1px;
    vertical-align: top;
    word-break: break-word;
  }
  th:nth-child(1), td:nth-child(1) { width: 36%; }
  th:nth-child(2), td:nth-child(2) { width: 32%; }
  th:nth-child(3), td:nth-child(3) { width: 32%; }
  .num { text-align: right; white-space: nowrap; font-weight: 700; }
  .muted { color: #444; font-size: 8px; }
  .sm { font-size: 7px; white-space: normal; line-height: 1.25; }
  .tot {
    margin-top: 6px;
    padding: 5px 4px;
    border: 1px dashed #000;
    font-size: 10px;
  }
  .tot-row {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    gap: 4px;
    margin: 2px 0;
  }
  .tot-row span { flex: 1; min-width: 0; }
  .tot-row strong { white-space: nowrap; font-weight: 800; }
  hr { border: none; border-top: 1px dashed #888; margin: 6px 0; }
  .sum-hint { text-align: center; font-size: 9px; margin: 6px 0; line-height: 1.35; color: #333; }
  .sum-count { text-align: center; font-size: 8px; margin: 0 0 6px; color: #444; }
  .thanks { margin-top: 10px; }
</style>`;
}

function escapeHtml(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function itemsRowsHtml(items) {
  const rows = (items || []).map((it) => {
    const desc = escapeHtml(it.description || t('common_item'));
    const note = it.note ? escapeHtml(it.note) : '';
    const amt = escapeHtml(formatPeso(it.amount));
    const when = escapeHtml(formatDateTime(it.createdAt));
    return `<tr><td>${desc}${note ? `<br/><span class="muted">${note}</span>` : ''}</td><td class="num">${amt}</td><td class="muted sm">${when}</td></tr>`;
  });
  return rows.join('');
}

function paymentsRowsHtml(payments) {
  const pay = escapeHtml(t('receipt_payLine'));
  const rows = (payments || []).map((p) => {
    const note = p.note ? escapeHtml(p.note) : '';
    const amt = escapeHtml(formatPeso(p.amount));
    const when = escapeHtml(formatDateTime(p.createdAt));
    return `<tr><td>${pay}${note ? ` — ${note}` : ''}</td><td class="num">${amt}</td><td class="muted sm">${when}</td></tr>`;
  });
  return rows.join('');
}

export function buildUtangPageReceiptHtml({
  storeName,
  customer,
  page,
  variant = 'full',
}) {
  const isSummary = variant === 'summary';
  const title = escapeHtml(storeName || APP_DISPLAY_NAME);
  const custName = escapeHtml(customer?.name || '');
  const phone = customer?.phone ? escapeHtml(customer.phone) : '';
  const addr = customer?.address ? escapeHtml(customer.address) : '';
  const isPaid = page?.status === 'paid';
  const paidStamp = isPaid
    ? `<div class="paid">${escapeHtml(t('receipt_paidStamp'))}</div><p class="sub">${escapeHtml(formatDateTime(page.paidAt))}</p>`
    : `<p class="sub hint">${escapeHtml(t('receipt_openHint'))}</p>`;

  const itemsTotal = escapeHtml(formatPeso(page.itemsTotal ?? 0));
  const paidTotal = escapeHtml(formatPeso(page.paidTotal ?? 0));
  const due = escapeHtml(formatPeso(page.due ?? 0));

  const thDesc = escapeHtml(t('receipt_desc'));
  const thAmt = escapeHtml(t('receipt_amount'));
  const thDate = escapeHtml(t('receipt_date'));
  const thPay = escapeHtml(t('receipt_payLine'));
  const noPay = escapeHtml(t('receipt_noPayments'));
  const subLine = escapeHtml(
    isSummary ? t('receipt_subSummary') : t('receipt_sub')
  );

  const itemCount = (page?.items || []).length;
  const payCount = (page?.payments || []).length;

  const detailBlock = isSummary
    ? `<hr/>
  <p class="sum-hint">${escapeHtml(t('receipt_summaryReceiptHint'))}</p>
  <p class="sum-count">${escapeHtml(
    t('receipt_summaryCounts', { itemCount, payCount })
  )}</p>`
    : `<hr/>
  <p class="sec">${escapeHtml(t('receipt_items'))}</p>
  <table>
    <thead><tr><th>${thDesc}</th><th class="num">${thAmt}</th><th>${thDate}</th></tr></thead>
    <tbody>${itemsRowsHtml(page.items)}</tbody>
  </table>
  <p class="sec">${escapeHtml(t('receipt_payments'))}</p>
  <table>
    <thead><tr><th>${thPay}</th><th class="num">${thAmt}</th><th>${thDate}</th></tr></thead>
    <tbody>${paymentsRowsHtml(page.payments) || `<tr><td colspan="3" class="muted">${noPay}</td></tr>`}</tbody>
  </table>`;

  return `<!DOCTYPE html><html><head><meta charset="utf-8"/>
<meta name="viewport" content="width=384, initial-scale=1, maximum-scale=1"/>
${receiptThermalCss()}
</head><body>
  <h1>${title}</h1>
  <p class="sub">${subLine}</p>
  ${paidStamp}
  <div class="row"><strong>${custName}</strong></div>
  ${phone ? `<div class="muted">${phone}</div>` : ''}
  ${addr ? `<div class="muted">${addr}</div>` : ''}
  ${detailBlock}
  <div class="tot">
    <div class="tot-row"><span>${escapeHtml(t('receipt_subtotal'))}</span><strong>${itemsTotal}</strong></div>
    <div class="tot-row"><span>${escapeHtml(t('receipt_totalPaid'))}</span><strong>${paidTotal}</strong></div>
    <div class="tot-row"><span>${escapeHtml(t('receipt_due'))}</span><strong>${due}</strong></div>
  </div>
  <p class="sub thanks">${escapeHtml(t('receipt_thanks'))}</p>
</body></html>`;
}

function buildPagePlainText({ storeName, customer, page, variant = 'full' }) {
  const itemWord = t('common_item');
  const itemCount = (page.items || []).length;
  const payCount = (page.payments || []).length;

  if (variant === 'summary') {
    const lines = [
      storeName || APP_DISPLAY_NAME,
      t('receipt_sheetTitle'),
      '',
      `${t('receipt_customer')}: ${customer?.name || ''}`,
    ];
    if (customer?.phone) lines.push(customer.phone);
    if (customer?.address) lines.push(customer.address);
    lines.push(
      '',
      t('receipt_summaryReceiptHint'),
      t('receipt_summaryCounts', { itemCount, payCount }),
      '',
      `${t('receipt_subtotal')}: ${formatPeso(page.itemsTotal)}`,
      `${t('receipt_totalPaid')}: ${formatPeso(page.paidTotal)}`,
      `${t('receipt_due')}: ${formatPeso(page.due)}`
    );
    if (page.status === 'paid') {
      lines.push('', t('receipt_plainPaid', { date: formatDateTime(page.paidAt) }));
    }
    lines.push('', t('receipt_thanks'));
    return lines.join('\n');
  }

  const lines = [
    storeName || APP_DISPLAY_NAME,
    t('receipt_sheetTitle'),
    '',
    `${t('receipt_customer')}: ${customer?.name || ''}`,
  ];
  if (customer?.phone) lines.push(customer.phone);
  if (customer?.address) lines.push(customer.address);
  lines.push('', `${t('receipt_itemsSection')}`);
  for (const it of page.items || []) {
    lines.push(
      `  - ${it.description || itemWord}  ${formatPeso(it.amount)}  (${formatDateTime(it.createdAt)})`
    );
  }
  lines.push('', `${t('receipt_paymentsSection')}`);
  if (!(page.payments || []).length) lines.push(`  ${t('receipt_noneYet')}`);
  for (const p of page.payments || []) {
    lines.push(
      `  - ${formatPeso(p.amount)}  (${formatDateTime(p.createdAt)})${p.note ? ` ${p.note}` : ''}`
    );
  }
  lines.push(
    '',
    `${t('receipt_subtotal')}: ${formatPeso(page.itemsTotal)}`,
    `${t('receipt_totalPaid')}: ${formatPeso(page.paidTotal)}`,
    `${t('receipt_due')}: ${formatPeso(page.due)}`
  );
  if (page.status === 'paid') {
    lines.push('', t('receipt_plainPaid', { date: formatDateTime(page.paidAt) }));
  }
  lines.push('', t('receipt_thanks'));
  return lines.join('\n');
}

/**
 * Print one “sheet”. `variant`: `full` (itemized) or `summary` (totals + counts only).
 */
export async function printUtangPageReceipt({
  customer,
  page,
  variant = 'full',
}) {
  const storeName =
    Constants.expoConfig?.name ||
    Constants.expoConfig?.slug ||
    APP_DISPLAY_NAME;
  const html = buildUtangPageReceiptHtml({ storeName, customer, page, variant });
  try {
    await Print.printAsync({ html });
  } catch {
    await Share.share({
      message: buildPagePlainText({ storeName, customer, page, variant }),
      title: t('receipt_shareTitle'),
    });
  }
}
