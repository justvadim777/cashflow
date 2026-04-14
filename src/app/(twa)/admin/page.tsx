"use client";

import { useEffect, useState } from "react";
import { useUserStore } from "@/store/user";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { api } from "@/lib/api";

interface GameForResults {
  id: string;
  date: string;
  time: string;
  type: string;
  status: string;
  participants: {
    user: { id: string; displayName: string };
  }[];
}

const SKILL_FIELDS = [
  { key: "skillFinance", label: "Финансовая грамотность" },
  { key: "skillStrategy", label: "Стратегия" },
  { key: "skillOpportunity", label: "Поиск возможностей" },
  { key: "skillDecision", label: "Принятие решений" },
  { key: "skillFocus", label: "Концентрация" },
  { key: "skillCommunication", label: "Коммуникация" },
  { key: "skillLeadership", label: "Лидерство" },
  { key: "skillAdaptation", label: "Адаптация" },
  { key: "skillLearning", label: "Обучение" },
  { key: "skillEngagement", label: "Вовлечённость" },
] as const;

const GAME_POINT_FIELDS = [
  { key: "pointsExitRatRace", label: "Выход из крысиных бегов (+10)" },
  { key: "pointsLiabilities", label: "Пассивы закрыты (+5)" },
  { key: "pointsDream", label: "Мечта куплена (+10)" },
  { key: "pointsBestIncome", label: "Лучший доход (+10)" },
  { key: "pointsIncomeGrowth", label: "Рост дохода (+5/50k)" },
] as const;

const EXTRA_POINT_FIELDS = [
  { key: "pointsSecret", label: "Секретный балл (+5)" },
  { key: "pointsOrder", label: "Заказ в заведении (+10)" },
  { key: "pointsSubscription", label: "Подписка (+5)" },
  { key: "pointsVideoReview", label: "Видео-отзыв (+5)" },
  { key: "pointsStories", label: "Сторис (+5)" },
] as const;

type Tab = "results" | "analytics" | "games";

export default function AdminPage() {
  const { role } = useUserStore();
  const [tab, setTab] = useState<Tab>("results");
  const [games, setGames] = useState<GameForResults[]>([]);
  const [selectedGame, setSelectedGame] = useState<string>("");
  const [selectedPlayer, setSelectedPlayer] = useState<string>("");
  const [scores, setScores] = useState<Record<string, number>>({});
  const [saving, setSaving] = useState(false);
  const [analytics, setAnalytics] = useState<Record<string, unknown> | null>(null);

  // Создание игры
  const [newGame, setNewGame] = useState({
    date: "",
    time: "",
    type: "BASE",
    price: 70000,
    playersLimit: 6,
    description: "",
  });

  const isAdmin = role === "ADMIN";
  const isHost = role === "HOST";
  const isOwner = role === "OWNER";

  useEffect(() => {
    if (!isAdmin && !isHost && !isOwner) return;

    async function loadGames() {
      try {
        const data = await api<{ games: GameForResults[] }>(
          "/games?status=active"
        );
        setGames(data.games);
      } catch {
        /* empty */
      }
    }
    loadGames();

    if (isAdmin || isOwner) {
      api<Record<string, unknown>>("/analytics")
        .then(setAnalytics)
        .catch(() => {});
    }
  }, [isAdmin, isHost, isOwner]);

  if (!isAdmin && !isHost && !isOwner) {
    return (
      <Card className="text-center py-8">
        <p className="text-danger font-semibold">Нет доступа</p>
      </Card>
    );
  }

  const currentGame = games.find((g) => g.id === selectedGame);

  async function saveResults() {
    if (!selectedGame || !selectedPlayer) return;
    setSaving(true);
    try {
      await api("/results", {
        method: "POST",
        body: JSON.stringify({
          gameId: selectedGame,
          userId: selectedPlayer,
          ...scores,
        }),
      });
      alert("Результат сохранён");
      setScores({});
      setSelectedPlayer("");
    } catch (e) {
      alert(e instanceof Error ? e.message : "Ошибка");
    }
    setSaving(false);
  }

  async function createGame() {
    try {
      await api("/games", {
        method: "POST",
        body: JSON.stringify(newGame),
      });
      alert("Игра создана");
      setNewGame({ date: "", time: "", type: "BASE", price: 70000, playersLimit: 6, description: "" });
    } catch (e) {
      alert(e instanceof Error ? e.message : "Ошибка");
    }
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Панель управления</h1>

      {/* Tabs */}
      <div className="flex gap-1 bg-card rounded-xl p-1">
        {(isAdmin || isHost) && (
          <button
            onClick={() => setTab("results")}
            className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-colors ${
              tab === "results" ? "bg-accent text-white" : "text-text-secondary"
            }`}
          >
            Результаты
          </button>
        )}
        {(isAdmin || isHost) && (
          <button
            onClick={() => setTab("games")}
            className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-colors ${
              tab === "games" ? "bg-accent text-white" : "text-text-secondary"
            }`}
          >
            Создать игру
          </button>
        )}
        {(isAdmin || isOwner) && (
          <button
            onClick={() => setTab("analytics")}
            className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-colors ${
              tab === "analytics" ? "bg-accent text-white" : "text-text-secondary"
            }`}
          >
            Аналитика
          </button>
        )}
      </div>

      {/* Results tab */}
      {tab === "results" && (
        <div className="space-y-4">
          <Card>
            <label className="block text-sm text-text-secondary mb-1">Игра</label>
            <select
              value={selectedGame}
              onChange={(e) => {
                setSelectedGame(e.target.value);
                setSelectedPlayer("");
              }}
              className="w-full bg-bg border border-border rounded-xl px-3 py-2 text-white"
            >
              <option value="">Выберите игру</option>
              {games.map((g) => (
                <option key={g.id} value={g.id}>
                  {new Date(g.date).toLocaleDateString("ru-RU")} {g.time} — {g.type}
                </option>
              ))}
            </select>
          </Card>

          {currentGame && (
            <Card>
              <label className="block text-sm text-text-secondary mb-1">Игрок</label>
              <select
                value={selectedPlayer}
                onChange={(e) => setSelectedPlayer(e.target.value)}
                className="w-full bg-bg border border-border rounded-xl px-3 py-2 text-white"
              >
                <option value="">Выберите игрока</option>
                {currentGame.participants.map((p) => (
                  <option key={p.user.id} value={p.user.id}>
                    {p.user.displayName}
                  </option>
                ))}
              </select>
            </Card>
          )}

          {selectedPlayer && (
            <>
              <Card>
                <h3 className="font-semibold mb-3">Навыки (1-10)</h3>
                <div className="space-y-2">
                  {SKILL_FIELDS.map(({ key, label }) => (
                    <div key={key} className="flex items-center gap-3">
                      <label className="flex-1 text-sm">{label}</label>
                      <input
                        type="number"
                        min={0}
                        max={10}
                        value={scores[key] || 0}
                        onChange={(e) =>
                          setScores({ ...scores, [key]: Number(e.target.value) })
                        }
                        className="w-16 bg-bg border border-border rounded-lg px-2 py-1 text-center text-white"
                      />
                    </div>
                  ))}
                </div>
              </Card>

              <Card>
                <h3 className="font-semibold mb-3">Игровые баллы</h3>
                <div className="space-y-2">
                  {GAME_POINT_FIELDS.map(({ key, label }) => (
                    <div key={key} className="flex items-center gap-3">
                      <label className="flex-1 text-sm">{label}</label>
                      <input
                        type="number"
                        min={0}
                        value={scores[key] || 0}
                        onChange={(e) =>
                          setScores({ ...scores, [key]: Number(e.target.value) })
                        }
                        className="w-16 bg-bg border border-border rounded-lg px-2 py-1 text-center text-white"
                      />
                    </div>
                  ))}
                </div>
              </Card>

              <Card>
                <h3 className="font-semibold mb-3">Дополнительные баллы</h3>
                <div className="space-y-2">
                  {EXTRA_POINT_FIELDS.map(({ key, label }) => (
                    <div key={key} className="flex items-center gap-3">
                      <label className="flex-1 text-sm">{label}</label>
                      <input
                        type="number"
                        min={0}
                        value={scores[key] || 0}
                        onChange={(e) =>
                          setScores({ ...scores, [key]: Number(e.target.value) })
                        }
                        className="w-16 bg-bg border border-border rounded-lg px-2 py-1 text-center text-white"
                      />
                    </div>
                  ))}
                </div>
              </Card>

              <Button
                className="w-full"
                size="lg"
                onClick={saveResults}
                disabled={saving}
              >
                {saving ? "Сохранение..." : "Сохранить результат"}
              </Button>
            </>
          )}
        </div>
      )}

      {/* Create game tab */}
      {tab === "games" && (
        <Card className="space-y-3">
          <div>
            <label className="block text-sm text-text-secondary mb-1">Дата</label>
            <input
              type="date"
              value={newGame.date}
              onChange={(e) => setNewGame({ ...newGame, date: e.target.value })}
              className="w-full bg-bg border border-border rounded-xl px-3 py-2 text-white"
            />
          </div>
          <div>
            <label className="block text-sm text-text-secondary mb-1">Время</label>
            <input
              type="time"
              value={newGame.time}
              onChange={(e) => setNewGame({ ...newGame, time: e.target.value })}
              className="w-full bg-bg border border-border rounded-xl px-3 py-2 text-white"
            />
          </div>
          <div>
            <label className="block text-sm text-text-secondary mb-1">Тип</label>
            <select
              value={newGame.type}
              onChange={(e) => setNewGame({ ...newGame, type: e.target.value })}
              className="w-full bg-bg border border-border rounded-xl px-3 py-2 text-white"
            >
              <option value="BASE">BASE</option>
              <option value="MAIN">MAIN</option>
            </select>
          </div>
          <div>
            <label className="block text-sm text-text-secondary mb-1">Цена (₽)</label>
            <input
              type="number"
              value={newGame.price / 100}
              onChange={(e) =>
                setNewGame({ ...newGame, price: Number(e.target.value) * 100 })
              }
              className="w-full bg-bg border border-border rounded-xl px-3 py-2 text-white"
            />
          </div>
          <div>
            <label className="block text-sm text-text-secondary mb-1">Макс. игроков</label>
            <input
              type="number"
              value={newGame.playersLimit}
              onChange={(e) =>
                setNewGame({ ...newGame, playersLimit: Number(e.target.value) })
              }
              className="w-full bg-bg border border-border rounded-xl px-3 py-2 text-white"
            />
          </div>
          <div>
            <label className="block text-sm text-text-secondary mb-1">Описание</label>
            <textarea
              value={newGame.description}
              onChange={(e) =>
                setNewGame({ ...newGame, description: e.target.value })
              }
              className="w-full bg-bg border border-border rounded-xl px-3 py-2 text-white resize-none"
              rows={3}
            />
          </div>
          <Button className="w-full" onClick={createGame}>
            Создать игру
          </Button>
        </Card>
      )}

      {/* Analytics tab */}
      {tab === "analytics" && analytics && (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <Card>
              <p className="text-text-secondary text-xs">Пользователи</p>
              <p className="text-2xl font-bold">{analytics.totalUsers as number}</p>
            </Card>
            <Card>
              <p className="text-text-secondary text-xs">Всего игр</p>
              <p className="text-2xl font-bold">{analytics.totalGames as number}</p>
            </Card>
            <Card>
              <p className="text-text-secondary text-xs">Активных</p>
              <p className="text-2xl font-bold text-success">
                {analytics.activeGames as number}
              </p>
            </Card>
            <Card>
              <p className="text-text-secondary text-xs">Выручка</p>
              <p className="text-2xl font-bold text-gold">
                {(
                  (analytics.totalRevenue as number) / 100
                ).toLocaleString("ru-RU")}{" "}
                ₽
              </p>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
