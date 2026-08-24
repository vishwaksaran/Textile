import 'server-only';

import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { STORE } from '@/lib/config';
import { createAdminSupabase } from '@/lib/supabase/server';
import { formatDate, invoiceNumber, shortOrderId } from '@/lib/utils';
import type { Order } from '@/types';

const MAROON: [number, number, number] = [74, 4, 4];
const BRONZE: [number, number, number] = [140, 98, 57];
const INK: [number, number, number] = [31, 27, 19];

/** ₹ is not in jsPDF's built-in fonts, so invoices spell the currency out. */
function money(amount: number): string {
  return `Rs. ${amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/** Renders a branded A4 tax invoice and returns the raw PDF bytes. */
export function buildInvoicePdf(order: Order): Uint8Array {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 48;

  // ------------------------------------------------------------- letterhead
  doc.setFillColor(...MAROON);
  doc.rect(0, 0, pageWidth, 96, 'F');

  doc.setTextColor(255, 224, 136);
  doc.setFont('times', 'bold');
  doc.setFontSize(22);
  doc.text(STORE.name, margin, 44);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(255, 253, 245);
  doc.text(STORE.tagline, margin, 62);
  doc.text(
    `${STORE.address.line1}, ${STORE.address.line2}, ${STORE.address.city} - ${STORE.address.pincode}`,
    margin,
    76,
  );

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(255, 224, 136);
  doc.text('TAX INVOICE', pageWidth - margin, 44, { align: 'right' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(255, 253, 245);
  doc.text(`GSTIN: ${STORE.gstin}`, pageWidth - margin, 62, { align: 'right' });

  // ---------------------------------------------------------- invoice meta
  let y = 130;
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
  autoTable(doc, {
    startY: y,
    head: [['#', 'Item', 'Qty', 'Unit Price', 'Amount']],
    body: items.map((item, i) => [
      String(i + 1),
      item.products?.name ?? 'Handloom piece',
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

  const rows: [string, string, boolean?][] = [
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
  const footerY = doc.internal.pageSize.getHeight() - 70;
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
    `Questions? Write to ${STORE.email} or call ${STORE.phone}. This is a computer-generated invoice.`,
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
