"use client";

import { create } from "zustand";
import type { UserRole, UserLevel } from "@/generated/prisma/client";

interface UserState {
  id: string | null;
  telegramId: string | null;
  username: string | null;
  displayName: string | null;
  avatarUrl: string | null;
  role: UserRole;
  totalPoints: number;
  monthlyPoints: number;
  level: UserLevel;
  referralCode: string | null;
  referralBalance: number;
  isLoading: boolean;
  isAuthenticated: boolean;
  setUser: (user: Partial<UserState>) => void;
  reset: () => void;
}

export const useUserStore = create<UserState>((set) => ({
  id: null,
  telegramId: null,
  username: null,
  displayName: null,
  avatarUrl: null,
  role: "PLAYER",
  totalPoints: 0,
  monthlyPoints: 0,
  level: "NEWBIE",
  referralCode: null,
  referralBalance: 0,
  isLoading: true,
  isAuthenticated: false,
  setUser: (user) => set({ ...user, isAuthenticated: true, isLoading: false }),
  reset: () =>
    set({
      id: null,
      telegramId: null,
      isAuthenticated: false,
      isLoading: false,
    }),
}));
