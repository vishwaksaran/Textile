'use client';

import * as React from 'react';
import Link from 'next/link';
import Script from 'next/script';
import { useRouter } from 'next/navigation';
import { Loader2, Lock, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Field, Input, Select, Textarea } from '@/components/ui/input';
import { OrderSummary } from '@/components/store/order-summary';
import { Skeleton } from '@/components/shared/skeleton';
import { useCartStore, cartTotals } from '@/stores/cart-store';
import { STORE, appUrl } from '@/lib/config';
import { INDIAN_STATES } from '@/lib/states';
import { citiesForState } from '@/lib/cities';
import {
  formatINR,
  isValidEmail,
  isValidIndianPhone,
  isValidPincode,
  normalisePhone,
} from '@/lib/utils';
import type { CheckoutDetails } from '@/types';
import type {
  RazorpayFailureResponse,
  RazorpaySuccessResponse,
} from '@/types/razorpay';

const EMPTY: CheckoutDetails = {
  name: '',
  email: '',
  phone: '',
  address: '',
  city: '',
  state: '',
  pincode: '',
};

const DRAFT_KEY = 'sls-checkout-draft';

type Errors = Partial<Record<keyof CheckoutDetails, string>>;

function validate(details: CheckoutDetails): Errors {
  const errors: Errors = {};
  if (details.name.trim().length < 2) errors.name = 'Please enter your full name.';
  if (!isValidEmail(details.email)) errors.email = 'We need a valid email for your invoice.';
  if (!isValidIndianPhone(details.phone))
    errors.phone = 'Enter a 10-digit Indian mobile number.';
  if (details.address.trim().length < 8)
    errors.address = 'Include the house number, street and landmark.';
  if (!details.city.trim()) errors.city = 'Which city should we ship to?';
  if (!details.state) errors.state = 'Please select your state.';
  if (!isValidPincode(details.pincode)) errors.pincode = 'Enter a valid 6-digit pincode.';
  return errors;
}

export function CheckoutForm() {
  const router = useRouter();
  const items = useCartStore((s) => s.items);
  const hydrated = useCartStore((s) => s.hydrated);
  const clear = useCartStore((s) => s.clear);
  const reconcile = useCartStore((s) => s.reconcile);

  const [details, setDetails] = React.useState<CheckoutDetails>(EMPTY);
  const [errors, setErrors] = React.useState<Errors>({});
  const [submitting, setSubmitting] = React.useState(false);
  const [scriptReady, setScriptReady] = React.useState(false);

  const cityOptions = React.useMemo(() => citiesForState(details.state), [details.state]);

  // The form survives a failed payment or an accidental reload.
  React.useEffect(() => {
    try {
      const saved = localStorage.getItem(DRAFT_KEY);
      if (saved) setDetails({ ...EMPTY, ...JSON.parse(saved) });
    } catch {
      /* private mode or corrupt draft — start fresh */
    }
  }, []);

  React.useEffect(() => {
    try {
      localStorage.setItem(DRAFT_KEY, JSON.stringify(details));
    } catch {
      /* storage full or blocked; the draft is a convenience only */
    }
  }, [details]);

  const totals = cartTotals(items);

  function set<K extends keyof CheckoutDetails>(key: K, value: CheckoutDetails[K]) {
    setDetails((d) => ({ ...d, [key]: value }));
    setErrors((e) => ({ ...e, [key]: undefined }));
  }

  async function handlePay() {
    const found = validate(details);
    setErrors(found);
    if (Object.keys(found).length > 0) {
      const first = Object.keys(found)[0];
      document.getElementById(first)?.focus();
      toast.error('Please check the highlighted fields.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/razorpay/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: items.map((i) => ({ productId: i.productId, quantity: i.quantity })),
          customer: { ...details, phone: normalisePhone(details.phone) },
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (data.code === 'CART_INVALID') {
          // Stock moved under us — repair the cart and send them back.
          const check = await fetch('/api/cart/validate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ productIds: items.map((i) => i.productId) }),
          });
          if (check.ok) reconcile((await check.json()).levels);
          toast.error(data.error, { description: 'Your cart has been updated.' });
          router.push('/cart');
          return;
        }
        toast.error(data.error ?? 'Could not start the payment.');
        return;
      }

      // ------------------------------------------------- demo (no Razorpay keys)
      if (data.demo) {
        toast.info('Demo checkout', {
          description: 'No Razorpay keys are configured, so the payment is simulated.',
        });
        await finalise({
          razorpay_order_id: data.razorpayOrderId,
          razorpay_payment_id: `demo_pay_${Date.now().toString(36)}`,
          razorpay_signature: '',
        });
        return;
      }

      // ----------------------------------------------------------- live payment
      if (!window.Razorpay) {
        toast.error('Payment window could not load. Please refresh and try again.');
        return;
      }

      const checkout = new window.Razorpay({
        key: data.keyId,
        amount: data.amount,
        currency: data.currency,
        name: STORE.name,
        image: appUrl('/icon.png'),
        description: `Order ${data.shortId ?? ''}`.trim(),
        order_id: data.razorpayOrderId,
        prefill: {
          name: details.name,
          email: details.email,
          contact: `+91${normalisePhone(details.phone)}`,
        },
        notes: { address: `${details.city}, ${details.state}` },
        theme: { color: '#4A0404' },
        retry: { enabled: true },
        modal: {
          confirm_close: true,
          ondismiss: () => {
            setSubmitting(false);
            toast.info('Payment cancelled', {
              description: 'Your cart and details have been kept.',
            });
          },
        },
        handler: (response: RazorpaySuccessResponse) => {
          void finalise(response);
        },
      });

      checkout.on('payment.failed', (response: RazorpayFailureResponse) => {
        setSubmitting(false);
        void fetch('/api/razorpay/verify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            failed: true,
            orderId: data.orderId,
            reason: response.error?.description,
          }),
        });
        toast.error('Payment failed', {
          description: response.error?.description ?? 'Please try another method.',
        });
      });

      checkout.open();
    } catch {
      toast.error('Network error', { description: 'Please check your connection and retry.' });
      setSubmitting(false);
    }
  }

  async function finalise(response: RazorpaySuccessResponse) {
    try {
      const res = await fetch('/api/razorpay/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(response),
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        toast.error(data.error ?? 'We could not verify that payment.', {
          description: 'If money left your account, write to us with the payment id.',
        });
        setSubmitting(false);
        return;
      }

      clear();
      try {
        localStorage.removeItem(DRAFT_KEY);
      } catch {
        /* nothing to clean up */
      }
      router.push(`/order/success?id=${data.orderId}`);
    } catch {
      toast.error('Payment taken, confirmation delayed', {
        description: 'Please do not pay again — check your email in a few minutes.',
      });
      setSubmitting(false);
    }
  }

  // ------------------------------------------------------------------ render
  if (!hydrated) {
    return (
      <div className="container-page grid grid-cols-1 gap-10 py-10 lg:grid-cols-[1fr_380px]">
        <div className="space-y-4">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-14 w-full" />
          ))}
        </div>
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="container-page flex flex-col items-center gap-5 py-24 text-center">
        <h1 className="font-headline-lg text-headline-lg text-deep-maroon">
          There is nothing to check out
        </h1>
        <p className="max-w-md font-body-md text-body-md text-on-surface-variant">
          Your cart is empty. Add a piece and we will hold it while you complete the details.
        </p>
        <Button asChild size="lg" shine>
          <Link href="/collections">Browse collections</Link>
        </Button>
      </div>
    );
  }

  return (
    <>
      <Script
        src="https://checkout.razorpay.com/v1/checkout.js"
        strategy="lazyOnload"
        onLoad={() => setScriptReady(true)}
      />

      <div className="container-page grid grid-cols-1 gap-10 py-10 lg:grid-cols-[1fr_380px] lg:gap-gutter">
        <div>
          <h1 className="mb-2 font-headline-lg text-headline-lg text-deep-maroon">Checkout</h1>
          <p className="mb-8 font-body-md text-body-md text-on-surface-variant">
            We ship insured, pan-India. Tracking arrives by WhatsApp and SMS.
          </p>

          <form
            className="space-y-8"
            noValidate
            onSubmit={(e) => {
              e.preventDefault();
              void handlePay();
            }}
          >
            <section className="space-y-5">
              <h2 className="font-label-sm text-label-sm uppercase tracking-widest text-earthy-bronze">
                Contact
              </h2>

              <Field label="Full name" htmlFor="name" error={errors.name} required>
                <Input
                  id="name"
                  name="name"
                  autoComplete="name"
                  enterKeyHint="next"
                  value={details.name}
                  onChange={(e) => set('name', e.target.value)}
                  aria-invalid={Boolean(errors.name)}
                />
              </Field>

              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                <Field label="Email" htmlFor="email" error={errors.email} required hint="Your invoice goes here.">
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    inputMode="email"
                    autoComplete="email"
                    enterKeyHint="next"
                    value={details.email}
                    onChange={(e) => set('email', e.target.value)}
                    aria-invalid={Boolean(errors.email)}
                  />
                </Field>

                <Field label="Mobile" htmlFor="phone" error={errors.phone} required>
                  <div className="flex items-center gap-2">
                    <span className="font-body-md text-body-md text-on-surface-variant">+91</span>
                    <Input
                      id="phone"
                      name="phone"
                      type="tel"
                      inputMode="numeric"
                      autoComplete="tel-national"
                      enterKeyHint="next"
                      maxLength={11}
                      placeholder="98765 43210"
                      value={details.phone}
                      onChange={(e) => set('phone', e.target.value.replace(/[^\d\s]/g, ''))}
                      aria-invalid={Boolean(errors.phone)}
                    />
                  </div>
                </Field>
              </div>
            </section>

            <section className="space-y-5">
              <h2 className="font-label-sm text-label-sm uppercase tracking-widest text-earthy-bronze">
                Shipping address
              </h2>

              <Field label="Address" htmlFor="address" error={errors.address} required>
                <Textarea
                  id="address"
                  name="address"
                  autoComplete="street-address"
                  rows={3}
                  placeholder="House / flat number, street, landmark"
                  value={details.address}
                  onChange={(e) => set('address', e.target.value)}
                  aria-invalid={Boolean(errors.address)}
                />
              </Field>

              {/* State comes first now, because the city suggestions depend on
                  it — asking for the city before knowing the state would offer
                  nothing useful. */}
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
                <Field label="State" htmlFor="state" error={errors.state} required>
                  <Select
                    id="state"
                    name="state"
                    autoComplete="address-level1"
                    value={details.state}
                    onChange={(e) => {
                      set('state', e.target.value);
                      // A city from the previous state is almost certainly
                      // wrong for the new one, and a stale value here would be
                      // posted to the courier without anyone noticing.
                      if (details.city) set('city', '');
                    }}
                    aria-invalid={Boolean(errors.state)}
                  >
                    <option value="">Select</option>
                    {INDIAN_STATES.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </Select>
                </Field>

                {/* Suggestions, not a whitelist: the list covers the cities we
                    post to most, and anywhere else can still be typed. A strict
                    dropdown would lose the sale of a customer whose town is not
                    on a hand-kept list — and the pincode is what routes the
                    parcel anyway. */}
                <Field
                  label="City"
                  htmlFor="city"
                  error={errors.city}
                  hint={
                    details.state
                      ? cityOptions.length > 0
                        ? 'Pick from the list, or type your town.'
                        : undefined
                      : 'Choose a state first for suggestions.'
                  }
                  required
                >
                  <Input
                    id="city"
                    name="city"
                    list="city-options"
                    autoComplete="address-level2"
                    placeholder={cityOptions[0] ? `e.g. ${cityOptions[0]}` : undefined}
                    value={details.city}
                    onChange={(e) => set('city', e.target.value)}
                    aria-invalid={Boolean(errors.city)}
                  />
                  <datalist id="city-options">
                    {cityOptions.map((c) => (
                      <option key={c} value={c} />
                    ))}
                  </datalist>
                </Field>

                <Field label="Pincode" htmlFor="pincode" error={errors.pincode} required>
                  <Input
                    id="pincode"
                    name="pincode"
                    inputMode="numeric"
                    autoComplete="postal-code"
                    enterKeyHint="done"
                    maxLength={6}
                    value={details.pincode}
                    onChange={(e) => set('pincode', e.target.value.replace(/\D/g, ''))}
                    aria-invalid={Boolean(errors.pincode)}
                  />
                </Field>
              </div>
            </section>

            <div className="hidden lg:block">
              <PayButton submitting={submitting} total={totals.total} ready={scriptReady} />
            </div>
          </form>
        </div>

        <div className="lg:sticky lg:top-28 lg:h-fit">
          <OrderSummary items={items} showItems>
            <div className="space-y-4">
              <div className="lg:hidden">
                <PayButton
                  submitting={submitting}
                  total={totals.total}
                  ready={scriptReady}
                  onClick={() => void handlePay()}
                />
              </div>
              <p className="flex items-center justify-center gap-2 font-body-md text-xs text-on-surface-variant">
                <ShieldCheck className="h-3.5 w-3.5 text-earthy-bronze" />
                Secured by Razorpay · UPI, cards, netbanking
              </p>
            </div>
          </OrderSummary>
        </div>
      </div>
    </>
  );
}

function PayButton({
  submitting,
  total,
  ready,
  onClick,
}: {
  submitting: boolean;
  total: number;
  ready: boolean;
  onClick?: () => void;
}) {
  return (
    <Button
      type={onClick ? 'button' : 'submit'}
      onClick={onClick}
      size="lg"
      shine
      className="w-full"
      disabled={submitting}
      aria-busy={submitting}
    >
      {submitting ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" />
          Opening payment…
        </>
      ) : (
        <>
          <Lock className="h-4 w-4" />
          Pay {formatINR(total)}
        </>
      )}
      {!ready && <span className="sr-only">Payment window still loading</span>}
    </Button>
  );
}
