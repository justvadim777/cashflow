"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import Link from "next/link";

const SLIDES = [
  {
    title: "Что такое Cashflow?",
    text: "Cashflow — это игра-тренажёр финансового мышления.\n\nТы:\n• управляешь деньгами\n• принимаешь решения\n• находишь возможности\n• учишься выходить из «крысиных бегов»\n\nЭто симуляция реальной жизни.",
    emoji: "🎲",
  },
  {
    title: "Кто такой Роберт Кийосаки?",
    text: "Предприниматель, инвестор, автор книги «Богатый папа, бедный папа» — человек, с которого началась финансовая грамотность как понятие.\n\nСоздал игру Cashflow, чтобы:\n• обучать финансовой грамотности\n• показать, как работают деньги",
    emoji: "📖",
  },
  {
    title: "Как проходит игра?",
    text: "• получаешь роль\n• ходишь по полю\n• принимаешь финансовые решения\n• работаешь с возможностями\n\nИгра длится 2–3 часа. Ведущий объясняет правила и помогает разобраться.",
    emoji: "🎯",
  },
  {
    title: "Цель игры",
    text: "• выйти из «крысиных бегов»\n• создать пассивный доход, который превышает расходы\n• осуществить мечту\n\nПобеждает тот, кто первым выходит на свободу от зарплаты.",
    emoji: "🏆",
  },
  {
    title: "Почему стоит прийти?",
    text: "• инсайты уже в первой игре\n• практика финансового мышления\n• окружение единомышленников\n• живая атмосфера в Остров Lounge",
    emoji: "🚀",
  },
  {
    title: "Два формата игр",
    text: "🟢 Базовая (700 ₽) — начальный уровень. Подходит новичкам: обучение правилам, первые навыки инвестирования, спокойный темп.\n\n🔵 Продвинутая (2 000 ₽) — для опытных игроков. Более сильные соперники, акцент на стратегии, глубокие решения.",
    emoji: "🎮",
  },
];

export default function InfoPage() {
  const [current, setCurrent] = useState(0);

  return (
    <div className="flex flex-col pb-4">
      <AnimatePresence mode="wait">
        <motion.div
          key={current}
          initial={{ opacity: 0, x: 30 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -30 }}
          transition={{ duration: 0.2 }}
          className="w-full"
        >
          <Card className="text-center py-6 px-5">
            <div className="text-4xl mb-3">{SLIDES[current].emoji}</div>
            <h2 className="text-lg font-bold mb-3">{SLIDES[current].title}</h2>
            <p className="text-text-secondary text-sm leading-relaxed whitespace-pre-line text-left">
              {SLIDES[current].text}
            </p>
          </Card>
        </motion.div>
      </AnimatePresence>

      {/* Dots */}
      <div className="flex justify-center gap-2 mt-4">
        {SLIDES.map((_, i) => (
          <button
            key={i}
            onClick={() => setCurrent(i)}
            className={`w-2 h-2 rounded-full transition-colors ${
              i === current ? "bg-accent" : "bg-text-secondary/30"
            }`}
          />
        ))}
      </div>

      {/* Navigation */}
      <div className="flex gap-3 mt-4 w-full">
        {current > 0 ? (
          <Button
            variant="secondary"
            className="flex-1"
            onClick={() => setCurrent(current - 1)}
          >
            Назад
          </Button>
        ) : (
          <div className="flex-1" />
        )}
        {current < SLIDES.length - 1 ? (
          <Button
            className="flex-1"
            onClick={() => setCurrent(current + 1)}
          >
            Далее
          </Button>
        ) : (
          <Link href="/games" className="flex-1 block">
            <Button className="w-full">К играм</Button>
          </Link>
        )}
      </div>
    </div>
  );
}
