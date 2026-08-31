import Link from 'next/link';
import { CircleSlash, Store, Video } from 'lucide-react';
import { STORE } from '@/lib/config';

/**
 * The exchange terms, stated on the product page rather than only on the
 * policy page.
 *
 * Two of these conditions are ones a customer cannot satisfy after the fact:
 * the unboxing video has to be recorded at the moment the parcel is opened,
 * and an exchange has to be brought to the shop in person. Telling someone
 * that once the parcel is already open, or once they have posted it back, is
 * telling them too late — so it is said here, before the money is spent,
 * where nobody has to go looking for it.
 */
export function ProductPolicyNote() {
  return (
    <section
      aria-labelledby="policy-note"
      className="rounded-lg border border-outline-variant/50 bg-surface-container-low p-5"
    >
      <h2
        id="policy-note"
        className="mb-1 font-label-sm text-label-sm uppercase tracking-widest text-earthy-bronze"
      >
        Before you order
      </h2>
      <p className="mb-4 font-body-md text-sm text-on-surface-variant">
        Every piece is checked by hand before it is packed. Please read these three
        conditions — two of them cannot be met after the parcel is opened.
      </p>

      <ul className="space-y-4">
        <li className="flex gap-3">
          <Video className="mt-0.5 h-5 w-5 flex-none text-deep-maroon" strokeWidth={1.5} />
          <div>
            <p className="font-body-md text-body-md font-semibold text-on-surface">
              Record an unboxing video
            </p>
            <p className="mt-0.5 font-body-md text-sm text-on-surface-variant">
              Start filming <strong>before</strong> you cut the packaging and keep going in
              one take until the piece is fully unfolded. This video is required for any
              cancellation or exchange claim — without it we cannot raise the matter with
              the courier, and we cannot process the request.
            </p>
          </div>
        </li>

        <li className="flex gap-3">
          <Store className="mt-0.5 h-5 w-5 flex-none text-deep-maroon" strokeWidth={1.5} />
          <div>
            <p className="font-body-md text-body-md font-semibold text-on-surface">
              Exchanges are handled at the shop
            </p>
            <p className="mt-0.5 font-body-md text-sm text-on-surface-variant">
              Message us on WhatsApp as soon as you open the parcel, with the video and a
              photograph of the fault — that part matters straight away, wherever you are.
              Then bring the piece to us at {STORE.address.landmark}, {STORE.address.city},
              with its tags and authenticity card, whenever you are next able to. Exchanges
              cannot be completed by post or online: we need to see the cloth and the fault
              ourselves.
            </p>
          </div>
        </li>

        <li className="flex gap-3">
          <CircleSlash className="mt-0.5 h-5 w-5 flex-none text-deep-maroon" strokeWidth={1.5} />
          <div>
            <p className="font-body-md text-body-md font-semibold text-on-surface">
              Defects only — no returns on preference
            </p>
            <p className="mt-0.5 font-body-md text-sm text-on-surface-variant">
              We exchange a piece that reaches you faulty or damaged. We cannot take one
              back for colour, size, style or a change of mind, because each piece is one of
              a kind. Ask us for more photographs or a video in daylight before you order —
              we would far rather help you choose than process an exchange afterwards.
            </p>
          </div>
        </li>
      </ul>

      <p className="mt-4 font-body-md text-xs text-on-surface-variant">
        Full terms on the{' '}
        <Link href="/returns" className="text-deep-maroon underline">
          Return &amp; Exchange Policy
        </Link>{' '}
        page. Questions before ordering? Call {STORE.phone}.
      </p>
    </section>
  );
}
