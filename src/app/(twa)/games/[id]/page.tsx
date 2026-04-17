"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { api } from "@/lib/api";
import Image from "next/image";

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
    confirmed: boolean;
    user: {
      id: string;
      displayName: string;
      avatarUrl: string | null;
      username: string | null;
      totalPoints: number;
    };
  }[];
  results: { totalPoints: number; userId: string; user: { displayName: string } }[];
}

const TYPE_LABELS: Record<string, string> = {
  BASE: "Базовая",
  MAIN: "Продвинутая",
};

export default function GameDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [game, setGame] = useState<GameDetail | null>(null);
  const [isParticipant, setIsParticipant] = useState(false);
  const [loading, setLoading] = useState(true);
  const [registering, setRegistering] = useState(false);

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

  async function handleRegister() {
    if (!game) return;
    setRegistering(true);
    try {
      await api(`/games/${game.id}/register`, { method: "POST" });
      setIsParticipant(true);
      setGame({ ...game, playersCount: game.playersCount + 1 });
    } catch (e) {
      alert(e instanceof Error ? e.message : "Ошибка записи");
    }
    setRegistering(false);
  }

  async function handleCancel() {
    if (!game) return;
    if (!confirm("Точно отменить запись на игру?")) return;
    setRegistering(true);
    try {
      await api(`/games/${game.id}/register`, { method: "DELETE" });
      setIsParticipant(false);
      setGame({ ...game, playersCount: Math.max(0, game.playersCount - 1) });
    } catch (e) {
      alert(e instanceof Error ? e.message : "Ошибка отмены");
    }
    setRegistering(false);
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
      <div className="flex items-center gap-3">
        <span
          className={`px-3 py-1 rounded-lg text-sm font-bold ${
            game.type === "MAIN"
              ? "bg-gold/20 text-gold"
              : "bg-accent/20 text-accent"
          }`}
        >
          {TYPE_LABELS[game.type]}
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

      {/* Кнопка записи */}
      {game.status === "OPEN" && !isParticipant && (
        <Button
          className="w-full"
          size="lg"
          onClick={handleRegister}
          disabled={registering}
        >
          {registering ? "Записываем..." : "Записаться на игру"}
        </Button>
      )}
      {isParticipant && game.status !== "FINISHED" && (
        <>
          <Card className="text-center bg-success/10 border-success/30">
            <p className="text-success font-semibold">Вы записаны на эту игру</p>
            <p className="text-text-secondary text-xs mt-1">Организатор свяжется с вами для оплаты</p>
          </Card>
          <Button
            variant="secondary"
            className="w-full"
            onClick={handleCancel}
            disabled={registering}
          >
            {registering ? "..." : "Отменить запись"}
          </Button>
        </>
      )}

      {/* Участники */}
      <div>
        <h2 className="text-lg font-bold mb-3">
          Участники ({game.participants.length})
        </h2>
        <div className="space-y-2">
          {game.participants.map((p) => (
            <Card key={p.user.id} className="flex items-center gap-3 py-3">
              <div className="w-10 h-10 rounded-full bg-accent/30 flex items-center justify-center text-sm font-bold shrink-0 relative">
                {p.user.avatarUrl ? (
                  <Image
                    src={p.user.avatarUrl}
                    alt=""
                    fill
                    className="rounded-full object-cover"
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
              <div className="flex items-center gap-2">
                {p.confirmed ? (
                  <span className="text-success text-xs font-semibold">Оплачен</span>
                ) : (
                  <span className="text-gold text-xs font-semibold">Ожидает</span>
                )}
              </div>
            </Card>
          ))}
        </div>
      </div>

      {/* Результаты */}
      {game.results.length > 0 && (
        <div>
          <h2 className="text-lg font-bold mb-3">Результаты</h2>
          <div className="space-y-2">
            {game.results.map((r, i) => (
              <Card key={r.userId} className="flex items-center gap-3 py-3">
                <span className="w-6 text-center text-sm font-bold text-text-secondary">
                  {i + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm truncate">{r.user.displayName}</p>
                </div>
                <p className="text-gold text-sm font-bold">{r.totalPoints} б.</p>
              </Card>
            ))}
          </div>
        </div>
      )}

      <p className="text-text-secondary text-xs text-center">
        Ведущий: {game.createdBy.displayName}
      </p>
    </div>
  );
}
