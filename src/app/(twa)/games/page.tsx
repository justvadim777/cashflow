"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/Card";
import { api } from "@/lib/api";
import Image from "next/image";
import Link from "next/link";

interface GameParticipant {
  user: {
    id: string;
    displayName: string;
    avatarUrl: string | null;
  };
}

interface Game {
  id: string;
  date: string;
  time: string;
  type: "BASE" | "MAIN";
  price: number;
  playersLimit: number;
  playersCount: number;
  status: "OPEN" | "FULL" | "FINISHED";
  description: string | null;
  participants: GameParticipant[];
}

type TabFilter = "active" | "finished";

export default function GamesPage() {
  const [games, setGames] = useState<Game[]>([]);
  const [topPlayerIds, setTopPlayerIds] = useState<string[]>([]);
  const [tab, setTab] = useState<TabFilter>("active");
  const [typeFilter, setTypeFilter] = useState<"" | "BASE" | "MAIN">("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadGames() {
      setLoading(true);
      try {
        const params = new URLSearchParams({ status: tab });
        if (typeFilter) params.set("type", typeFilter);
        const data = await api<{ games: Game[]; topPlayerIds: string[] }>(`/games?${params}`);
        setGames(data.games);
        setTopPlayerIds(data.topPlayerIds || []);
      } catch {
        setGames([]);
      }
      setLoading(false);
    }
    loadGames();
  }, [tab, typeFilter]);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Игры</h1>

      {/* Табы */}
      <div className="flex gap-2">
        {(["active", "finished"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-xl text-sm font-semibold transition-colors ${
              tab === t
                ? "bg-accent text-white"
                : "bg-card text-text-secondary border border-border"
            }`}
          >
            {t === "active" ? "Активные" : "Завершённые"}
          </button>
        ))}
      </div>

      {/* Фильтр типа */}
      <div className="flex gap-2">
        {(["", "BASE", "MAIN"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTypeFilter(t)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              typeFilter === t
                ? "bg-accent/20 text-accent"
                : "text-text-secondary hover:text-white"
            }`}
          >
            {t === "" ? "Все" : t}
          </button>
        ))}
      </div>

      {/* Список */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin" />
        </div>
      ) : games.length === 0 ? (
        <Card className="text-center py-8">
          <p className="text-text-secondary">Игр пока нет</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {games.map((game) => {
            const spotsLeft = game.playersLimit - game.playersCount;
            const lowSpots = spotsLeft > 0 && spotsLeft <= 2 && game.status === "OPEN";
            const hasTopPlayer = game.participants.some((p) =>
              topPlayerIds.includes(p.user.id)
            );

            return (
              <Link key={game.id} href={`/games/${game.id}`}>
                <Card className="hover:border-accent/30 transition-colors">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span
                          className={`px-2 py-0.5 rounded-md text-xs font-bold ${
                            game.type === "MAIN"
                              ? "bg-gold/20 text-gold"
                              : "bg-accent/20 text-accent"
                          }`}
                        >
                          {game.type}
                        </span>
                        {game.status === "FULL" && (
                          <span className="px-2 py-0.5 rounded-md text-xs font-bold bg-danger/20 text-danger">
                            Мест нет
                          </span>
                        )}
                        {lowSpots && (
                          <span className="px-2 py-0.5 rounded-md text-xs font-bold bg-gold/20 text-gold">
                            Мало мест
                          </span>
                        )}
                        {hasTopPlayer && game.status !== "FINISHED" && (
                          <span className="px-2 py-0.5 rounded-md text-xs font-bold bg-accent/20 text-accent">
                            Топ игрок
                          </span>
                        )}
                      </div>
                      <p className="font-semibold mt-2">
                        {new Date(game.date).toLocaleDateString("ru-RU", {
                          day: "numeric",
                          month: "long",
                        })}{" "}
                        в {game.time}
                      </p>
                      <p className="text-text-secondary text-sm mt-1">
                        {game.playersCount}/{game.playersLimit} игроков
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-gold">
                        {(game.price / 100).toLocaleString("ru-RU")} ₽
                      </p>
                    </div>
                  </div>

                  {/* Аватары участников */}
                  {game.participants.length > 0 && (
                    <div className="flex -space-x-2 mt-3">
                      {game.participants.slice(0, 5).map((p) => (
                        <div
                          key={p.user.id}
                          className="w-8 h-8 rounded-full bg-accent/30 border-2 border-card flex items-center justify-center text-xs font-bold relative"
                          title={p.user.displayName}
                        >
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
                      ))}
                      {game.participants.length > 5 && (
                        <div className="w-8 h-8 rounded-full bg-card border-2 border-border flex items-center justify-center text-xs text-text-secondary">
                          +{game.participants.length - 5}
                        </div>
                      )}
                    </div>
                  )}
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
