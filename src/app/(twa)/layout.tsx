"use client";

import { TelegramProvider } from "@/components/ui/TelegramProvider";
import { BottomNav } from "@/components/ui/BottomNav";
import { BackButton } from "@/components/ui/BackButton";

export default function TWALayout({ children }: { children: React.ReactNode }) {
  return (
    <TelegramProvider>
      <main className="flex-1 pb-20 max-w-md mx-auto w-full px-4 pt-4">
        <BackButton />
        {children}
      </main>
      <BottomNav />
    </TelegramProvider>
  );
}
