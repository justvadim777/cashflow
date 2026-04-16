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

const TYPE_LABELS: Record<string, string> = {
  BASE: "Базовая",
  MAIN: "Продвинутая",
};

interface NextGame {
  id: string;
  date: string;
  time: string;
  type: string;
}

export default function DashboardPage() {
  const { displayName, totalPoints, monthlyPoints, level, referralCode } = useUserStore();
  const [nextGame, setNextGame] = useState<NextGame | null>(null);

  useEffect(() => {
    api<{ nextGame: NextGame | null }>("/games/next")
      .then((d) => setNextGame(d.nextGame))
      .catch(() => {});
  }, []);

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
      <Card>
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="text-text-secondary text-sm">Твой уровень</p>
            <p className="text-lg font-bold text-accent">
              {LEVEL_LABELS[level]}
            </p>
          </div>
        </div>
        <div className="flex gap-3">
          <div className="flex-1 bg-bg rounded-xl px-3 py-2 text-center">
            <p className="text-text-secondary text-xs">За всё время</p>
            <p className="text-xl font-bold text-gold">{totalPoints}</p>
          </div>
          <div className="flex-1 bg-bg rounded-xl px-3 py-2 text-center">
            <p className="text-text-secondary text-xs">За месяц</p>
            <p className="text-xl font-bold text-accent">{monthlyPoints}</p>
          </div>
        </div>
      </Card>

      {/* Ближайшая игра */}
      {nextGame && (
        <div>
          <Link href={`/games/${nextGame.id}`} className="block">
            <Card className="border-accent/30 hover:border-accent/50 transition-colors">
              <p className="text-text-secondary text-xs mb-1">Ближайшая игра</p>
              <div className="flex items-center justify-between">
                <p className="font-semibold">
                  {new Date(nextGame.date).toLocaleDateString("ru-RU", {
                    day: "numeric",
                    month: "long",
                  })}{" "}
                  в {nextGame.time}
                </p>
                <span className={`px-2 py-0.5 rounded-md text-xs font-bold ${
                  nextGame.type === "MAIN" ? "bg-gold/20 text-gold" : "bg-accent/20 text-accent"
                }`}>
                  {TYPE_LABELS[nextGame.type] || nextGame.type}
                </span>
              </div>
            </Card>
          </Link>
        </div>
      )}

      {/* Быстрые действия */}
      <div className="grid grid-cols-2 gap-3">
        <Link href="/games" className="block">
          <Card className="text-center hover:border-accent/30 transition-colors h-full">
            <div className="text-3xl mb-2">🎲</div>
            <p className="font-semibold text-sm">Игры</p>
            <p className="text-text-secondary text-xs mt-1">
              Записаться на игру
            </p>
          </Card>
        </Link>

        <Link href="/leaderboard" className="block">
          <Card className="text-center hover:border-accent/30 transition-colors h-full">
            <div className="text-3xl mb-2">🏆</div>
            <p className="font-semibold text-sm">Рейтинг</p>
            <p className="text-text-secondary text-xs mt-1">
              Топ игроков
            </p>
          </Card>
        </Link>

        <Link href="/referral" className="block">
          <Card className="text-center hover:border-accent/30 transition-colors h-full">
            <div className="text-3xl mb-2">🤝</div>
            <p className="font-semibold text-sm">Реферал</p>
            <p className="text-text-secondary text-xs mt-1">
              Пригласи друга
            </p>
          </Card>
        </Link>

        <Link href="/profile" className="block">
          <Card className="text-center hover:border-accent/30 transition-colors h-full">
            <div className="text-3xl mb-2">👤</div>
            <p className="font-semibold text-sm">Профиль</p>
            <p className="text-text-secondary text-xs mt-1">
              Достижения
            </p>
          </Card>
        </Link>

        <Link href="/info" className="block col-span-2">
          <Card className="text-center hover:border-accent/30 transition-colors">
            <div className="text-3xl mb-2">ℹ️</div>
            <p className="font-semibold text-sm">О Cashflow</p>
            <p className="text-text-secondary text-xs mt-1">
              Правила, форматы игр, рейтинг
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
