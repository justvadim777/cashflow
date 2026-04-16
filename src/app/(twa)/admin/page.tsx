"use client";

import { useEffect, useState } from "react";
import { useUserStore } from "@/store/user";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { api } from "@/lib/api";

interface Participant {
  id: string;
  confirmed: boolean;
  user: {
    id: string;
    displayName: string;
    username: string | null;
    telegramId: string;
  };
}

interface GameForResults {
  id: string;
  date: string;
  time: string;
  type: string;
  status: string;
  participants: Participant[];
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

const GAME_POINT_TOGGLES = [
  { key: "pointsExitRatRace", label: "Выход из крысиных бегов", points: 10 },
  { key: "pointsLiabilities", label: "Пассивы закрыты", points: 5 },
  { key: "pointsDream", label: "Мечта куплена", points: 10 },
  { key: "pointsBestIncome", label: "Лучший доход", points: 10 },
] as const;

const EXTRA_POINT_FIELDS = [
  { key: "pointsSecret", label: "Секретный балл", points: 5 },
  { key: "pointsOrder", label: "Заказ в заведении", points: 10 },
  { key: "pointsSubscription", label: "Подписка", points: 5 },
  { key: "pointsVideoReview", label: "Видео-отзыв", points: 5 },
  { key: "pointsStories", label: "Сторис", points: 5 },
] as const;

type Tab = "participants" | "results" | "games" | "analytics";

export default function AdminPage() {
  const { role } = useUserStore();
  const [tab, setTab] = useState<Tab>("participants");
  const [confirming, setConfirming] = useState<string | null>(null);
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

  async function handleParticipant(gameId: string, participantId: string, action: "confirm" | "reject") {
    setConfirming(participantId);
    try {
      await api(`/games/${gameId}/confirm`, {
        method: "PATCH",
        body: JSON.stringify({ participantId, action }),
      });
      // Перезагрузить список игр
      const data = await api<{ games: GameForResults[] }>("/games?status=active");
      setGames(data.games);
    } catch (e) {
      alert(e instanceof Error ? e.message : "Ошибка");
    }
    setConfirming(null);
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
            onClick={() => setTab("participants")}
            className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-colors ${
              tab === "participants" ? "bg-accent text-white" : "text-text-secondary"
            }`}
          >
            Заявки
          </button>
        )}
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
            Создать
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

      {/* Participants tab */}
      {tab === "participants" && (
        <div className="space-y-4">
          {games.length === 0 ? (
            <Card className="text-center py-8">
              <p className="text-text-secondary">Нет активных игр</p>
            </Card>
          ) : (
            games.map((game) => {
              const pending = game.participants.filter((p) => !p.confirmed);
              const confirmed = game.participants.filter((p) => p.confirmed);

              return (
                <Card key={game.id} className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold">
                        {new Date(game.date).toLocaleDateString("ru-RU", {
                          day: "numeric",
                          month: "long",
                        })}{" "}
                        в {game.time}
                      </p>
                      <p className="text-text-secondary text-xs">{game.type}</p>
                    </div>
                    <div className="text-right">
                      <span className="text-xs text-text-secondary">
                        {confirmed.length} подтв. / {game.participants.length} всего
                      </span>
                    </div>
                  </div>

                  {pending.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-gold text-xs font-semibold">Ожидают оплаты:</p>
                      {pending.map((p) => (
                        <div
                          key={p.id}
                          className="flex items-center gap-3 bg-bg rounded-xl px-3 py-2"
                        >
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-sm truncate">
                              {p.user.displayName}
                            </p>
                            {p.user.username && (
                              <a
                                href={`https://t.me/${p.user.username}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-accent text-xs hover:underline"
                              >
                                @{p.user.username}
                              </a>
                            )}
                          </div>
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleParticipant(game.id, p.id, "confirm")}
                              disabled={confirming === p.id}
                              className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-success/20 text-success hover:bg-success/30 transition-colors disabled:opacity-50"
                            >
                              {confirming === p.id ? "..." : "Оплатил"}
                            </button>
                            <button
                              onClick={() => handleParticipant(game.id, p.id, "reject")}
                              disabled={confirming === p.id}
                              className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-danger/20 text-danger hover:bg-danger/30 transition-colors disabled:opacity-50"
                            >
                              Отмена
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {confirmed.length > 0 && (
                    <div className="space-y-1">
                      <p className="text-success text-xs font-semibold">Подтверждены:</p>
                      {confirmed.map((p) => (
                        <div
                          key={p.id}
                          className="flex items-center gap-3 bg-bg rounded-xl px-3 py-2"
                        >
                          <div className="text-sm truncate flex-1">
                            {p.user.displayName}
                            {p.user.username && (
                              <a
                                href={`https://t.me/${p.user.username}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-accent text-xs ml-1 hover:underline"
                              >
                                @{p.user.username}
                              </a>
                            )}
                          </div>
                          <span className="text-success text-xs">✓</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {game.participants.length === 0 && (
                    <p className="text-text-secondary text-sm text-center py-2">
                      Пока никто не записался
                    </p>
                  )}
                </Card>
              );
            })
          )}
        </div>
      )}

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
                <div className="space-y-4">
                  {SKILL_FIELDS.map(({ key, label }) => {
                    const value = scores[key] || 0;
                    return (
                      <div key={key}>
                        <div className="flex items-center justify-between mb-1">
                          <label className="text-sm">{label}</label>
                          <span className={`text-sm font-bold ${value > 0 ? "text-accent" : "text-text-secondary"}`}>
                            {value}
                          </span>
                        </div>
                        <div className="flex gap-1">
                          {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
                            <button
                              key={n}
                              type="button"
                              onClick={() => setScores({ ...scores, [key]: n })}
                              className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                                n <= value
                                  ? "bg-accent text-white"
                                  : "bg-bg border border-border text-text-secondary"
                              }`}
                            >
                              {n}
                            </button>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </Card>

              <Card>
                <h3 className="font-semibold mb-3">Игровые баллы</h3>
                <div className="space-y-3">
                  {GAME_POINT_TOGGLES.map(({ key, label, points }) => {
                    const active = (scores[key] || 0) > 0;
                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() =>
                          setScores({ ...scores, [key]: active ? 0 : points })
                        }
                        className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl border transition-colors ${
                          active
                            ? "bg-success/10 border-success/30 text-success"
                            : "bg-bg border-border text-text-secondary"
                        }`}
                      >
                        <span className="text-sm">{label}</span>
                        <span className="text-xs font-bold">
                          {active ? `+${points}` : `${points}`}
                        </span>
                      </button>
                    );
                  })}

                  {/* Рост дохода — шаг +5 */}
                  <div className="px-3 py-2.5 rounded-xl border border-border bg-bg">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-text-secondary">Рост дохода (+5 за 50k)</span>
                      <span className={`text-sm font-bold ${(scores.pointsIncomeGrowth || 0) > 0 ? "text-success" : "text-text-secondary"}`}>
                        +{scores.pointsIncomeGrowth || 0}
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() =>
                          setScores({ ...scores, pointsIncomeGrowth: Math.max(0, (scores.pointsIncomeGrowth || 0) - 5) })
                        }
                        className="w-10 h-10 rounded-xl bg-card border border-border text-white font-bold text-lg"
                      >
                        −
                      </button>
                      <div className="flex-1 flex gap-1">
                        {[5, 10, 15, 20, 25].map((n) => (
                          <button
                            key={n}
                            type="button"
                            onClick={() => setScores({ ...scores, pointsIncomeGrowth: n })}
                            className={`flex-1 py-2 rounded-lg text-xs font-bold transition-colors ${
                              (scores.pointsIncomeGrowth || 0) === n
                                ? "bg-success text-white"
                                : "bg-card border border-border text-text-secondary"
                            }`}
                          >
                            {n}
                          </button>
                        ))}
                      </div>
                      <button
                        type="button"
                        onClick={() =>
                          setScores({ ...scores, pointsIncomeGrowth: (scores.pointsIncomeGrowth || 0) + 5 })
                        }
                        className="w-10 h-10 rounded-xl bg-card border border-border text-white font-bold text-lg"
                      >
                        +
                      </button>
                    </div>
                  </div>
                </div>
              </Card>

              <Card>
                <h3 className="font-semibold mb-3">Дополнительные баллы</h3>
                <div className="space-y-3">
                  {EXTRA_POINT_FIELDS.map(({ key, label, points }) => {
                    const active = (scores[key] || 0) > 0;
                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() =>
                          setScores({ ...scores, [key]: active ? 0 : points })
                        }
                        className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl border transition-colors ${
                          active
                            ? "bg-success/10 border-success/30 text-success"
                            : "bg-bg border-border text-text-secondary"
                        }`}
                      >
                        <span className="text-sm">{label}</span>
                        <span className="text-xs font-bold">
                          {active ? `+${points}` : `${points}`}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </Card>

              <Card>
                <h3 className="font-semibold mb-3">Выручка кальянки</h3>
                <div>
                  <label className="block text-sm text-text-secondary mb-1">Сумма заказа (₽)</label>
                  <input
                    type="number"
                    min={0}
                    value={(scores.hookahRevenue || 0) / 100 || ""}
                    onChange={(e) =>
                      setScores({ ...scores, hookahRevenue: Math.round(Number(e.target.value) * 100) })
                    }
                    placeholder="0"
                    className="w-full bg-bg border border-border rounded-xl px-3 py-2 text-white"
                  />
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
        <div className="space-y-4">
          {/* Регистрации */}
          <div>
            <p className="text-text-secondary text-xs font-semibold mb-2">РЕГИСТРАЦИИ В БОТЕ</p>
            <div className="grid grid-cols-3 gap-3">
              <Card>
                <p className="text-text-secondary text-xs">Всего</p>
                <p className="text-xl font-bold">{analytics.totalUsers as number}</p>
              </Card>
              <Card>
                <p className="text-text-secondary text-xs">Месяц</p>
                <p className="text-xl font-bold text-success">+{analytics.newUsersThisMonth as number}</p>
              </Card>
              <Card>
                <p className="text-text-secondary text-xs">Неделя</p>
                <p className="text-xl font-bold text-success">+{analytics.newUsersThisWeek as number}</p>
              </Card>
            </div>
          </div>

          {/* Игроки */}
          <div>
            <p className="text-text-secondary text-xs font-semibold mb-2">КОЛИЧЕСТВО ИГРОКОВ</p>
            <div className="grid grid-cols-2 gap-3">
              <Card>
                <p className="text-text-secondary text-xs">Всего записей</p>
                <p className="text-xl font-bold">{analytics.totalParticipants as number}</p>
              </Card>
              <Card>
                <p className="text-text-secondary text-xs">Подтверждено</p>
                <p className="text-xl font-bold text-success">{analytics.confirmedParticipants as number}</p>
              </Card>
            </div>
          </div>

          {/* Новые оплаченные */}
          <div>
            <p className="text-text-secondary text-xs font-semibold mb-2">НОВЫЕ ОПЛАЧЕННЫЕ</p>
            <div className="grid grid-cols-2 gap-3">
              <Card>
                <p className="text-text-secondary text-xs">За месяц</p>
                <p className="text-xl font-bold text-success">{analytics.newPaidThisMonth as number}</p>
              </Card>
              <Card>
                <p className="text-text-secondary text-xs">За неделю</p>
                <p className="text-xl font-bold text-success">{analytics.newPaidThisWeek as number}</p>
              </Card>
            </div>
          </div>

          {/* Выручка по оплатам */}
          <div>
            <p className="text-text-secondary text-xs font-semibold mb-2">ВЫРУЧКА ПО ОПЛАТАМ</p>
            <div className="grid grid-cols-2 gap-3">
              <Card>
                <p className="text-text-secondary text-xs">Всего</p>
                <p className="text-xl font-bold text-gold">
                  {((analytics.totalRevenue as number) / 100).toLocaleString("ru-RU")} ₽
                </p>
              </Card>
              <Card>
                <p className="text-text-secondary text-xs">За месяц</p>
                <p className="text-xl font-bold text-gold">
                  {((analytics.monthRevenue as number) / 100).toLocaleString("ru-RU")} ₽
                </p>
              </Card>
            </div>
          </div>

          {/* Выручка кальянки */}
          <div>
            <p className="text-text-secondary text-xs font-semibold mb-2">ВЫРУЧКА КАЛЬЯНКИ</p>
            <div className="grid grid-cols-2 gap-3">
              <Card>
                <p className="text-text-secondary text-xs">Всего</p>
                <p className="text-xl font-bold text-gold">
                  {((analytics.hookahRevenueTotal as number) / 100).toLocaleString("ru-RU")} ₽
                </p>
              </Card>
              <Card>
                <p className="text-text-secondary text-xs">За месяц</p>
                <p className="text-xl font-bold text-gold">
                  {((analytics.hookahRevenueMonth as number) / 100).toLocaleString("ru-RU")} ₽
                </p>
              </Card>
            </div>
          </div>

          {/* Средний чек кальянки */}
          <div>
            <p className="text-text-secondary text-xs font-semibold mb-2">СРЕДНИЙ ЧЕК КАЛЬЯНКИ</p>
            <div className="grid grid-cols-2 gap-3">
              <Card>
                <p className="text-text-secondary text-xs">Всего</p>
                <p className="text-xl font-bold text-accent">
                  {((analytics.hookahAvgTotal as number) / 100).toLocaleString("ru-RU")} ₽
                </p>
              </Card>
              <Card>
                <p className="text-text-secondary text-xs">За месяц</p>
                <p className="text-xl font-bold text-accent">
                  {((analytics.hookahAvgMonth as number) / 100).toLocaleString("ru-RU")} ₽
                </p>
              </Card>
            </div>
          </div>

          {/* Реферальная программа */}
          <div>
            <p className="text-text-secondary text-xs font-semibold mb-2">СУММА В РЕФЕРАЛЬНУЮ</p>
            <div className="grid grid-cols-2 gap-3">
              <Card>
                <p className="text-text-secondary text-xs">Всего</p>
                <p className="text-xl font-bold text-gold">
                  {((analytics.referralTotal as number) / 100).toLocaleString("ru-RU")} ₽
                </p>
              </Card>
              <Card>
                <p className="text-text-secondary text-xs">За месяц</p>
                <p className="text-xl font-bold text-gold">
                  {((analytics.referralMonth as number) / 100).toLocaleString("ru-RU")} ₽
                </p>
              </Card>
            </div>
            {(analytics.pendingWithdrawals as number) > 0 && (
              <Card className="mt-3 border-gold/30">
                <p className="text-text-secondary text-xs">Заявки на вывод</p>
                <p className="text-xl font-bold text-gold">{analytics.pendingWithdrawals as number}</p>
              </Card>
            )}
          </div>

          {/* Игры */}
          <div>
            <p className="text-text-secondary text-xs font-semibold mb-2">ИГРЫ</p>
            <div className="grid grid-cols-3 gap-3">
              <Card>
                <p className="text-text-secondary text-xs">Всего</p>
                <p className="text-xl font-bold">{analytics.totalGames as number}</p>
              </Card>
              <Card>
                <p className="text-text-secondary text-xs">Активных</p>
                <p className="text-xl font-bold text-success">{analytics.activeGames as number}</p>
              </Card>
              <Card>
                <p className="text-text-secondary text-xs">Завершено</p>
                <p className="text-xl font-bold">{analytics.finishedGames as number}</p>
              </Card>
            </div>
          </div>

          {/* Статистика */}
          <div>
            <p className="text-text-secondary text-xs font-semibold mb-2">СТАТИСТИКА</p>
            <Card>
              <p className="text-text-secondary text-xs">Средний балл за игру</p>
              <p className="text-2xl font-bold text-accent">{analytics.avgPoints as number}</p>
            </Card>
          </div>

          {/* Топ игроков */}
          {(analytics.topPlayers as { displayName: string; totalPoints: number; level: string }[])?.length > 0 && (
            <div>
              <p className="text-text-secondary text-xs font-semibold mb-2">ТОП-5 ИГРОКОВ</p>
              <Card className="space-y-2">
                {(analytics.topPlayers as { displayName: string; totalPoints: number; level: string }[]).map(
                  (p, i) => (
                    <div key={i} className="flex items-center justify-between py-1">
                      <div className="flex items-center gap-2">
                        <span className="text-text-secondary text-xs w-4">{i + 1}</span>
                        <span className="text-sm font-semibold">{p.displayName}</span>
                      </div>
                      <span className="text-gold text-sm font-bold">{p.totalPoints}</span>
                    </div>
                  )
                )}
              </Card>
            </div>
          )}

          {/* Ближайшие игры */}
          {(analytics.upcomingGames as { id: string; date: string; time: string; type: string; status: string; playersCount: number; playersLimit: number }[])?.length > 0 && (
            <div>
              <p className="text-text-secondary text-xs font-semibold mb-2">БЛИЖАЙШИЕ ИГРЫ</p>
              <div className="space-y-2">
                {(analytics.upcomingGames as { id: string; date: string; time: string; type: string; status: string; playersCount: number; playersLimit: number }[]).map(
                  (g) => (
                    <Card key={g.id} className="flex items-center justify-between py-3">
                      <div>
                        <p className="text-sm font-semibold">
                          {new Date(g.date).toLocaleDateString("ru-RU", {
                            day: "numeric",
                            month: "short",
                          })}{" "}
                          в {g.time}
                        </p>
                        <p className="text-text-secondary text-xs">{g.type}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold">
                          {g.playersCount}/{g.playersLimit}
                        </p>
                        <p className={`text-xs font-semibold ${g.status === "FULL" ? "text-danger" : "text-success"}`}>
                          {g.status === "FULL" ? "Заполнена" : "Открыта"}
                        </p>
                      </div>
                    </Card>
                  )
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
