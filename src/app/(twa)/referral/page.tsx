"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { api } from "@/lib/api";

interface ReferralEntry {
  id: string;
  displayName: string;
  username: string | null;
  avatarUrl: string | null;
  joinedAt: string;
  hasPaid: boolean;
  totalPaid: number;
  earnedFromHim: number;
}

interface ReferralData {
  referralCode: string;
  totalCount: number;
  paidCount: number;
  totalEarned: number;
  balance: number;
  referrals: ReferralEntry[];
}

export default function ReferralPage() {
  const [data, setData] = useState<ReferralData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await api<ReferralData>("/referral");
        setData(res);
      } catch {
        /* empty */
      }
      setLoading(false);
    }
    load();
  }, []);

  async function handleWithdraw() {
    if (!data || data.balance <= 0) return;
    try {
      await api("/referral/withdraw", {
        method: "POST",
        body: JSON.stringify({ amount: data.balance }),
      });
      setData({ ...data, balance: 0 });
    } catch (e) {
      alert(e instanceof Error ? e.message : "Ошибка");
    }
  }

  function copyLink() {
    if (!data) return;
    navigator.clipboard.writeText(
      `https://t.me/BOT?start=ref_${data.referralCode}`
    );
  }

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Реферальная программа</h1>
      <p className="text-text-secondary text-sm">
        Приглашай друзей и получай 15% с каждой оплаты
      </p>

      {/* Счётчики */}
      <div className="grid grid-cols-3 gap-2">
        <Card className="text-center py-3">
          <p className="text-2xl font-bold">{data.totalCount}</p>
          <p className="text-text-secondary text-xs mt-1">Рефералов</p>
        </Card>
        <Card className="text-center py-3">
          <p className="text-2xl font-bold text-success">{data.paidCount}</p>
          <p className="text-text-secondary text-xs mt-1">Оплатили</p>
        </Card>
        <Card className="text-center py-3">
          <p className="text-lg font-bold text-gold">
            {(data.totalEarned / 100).toLocaleString("ru-RU")} ₽
          </p>
          <p className="text-text-secondary text-xs mt-1">Заработано</p>
        </Card>
      </div>

      {/* Баланс */}
      <Card>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-text-secondary text-sm">Доступно к выводу</p>
            <p className="text-3xl font-bold text-gold">
              {(data.balance / 100).toLocaleString("ru-RU")} ₽
            </p>
          </div>
        </div>
        {data.balance > 0 && (
          <Button className="w-full mt-4" onClick={handleWithdraw}>
            Вывести средства
          </Button>
        )}
      </Card>

      {/* Ссылка */}
      <Card>
        <p className="text-text-secondary text-sm mb-2">Твоя реферальная ссылка</p>
        <div className="flex items-center gap-2">
          <code className="flex-1 bg-bg rounded-lg px-3 py-2 text-sm text-accent truncate">
            t.me/BOT?start=ref_{data.referralCode}
          </code>
          <Button size="sm" onClick={copyLink}>
            Скопировать
          </Button>
        </div>
      </Card>

      {/* Список рефералов */}
      <div>
        <h2 className="text-lg font-bold mb-3">
          Рефералы ({data.totalCount})
        </h2>
        {data.referrals.length === 0 ? (
          <Card className="text-center py-6">
            <p className="text-text-secondary">Пока нет рефералов</p>
          </Card>
        ) : (
          <div className="space-y-2">
            {data.referrals.map((ref) => (
              <Card key={ref.id} className="flex items-center gap-3 py-3">
                <div className="w-10 h-10 rounded-full bg-accent/30 flex items-center justify-center text-sm font-bold shrink-0 relative">
                  {ref.avatarUrl ? (
                    <img
                      src={ref.avatarUrl}
                      alt=""
                      className="w-full h-full rounded-full object-cover"
                    />
                  ) : (
                    ref.displayName[0]
                  )}
                  {ref.hasPaid && (
                    <span className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-success rounded-full flex items-center justify-center text-[9px] text-white font-bold">
                      ✓
                    </span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm truncate">{ref.displayName}</p>
                  {ref.username && (
                    <p className="text-text-secondary text-xs">@{ref.username}</p>
                  )}
                  <p className="text-text-secondary text-xs">
                    {new Date(ref.joinedAt).toLocaleDateString("ru-RU")}
                    {!ref.hasPaid && (
                      <span className="text-gold ml-1">• не оплатил</span>
                    )}
                  </p>
                </div>
                {ref.earnedFromHim > 0 && (
                  <p className="text-success text-sm font-bold shrink-0">
                    +{(ref.earnedFromHim / 100).toLocaleString("ru-RU")} ₽
                  </p>
                )}
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
