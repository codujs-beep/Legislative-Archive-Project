"use client";

import { useState } from "react";
import type { Member, Status, Task } from "@/lib/types";
import { t } from "@/lib/ui";

const COLS: { key: Status; color: string }[] = [
  { key: "todo", color: "#8a8f9c" },
  { key: "doing", color: "#f0902f" },
  { key: "done", color: "#21b8a6" },
];

export default function BoardTab({
  me,
  members,
  tasks,
  onAdd,
  onStatus,
}: {
  me: Member;
  members: Member[];
  tasks: Task[];
  onAdd: (title: string, assigneeId: string | null, deadline: string) => Promise<void>;
  onStatus: (id: string, s: Status) => Promise<void>;
}) {
  const lang = me.lang;
  const [title, setTitle] = useState("");
  const [assignee, setAssignee] = useState("");
  const [deadline, setDeadline] = useState("");
  const [showOriginal, setShowOriginal] = useState<Set<string>>(new Set());
  const nameOf = (id: string | null) => members.find((m) => m.id === id)?.name ?? t("unassigned", lang);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    await onAdd(title.trim(), assignee || null, deadline.trim());
    setTitle(""); setDeadline("");
  }

  function toggle(id: string) {
    setShowOriginal((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });
  }

  return (
    <div className="page">
      <form className="addrow" onSubmit={add}>
        <input className="grow" placeholder={t("newTask", lang)} value={title} onChange={(e) => setTitle(e.target.value)} />
        <select value={assignee} onChange={(e) => setAssignee(e.target.value)}>
          <option value="">{t("assignee", lang)}</option>
          {members.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
        </select>
        <input style={{ width: 120 }} placeholder={t("deadline", lang)} value={deadline} onChange={(e) => setDeadline(e.target.value)} />
        <button className="go">{t("add", lang)}</button>
      </form>

      {COLS.map((c) => {
        const list = tasks.filter((x) => x.status === c.key);
        return (
          <div key={c.key}>
            <div className="col-title"><span className="dot" style={{ background: c.color }} /><span style={{ color: c.color }}>{t(c.key, lang)}</span></div>
            {list.length === 0 && <div className="muted" style={{ marginBottom: 8 }}>—</div>}
            {list.map((tk) => {
              const other = lang === "ko" ? tk.title_ko : tk.title_zh;
              const translatable = !!other && other !== tk.title;
              const shown = translatable && !showOriginal.has(tk.id) ? other : tk.title;
              return (
                <div className="tcard" key={tk.id}>
                  <div>
                    <div className="tt">{shown}</div>
                    <div className="ts">{t("who", lang)} {nameOf(tk.assignee_id)} · {t("due", lang)} {tk.deadline || t("unassigned", lang)}</div>
                    {tk.deliverable && <div className="ts">{t("deliverable", lang)}: {tk.deliverable}</div>}
                    {translatable && (
                      <button className="link" type="button" onClick={() => toggle(tk.id)}>
                        {showOriginal.has(tk.id) ? t("viewTranslation", lang) : t("hideTranslation", lang)}
                      </button>
                    )}
                  </div>
                  <select value={tk.status} onChange={(e) => onStatus(tk.id, e.target.value as Status)}>
                    {COLS.map((o) => <option key={o.key} value={o.key}>{t(o.key, lang)}</option>)}
                  </select>
                </div>
              );
            })}
          </div>
        );
      })}
      <div className="hint" style={{ marginTop: 14 }}>{t("boardHint", lang)}</div>
    </div>
  );
}
