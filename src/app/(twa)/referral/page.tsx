"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { api } from "@/lib/api";
import Image from "next/image";

interface InvitedUser {
  id: string;
  displayName: string;
  avatarUrl: string | null;
  username: string | null;
  createdAt: string;
  earned: number;
  paidGames: number;
}

interface ReferralData {
  referralCode: string;
  referralBalance: number;
  totalEarned: number;
  invited: InvitedUser[];
  referrals: {
    id: string;
    amount: number;
    status: string;
    createdAt: string;
    referred: { displayName: string; avatarUrl: string | null };
    game: { date: string; type: string };
  }[];
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
    if (!data || data.referralBalance <= 0) return;
    try {
      await api("/referral/withdraw", {
        method: "POST",
        body: JSON.stringify({ amount: data.referralBalance }),
      });
      setData({ ...data, referralBalance: 0 });
    } catch (e) {
      alert(e instanceof Error ? e.message : "Ошибка");
    }
  }

  async function handleCoupon() {
    if (!data || data.referralBalance <= 0) return;
    try {
      const res = await api<{ couponCode: string; message: string }>("/referral/coupon", {
        method: "POST",
        body: JSON.stringify({ amount: data.referralBalance }),
      });
      alert(res.message);
      setData({ ...data, referralBalance: 0 });
    } catch (e) {
      alert(e instanceof Error ? e.message : "Ошибка");
    }
  }

  function copyLink() {
    if (!data) return;
    navigator.clipboard.writeText(
      `https://t.me/denezhnyjpotok_bot?start=ref_${data.referralCode}`
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

      {/* Баланс */}
      <Card>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-text-secondary text-sm">Баланс</p>
            <p className="text-3xl font-bold text-gold">
              {(data.referralBalance / 100).toLocaleString("ru-RU")} ₽
            </p>
          </div>
          <div className="text-right">
            <p className="text-text-secondary text-sm">Всего заработано</p>
            <p className="text-lg font-semibold text-success">
              {(data.totalEarned / 100).toLocaleString("ru-RU")} ₽
            </p>
          </div>
        </div>
        <div className="flex gap-3 mt-4">
          <Button
            className="flex-1"
            onClick={handleWithdraw}
            disabled={data.referralBalance <= 0}
          >
            Вывести
          </Button>
          <Button
            className="flex-1"
            variant="secondary"
            onClick={handleCoupon}
            disabled={data.referralBalance <= 0}
          >
            Купон
          </Button>
        </div>
        {data.referralBalance <= 0 && (
          <p className="text-text-secondary text-xs text-center mt-2">
            Пригласи друга, чтобы получить баланс
          </p>
        )}
      </Card>

      {/* Ссылка */}
      <Card>
        <p className="text-text-secondary text-sm mb-2">Твоя реферальная ссылка</p>
        <div className="flex items-center gap-2">
          <code className="flex-1 bg-bg rounded-lg px-3 py-2 text-sm text-accent truncate">
            t.me/denezhnyjpotok_bot?start=ref_{data.referralCode}
          </code>
          <Button size="sm" onClick={copyLink}>
            Скопировать
          </Button>
        </div>
      </Card>

      {/* Приглашённые */}
      <div>
        <h2 className="text-lg font-bold mb-3">
          Приглашённые ({data.invited.length})
        </h2>
        {data.invited.length === 0 ? (
          <Card className="text-center py-6">
            <p className="text-text-secondary text-sm">Пока никого не пригласил</p>
            <p className="text-text-secondary text-xs mt-1">Поделись ссылкой выше</p>
          </Card>
        ) : (
          <div className="space-y-2">
            {data.invited.map((u) => (
              <Card key={u.id} className="flex items-center gap-3 py-3">
                <div className="w-10 h-10 rounded-full bg-accent/30 flex items-center justify-center text-sm font-bold relative">
                  {u.avatarUrl ? (
                    <Image
                      src={u.avatarUrl}
                      alt=""
                      fill
                      className="rounded-full object-cover"
                    />
                  ) : (
                    u.displayName[0]
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm truncate">{u.displayName}</p>
                  <p className="text-text-secondary text-xs">
                    {u.paidGames > 0
                      ? `Оплатил игр: ${u.paidGames}`
                      : "Ещё не играл"}
                  </p>
                </div>
                <p className={`text-sm font-bold ${u.earned > 0 ? "text-success" : "text-text-secondary"}`}>
                  {u.earned > 0 ? `+${(u.earned / 100).toLocaleString("ru-RU")} ₽` : "—"}
                </p>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
