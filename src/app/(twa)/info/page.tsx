"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import Link from "next/link";

const SLIDES = [
  {
    title: "Что такое Cashflow?",
    text: "Настольная бизнес-игра по мотивам книги Роберта Кийосаки «Богатый папа, бедный папа». Симуляция финансовой жизни, где ты учишься инвестировать и строить пассивный доход.",
    emoji: "🎲",
  },
  {
    title: "Как играть?",
    text: "Запишись на игру, приходи в Остров Lounge. Ведущий объяснит правила. Игра длится 2-3 часа. Цель — выйти из «крысиных бегов» и осуществить мечту.",
    emoji: "🎯",
  },
  {
    title: "Баллы и рейтинг",
    text: "За каждую игру ты получаешь баллы от ведущего по 10 навыкам + бонусные баллы. Баллы формируют твой рейтинг и уровень: Новичок → Игрок → Инвестор → Капиталист.",
    emoji: "⭐",
  },
  {
    title: "Реферальная программа",
    text: "Пригласи друга по своей ссылке и получай 15% с каждой его оплаты. Баланс можно вывести или использовать как купон в заведении.",
    emoji: "🤝",
  },
  {
    title: "Начни сейчас!",
    text: "Выбери ближайшую игру, оплати участие и приходи в Остров Lounge. Первый шаг к финансовой грамотности начинается здесь.",
    emoji: "🚀",
  },
];

export default function InfoPage() {
  const [current, setCurrent] = useState(0);

  return (
    <div className="flex flex-col items-center min-h-[70vh] justify-center">
      <AnimatePresence mode="wait">
        <motion.div
          key={current}
          initial={{ opacity: 0, x: 30 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -30 }}
          transition={{ duration: 0.2 }}
          className="w-full"
        >
          <Card className="text-center py-8 px-6">
            <div className="text-5xl mb-4">{SLIDES[current].emoji}</div>
            <h2 className="text-xl font-bold mb-3">{SLIDES[current].title}</h2>
            <p className="text-text-secondary leading-relaxed">
              {SLIDES[current].text}
            </p>
          </Card>
        </motion.div>
      </AnimatePresence>

      {/* Dots */}
      <div className="flex gap-2 mt-6">
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
      <div className="flex gap-3 mt-6 w-full">
        {current > 0 && (
          <Button
            variant="secondary"
            className="flex-1"
            onClick={() => setCurrent(current - 1)}
          >
            Назад
          </Button>
        )}
        {current < SLIDES.length - 1 ? (
          <Button
            className="flex-1"
            onClick={() => setCurrent(current + 1)}
          >
            Далее
          </Button>
        ) : (
          <Link href="/games" className="flex-1">
            <Button className="w-full">Записаться на игру</Button>
          </Link>
        )}
      </div>
    </div>
  );
}
