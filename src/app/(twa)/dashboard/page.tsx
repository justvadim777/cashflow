"use client";

import { useEffect, useState } from "react";
import { useUserStore } from "@/store/user";
import { useUiStore } from "@/store/ui";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import Link from "next/link";
import { api } from "@/lib/api";

interface NextGame {
  id: string;
  date: string;
  time: string;
  type: string;
  price: number;
  playersCount: number;
  playersLimit: number;
  status: string;
  isParticipant: boolean;
  isConfirmed: boolean;
}

const LEVEL_LABELS: Record<string, string> = {
  NEWBIE: "Новичок",
  PLAYER: "Игрок",
  INVESTOR: "Инвестор",
  CAPITALIST: "Капиталист",
};

const TG_CHANNEL = process.env.NEXT_PUBLIC_TG_CHANNEL_URL ?? "https://t.me/CashFlow_VTR";
const TG_LOUNGE = process.env.NEXT_PUBLIC_TG_LOUNGE_URL ?? "https://t.me/ostrovnezh";

type TgWindow = Window & { Telegram?: { WebApp?: { openTelegramLink?: (u: string) => void } } };

function openTgLink(url: string) {
  const tgWin = typeof window !== "undefined" ? (window as unknown as TgWindow) : null;
  if (tgWin?.Telegram?.WebApp?.openTelegramLink) {
    tgWin.Telegram.WebApp.openTelegramLink(url);
  } else {
    window.open(url, "_blank");
  }
}

export default function DashboardPage() {
  const { displayName, totalPoints, level, referralCode } = useUserStore();
  const { dismissedSubscribeBanner, dismissSubscribeBanner } = useUiStore();
  const [nextGame, setNextGame] = useState<NextGame | null | undefined>(undefined);

  useEffect(() => {
    api<{ game: NextGame | null }>("/games/next")
      .then((d) => setNextGame(d.game))
      .catch(() => setNextGame(null));
  }, []);

  return (
    <div className="space-y-4">
      {/* Баннер подписки на ТГК */}
      {!dismissedSubscribeBanner && (
        <div className="relative flex items-center gap-3 bg-accent/10 border border-accent/30 rounded-xl px-4 py-3">
          <span className="text-lg">📢</span>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold">Подпишись на наш Telegram-канал</p>
            <p className="text-text-secondary text-xs">Будь в потоке последних новостей</p>
          </div>
          <button
            onClick={() => openTgLink(TG_CHANNEL)}
            className="shrink-0 px-3 py-1.5 rounded-lg bg-accent text-white text-xs font-semibold"
          >
            Подписаться
          </button>
          <button
            onClick={dismissSubscribeBanner}
            className="shrink-0 text-text-secondary hover:text-white text-lg leading-none ml-1"
            aria-label="Закрыть"
          >
            ×
          </button>
        </div>
      )}

      {/* Приветствие */}
      <div>
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

      {/* Ближайшая игра */}
      {nextGame !== undefined && (
        nextGame ? (
          <Link href={`/games/${nextGame.id}`}>
            <Card className="hover:border-accent/30 transition-colors">
              <div className="flex items-center justify-between mb-1">
                <p className="text-text-secondary text-xs font-semibold uppercase tracking-wide">
                  Ближайшая игра
                </p>
                <span className={`px-2 py-0.5 rounded text-xs font-bold ${
                  nextGame.type === "MAIN" ? "bg-gold/20 text-gold" : "bg-accent/20 text-accent"
                }`}>
                  {nextGame.type}
                </span>
              </div>
              <p className="font-bold text-lg">
                {new Date(nextGame.date).toLocaleDateString("ru-RU", {
                  day: "numeric",
                  month: "long",
                })}{" "}
                в {nextGame.time}
              </p>
              <div className="flex items-center justify-between gap-3 mt-2">
                <p className="text-text-secondary text-sm shrink-0">
                  {nextGame.playersCount}/{nextGame.playersLimit} игроков
                </p>
                {nextGame.isParticipant ? (
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded shrink-0 ${
                    nextGame.isConfirmed ? "text-success bg-success/10" : "text-gold bg-gold/10"
                  }`}>
                    {nextGame.isConfirmed ? "Записан" : "Ожидание"}
                  </span>
                ) : (
                  <span className="text-gold text-sm font-bold shrink-0">
                    {(nextGame.price / 100).toLocaleString("ru-RU")} ₽
                  </span>
                )}
              </div>
            </Card>
          </Link>
        ) : (
          <Card className="text-center py-4">
            <p className="text-text-secondary text-sm">Ближайших игр нет</p>
          </Card>
        )
      )}

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

      {/* Каналы снизу */}
      <div className="flex gap-2">
        <a
          href="https://t.me/CashFlow_VTR"
          target="_blank"
          rel="noopener noreferrer"
          className="flex-1 flex items-center justify-center gap-1.5 bg-card border border-border rounded-xl py-2.5 text-xs font-semibold text-accent hover:border-accent/40 transition-colors"
        >
          📢 Подписаться на канал
        </a>
        <a
          href="https://t.me/ostrovnezh"
          target="_blank"
          rel="noopener noreferrer"
          className="flex-1 flex items-center justify-center gap-1.5 bg-card border border-border rounded-xl py-2.5 text-xs font-semibold text-accent hover:border-accent/40 transition-colors"
        >
          🏝 Остров Lounge
        </a>
      </div>

      {/* Реферальный код */}
      {referralCode && (
        <Card>
          <p className="text-text-secondary text-sm mb-2">Твоя реферальная ссылка</p>
          <div className="flex items-center gap-2">
            <code className="flex-1 bg-bg rounded-lg px-3 py-2 text-sm text-accent truncate">
              t.me/CashFlow_VTR_bot?start=ref_{referralCode}
            </code>
            <Button
              size="sm"
              onClick={() => {
                navigator.clipboard.writeText(
                  `https://t.me/CashFlow_VTR_bot?start=ref_${referralCode}`
                );
              }}
            >
              Скопировать
            </Button>
          </div>
        </Card>
      )}

      {/* Кнопки каналов (задача 6) */}
      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={() => openTgLink(TG_CHANNEL)}
          className="flex items-center justify-center gap-2 bg-card border border-border rounded-xl px-3 py-3 hover:border-accent/30 transition-colors"
        >
          <span className="text-accent text-lg">✈</span>
          <span className="text-sm font-semibold">Канал Cashflow</span>
        </button>
        <button
          onClick={() => openTgLink(TG_LOUNGE)}
          className="flex items-center justify-center gap-2 bg-card border border-border rounded-xl px-3 py-3 hover:border-accent/30 transition-colors"
        >
          <span className="text-accent text-lg">✈</span>
          <span className="text-sm font-semibold">Канал Острова</span>
        </button>
      </div>
    </div>
  );
}
