"use client";

import { useEffect, useState } from "react";
import { useUserStore } from "@/store/user";
import { setInitData } from "@/lib/api";

export function TelegramProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const { setUser, reset } = useUserStore();

  useEffect(() => {
    async function init() {
      try {
        const { retrieveRawInitData } = await import("@tma.js/sdk");
        const rawInitData = retrieveRawInitData();

        if (!rawInitData) {
          reset();
          setReady(true);
          return;
        }

        setInitData(rawInitData);

        const res = await fetch("/api/auth", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ initData: rawInitData }),
        });

        if (res.ok) {
          const data = await res.json();
          setUser(data.user);
        } else {
          reset();
        }
      } catch {
        reset();
      }
      setReady(true);
    }

    init();
  }, [setUser, reset]);

  if (!ready) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-bg">
        <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return <>{children}</>;
}
