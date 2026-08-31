import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Truck, ShieldCheck, RotateCcw, type LucideIcon } from 'lucide-react';
import { Breadcrumbs } from '@/components/store/breadcrumbs';
import { ProductGallery } from '@/components/store/product-gallery';
import { AddToCart } from '@/components/store/add-to-cart';
import { ProductPolicyNote } from '@/components/store/product-policy-note';
import { StickyBuyBar } from '@/components/store/sticky-buy-bar';
import { RelatedCarousel } from '@/components/store/related-carousel';
import { Badge } from '@/components/ui/badge';
import { AnimatedPage } from '@/components/shared/motion';
import { getProductById, getRelatedProducts } from '@/lib/data';
import { COMMERCE, STORE } from '@/lib/config';
import { discountPercent, effectivePrice, formatINR } from '@/lib/utils';
import { breadcrumbJsonLd, canonical } from '@/lib/seo';
import { getCategoryAttributes, getProductAttributeValues } from '@/lib/attributes';

export const revalidate = 120;

export async function generateMetadata({
  params,
}: {
  params: { id: string };
}): Promise<Metadata> {
  const product = await getProductById(params.id);
  if (!product) return { title: 'Piece not found' };

  return {
    alternates: { canonical: canonical(`/product/${product.id}`) },
    title: product.name,
    description: product.description?.slice(0, 160),
    openGraph: {
      title: product.name,
      description: product.description?.slice(0, 160),
      images: product.images?.[0] ? [product.images[0]] : undefined,
    },
  };
}

export default async function ProductPage({ params }: { params: { id: string } }) {
  const product = await getProductById(params.id);
  if (!product) notFound();

  const related = await getRelatedProducts(product);

  /*
    Attributes and answers are read together and zipped here rather than in
    the query, because the order the shop put its attributes in is the order
    a customer should read them — and that lives on the attribute, not on the
    answer.
  */
  const [attributes, values] = await Promise.all([
    getCategoryAttributes(product.category_id),
    getProductAttributeValues(product.id),
  ]);

  const specs = attributes
    .map((attribute) => {
      const answer = values[attribute.id];
      const text = answer?.values?.length
        ? answer.values.join(', ')
        : (answer?.value ?? '').trim();
      if (!text) return null;
      return {
        label: attribute.name,
        value: attribute.unit ? `${text} ${attribute.unit}` : text,
      };
    })
    .filter((s): s is { label: string; value: string } => s !== null);
  const price = effectivePrice(product);
  const off = discountPercent(product);
  const soldOut = product.is_sold_out || product.stock_quantity <= 0;
  const low = !soldOut && product.stock_quantity <= 3;

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name,
    description: product.description ?? undefined,
    image: product.images,
    brand: { '@type': 'Brand', name: STORE.name },
    offers: {
      '@type': 'Offer',
      price,
      priceCurrency: 'INR',
      availability: soldOut
        ? 'https://schema.org/OutOfStock'
        : 'https://schema.org/InStock',
    },
  };

  return (
    <AnimatedPage>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(
            breadcrumbJsonLd([
              { name: 'Home', path: '/' },
              { name: 'Collections', path: '/collections' },
              ...(product.categories
                ? [
                    {
                      name: product.categories.name,
                      path: `/category/${product.categories.slug}`,
                    },
                  ]
                : []),
              { name: product.name, path: `/product/${product.id}` },
            ]),
          ),
        }}
      />

      <div className="container-page pt-6">
        <Breadcrumbs
          trail={[
            { label: 'Home', href: '/' },
            { label: 'Collections', href: '/collections' },
            ...(product.categories
              ? [{ label: product.categories.name, href: `/category/${product.categories.slug}` }]
              : []),
            { label: product.name },
          ]}
        />
      </div>

      <div className="container-page grid grid-cols-1 gap-10 py-8 lg:grid-cols-2 lg:gap-16 lg:py-12">
        <ProductGallery product={product} dimmed={soldOut} />

        <div className="space-y-6">
          <div className="space-y-3">
            {product.categories?.name && (
              <p className="font-label-sm text-label-sm uppercase tracking-widest text-earthy-bronze">
                {product.categories.name}
              </p>
            )}
            <h1 className="font-display-lg text-[32px] leading-tight text-deep-maroon md:text-[42px] md:leading-[50px]">
              {product.name}
            </h1>

            <div className="flex flex-wrap items-baseline gap-3">
              <span className="font-body-lg text-[28px] font-bold leading-none tabular-nums text-deep-maroon">
                {formatINR(price)}
              </span>
              {off && (
                <>
                  <span className="font-body-lg text-body-lg text-on-surface-variant/80 line-through">
                    {formatINR(product.price)}
                  </span>
                  <Badge variant="maroon">{off}% off</Badge>
                </>
              )}
            </div>
            <p className="font-body-md text-xs text-on-surface-variant">
              Inclusive of all taxes.{' '}
              {COMMERCE.freeShippingThreshold > 0 &&
                `Free shipping above ${formatINR(COMMERCE.freeShippingThreshold)}.`}
            </p>
          </div>

          <div>
            {soldOut ? (
              <Badge variant="error">Sold Out</Badge>
            ) : low ? (
              <Badge variant="warning">Only {product.stock_quantity} left</Badge>
            ) : (
              <Badge variant="success">In Stock</Badge>
            )}
          </div>

          <div className="gold-divider" />

          {product.description && (
            <div className="space-y-3">
              <h2 className="font-label-sm text-label-sm uppercase tracking-widest text-on-surface-variant">
                About this piece
              </h2>
              <p className="whitespace-pre-line font-body-md text-body-md leading-relaxed text-on-surface-variant">
                {product.description}
              </p>
            </div>
          )}

          {/* The spec a customer would otherwise have to ask for, built from
              whatever this piece's collection asks about. Only answered
              attributes appear, so a half-described piece shows nothing
              rather than a row of blanks. */}
          {specs.length > 0 && (
            <div className="space-y-3">
              <h2 className="font-label-sm text-label-sm uppercase tracking-widest text-on-surface-variant">
                Specifications
              </h2>
              <dl className="divide-y divide-outline-variant/30 border-y border-outline-variant/30">
                {specs.map((spec) => (
                  <Spec key={spec.label} label={spec.label} value={spec.value} />
                ))}
              </dl>
            </div>
          )}

          <div id="buy-box" className="scroll-mt-32 pt-2">
            <AddToCart product={product} />
          </div>

          <ul className="grid grid-cols-1 gap-4 border-t border-outline-variant/40 pt-6 sm:grid-cols-3">
            <Assurance Icon={Truck} title="Ships in 3 days" body="Insured courier, pan-India." />
            <Assurance
              Icon={ShieldCheck}
              title="Authenticity card"
              body="Named weaver and loom origin."
            />
            <Assurance
              Icon={RotateCcw}
              title="Exchange in store"
              body="Defective pieces only. Tell us first."
            />
          </ul>

          <ProductPolicyNote />
        </div>
      </div>

      {related.length > 0 && (
        <section className="border-t border-outline-variant/30 bg-surface-container-low py-16">
          <div className="container-page">
            <RelatedCarousel products={related} />
          </div>
        </section>
      )}

      <StickyBuyBar product={product} />
    </AnimatedPage>
  );
}

function Spec({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-4 py-2.5">
      <dt className="w-28 flex-none font-body-md text-sm text-on-surface-variant">{label}</dt>
      <dd className="font-body-md text-sm text-on-surface">{value}</dd>
    </div>
  );
}

function Assurance({
  Icon,
  title,
  body,
}: {
  Icon: LucideIcon;
  title: string;
  body: string;
}) {
  return (
    <li className="flex gap-3">
      <Icon className="h-5 w-5 flex-none text-earthy-bronze" strokeWidth={1.5} />
      <div>
        <p className="font-body-md text-sm font-semibold text-deep-maroon">{title}</p>
        <p className="font-body-md text-xs text-on-surface-variant">{body}</p>
      </div>
    </li>
  );
}
