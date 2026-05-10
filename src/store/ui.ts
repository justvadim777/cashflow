"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

interface UiState {
  dismissedSubscribeBanner: boolean;
  dismissSubscribeBanner: () => void;
}

export const useUiStore = create<UiState>()(
  persist(
    (set) => ({
      dismissedSubscribeBanner: false,
      dismissSubscribeBanner: () => set({ dismissedSubscribeBanner: true }),
    }),
    { name: "cashflow-ui" }
  )
);
