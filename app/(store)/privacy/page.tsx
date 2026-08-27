import type { Metadata } from 'next';
import { ProsePage } from '@/components/store/prose-page';
import { STORE } from '@/lib/config';
import { canonical } from '@/lib/seo';

export const metadata: Metadata = {
  alternates: { canonical: canonical('/privacy') },
  title: 'Privacy Policy',
  description: 'What we collect, why, who we share it with, and how to have it deleted.',
};

export default function PrivacyPage() {
  return (
    <ProsePage
      eyebrow="Your details"
      title="Privacy Policy"
      intro="We collect the minimum needed to send you a saree and an invoice, and nothing else."
    >
      <h2>What we collect</h2>
      <ul>
        <li>Your name, email, mobile number and shipping address, taken at checkout.</li>
        <li>Your order history and the invoices raised against it.</li>
        <li>Basic, aggregated analytics about how pages perform. No advertising trackers.</li>
      </ul>
      <p>
        We never see or store your card, UPI or netbanking credentials. Those go directly to
        Razorpay, our payment gateway.
      </p>

      <h2>Why we need it</h2>
      <ul>
        <li>Your address and phone number so a courier can deliver the parcel.</li>
        <li>Your mobile number so we can send tracking updates by WhatsApp and SMS.</li>
        <li>Your email for the order confirmation and the tax invoice.</li>
      </ul>

      <h2>Who else sees it</h2>
      <ul>
        <li><strong>Razorpay</strong> — to take the payment and to process any refund.</li>
        <li><strong>The courier</strong> — name, address and phone number, on the shipping label.</li>
        <li><strong>Meta (WhatsApp) and our SMS provider</strong> — your number, to deliver tracking.</li>
        <li><strong>Supabase and Vercel</strong> — who host the database and the website.</li>
      </ul>
      <p>We do not sell your data, and we do not share it for advertising.</p>

      <h2>Messages you can turn off</h2>
      <p>
        Tracking updates are transactional and are sent for every order. Newsletter emails are
        optional — every one carries an unsubscribe link, and asking us once is enough.
      </p>

      <h2>How long we keep it</h2>
      <p>
        Order and invoice records are retained for eight years, as Indian tax rules require.
        Everything else is deleted when you ask.
      </p>

      <h2>Your rights</h2>
      <p>
        Write to <a href={`mailto:${STORE.email}`}>{STORE.email}</a> to see, correct or delete what
        we hold about you. We reply within seven working days.
      </p>
    </ProsePage>
  );
}
