"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_ITEMS = [
  {
    href: "/dashboard",
    label: "Главная",
    icon: (active: boolean) => (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
        <path
          d="M3 9.5L12 3l9 6.5V20a1 1 0 01-1 1H4a1 1 0 01-1-1V9.5z"
          stroke={active ? "#A855F7" : "#9CA3AF"}
          strokeWidth="2"
          fill={active ? "rgba(168,85,247,0.1)" : "none"}
        />
      </svg>
    ),
  },
  {
    href: "/leaderboard",
    label: "Рейтинг",
    icon: (active: boolean) => (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
        <path
          d="M12 2l2.09 6.26L21 9.27l-5 3.64L17.18 20 12 16.77 6.82 20 8 12.91l-5-3.64 6.91-1.01L12 2z"
          stroke={active ? "#A855F7" : "#9CA3AF"}
          strokeWidth="2"
          fill={active ? "rgba(168,85,247,0.15)" : "none"}
        />
      </svg>
    ),
  },
  {
    href: "/profile",
    label: "Профиль",
    icon: (active: boolean) => (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
        <circle
          cx="12"
          cy="8"
          r="4"
          stroke={active ? "#A855F7" : "#9CA3AF"}
          strokeWidth="2"
        />
        <path
          d="M4 20c0-3.31 3.58-6 8-6s8 2.69 8 6"
          stroke={active ? "#A855F7" : "#9CA3AF"}
          strokeWidth="2"
          strokeLinecap="round"
        />
      </svg>
    ),
  },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-card border-t border-border backdrop-blur-lg z-50 pb-[env(safe-area-inset-bottom)]">
      <div className="flex items-center justify-around h-16 max-w-md mx-auto">
        {NAV_ITEMS.map((item) => {
          const isActive = pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className="flex flex-col items-center gap-1 py-2 px-4"
            >
              {item.icon(isActive)}
              <span
                className={`text-xs ${
                  isActive ? "text-accent font-semibold" : "text-text-secondary"
                }`}
              >
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
