/**
 * Renders a sample GST invoice to a file so the layout can be eyeballed
 * without placing an order.
 *
 *   npm run invoice:preview            (Tamil Nadu buyer, CGST + SGST)
 *   npm run invoice:preview -- --inter (Karnataka buyer, IGST)
 */
import { writeFileSync } from 'node:fs';
import { buildInvoicePdf } from '../lib/invoice';
import { computeTax } from '../lib/tax';
import { STORE } from '../lib/config';
import type { Order } from '../types';

const inter = process.argv.includes('--inter');
const buyerState = inter ? 'Karnataka' : 'Tamil Nadu';

const order = {
  id: '9ba42876-3774-4480-86c8-b040ca0e8c77',
  razorpay_order_id: 'order_TVw0fj6gAmdoh7',
  razorpay_payment_id: 'pay_TVw0fj6gAmdoh7',
  customer_name: 'Meenakshi Raman',
  customer_email: 'meenakshi@example.com',
  customer_phone: '9789467448',
  customer_address: '12 Race Course Road',
  customer_city: 'Coimbatore',
  customer_state: buyerState,
  customer_pincode: '641018',
  total_amount: 52000,
  payment_status: 'paid',
  order_status: 'processing',
  tracking_id: null,
  courier_name: null,
  invoice_url: null,
  is_intra_state: null,
  place_of_supply: buyerState,
  notified_whatsapp_at: null,
  notified_sms_at: null,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  order_items: [
    {
      id: 'i1',
      order_id: '9ba42876-3774-4480-86c8-b040ca0e8c77',
      product_id: 'p1',
      quantity: 1,
      price_at_time: 44000,
      hsn_at_time: '5007',
      gst_rate_at_time: 5,
      products: { id: 'p1', name: 'Kanchipuram bridal silk saree', images: [], hsn_code: '5007', gst_rate: 5 },
    },
    {
      id: 'i2',
      order_id: '9ba42876-3774-4480-86c8-b040ca0e8c77',
      product_id: 'p2',
      quantity: 2,
      price_at_time: 4000,
      hsn_at_time: '5208',
      gst_rate_at_time: 5,
      products: { id: 'p2', name: 'Khadi cotton saree, indigo border', images: [], hsn_code: '5208', gst_rate: 5 },
    },
  ],
} as unknown as Order;

const items = (order.order_items ?? []).map((item) => ({
  description: item.products?.name ?? 'Handloom piece',
  quantity: item.quantity,
  gross: Number(item.price_at_time) * item.quantity,
  hsn: item.hsn_at_time,
  rate: item.gst_rate_at_time,
}));

const tax = computeTax({ items, buyerState, sellerGstin: STORE.gstin });

const out = inter ? 'invoice-preview-igst.pdf' : 'invoice-preview-cgst-sgst.pdf';
writeFileSync(out, buildInvoicePdf(order, tax));

const kb = (n: number) => `${(n / 1024).toFixed(0)} KB`;
console.log(`\n  ${inter ? 'INTER-state (IGST)' : 'INTRA-state (CGST + SGST)'} — buyer in ${buyerState}\n`);
for (const line of tax.lines) {
  console.log(
    `    ${line.description.padEnd(38).slice(0, 38)} HSN ${line.hsn.padEnd(6)} ` +
      `${String(line.rate).padStart(2)}%  taxable ${line.taxable.toFixed(2).padStart(10)}  gross ${line.gross.toFixed(2).padStart(10)}`,
  );
}
console.log(`\n    taxable value  ${tax.totals.taxable.toFixed(2).padStart(12)}`);
if (tax.intraState) {
  console.log(`    CGST           ${tax.totals.cgst.toFixed(2).padStart(12)}`);
  console.log(`    SGST           ${tax.totals.sgst.toFixed(2).padStart(12)}`);
} else {
  console.log(`    IGST           ${tax.totals.igst.toFixed(2).padStart(12)}`);
}
console.log(`    total charged  ${tax.totals.gross.toFixed(2).padStart(12)}`);
console.log(
  `\n  reconciles: ${
    Math.round((tax.totals.taxable + tax.totals.tax) * 100) === Math.round(tax.totals.gross * 100)
      ? 'yes'
      : 'NO'
  }`,
);
console.log(`  matches order total ${order.total_amount}: ${tax.totals.gross === Number(order.total_amount) ? 'yes' : 'NO'}`);
console.log(`\n  wrote ${out} (${kb(buildInvoicePdf(order, tax).length)})\n`);
