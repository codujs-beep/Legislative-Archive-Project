"use client";

import { useState } from "react";
import type { Lang, Message } from "@/lib/types";
import { t } from "@/lib/ui";

export default function QuizCard({
  message,
  lang,
  onCorrect,
}: {
  message: Message;
  lang: Lang;
  onCorrect: (m: Message) => Promise<void>;
}) {
  const ins = message.instruction!;
  const q = ins.quiz;
  const [sel, setSel] = useState<number | null>(null);
  const [wrong, setWrong] = useState(false);
  const [busy, setBusy] = useState(false);

  const question = lang === "ko" ? q.question_ko : q.question_zh;
  const options = lang === "ko" ? q.options_ko : q.options_zh;
  const easy = lang === "ko" ? q.easy_ko : q.easy_zh;

  async function submit() {
    if (sel === null) return;
    if (sel !== q.answer) { setWrong(true); return; }
    setBusy(true);
    await onCorrect(message);
    setBusy(false);
  }

  return (
    <div className="quiz">
      <h4>🧩 {t("quizTitle", lang)}</h4>
      <div className="q">{question}</div>
      {options.map((o, i) => (
        <button key={i} type="button" className={`opt ${sel === i ? "sel" : ""}`} onClick={() => { setSel(i); setWrong(false); }}>
          {String.fromCharCode(65 + i)}. {o}
        </button>
      ))}
      {wrong && (
        <>
          <div className="error">{t("quizWrong", lang)}</div>
          <div className="easy">💡 {easy}</div>
        </>
      )}
      <button className="primary" disabled={sel === null || busy} onClick={submit}>{t("submit", lang)}</button>
    </div>
  );
}
