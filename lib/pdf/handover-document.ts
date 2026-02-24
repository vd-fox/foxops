import { readFile } from 'fs/promises';
import path from 'path';
import puppeteer from 'puppeteer';

type GeneralItem = { name: string; quantity: string };
type PdaItem = {
  name: string;
  quantity: string;
  type: string;
  customFlags: string;
  systemFlags: string;
  simCardId: string;
  phoneNumber: string;
  description: string;
};
type MobilePrinterItem = {
  name: string;
  quantity: string;
  type: string;
  customFlags: string;
  systemFlags: string;
  description: string;
};

export interface HandoverDocumentPayload {
  receiverName: string;
  date: string;
  location: string;
  giverName: string;
  giverSignature?: string | null;
  giverLabel: string;
  receiverLabel: string;
  notes: string;
  generalItems: GeneralItem[];
  pdaItems: PdaItem[];
  mobilePrinters: MobilePrinterItem[];
  receiverSignature?: string | null;
}

const TEMPLATE_PATH = path.join(process.cwd(), 'lib/pdf/templates/handover.html');
let cachedTemplate: string | null = null;

const loadTemplate = async () => {
  if (!cachedTemplate) {
    cachedTemplate = await readFile(TEMPLATE_PATH, 'utf8');
  }
  return cachedTemplate;
};

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

const buildRows = <T>(
  data: T[],
  renderer: (item: T, index: number) => string,
  emptyColspan = 3
) => {
  if (!data.length) {
    return `<tr><td colspan="${emptyColspan}" style="text-align:center;color:#777;">Nincs adat</td></tr>`;
  }
  return data.map(renderer).join('\n');
};

const renderSignature = (dataUrl?: string | null) => {
  if (!dataUrl) {
    return '<span style="color:#777;font-size:10px;">Nincs digitális aláírás</span>';
  }
  return `<img src="${dataUrl}" alt="Aláírás" />`;
};

const injectContent = (template: string, payload: HandoverDocumentPayload) => {
  const generalRows = buildRows(payload.generalItems, (item, index) => `
    <tr>
      <td>${index + 1}</td>
      <td>${escapeHtml(item.name)}</td>
      <td>${escapeHtml(item.quantity)}</td>
    </tr>
  `);

  const pdaRows = buildRows(payload.pdaItems, (item, index) => `
    <tr>
      <td>${index + 1}</td>
      <td>${escapeHtml(item.name)}</td>
      <td>${escapeHtml(item.quantity)}</td>
      <td>${escapeHtml(item.type)}</td>
      <td>${escapeHtml(item.customFlags)}</td>
      <td>${escapeHtml(item.systemFlags)}</td>
      <td>${escapeHtml(item.simCardId)}</td>
      <td>${escapeHtml(item.phoneNumber)}</td>
      <td>${escapeHtml(item.description)}</td>
    </tr>
  `, 9);

  const printerRows = buildRows(payload.mobilePrinters, (item, index) => `
    <tr>
      <td>${index + 1}</td>
      <td>${escapeHtml(item.name)}</td>
      <td>${escapeHtml(item.quantity)}</td>
      <td>${escapeHtml(item.type)}</td>
      <td>${escapeHtml(item.customFlags)}</td>
      <td>${escapeHtml(item.systemFlags)}</td>
      <td>${escapeHtml(item.description)}</td>
    </tr>
  `, 7);

  return template
    .replace(/{{RECEIVER_NAME}}/g, escapeHtml(payload.receiverName))
    .replace(/{{GIVER_NAME}}/g, escapeHtml(payload.giverName))
    .replace(/{{GIVER_LABEL}}/g, escapeHtml(payload.giverLabel))
    .replace(/{{RECEIVER_LABEL}}/g, escapeHtml(payload.receiverLabel))
    .replace(/{{DATE}}/g, escapeHtml(payload.date))
    .replace(/{{LOCATION}}/g, escapeHtml(payload.location))
    .replace(/{{NOTES}}/g, escapeHtml(payload.notes ?? ''))
    .replace('{{GENERAL_ITEMS_ROWS}}', generalRows)
    .replace('{{PDA_ROWS}}', pdaRows)
    .replace('{{MOBILE_PRINTER_ROWS}}', printerRows)
    .replace('{{GIVER_SIGNATURE}}', renderSignature(payload.giverSignature))
    .replace('{{RECEIVER_SIGNATURE}}', renderSignature(payload.receiverSignature));
};

export async function generateHandoverPdf(payload: HandoverDocumentPayload) {
  const template = await loadTemplate();
  const html = injectContent(template, payload);

  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--font-render-hinting=medium']
  });

  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0' });
    await page.emulateMediaType('screen');
    return await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: '15mm', bottom: '15mm', left: '15mm', right: '15mm' }
    });
  } finally {
    await browser.close();
  }
}
