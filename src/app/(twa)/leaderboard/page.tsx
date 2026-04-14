"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Card } from "@/components/ui/Card";
import { api } from "@/lib/api";

interface LeaderboardPlayer {
  id: string;
  displayName: string;
  username: string | null;
  avatarUrl: string | null;
  totalPoints: number;
  monthlyPoints: number;
  level: string;
}

type Period = "all" | "week" | "month";

const PERIOD_LABELS: Record<Period, string> = {
  all: "All time",
  week: "Last week",
  month: "Last month",
};

function Avatar({
  player,
  size = "md",
}: {
  player: LeaderboardPlayer;
  size?: "sm" | "md" | "lg";
}) {
  const sizes = { sm: "w-8 h-8 text-xs", md: "w-12 h-12 text-sm", lg: "w-16 h-16 text-xl" };
  return (
    <div
      className={`${sizes[size]} rounded-full bg-accent/30 flex items-center justify-center font-bold shrink-0`}
    >
      {player.avatarUrl ? (
        <img
          src={player.avatarUrl}
          alt=""
          className="w-full h-full rounded-full object-cover"
        />
      ) : (
        player.displayName[0]
      )}
    </div>
  );
}

export default function LeaderboardPage() {
  const [period, setPeriod] = useState<Period>("all");
  const [players, setPlayers] = useState<LeaderboardPlayer[]>([]);
  const [userPosition, setUserPosition] = useState(0);
  const [userId, setUserId] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const data = await api<{
          players: LeaderboardPlayer[];
          userPosition: number;
          userId: string;
        }>(`/leaderboard?period=${period}`);
        setPlayers(data.players);
        setUserPosition(data.userPosition);
        setUserId(data.userId);
      } catch {
        setPlayers([]);
      }
      setLoading(false);
    }
    load();
  }, [period]);

  const top3 = players.slice(0, 3);
  const rest = players.slice(3);

  // Порядок отображения подиума: 2, 1, 3
  const podiumOrder = [top3[1], top3[0], top3[2]].filter(Boolean);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Рейтинг</h1>

      {/* Period tabs */}
      <div className="flex gap-1 bg-card rounded-xl p-1">
        {(["all", "week", "month"] as const).map((p) => (
          <button
            key={p}
            onClick={() => setPeriod(p)}
            className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-colors ${
              period === p
                ? "bg-accent text-white"
                : "text-text-secondary hover:text-white"
            }`}
          >
            {PERIOD_LABELS[p]}
          </button>
        ))}
      </div>

      {/* User position pill */}
      {userPosition > 0 && (
        <div className="flex justify-center">
          <div className="bg-accent/20 text-accent px-4 py-1.5 rounded-full text-sm font-semibold">
            Твоя позиция: #{userPosition}
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <>
          {/* Podium */}
          {top3.length >= 3 && (
            <div className="flex items-end justify-center gap-3 py-4">
              {podiumOrder.map((player, i) => {
                const actualPlace = i === 0 ? 2 : i === 1 ? 1 : 3;
                const heights = ["h-24", "h-32", "h-20"];
                const borderColors = [
                  "border-gray-400",
                  "border-gold",
                  "border-amber-700",
                ];

                return (
                  <motion.div
                    key={player.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.1 }}
                    className="flex flex-col items-center"
                  >
                    <div className="relative">
                      {actualPlace === 1 && (
                        <span className="absolute -top-5 left-1/2 -translate-x-1/2 text-lg">
                          👑
                        </span>
                      )}
                      <div
                        className={`rounded-full border-2 ${borderColors[i]} p-[2px]`}
                      >
                        <Avatar player={player} size="lg" />
                      </div>
                      <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-accent flex items-center justify-center text-xs font-bold">
                        {actualPlace}
                      </div>
                    </div>
                    <p className="text-sm font-semibold mt-2 truncate max-w-[80px] text-center">
                      {player.displayName}
                    </p>
                    <p className="text-gold text-xs font-bold">
                      {player.totalPoints}
                    </p>
                  </motion.div>
                );
              })}
            </div>
          )}

          {/* List */}
          <div className="space-y-2">
            {rest.map((player, i) => {
              const position = i + 4;
              const isCurrentUser = player.id === userId;

              return (
                <motion.div
                  key={player.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.03 }}
                >
                  <Card
                    className={`flex items-center gap-3 py-3 ${
                      isCurrentUser ? "border-accent/50 bg-accent/5" : ""
                    }`}
                  >
                    <span className="w-6 text-center text-sm font-bold text-text-secondary">
                      {position}
                    </span>
                    <Avatar player={player} size="sm" />
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm truncate">
                        {player.displayName}
                      </p>
                    </div>
                    <p className="text-gold text-sm font-bold">
                      {player.totalPoints}
                    </p>
                  </Card>
                </motion.div>
              );
            })}
          </div>

          {players.length === 0 && (
            <Card className="text-center py-8">
              <p className="text-text-secondary">Пока нет игроков</p>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
