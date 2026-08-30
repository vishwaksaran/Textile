import type { Category } from '@/types';

/**
 * Splits the catalogue into the shape the navigation needs.
 *
 * One function rather than a filter repeated at each call site: the desktop
 * bar, the mobile overlay and the footer all have to agree about where a
 * collection lives, and three copies of `slug !== 'churidars'` would drift the
 * first time a fourth surface was added.
 *
 * Ordering is `sort_order` then name, so an untouched catalogue still comes
 * out predictably rather than in whatever order the database returned.
 */
export interface NavCategories {
  /** Weaves, shown inside the Sarees dropdown. */
  sarees: Category[];
  /** Different garment types, each its own top-level nav item. */
  standalone: Category[];
}

function byOrderThenName(a: Category, b: Category): number {
  const order = (a.sort_order ?? 0) - (b.sort_order ?? 0);
  return order !== 0 ? order : a.name.localeCompare(b.name);
}

export function splitNavCategories(categories: Category[]): NavCategories {
  const sorted = [...categories].sort(byOrderThenName);
  return {
    // Anything without an explicit group is a weave — that was the only kind
    // of collection before this existed, and it keeps older rows working.
    sarees: sorted.filter((c) => (c.nav_group ?? 'sarees') === 'sarees'),
    standalone: sorted.filter((c) => c.nav_group === 'standalone'),
  };
}
