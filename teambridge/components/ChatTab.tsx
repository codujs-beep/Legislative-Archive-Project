"use client";

import { useEffect, useRef, useState } from "react";
import type { Member, Message, Task } from "@/lib/types";
import { t } from "@/lib/ui";
import QuizCard from "./QuizCard";

function targeted(m: Message, me: Member) {
  const ins = m.instruction;
  if (!ins || m.member_id === me.id) return false;
  if (!ins.assignee_name) return true;
  return ins.assignee_name === me.name;
}

export default function ChatTab({
  me,
  members,
  messages,
  tasks,
  onSend,
  onQuizCorrect,
}: {
  me: Member;
  members: Member[];
  messages: Message[];
  tasks: Task[];
  onSend: (text: string) => Promise<void>;
  onQuizCorrect: (m: Message) => Promise<void>;
}) {
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const bottom = useRef<HTMLDivElement>(null);
  const nameOf = (id: string) => members.find((m) => m.id === id)?.name ?? "?";

  useEffect(() => { bottom.current?.scrollIntoView({ behavior: "smooth" }); }, [messages.length]);

  const done = new Set(tasks.filter((x) => x.assignee_id === me.id && x.source_message_id).map((x) => x.source_message_id));

  async function send(e: React.FormEvent) {
    e.preventDefault();
    const v = text.trim();
    if (!v || busy) return;
    setBusy(true);
    setText("");
    try { await onSend(v); } finally { setBusy(false); }
  }

  return (
    <>
      <div className="chat">
        {messages.length === 0 && <div className="empty">{t("noMessages", me.lang)}</div>}
        {messages.map((m) => {
          const mine = m.member_id === me.id;
          const translated = me.lang === "ko" ? m.text_ko : m.text_zh;
          const primary = mine ? m.text : translated ?? m.text;
          const showOriginal = !mine && translated && m.lang !== me.lang;
          const ins = m.instruction;
          const needsQuiz = ins && targeted(m, me) && !done.has(m.id);
          return (
            <div key={m.id} className={`msg ${mine ? "me" : ""}`}>
              <div className="who">{nameOf(m.member_id)}</div>
              <div className="bubble">{primary}</div>
              {showOriginal && <div className="sub">{m.text}</div>}
              {ins && (
                <div className="instr">
                  <span className="badge">{t("instructionBadge", me.lang)}</span>
                  <div>▸ {t("what", me.lang)}: {me.lang === "ko" ? ins.title_ko : ins.title_zh}</div>
                  {ins.deliverable && <div>▸ {t("deliverable", me.lang)}: {ins.deliverable}</div>}
                  <div>▸ {t("due", me.lang)}: {ins.deadline || t("unassigned", me.lang)}</div>
                  <div>▸ {t("who", me.lang)}: {ins.assignee_name || t("unassigned", me.lang)}</div>
                </div>
              )}
              {needsQuiz && <QuizCard message={m} lang={me.lang} onCorrect={onQuizCorrect} />}
              {ins && targeted(m, me) && done.has(m.id) && <div className="ok" style={{ marginTop: 6 }}>✅ {t("understood", me.lang)}</div>}
            </div>
          );
        })}
        <div ref={bottom} />
      </div>
      <form className="composer" onSubmit={send}>
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={t(me.lang === "ko" ? "placeholderKo" : "placeholderZh", me.lang)}
        />
        <button disabled={busy || !text.trim()}>{busy ? "…" : t("send", me.lang)}</button>
      </form>
    </>
  );
}
