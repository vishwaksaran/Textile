import 'server-only';

import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { STORE, storeAddressLines } from '@/lib/config';
import { INVOICE_LOGO_PNG, INVOICE_WATERMARK_JPG } from '@/lib/logo-data';
import { createAdminSupabase } from '@/lib/supabase/server';
import { describeItem, formatDate, invoiceNumber, shortOrderId } from '@/lib/utils';
import type { TaxSummary } from '@/lib/tax';
import type { Order } from '@/types';

const MAROON: [number, number, number] = [74, 4, 4];
const BRONZE: [number, number, number] = [140, 98, 57];
const INK: [number, number, number] = [31, 27, 19];

/** ₹ is not in jsPDF's built-in fonts, so invoices spell the currency out. */
function money(amount: number): string {
  return `Rs. ${amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/**
 * Renders a branded A4 tax invoice and returns the raw PDF bytes.
 *
 * `tax` is optional. Pass it and the invoice prints a compliant GST
 * breakdown — HSN codes, taxable value, and CGST+SGST or IGST. Omit it (or
 * switch the breakdown off in the admin screen) and it falls back to the
 * plain subtotal/shipping/total layout, which is what a shop that is not yet
 * GST-registered should be sending.
 */
export function buildInvoicePdf(order: Order, tax?: TaxSummary | null): Uint8Array {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 48;

  // -------------------------------------------------------------- watermark
  // Drawn first so every later element paints over it. The emblem is portrait,
  // so it is sized by width and centred in the body area below the letterhead.
  const pageHeight = doc.internal.pageSize.getHeight();
  const wmWidth = 300;
  const wmHeight = wmWidth * (512 / 370); // the emblem's own proportions
  doc.addImage(
    INVOICE_WATERMARK_JPG,
    'JPEG',
    (pageWidth - wmWidth) / 2,
    (pageHeight - wmHeight) / 2 + 30,
    wmWidth,
    wmHeight,
  );

  // ------------------------------------------------------------- letterhead
  // Deep enough for the emblem plus three address lines without crowding.
  const headerHeight = 118;
  doc.setFillColor(...MAROON);
  doc.rect(0, 0, pageWidth, headerHeight, 'F');

  // The emblem sits in a cream roundel so the maroon artwork reads against
  // the maroon band — inverting it would flatten the linework away.
  const logoSize = 62;
  const logoX = margin;
  const logoY = (headerHeight - logoSize) / 2;
  doc.setFillColor(255, 248, 240);
  doc.circle(logoX + logoSize / 2, logoY + logoSize / 2, logoSize / 2 + 3, 'F');
  doc.addImage(INVOICE_LOGO_PNG, 'PNG', logoX, logoY, logoSize, logoSize);

  const textX = logoX + logoSize + 18;

  doc.setTextColor(255, 224, 136);
  doc.setFont('times', 'bold');
  doc.setFontSize(21);
  doc.text(STORE.name, textX, 40);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(255, 253, 245);
  doc.text(STORE.tagline.toUpperCase(), textX, 54);

  // Each address line on its own row, so a long street address stays legible
  // rather than being squeezed onto one overflowing line.
  doc.setFontSize(8.5);
  storeAddressLines().forEach((line, i) => {
    doc.text(line, textX, 70 + i * 11);
  });

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  doc.setTextColor(255, 224, 136);
  doc.text('TAX INVOICE', pageWidth - margin, 40, { align: 'right' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(255, 253, 245);
  // Phone only, no email: the store is reached by call, and printing an
  // address nobody monitors on a tax document is worse than omitting it.
  doc.text(`GSTIN: ${STORE.gstin}`, pageWidth - margin, 58, { align: 'right' });
  doc.text(STORE.phone, pageWidth - margin, 72, { align: 'right' });

  // ---------------------------------------------------------- invoice meta
  let y = headerHeight + 44;
  doc.setTextColor(...INK);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text(`Invoice No: ${invoiceNumber(order.id, order.created_at)}`, margin, y);
  doc.setFont('helvetica', 'normal');
  doc.text(`Order ID: ${shortOrderId(order.id)}`, margin, y + 15);
  doc.text(`Invoice Date: ${formatDate(order.created_at)}`, margin, y + 30);
  if (order.razorpay_payment_id) {
    doc.text(`Payment ID: ${order.razorpay_payment_id}`, margin, y + 45);
  }
  // Place of supply decides whether the tax splits into CGST+SGST or falls
  // to IGST, so a GST invoice has to state it alongside the tax itself.
  if (tax) {
    doc.text(
      `Place of Supply: ${tax.placeOfSupply}${tax.buyerStateCode ? ` (${tax.buyerStateCode})` : ''}`,
      margin,
      y + (order.razorpay_payment_id ? 60 : 45),
    );
  }

  // --------------------------------------------------------------- bill to
  const rightX = pageWidth / 2 + 20;
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...BRONZE);
  doc.text('BILL TO', rightX, y);
  doc.setTextColor(...INK);
  doc.setFont('helvetica', 'normal');

  const addressLines = [
    order.customer_name,
    order.customer_address,
    [order.customer_city, order.customer_state].filter(Boolean).join(', '),
    order.customer_pincode ? `PIN ${order.customer_pincode}` : '',
    order.customer_phone ? `Phone: +91 ${order.customer_phone}` : '',
    order.customer_email,
  ].filter(Boolean) as string[];

  addressLines.forEach((line, i) => {
    doc.text(doc.splitTextToSize(line, pageWidth / 2 - margin - 20), rightX, y + 15 + i * 14);
  });

  y = Math.max(y + 45, y + 15 + addressLines.length * 14) + 24;

  // ----------------------------------------------------------- items table
  const items = order.order_items ?? [];

  // With a tax summary the table carries the columns a GST invoice needs —
  // HSN and taxable value per line. Without one it stays the simpler receipt.
  // `tax.lines` may hold a trailing shipping line that has no order_item, so
  // the goods lines are matched by index and shipping is left to the totals.
  const showTax = Boolean(tax);

  if (showTax && tax) {
    autoTable(doc, {
      startY: y,
      head: [['#', 'Item', 'HSN', 'Qty', 'Rate', 'Taxable', 'GST', 'Amount']],
      body: tax.lines.map((line, i) => [
        String(i + 1),
        line.description,
        line.hsn || '—',
        String(line.quantity),
        money(line.gross / Math.max(line.quantity, 1)),
        money(line.taxable),
        `${line.rate}%`,
        money(line.gross),
      ]),
      margin: { left: margin, right: margin },
      styles: { font: 'helvetica', fontSize: 8, cellPadding: 6, textColor: INK },
      headStyles: { fillColor: MAROON, textColor: [255, 224, 136], fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [251, 243, 229] },
      columnStyles: {
        0: { cellWidth: 20, halign: 'center' },
        2: { cellWidth: 46, halign: 'center' },
        3: { cellWidth: 26, halign: 'center' },
        4: { cellWidth: 68, halign: 'right' },
        5: { cellWidth: 68, halign: 'right' },
        6: { cellWidth: 32, halign: 'center' },
        7: { cellWidth: 72, halign: 'right' },
      },
    });
  } else {
    autoTable(doc, {
      startY: y,
      head: [['#', 'Item', 'Qty', 'Unit Price', 'Amount']],
      body: items.map((item, i) => [
        String(i + 1),
        describeItem(item),
        String(item.quantity),
        money(Number(item.price_at_time)),
        money(Number(item.price_at_time) * item.quantity),
      ]),
      margin: { left: margin, right: margin },
      styles: { font: 'helvetica', fontSize: 9, cellPadding: 8, textColor: INK },
      headStyles: { fillColor: MAROON, textColor: [255, 224, 136], fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [251, 243, 229] },
      columnStyles: {
        0: { cellWidth: 28, halign: 'center' },
        2: { cellWidth: 44, halign: 'center' },
        3: { cellWidth: 88, halign: 'right' },
        4: { cellWidth: 92, halign: 'right' },
      },
    });
  }

  // ---------------------------------------------------------------- totals
  const subtotal = items.reduce(
    (sum, item) => sum + Number(item.price_at_time) * item.quantity,
    0,
  );
  const total = Number(order.total_amount ?? subtotal);
  const shipping = Math.max(total - subtotal, 0);

  // jspdf-autotable augments the doc object at runtime without typings.
  const withTable = doc as unknown as { lastAutoTable?: { finalY: number } };
  let cursor = (withTable.lastAutoTable?.finalY ?? y) + 24;
  const labelX = pageWidth - margin - 180;
  const valueX = pageWidth - margin;

  // With a tax summary the totals show the statutory build-up: taxable value,
  // then the tax split by place of supply, then the amount actually charged.
  // The final figure is always `total` — the sum Razorpay captured — because
  // tax is extracted from a tax-inclusive price rather than added to it.
  const rows: [string, string, boolean?][] = tax
    ? [
        ['Taxable Value', money(tax.totals.taxable)],
        ...(tax.intraState
          ? tax.byRate.flatMap<[string, string, boolean?]>((b) => [
              [`CGST @ ${b.rate / 2}%`, money(b.cgst)],
              [`SGST @ ${b.rate / 2}%`, money(b.sgst)],
            ])
          : tax.byRate.map<[string, string, boolean?]>((b) => [
              `IGST @ ${b.rate}%`,
              money(b.igst),
            ])),
        ['Total Paid', money(total), true],
      ]
    : [
        ['Subtotal', money(subtotal)],
        ['Shipping', shipping === 0 ? 'Free' : money(shipping)],
        ['Total Paid', money(total), true],
      ];

  rows.forEach(([label, value, emphasis]) => {
    doc.setFont('helvetica', emphasis ? 'bold' : 'normal');
    doc.setFontSize(emphasis ? 12 : 10);
    doc.setTextColor(...(emphasis ? MAROON : INK));
    doc.text(label, labelX, cursor);
    doc.text(value, valueX, cursor, { align: 'right' });
    cursor += emphasis ? 20 : 16;
  });

  doc.setDrawColor(212, 175, 55);
  doc.line(labelX, cursor - 34, valueX, cursor - 34);

  // ---------------------------------------------------------------- footer
  const footerY = pageHeight - 70;
  doc.setDrawColor(212, 175, 55);
  doc.line(margin, footerY - 18, pageWidth - margin, footerY - 18);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(...BRONZE);
  doc.text(
    'Thank you for supporting handloom weavers. Every piece is woven by hand and carries an authenticity card.',
    margin,
    footerY,
  );
  doc.text(
    `Questions? Call ${STORE.phone}. This is a computer-generated invoice.`,
    margin,
    footerY + 12,
  );

  return new Uint8Array(doc.output('arraybuffer'));
}

/**
 * Uploads the invoice to Supabase Storage and returns its public URL.
 * Returns null when storage is unavailable — callers fall back to the
 * on-the-fly `/api/invoice/[id]` route.
 */
export async function uploadInvoice(order: Order, pdf: Uint8Array): Promise<string | null> {
  const supabase = createAdminSupabase();
  if (!supabase) return null;

  const path = `${invoiceNumber(order.id, order.created_at)}.pdf`;
  const { error } = await supabase.storage
    .from('invoices')
    .upload(path, pdf, { contentType: 'application/pdf', upsert: true });

  if (error) return null;

  const { data } = supabase.storage.from('invoices').getPublicUrl(path);
  return data.publicUrl;
}
