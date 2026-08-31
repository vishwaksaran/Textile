import type { Category } from '@/types';

/**
 * The navigation, derived from the category tree.
 *
 * Every top-level category is a menu item and its children are that item's
 * dropdown. Nothing here knows the word "Sarees": adding Blouses or Lehengas
 * is a row in the Category Manager, not a code change, which is the whole
 * point of the tree.
 *
 * One function rather than a filter repeated at each call site — the desktop
 * bar, the mobile overlay, the bottom tab bar and the footer all have to
 * agree about where a collection lives, and four copies would drift.
 */
export interface NavSection {
  section: Category;
  children: Category[];
}

export interface NavTree {
  /** Top-level items, in order, each with its own children. */
  sections: NavSection[];
}

function byOrderThenName(a: Category, b: Category): number {
  const order = (a.sort_order ?? 0) - (b.sort_order ?? 0);
  return order !== 0 ? order : a.name.localeCompare(b.name);
}

/**
 * Hidden rows never reach the menu, but stay reachable by URL and search.
 *
 * Falls back to nav_group when is_visible is absent, so the menu is right
 * whichever side of the migration the database is on.
 */
const visible = (c: Category) =>
  c.is_visible !== undefined ? c.is_visible : c.nav_group !== 'hidden';

export function buildNavTree(categories: Category[]): NavTree {
  const sorted = [...categories].filter(visible).sort(byOrderThenName);

  // A row whose parent is hidden or missing would otherwise vanish from the
  // menu without ever appearing as a section of its own.
  const ids = new Set(sorted.map((c) => c.id));

  const sections = sorted
    .filter((c) => c.parent_id === null || !ids.has(c.parent_id))
    .map((section) => ({
      section,
      children: sorted.filter((c) => c.parent_id === section.id),
    }));

  return { sections };
}

/**
 * Kept for the surfaces that still think in terms of "weaves and everything
 * else" — the footer's two lists, and the single garment slot in the bottom
 * tab bar, which has room for one item and no dropdown.
 *
 * Reads the tree rather than nav_group so it cannot disagree with the menu.
 */
export function splitNavCategories(categories: Category[]): {
  sarees: Category[];
  standalone: Category[];
} {
  const { sections } = buildNavTree(categories);
  const first = sections[0];
  return {
    sarees: first ? first.children : [],
    standalone: sections.slice(1).map((s) => s.section),
  };
}
