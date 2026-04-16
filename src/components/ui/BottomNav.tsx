"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useUserStore } from "@/store/user";

interface NavItem {
  href: string;
  label: string;
  icon: (active: boolean) => React.ReactNode;
  roles?: string[];
}

const NAV_ITEMS: NavItem[] = [
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
  {
    href: "/admin",
    label: "Управление",
    roles: ["HOST", "ADMIN", "OWNER"],
    icon: (active: boolean) => (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
        <path
          d="M12 15.5A3.5 3.5 0 1012 8.5a3.5 3.5 0 000 7z"
          stroke={active ? "#A855F7" : "#9CA3AF"}
          strokeWidth="2"
        />
        <path
          d="M19.14 12.94c.04-.31.06-.63.06-.94 0-.31-.02-.63-.06-.94l2.03-1.58a.49.49 0 00.12-.61l-1.92-3.32a.49.49 0 00-.59-.22l-2.39.96a7.04 7.04 0 00-1.62-.94l-.36-2.54a.48.48 0 00-.48-.41h-3.84a.48.48 0 00-.48.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96a.49.49 0 00-.59.22L2.74 9.87a.48.48 0 00.12.61l2.03 1.58c-.04.31-.06.63-.06.94 0 .31.02.63.06.94l-2.03 1.58a.49.49 0 00-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.49.37 1.03.7 1.62.94l.36 2.54c.05.24.26.41.48.41h3.84c.24 0 .44-.17.48-.41l.36-2.54c.59-.24 1.13-.57 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.03-1.58z"
          stroke={active ? "#A855F7" : "#9CA3AF"}
          strokeWidth="2"
          fill={active ? "rgba(168,85,247,0.1)" : "none"}
        />
      </svg>
    ),
  },
];

export function BottomNav() {
  const pathname = usePathname();
  const { role } = useUserStore();

  const visibleItems = NAV_ITEMS.filter(
    (item) => !item.roles || item.roles.includes(role)
  );

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-card border-t border-border backdrop-blur-lg z-50 pb-[env(safe-area-inset-bottom)]">
      <div className="flex items-center justify-around h-16 max-w-md mx-auto">
        {visibleItems.map((item) => {
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
