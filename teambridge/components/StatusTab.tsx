"use client";

import type { Member, Message, Task } from "@/lib/types";
import { t } from "@/lib/ui";
import { avatarColor, LANG_LABEL } from "@/lib/util";

export default function StatusTab({ me, members, tasks, messages }: { me: Member; members: Member[]; tasks: Task[]; messages: Message[] }) {
  const lang = me.lang;
  return (
    <div className="page">
      <div className="hint">{t("statusHint", lang)}</div>
      {members.map((m) => {
        const confirmed = tasks.filter((x) => x.assignee_id === m.id && x.confirmed);
        const pending = messages.filter(
          (x) =>
            x.instruction &&
            x.member_id !== m.id &&
            (!x.instruction.assignee_name || x.instruction.assignee_name === m.name) &&
            !tasks.some((tk) => tk.source_message_id === x.id && tk.assignee_id === m.id)
        );
        return (
          <div className="mcard" key={m.id}>
            <div className="mhead">
              <div className="avatar" style={{ background: avatarColor(m.id) }}>{m.name.slice(0, 1)}</div>
              <div>
                <div className="mname">{m.name}</div>
                <div className="msub">{m.role === "leader" ? (lang === "ko" ? "조장" : "组长") : (lang === "ko" ? "팀원" : "组员")} · {LANG_LABEL[m.lang]}</div>
              </div>
            </div>
            {confirmed.length === 0 && pending.length === 0 && <div className="muted">{t("noTasks", lang)}</div>}
            {confirmed.map((tk) => (
              <div className="trow" key={tk.id}>
                <span>{lang === "ko" ? tk.title_ko ?? tk.title : tk.title_zh ?? tk.title}{tk.deadline ? ` · ${tk.deadline}` : ""}</span>
                <span className="chip done">{t("understood", lang)}</span>
              </div>
            ))}
            {pending.map((p) => (
              <div className="trow" key={p.id}>
                <span>{lang === "ko" ? p.instruction!.title_ko : p.instruction!.title_zh}</span>
                <span className="chip wait">{t("waiting", lang)}</span>
              </div>
            ))}
          </div>
        );
      })}
    </div>
  );
}
