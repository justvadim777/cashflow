"use client";

import { useUserStore } from "@/store/user";
import { useUiStore } from "@/store/ui";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import Link from "next/link";

const LEVEL_LABELS: Record<string, string> = {
  NEWBIE: "Новичок",
  PLAYER: "Игрок",
  INVESTOR: "Инвестор",
  CAPITALIST: "Капиталист",
};

const TG_CHANNEL = process.env.NEXT_PUBLIC_TG_CHANNEL_URL ?? "https://t.me/cashflow_channel";
const TG_LOUNGE = process.env.NEXT_PUBLIC_TG_LOUNGE_URL ?? "https://t.me/ostrov_lounge";

function openTgLink(url: string) {
  if (typeof window !== "undefined" && (window as Window & { Telegram?: { WebApp?: { openTelegramLink?: (u: string) => void } } }).Telegram?.WebApp?.openTelegramLink) {
    (window as Window & { Telegram: { WebApp: { openTelegramLink: (u: string) => void } } }).Telegram.WebApp.openTelegramLink(url);
  } else {
    window.open(url, "_blank");
  }
}

export default function DashboardPage() {
  const { displayName, totalPoints, level, referralCode } = useUserStore();
  const { dismissedSubscribeBanner, dismissSubscribeBanner } = useUiStore();

  return (
    <div className="space-y-4">
      {/* Баннер подписки на ТГК (задача 5) */}
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
              t.me/BOT?start=ref_{referralCode}
            </code>
            <Button
              size="sm"
              onClick={() => {
                navigator.clipboard.writeText(
                  `https://t.me/BOT?start=ref_${referralCode}`
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
