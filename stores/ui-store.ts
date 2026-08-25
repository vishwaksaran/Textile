'use client';

import { create } from 'zustand';

interface UiState {
  searchOpen: boolean;
  openSearch: () => void;
  closeSearch: () => void;

  /**
   * True while the product page's sticky buy bar is on screen. Published here
   * so the floating WhatsApp button can lift clear of it instead of the two
   * overlapping — they are both fixed to the bottom on mobile.
   */
  buyBarVisible: boolean;
  setBuyBarVisible: (visible: boolean) => void;
}

/**
 * Chrome-level UI state shared across the header, the mobile tab bar, the
 * search overlay and the floating contact button. Kept apart from the cart
 * store so the two do not entangle.
 */
export const useUiStore = create<UiState>((set) => ({
  searchOpen: false,
  openSearch: () => set({ searchOpen: true }),
  closeSearch: () => set({ searchOpen: false }),

  buyBarVisible: false,
  setBuyBarVisible: (visible) => set({ buyBarVisible: visible }),
}));
