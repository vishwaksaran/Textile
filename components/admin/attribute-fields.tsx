'use client';

import * as React from 'react';
import { Field, Input, Select, Textarea } from '@/components/ui/input';
import type { Attribute } from '@/lib/attributes';

export interface AttributeDraft {
  value?: string | null;
  values?: string[] | null;
}

/**
 * The fields one category asks for, rendered from its attributes.
 *
 * Nothing here knows what a saree or a churidar is. It reads `input_type` and
 * draws the right control, which is what lets a new product section exist
 * without a form being written for it.
 *
 * A `dropdown` still allows a value that is not in the list. The fixed
 * options keep the common cases spelled one way, which is their purpose, but
 * a shop that starts stocking a weave nobody listed should be able to sell it
 * today rather than wait for someone to add an option — so every picker is a
 * datalist, and what is typed is saved as written.
 */
export function AttributeFields({
  attributes,
  values,
  onChange,
}: {
  attributes: Attribute[];
  values: Record<string, AttributeDraft>;
  onChange: (attributeId: string, draft: AttributeDraft) => void;
}) {
  if (attributes.length === 0) return null;

  return (
    <section className="space-y-5 rounded-lg border border-outline-variant/40 bg-surface-container-lowest p-6">
      <div>
        <h2 className="font-headline-md text-headline-md text-deep-maroon">Details</h2>
        <p className="mt-1 font-body-md text-sm text-on-surface-variant">
          These come from the collection this piece belongs to. Change the collection and
          the fields change with it.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        {attributes.map((attribute) => (
          <AttributeField
            key={attribute.id}
            attribute={attribute}
            draft={values[attribute.id] ?? {}}
            onChange={(draft) => onChange(attribute.id, draft)}
          />
        ))}
      </div>
    </section>
  );
}

function AttributeField({
  attribute,
  draft,
  onChange,
}: {
  attribute: Attribute;
  draft: AttributeDraft;
  onChange: (draft: AttributeDraft) => void;
}) {
  const id = `attr-${attribute.slug}`;
  const listId = `${id}-options`;
  const label = attribute.unit ? `${attribute.name} (${attribute.unit})` : attribute.name;

  const datalist = (
    <datalist id={listId}>
      {attribute.options.map((o) => (
        <option key={o.id} value={o.value} />
      ))}
    </datalist>
  );

  switch (attribute.input_type) {
    case 'boolean':
      return (
        <Field label={label} htmlFor={id} hint={attribute.help_text ?? undefined}>
          <Select
            id={id}
            value={draft.value ?? ''}
            onChange={(e) => onChange({ value: e.target.value || null })}
          >
            <option value="">Not specified</option>
            <option value="Yes">Yes</option>
            <option value="No">No</option>
          </Select>
        </Field>
      );

    case 'multiselect':
      return (
        <Field
          label={label}
          htmlFor={id}
          hint={attribute.help_text ?? 'Tick any that apply.'}
          className="sm:col-span-2"
        >
          <div id={id} className="flex flex-wrap gap-x-5 gap-y-2 pt-1">
            {attribute.options.map((option) => {
              const checked = (draft.values ?? []).includes(option.value);
              return (
                <label key={option.id} className="flex cursor-pointer items-center gap-2">
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={(e) => {
                      const next = new Set(draft.values ?? []);
                      if (e.target.checked) next.add(option.value);
                      else next.delete(option.value);
                      onChange({ values: [...next] });
                    }}
                    className="h-4 w-4 rounded-none border-outline-variant text-deep-maroon focus:ring-primary-container"
                  />
                  <span className="font-body-md text-sm text-on-surface">{option.value}</span>
                </label>
              );
            })}
          </div>
        </Field>
      );

    case 'dropdown_custom':
      /*
        A picker that fills the box, not a datalist. Wash care is often a
        sentence — "Hand wash separately in cold water. Do not soak. Dry in
        shade." — which wants a textarea, and a textarea cannot carry a
        datalist. Choosing a preset writes it into the box, where it can then
        be edited or replaced entirely.
      */
      return (
        <Field
          label={label}
          htmlFor={id}
          hint={attribute.help_text ?? 'Pick one to start from, then edit freely.'}
          className="sm:col-span-2"
        >
          <div className="space-y-2">
            <Select
              aria-label={`Preset for ${attribute.name}`}
              value=""
              onChange={(e) => e.target.value && onChange({ value: e.target.value })}
            >
              <option value="">Choose a preset…</option>
              {attribute.options.map((o) => (
                <option key={o.id} value={o.value}>
                  {o.value}
                </option>
              ))}
            </Select>
            <Textarea
              id={id}
              rows={2}
              value={draft.value ?? ''}
              onChange={(e) => onChange({ value: e.target.value })}
              placeholder={attribute.options[0]?.value}
            />
          </div>
        </Field>
      );

    case 'number':
    case 'measurement':
      return (
        <Field label={label} htmlFor={id} hint={attribute.help_text ?? undefined}>
          <Input
            id={id}
            list={listId}
            inputMode="decimal"
            value={draft.value ?? ''}
            onChange={(e) => onChange({ value: e.target.value })}
            placeholder={attribute.options[0]?.value ?? (attribute.unit ? `e.g. 44` : undefined)}
          />
          {datalist}
        </Field>
      );

    case 'text':
      return (
        <Field label={label} htmlFor={id} hint={attribute.help_text ?? undefined}>
          <Input
            id={id}
            value={draft.value ?? ''}
            onChange={(e) => onChange({ value: e.target.value })}
          />
        </Field>
      );

    default:
      return (
        <Field
          label={label}
          htmlFor={id}
          hint={attribute.help_text ?? 'Pick one, or type your own.'}
        >
          <Input
            id={id}
            list={listId}
            value={draft.value ?? ''}
            onChange={(e) => onChange({ value: e.target.value })}
            placeholder="Choose, or type your own"
          />
          {datalist}
        </Field>
      );
  }
}
