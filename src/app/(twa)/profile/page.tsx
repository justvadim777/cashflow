"use client";

import { useEffect, useState } from "react";
import { useUserStore } from "@/store/user";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { api } from "@/lib/api";
import Link from "next/link";

const LEVEL_LABELS: Record<string, string> = {
  NEWBIE: "Новичок",
  PLAYER: "Игрок",
  INVESTOR: "Инвестор",
  CAPITALIST: "Капиталист",
};

const ACHIEVEMENT_LABELS: Record<string, { icon: string; label: string }> = {
  FIRST_GAME: { icon: "🎮", label: "Первая игра" },
  FIRST_EXIT: { icon: "🚀", label: "Первый выход" },
  FIRST_DREAM: { icon: "💭", label: "Первая мечта" },
  THREE_IN_ROW: { icon: "🔥", label: "3 игры подряд" },
  FIVE_TOTAL: { icon: "⭐", label: "5 игр" },
  FIRST_REFERRAL: { icon: "🤝", label: "Первый реферал" },
};

type Tab = "achievements" | "rewards" | "goals" | "referral";

interface Achievement {
  type: string;
  earnedAt: string;
}

interface PointEvent {
  id: string;
  totalPoints: number;
  gameId: string;
  game?: { date: string; type: string };
}

export default function ProfilePage() {
  const user = useUserStore();
  const [tab, setTab] = useState<Tab>("achievements");
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [recentResults, setRecentResults] = useState<PointEvent[]>([]);

  useEffect(() => {
    // TODO: Load achievements and recent results from API
  }, []);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-text-secondary text-sm">Позиция в рейтинге</p>
          <p className="text-3xl font-bold">—</p>
        </div>
        <div className="text-right">
          <p className="text-text-secondary text-sm">Баллы</p>
          <p className="text-3xl font-bold text-gold">{user.totalPoints}</p>
        </div>
      </div>

      {/* Avatar */}
      <div className="flex flex-col items-center">
        <div className="w-24 h-24 rounded-full bg-gradient-to-br from-[#7B2FBE] to-accent p-[3px]">
          <div className="w-full h-full rounded-full bg-card flex items-center justify-center text-3xl font-bold">
            {user.avatarUrl ? (
              <img
                src={user.avatarUrl}
                alt=""
                className="w-full h-full rounded-full object-cover"
              />
            ) : (
              user.displayName?.[0] || "?"
            )}
          </div>
        </div>
        <h1 className="text-xl font-bold mt-3">{user.displayName}</h1>
        <p className="text-accent text-sm font-semibold">
          {LEVEL_LABELS[user.level]}
        </p>
      </div>

      {/* View Leaderboard */}
      <Link href="/leaderboard">
        <Button className="w-full flex items-center justify-center gap-2">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <path
              d="M12 2l2.09 6.26L21 9.27l-5 3.64L17.18 20 12 16.77 6.82 20 8 12.91l-5-3.64 6.91-1.01L12 2z"
              fill="white"
            />
          </svg>
          Рейтинг игроков
        </Button>
      </Link>

      {/* Tabs */}
      <div className="flex gap-1 bg-card rounded-xl p-1">
        {(["achievements", "rewards", "goals", "referral"] as const).map(
          (t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-colors ${
                tab === t
                  ? "bg-accent text-white"
                  : "text-text-secondary hover:text-white"
              }`}
            >
              {t === "achievements"
                ? "Значки"
                : t === "rewards"
                ? "Награды"
                : t === "goals"
                ? "Цели"
                : "Рефералы"}
            </button>
          )
        )}
      </div>

      {/* Tab content */}
      {tab === "achievements" && (
        <div className="grid grid-cols-3 gap-3">
          {Object.entries(ACHIEVEMENT_LABELS).map(([type, { icon, label }]) => {
            const earned = achievements.find((a) => a.type === type);
            return (
              <div
                key={type}
                className={`flex flex-col items-center gap-2 p-3 rounded-2xl border ${
                  earned
                    ? "bg-card border-accent/30"
                    : "bg-card/50 border-border opacity-50"
                }`}
              >
                <div
                  className={`w-12 h-12 rounded-full flex items-center justify-center text-xl ${
                    earned ? "bg-accent/20" : "bg-card"
                  }`}
                >
                  {earned ? icon : "🔒"}
                </div>
                <p className="text-xs text-center font-medium">{label}</p>
              </div>
            );
          })}
        </div>
      )}

      {tab === "rewards" && (
        <Card className="text-center py-8">
          <p className="text-text-secondary">Награды появятся после игр</p>
        </Card>
      )}

      {tab === "goals" && (
        <Card className="text-center py-8">
          <p className="text-text-secondary">Цели будут доступны скоро</p>
        </Card>
      )}

      {tab === "referral" && (
        <Card>
          <p className="text-text-secondary text-sm mb-2">
            Баланс рефералов
          </p>
          <p className="text-2xl font-bold text-gold">
            {((user.referralBalance || 0) / 100).toLocaleString("ru-RU")} ₽
          </p>
          {user.referralCode && (
            <div className="mt-3">
              <p className="text-text-secondary text-xs mb-1">Твоя ссылка</p>
              <code className="block bg-bg rounded-lg px-3 py-2 text-xs text-accent break-all">
                t.me/BOT?start=ref_{user.referralCode}
              </code>
            </div>
          )}
        </Card>
      )}
    </div>
  );
}
