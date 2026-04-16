"use client";

import { useUserStore } from "@/store/user";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import Link from "next/link";

const LEVEL_LABELS: Record<string, string> = {
  NEWBIE: "Новичок",
  PLAYER: "Игрок",
  INVESTOR: "Инвестор",
  CAPITALIST: "Капиталист",
};

export default function DashboardPage() {
  const { displayName, totalPoints, level, referralCode } = useUserStore();

  return (
    <div className="space-y-4">
      {/* Приветствие */}
      <div className="pt-2">
        <h1 className="text-2xl font-bold">
          Привет, {displayName || "Игрок"}
        </h1>
        <p className="text-text-secondary text-sm mt-1">
          Добро пожаловать в Cashflow
        </p>
      </div>

      {/* Статистика */}
      <Card className="flex items-center justify-between">
        <div>
          <p className="text-text-secondary text-sm">Твой уровень</p>
          <p className="text-lg font-bold text-accent">
            {LEVEL_LABELS[level]}
          </p>
        </div>
        <div className="text-right">
          <p className="text-text-secondary text-sm">Баллы</p>
          <p className="text-2xl font-bold text-gold">{totalPoints}</p>
        </div>
      </Card>

      {/* Быстрые действия */}
      <div className="grid grid-cols-2 gap-3">
        <Link href="/games">
          <Card className="text-center hover:border-accent/30 transition-colors">
            <div className="text-3xl mb-2">🎲</div>
            <p className="font-semibold text-sm">Игры</p>
            <p className="text-text-secondary text-xs mt-1">
              Записаться на игру
            </p>
          </Card>
        </Link>

        <Link href="/leaderboard">
          <Card className="text-center hover:border-accent/30 transition-colors">
            <div className="text-3xl mb-2">🏆</div>
            <p className="font-semibold text-sm">Рейтинг</p>
            <p className="text-text-secondary text-xs mt-1">
              Топ игроков
            </p>
          </Card>
        </Link>

        <Link href="/referral">
          <Card className="text-center hover:border-accent/30 transition-colors">
            <div className="text-3xl mb-2">🤝</div>
            <p className="font-semibold text-sm">Реферал</p>
            <p className="text-text-secondary text-xs mt-1">
              Пригласи друга
            </p>
          </Card>
        </Link>

        <Link href="/profile">
          <Card className="text-center hover:border-accent/30 transition-colors">
            <div className="text-3xl mb-2">👤</div>
            <p className="font-semibold text-sm">Профиль</p>
            <p className="text-text-secondary text-xs mt-1">
              Достижения
            </p>
          </Card>
        </Link>
      </div>

      {/* Реферальный код */}
      {referralCode && (
        <Card>
          <p className="text-text-secondary text-sm mb-2">Твоя реферальная ссылка</p>
          <div className="flex items-center gap-2">
            <code className="flex-1 bg-bg rounded-lg px-3 py-2 text-sm text-accent truncate">
              t.me/denezhnyjpotok_bot?start=ref_{referralCode}
            </code>
            <Button
              size="sm"
              onClick={() => {
                navigator.clipboard.writeText(
                  `https://t.me/denezhnyjpotok_bot?start=ref_${referralCode}`
                );
              }}
            >
              Скопировать
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
}
