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
    userId: string;
    confirmed: boolean;
    paymentMethod: "YUKASSA" | "CASH";
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
  const [registering, setRegistering] = useState(false);
  const [inWaitlist, setInWaitlist] = useState(false);
  const [joiningWaitlist, setJoiningWaitlist] = useState(false);

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

  async function handlePayOnline() {
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

  async function handleRegisterCash() {
    if (!game) return;
    setRegistering(true);
    try {
      await api(`/games/${game.id}/register`, { method: "POST" });
      setIsParticipant(true);
      setGame((prev) =>
        prev ? { ...prev, playersCount: prev.playersCount + 1 } : prev
      );
    } catch (e) {
      alert(e instanceof Error ? e.message : "Ошибка записи");
    }
    setRegistering(false);
  }

  async function handleJoinWaitlist() {
    if (!game) return;
    setJoiningWaitlist(true);
    try {
      await api(`/games/${game.id}/waitlist`, { method: "POST" });
      setInWaitlist(true);
    } catch (e) {
      alert(e instanceof Error ? e.message : "Ошибка");
    }
    setJoiningWaitlist(false);
  }

  async function handleCancel() {
    if (!game) return;
    if (!confirm("Отменить запись?")) return;
    try {
      await api(`/games/${game.id}/register`, { method: "DELETE" });
      setIsParticipant(false);
      setGame((prev) =>
        prev ? { ...prev, playersCount: prev.playersCount - 1 } : prev
      );
    } catch (e) {
      alert(e instanceof Error ? e.message : String(e));
    }
  }

  if (loading || !game) {
    return (
      <div className="flex justify-center py-12">
        <div className="w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const myParticipant = game.participants.find((p) => p.userId !== undefined);
  const isConfirmed = myParticipant?.confirmed ?? false;
  const isCash = myParticipant?.paymentMethod === "CASH";

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

      {/* Кнопки действий */}
      {game.status === "FULL" && !isParticipant && (
        <div className="space-y-2">
          {inWaitlist ? (
            <Card className="text-center bg-gold/10 border-gold/30">
              <p className="text-gold font-semibold">Вы в листе ожидания</p>
              <p className="text-text-secondary text-xs mt-1">Уведомим, когда освободится место</p>
            </Card>
          ) : (
            <Button
              className="w-full"
              size="lg"
              onClick={handleJoinWaitlist}
              disabled={joiningWaitlist}
            >
              {joiningWaitlist ? "..." : "Встать в лист ожидания"}
            </Button>
          )}
        </div>
      )}

      {game.status === "OPEN" && !isParticipant && (
        <div className="space-y-2">
          <Button
            className="w-full"
            size="lg"
            onClick={handlePayOnline}
            disabled={paying}
          >
            {paying ? "Оформление..." : "Оплатить онлайн"}
          </Button>
          <Button
            className="w-full bg-card border border-accent/30 text-accent"
            size="lg"
            onClick={handleRegisterCash}
            disabled={registering}
          >
            {registering ? "Запись..." : "Записаться, оплачу на месте"}
          </Button>
          <p className="text-text-secondary text-xs text-center">
            При оплате наличными запись ожидает подтверждения администратора
          </p>
        </div>
      )}

      {isParticipant && (
        <div className="space-y-2">
          {isConfirmed ? (
            <Card className="text-center bg-success/10 border-success/30">
              <p className="text-success font-semibold">Вы записаны на эту игру</p>
            </Card>
          ) : isCash ? (
            <Card className="text-center bg-gold/10 border-gold/30">
              <p className="text-gold font-semibold">Запись ожидает подтверждения</p>
              <p className="text-text-secondary text-xs mt-1">Администратор подтвердит вашу запись</p>
            </Card>
          ) : (
            <Card className="text-center bg-accent/10 border-accent/30">
              <p className="text-accent font-semibold">Ожидание оплаты...</p>
            </Card>
          )}
          {!isConfirmed && isCash && (
            <button
              onClick={handleCancel}
              className="w-full text-danger text-sm py-2 hover:underline"
            >
              Отменить запись
            </button>
          )}
        </div>
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
              <div className="text-right">
                <p className="text-gold text-sm font-bold">
                  {p.user.totalPoints} б.
                </p>
                {!p.confirmed && (
                  <p className="text-text-secondary text-xs">ожидание</p>
                )}
              </div>
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
