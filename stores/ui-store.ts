'use client';

import { create } from 'zustand';

interface UiState {
  searchOpen: boolean;
  openSearch: () => void;
  closeSearch: () => void;
}

/**
 * Chrome-level UI state shared across the header, the mobile tab bar and the
 * search overlay. Kept apart from the cart store so the two do not entangle.
 */
export const useUiStore = create<UiState>((set) => ({
  searchOpen: false,
  openSearch: () => set({ searchOpen: true }),
  closeSearch: () => set({ searchOpen: false }),
}));
