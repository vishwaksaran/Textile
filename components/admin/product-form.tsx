'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { AttributeFields, type AttributeDraft } from '@/components/admin/attribute-fields';
import type { Attribute } from '@/lib/attributes';
import { Loader2, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Field, Input, Select, Textarea } from '@/components/ui/input';
import { ImageUploader } from '@/components/admin/image-uploader';
import { ConfirmDialog } from '@/components/shared/confirm-dialog';
import { formatINR } from '@/lib/utils';
import type { Category, Product } from '@/types';

interface ProductFormProps {
  categories: Category[];
  product?: Product;
}

interface FormState {
  name: string;
  description: string;
  price: string;
  discounted_price: string;
  stock_quantity: string;
  length: string;
  fabric: string;
  wash_care: string;
  hsn_code: string;
  gst_rate: string;
  category_id: string;
  images: string[];
  is_active: boolean;
}

export function ProductForm({ categories, product }: ProductFormProps) {
  const router = useRouter();
  const editing = Boolean(product);

  const [form, setForm] = React.useState<FormState>({
    name: product?.name ?? '',
    description: product?.description ?? '',
    price: product ? String(product.price) : '',
    discounted_price: product?.discounted_price ? String(product.discounted_price) : '',
    stock_quantity: product ? String(product.stock_quantity) : '0',
    length: product?.length ?? '',
    fabric: product?.fabric ?? '',
    wash_care: product?.wash_care ?? '',
    hsn_code: product?.hsn_code ?? '',
    gst_rate: product?.gst_rate === null || product?.gst_rate === undefined ? '' : String(product.gst_rate),
    category_id: product?.category_id ?? '',
    images: product?.images ?? [],
    is_active: product?.is_active ?? true,
  });

  const [attributes, setAttributes] = React.useState<Attribute[]>([]);
  const [attrValues, setAttrValues] = React.useState<Record<string, AttributeDraft>>(
    product?.attributeValues ?? {},
  );

  /*
    Refetched whenever the collection changes, because the fields a product
    is asked for belong to its category. Answers already given are kept: a
    piece moved from Sarees to Churidars keeps its fabric, which both ask
    for, and simply stops being asked for a saree length.
  */
  React.useEffect(() => {
    if (!form.category_id) {
      setAttributes([]);
      return;
    }
    let cancelled = false;
    fetch(`/api/admin/attributes?categoryId=${form.category_id}`)
      .then((r) => (r.ok ? r.json() : { attributes: [] }))
      .then((d) => !cancelled && setAttributes(d.attributes ?? []))
      .catch(() => !cancelled && setAttributes([]));
    return () => {
      cancelled = true;
    };
  }, [form.category_id]);

  const [errors, setErrors] = React.useState<Partial<Record<keyof FormState, string>>>({});
  const [saving, setSaving] = React.useState(false);
  const [confirmDelete, setConfirmDelete] = React.useState(false);

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
    setErrors((e) => ({ ...e, [key]: undefined }));
  }

  function validate(): boolean {
    const next: Partial<Record<keyof FormState, string>> = {};
    if (form.name.trim().length < 2) next.name = 'Give the piece a name.';

    const price = Number(form.price);
    if (!Number.isFinite(price) || price <= 0) next.price = 'Enter a price above zero.';

    if (form.discounted_price) {
      const discounted = Number(form.discounted_price);
      if (!Number.isFinite(discounted) || discounted <= 0) {
        next.discounted_price = 'Enter a valid amount.';
      } else if (discounted >= price) {
        next.discounted_price = 'Must be lower than the price.';
      }
    }

    if (form.hsn_code && !/^\d{4}(\d{2})?(\d{2})?$/.test(form.hsn_code)) {
      next.hsn_code = 'HSN codes are 4, 6 or 8 digits.';
    }

    if (form.gst_rate) {
      const rate = Number(form.gst_rate);
      if (!Number.isFinite(rate) || rate < 0 || rate > 100) {
        next.gst_rate = 'Enter a percentage between 0 and 100.';
      }
    }

    const stock = Number(form.stock_quantity);
    if (!Number.isInteger(stock) || stock < 0) {
      next.stock_quantity = 'Whole numbers, zero or more.';
    }

    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) {
      toast.error('Please check the highlighted fields.');
      return;
    }

    setSaving(true);
    try {
      const res = await fetch(
        editing ? `/api/admin/products/${product!.id}` : '/api/admin/products',
        {
          method: editing ? 'PUT' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: form.name.trim(),
            description: form.description.trim() || null,
            price: Number(form.price),
            discounted_price: form.discounted_price ? Number(form.discounted_price) : null,
            stock_quantity: Number(form.stock_quantity),
            attributeValues: attrValues,
            hsn_code: form.hsn_code || null,
            gst_rate: form.gst_rate ? Number(form.gst_rate) : null,
            category_id: form.category_id || null,
            images: form.images,
            is_active: form.is_active,
          }),
        },
      );

      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? 'Could not save the product.');
        return;
      }

      toast.success(editing ? 'Product updated.' : 'Product added.');
      router.push('/admin/products');
      router.refresh();
    } catch {
      toast.error('Network error — please try again.');
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    const res = await fetch(`/api/admin/products/${product!.id}`, { method: 'DELETE' });
    const data = await res.json();

    if (!res.ok) {
      toast.error(data.error ?? 'Could not delete the product.');
      return;
    }

    toast.success(
      data.deactivated
        ? 'This piece appears in past orders, so it was hidden rather than deleted.'
        : 'Product deleted.',
    );
    router.push('/admin/products');
    router.refresh();
  }

  const price = Number(form.price) || 0;
  const discounted = Number(form.discounted_price) || 0;
  const savingsPercent =
    price > 0 && discounted > 0 && discounted < price
      ? Math.round(((price - discounted) / price) * 100)
      : null;

  return (
    <>
      <form onSubmit={save} noValidate className="grid grid-cols-1 gap-8 xl:grid-cols-[1fr_360px]">
        <div className="space-y-8">
          <section className="space-y-5 rounded-lg border border-outline-variant/40 bg-surface-container-lowest p-6">
            <h2 className="font-headline-md text-headline-md text-deep-maroon">Details</h2>

            <Field label="Name" htmlFor="name" error={errors.name} required>
              <Input
                id="name"
                value={form.name}
                onChange={(e) => set('name', e.target.value)}
                placeholder="Royal Emerald Kanjeevaram"
              />
            </Field>

            <Field
              label="Description"
              htmlFor="description"
              hint="The story of the piece — weave, border, motif. Length, fabric and wash care have their own fields below, so leave them out of here."
            >
              <Textarea
                id="description"
                rows={6}
                value={form.description}
                onChange={(e) => set('description', e.target.value)}
              />
            </Field>



            <Field label="Collection" htmlFor="category_id">
              <Select
                id="category_id"
                value={form.category_id}
                onChange={(e) => set('category_id', e.target.value)}
              >
                <option value="">No collection</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </Select>
            </Field>
          </section>

          <section className="space-y-5 rounded-lg border border-outline-variant/40 bg-surface-container-lowest p-6">
            <div>
              <h2 className="font-headline-md text-headline-md text-deep-maroon">Tax</h2>
              <p className="mt-1 font-body-md text-sm text-on-surface-variant">
                Both optional. Left blank, this piece uses the shop-wide defaults from{' '}
                <Link href="/admin/settings/tax" className="text-deep-maroon underline">
                  Tax Settings
                </Link>
                .
              </p>
            </div>

            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <Field
                label="HSN code"
                htmlFor="hsn_code"
                error={errors.hsn_code}
                hint="4, 6 or 8 digits."
              >
                <Input
                  id="hsn_code"
                  inputMode="numeric"
                  placeholder="e.g. 5007"
                  value={form.hsn_code}
                  onChange={(e) => set('hsn_code', e.target.value.replace(/\D/g, ''))}
                />
              </Field>

              <Field
                label="GST rate (%)"
                htmlFor="gst_rate"
                error={errors.gst_rate}
                hint="Only if it differs from the default."
              >
                <Input
                  id="gst_rate"
                  inputMode="decimal"
                  placeholder="default"
                  value={form.gst_rate}
                  onChange={(e) => set('gst_rate', e.target.value.replace(/[^\d.]/g, ''))}
                />
              </Field>
            </div>
          </section>

          <AttributeFields
            attributes={attributes}
            values={attrValues}
            onChange={(id, draft) => setAttrValues((v) => ({ ...v, [id]: draft }))}
          />

          <section className="rounded-lg border border-outline-variant/40 bg-surface-container-lowest p-6">
            <ImageUploader
              bucket="products"
              value={form.images}
              onChange={(images) => set('images', images)}
            />
          </section>
        </div>

        <div className="space-y-8">
          <section className="space-y-5 rounded-lg border border-outline-variant/40 bg-surface-container-lowest p-6">
            <h2 className="font-headline-md text-headline-md text-deep-maroon">Price & stock</h2>

            <Field label="Price (₹)" htmlFor="price" error={errors.price} required>
              <Input
                id="price"
                inputMode="decimal"
                value={form.price}
                onChange={(e) => set('price', e.target.value.replace(/[^\d.]/g, ''))}
              />
            </Field>

            <Field
              label="Discounted price (₹)"
              htmlFor="discounted_price"
              error={errors.discounted_price}
              hint={savingsPercent ? `Shows as ${savingsPercent}% off.` : 'Leave empty for no discount.'}
            >
              <Input
                id="discounted_price"
                inputMode="decimal"
                value={form.discounted_price}
                onChange={(e) => set('discounted_price', e.target.value.replace(/[^\d.]/g, ''))}
              />
            </Field>

            <Field
              label="Stock quantity"
              htmlFor="stock_quantity"
              error={errors.stock_quantity}
              hint={
                Number(form.stock_quantity) <= 0
                  ? 'Zero marks the piece Sold Out on the storefront.'
                  : undefined
              }
              required
            >
              <Input
                id="stock_quantity"
                inputMode="numeric"
                value={form.stock_quantity}
                onChange={(e) => set('stock_quantity', e.target.value.replace(/\D/g, ''))}
              />
            </Field>

            {price > 0 && (
              <p className="rounded bg-primary-container/10 px-3 py-2 font-body-md text-sm text-on-surface-variant">
                Customers pay{' '}
                <strong className="text-deep-maroon">
                  {formatINR(discounted && discounted < price ? discounted : price)}
                </strong>
              </p>
            )}

            <label className="flex cursor-pointer items-center justify-between gap-4 border-t border-outline-variant/40 pt-5">
              <span className="font-body-md text-sm text-on-surface">
                Visible on the storefront
              </span>
              <input
                type="checkbox"
                checked={form.is_active}
                onChange={(e) => set('is_active', e.target.checked)}
                className="h-4 w-4 rounded-none border-outline-variant text-deep-maroon focus:ring-primary-container"
              />
            </label>
          </section>

          <div className="space-y-3">
            <Button type="submit" size="lg" className="w-full" disabled={saving} shine>
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Saving…
                </>
              ) : editing ? (
                'Save changes'
              ) : (
                'Add product'
              )}
            </Button>

            <Button asChild variant="outline" className="w-full">
              <Link href="/admin/products">Cancel</Link>
            </Button>

            {editing && (
              <Button
                type="button"
                variant="ghost"
                className="w-full text-error hover:bg-error-container"
                onClick={() => setConfirmDelete(true)}
              >
                <Trash2 className="h-4 w-4" />
                Delete product
              </Button>
            )}
          </div>
        </div>
      </form>

      <ConfirmDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title="Delete this product?"
        description="If it appears in past orders it will be hidden from the storefront instead, so your order history stays intact."
        confirmLabel="Delete"
        onConfirm={remove}
      />
    </>
  );
}
