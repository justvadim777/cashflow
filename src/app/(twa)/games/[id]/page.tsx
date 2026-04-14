"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { api } from "@/lib/api";

interface GameDetail {
  id: string;
  date: string;
  time: string;
  type: "BASE" | "MAIN";
  price: number;
  playersLimit: number;
  playersCount: number;
  status: "OPEN" | "FULL" | "FINISHED";
  description: string | null;
  createdBy: { id: string; displayName: string };
  participants: {
    user: {
      id: string;
      displayName: string;
      avatarUrl: string | null;
      username: string | null;
      totalPoints: number;
    };
  }[];
  results: { totalPoints: number }[];
}

export default function GameDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [game, setGame] = useState<GameDetail | null>(null);
  const [isParticipant, setIsParticipant] = useState(false);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const data = await api<{
          game: GameDetail;
          isParticipant: boolean;
        }>(`/games/${id}`);
        setGame(data.game);
        setIsParticipant(data.isParticipant);
      } catch {
        router.push("/games");
      }
      setLoading(false);
    }
    load();
  }, [id, router]);

  async function handlePay() {
    if (!game) return;
    setPaying(true);
    try {
      const data = await api<{ paymentUrl: string }>("/payments", {
        method: "POST",
        body: JSON.stringify({ gameId: game.id }),
      });
      if (data.paymentUrl) {
        window.location.href = data.paymentUrl;
      }
    } catch (e) {
      alert(e instanceof Error ? e.message : "Ошибка оплаты");
    }
    setPaying(false);
  }

  if (loading || !game) {
    return (
      <div className="flex justify-center py-12">
        <div className="w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <button
        onClick={() => router.back()}
        className="text-text-secondary text-sm hover:text-white transition-colors"
      >
        &larr; Назад
      </button>

      <div className="flex items-center gap-3">
        <span
          className={`px-3 py-1 rounded-lg text-sm font-bold ${
            game.type === "MAIN"
              ? "bg-gold/20 text-gold"
              : "bg-accent/20 text-accent"
          }`}
        >
          {game.type}
        </span>
        <span
          className={`px-3 py-1 rounded-lg text-sm font-bold ${
            game.status === "OPEN"
              ? "bg-success/20 text-success"
              : game.status === "FULL"
              ? "bg-danger/20 text-danger"
              : "bg-text-secondary/20 text-text-secondary"
          }`}
        >
          {game.status === "OPEN"
            ? "Открыта"
            : game.status === "FULL"
            ? "Заполнена"
            : "Завершена"}
        </span>
      </div>

      <h1 className="text-2xl font-bold">
        {new Date(game.date).toLocaleDateString("ru-RU", {
          day: "numeric",
          month: "long",
          year: "numeric",
        })}{" "}
        в {game.time}
      </h1>

      {game.description && (
        <p className="text-text-secondary">{game.description}</p>
      )}

      <Card>
        <div className="flex justify-between">
          <div>
            <p className="text-text-secondary text-sm">Стоимость</p>
            <p className="text-xl font-bold text-gold">
              {(game.price / 100).toLocaleString("ru-RU")} ₽
            </p>
          </div>
          <div className="text-right">
            <p className="text-text-secondary text-sm">Места</p>
            <p className="text-xl font-bold">
              {game.playersCount}/{game.playersLimit}
            </p>
          </div>
        </div>
      </Card>

      {/* Кнопка оплаты */}
      {game.status === "OPEN" && !isParticipant && (
        <Button
          className="w-full"
          size="lg"
          onClick={handlePay}
          disabled={paying}
        >
          {paying ? "Оформление..." : "Записаться и оплатить"}
        </Button>
      )}
      {isParticipant && (
        <Card className="text-center bg-success/10 border-success/30">
          <p className="text-success font-semibold">Вы записаны на эту игру</p>
        </Card>
      )}

      {/* Участники */}
      <div>
        <h2 className="text-lg font-bold mb-3">
          Участники ({game.participants.length})
        </h2>
        <div className="space-y-2">
          {game.participants.map((p) => (
            <Card key={p.user.id} className="flex items-center gap-3 py-3">
              <div className="w-10 h-10 rounded-full bg-accent/30 flex items-center justify-center text-sm font-bold shrink-0">
                {p.user.avatarUrl ? (
                  <img
                    src={p.user.avatarUrl}
                    alt=""
                    className="w-full h-full rounded-full object-cover"
                  />
                ) : (
                  p.user.displayName[0]
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold truncate">{p.user.displayName}</p>
                {p.user.username && (
                  <p className="text-text-secondary text-xs">
                    @{p.user.username}
                  </p>
                )}
              </div>
              <p className="text-gold text-sm font-bold">
                {p.user.totalPoints} pts
              </p>
            </Card>
          ))}
        </div>
      </div>

      {/* Результат */}
      {game.results.length > 0 && (
        <Card>
          <p className="text-text-secondary text-sm">Ваш результат</p>
          <p className="text-2xl font-bold text-gold">
            {game.results[0].totalPoints} баллов
          </p>
        </Card>
      )}

      <p className="text-text-secondary text-xs text-center">
        Ведущий: {game.createdBy.displayName}
      </p>
    </div>
  );
}
