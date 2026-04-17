"use client";

import { usePathname, useRouter } from "next/navigation";

export function BackButton() {
  const pathname = usePathname();
  const router = useRouter();

  // На главной не показываем
  if (pathname === "/dashboard" || pathname === "/") return null;

  return (
    <button
      onClick={() => router.back()}
      className="flex items-center gap-1 text-text-secondary text-sm hover:text-white transition-colors mb-3"
    >
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
        <path
          d="M15 18l-6-6 6-6"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      Назад
    </button>
  );
}
