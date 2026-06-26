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

interface CashParticipant {
  userId: string;
  confirmed: boolean;
  paymentMethod: string;
  joinedAt: string;
  user: { displayName: string; username: string | null };
  game: { id: string; date: string; time: string; price: number };
}

interface RefundRequest {
  id: string;
  amount: number;
  reason: string | null;
  status: "CREATED" | "PROCESSING" | "DONE";
  createdAt: string;
  user: { displayName: string };
  game: { date: string; time: string };
}

type Tab = "results" | "analytics" | "games" | "refunds" | "cash";

export default function AdminPage() {
  const { role } = useUserStore();
  const [tab, setTab] = useState<Tab>("results");
  const [games, setGames] = useState<GameForResults[]>([]);
  const [selectedGame, setSelectedGame] = useState<string>("");
  const [selectedPlayer, setSelectedPlayer] = useState<string>("");
  const [scores, setScores] = useState<Record<string, number>>({});
  const [saving, setSaving] = useState(false);
  const [analytics, setAnalytics] = useState<Record<string, unknown> | null>(null);
  const [refunds, setRefunds] = useState<RefundRequest[]>([]);
  const [cashParticipants, setCashParticipants] = useState<CashParticipant[]>([]);
  const [cashAmounts, setCashAmounts] = useState<Record<string, number>>({});

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
      api<{ refunds: RefundRequest[] }>("/admin/refunds/all")
        .then((d) => setRefunds(d.refunds))
        .catch(() => {});
      api<{ participants: CashParticipant[] }>("/admin/cash-participants")
        .then((d) => setCashParticipants(d.participants))
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
        {(isAdmin || isHost) && (
          <button
            onClick={() => setTab("cash")}
            className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-colors ${
              tab === "cash" ? "bg-accent text-white" : "text-text-secondary"
            }`}
          >
            Наличные
          </button>
        )}
        {(isAdmin || isOwner) && (
          <button
            onClick={() => setTab("refunds")}
            className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-colors ${
              tab === "refunds" ? "bg-accent text-white" : "text-text-secondary"
            }`}
          >
            Возвраты
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

      {/* Cash registrations tab */}
      {tab === "cash" && (
        <div className="space-y-3">
          <h2 className="font-semibold text-lg">CASH-записи (ожидают подтверждения)</h2>
          {cashParticipants.filter((p) => !p.confirmed).length === 0 && (
            <Card className="text-center text-text-secondary py-6">Нет ожидающих записей</Card>
          )}
          {cashParticipants
            .filter((p) => !p.confirmed)
            .map((p) => (
              <Card key={`${p.game.id}-${p.userId}`} className="space-y-2">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="font-semibold">{p.user.displayName}</p>
                    {p.user.username && (
                      <p className="text-text-secondary text-xs">@{p.user.username}</p>
                    )}
                    <p className="text-text-secondary text-xs">
                      {new Date(p.game.date).toLocaleDateString("ru-RU")} {p.game.time}
                    </p>
                  </div>
                  <p className="text-gold text-xs font-semibold">CASH</p>
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <input
                    type="number"
                    min={0}
                    value={cashAmounts[`${p.game.id}-${p.userId}`] ?? Math.round((p.game.price ?? 0) / 100)}
                    onChange={(e) =>
                      setCashAmounts((prev) => ({
                        ...prev,
                        [`${p.game.id}-${p.userId}`]: Number(e.target.value),
                      }))
                    }
                    className="w-24 bg-bg border border-border rounded-lg px-2 py-1 text-center text-white text-sm"
                    placeholder="Сумма ₽"
                  />
                  <span className="text-text-secondary text-xs">₽</span>
                </div>
                <div className="flex gap-2 mt-2">
                  <Button
                    size="sm"
                    className="flex-1"
                    onClick={async () => {
                      const amount = cashAmounts[`${p.game.id}-${p.userId}`] ?? Math.round((p.game.price ?? 0) / 100);
                      await api(`/games/${p.game.id}/confirm`, {
                        method: "PATCH",
                        body: JSON.stringify({ userId: p.userId, action: "confirm", amount }),
                      });
                      setCashParticipants((prev) =>
                        prev.map((x) =>
                          x.userId === p.userId && x.game.id === p.game.id
                            ? { ...x, confirmed: true }
                            : x
                        )
                      );
                    }}
                  >
                    Подтвердить
                  </Button>
                  <Button
                    size="sm"
                    className="flex-1 bg-danger/20 text-danger"
                    onClick={async () => {
                      await api(`/games/${p.game.id}/confirm`, {
                        method: "PATCH",
                        body: JSON.stringify({ userId: p.userId, action: "reject" }),
                      });
                      setCashParticipants((prev) =>
                        prev.filter(
                          (x) => !(x.userId === p.userId && x.game.id === p.game.id)
                        )
                      );
                    }}
                  >
                    Отклонить
                  </Button>
                </div>
              </Card>
            ))}
        </div>
      )}

      {/* Refunds tab */}
      {tab === "refunds" && (
        <div className="space-y-3">
          <h2 className="font-semibold text-lg">Заявки на возврат</h2>
          {refunds.length === 0 && (
            <Card className="text-center text-text-secondary py-6">Нет заявок</Card>
          )}
          {refunds.map((r) => (
            <Card key={r.id} className="space-y-2">
              <div className="flex justify-between items-start">
                <div>
                  <p className="font-semibold">{r.user.displayName}</p>
                  <p className="text-text-secondary text-xs">
                    {new Date(r.game.date).toLocaleDateString("ru-RU")} {r.game.time}
                  </p>
                  {r.reason && <p className="text-sm mt-1">{r.reason}</p>}
                </div>
                <div className="text-right">
                  <p className="text-gold font-bold">{(r.amount / 100).toLocaleString("ru-RU")} ₽</p>
                  <p className={`text-xs font-semibold ${r.status === "DONE" ? "text-success" : r.status === "PROCESSING" ? "text-gold" : "text-text-secondary"}`}>
                    {r.status === "CREATED" ? "Новая" : r.status === "PROCESSING" ? "В работе" : "Готово"}
                  </p>
                </div>
              </div>
              {r.status !== "DONE" && (
                <div className="flex gap-2">
                  {r.status === "CREATED" && (
                    <Button
                      size="sm"
                      className="flex-1"
                      onClick={async () => {
                        await api(`/admin/refunds/${r.id}`, { method: "PATCH", body: JSON.stringify({ status: "PROCESSING" }) });
                        setRefunds((prev) => prev.map((x) => x.id === r.id ? { ...x, status: "PROCESSING" } : x));
                      }}
                    >
                      Взять в работу
                    </Button>
                  )}
                  <Button
                    size="sm"
                    className="flex-1 bg-success/20 text-success"
                    onClick={async () => {
                      await api(`/admin/refunds/${r.id}`, { method: "PATCH", body: JSON.stringify({ status: "DONE" }) });
                      setRefunds((prev) => prev.map((x) => x.id === r.id ? { ...x, status: "DONE" } : x));
                    }}
                  >
                    Готово
                  </Button>
                </div>
              )}
            </Card>
          ))}
        </div>
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
              <p className="text-text-secondary text-xs">Активных игр</p>
              <p className="text-2xl font-bold text-success">
                {analytics.activeGames as number}
              </p>
            </Card>
            <Card>
              <p className="text-text-secondary text-xs">Оплаченные</p>
              <p className="text-2xl font-bold">{analytics.paidCount as number}</p>
              <p className="text-text-secondary text-xs mt-1">
                Новые: {analytics.firstPaidCount as number}
              </p>
            </Card>
          </div>
          {/* Выручка */}
          <Card>
            <p className="text-text-secondary text-xs mb-2">Выручка</p>
            <div className="space-y-1">
              <div className="flex justify-between">
                <span className="text-sm text-text-secondary">ЮКасса</span>
                <span className="text-sm font-semibold">
                  {((analytics.yukassaRevenue as number) / 100).toLocaleString("ru-RU")} ₽
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-text-secondary">Наличные</span>
                <span className="text-sm font-semibold">
                  {((analytics.cashRevenue as number) / 100).toLocaleString("ru-RU")} ₽
                </span>
              </div>
              <div className="flex justify-between border-t border-border pt-1 mt-1">
                <span className="text-sm font-semibold">Итого</span>
                <span className="text-lg font-bold text-gold">
                  {((analytics.totalRevenue as number) / 100).toLocaleString("ru-RU")} ₽
                </span>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
