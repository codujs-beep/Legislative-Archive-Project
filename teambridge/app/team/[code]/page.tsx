"use client";

import { use, useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import Logo from "@/components/Logo";
import ChatTab from "@/components/ChatTab";
import StatusTab from "@/components/StatusTab";
import BoardTab from "@/components/BoardTab";
import { getSupabase, supabaseConfigured } from "@/lib/supabase";
import { loadMemberId, saveMemberId } from "@/lib/util";
import { t } from "@/lib/ui";
import type { Lang, Member, Message, Status, Task, Team } from "@/lib/types";

type Tab = "chat" | "status" | "board";

export default function TeamPage({ params }: { params: Promise<{ code: string }> }) {
  const { code: rawCode } = use(params);
  const code = rawCode.toUpperCase();

  const [team, setTeam] = useState<Team | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [meId, setMeId] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("chat");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const teamIdRef = useRef<string | null>(null);

  const [joinName, setJoinName] = useState("");
  const [joinLang, setJoinLang] = useState<Lang>("ko");
  const [joinBusy, setJoinBusy] = useState(false);

  useEffect(() => { setMeId(loadMemberId(code)); }, [code]);

  const refetch = useCallback(async (teamId: string) => {
    const sb = getSupabase();
    const [m, ms, tk] = await Promise.all([
      sb.from("members").select("*").eq("team_id", teamId).order("created_at"),
      sb.from("messages").select("*").eq("team_id", teamId).order("created_at"),
      sb.from("tasks").select("*").eq("team_id", teamId).order("created_at"),
    ]);
    if (m.data) setMembers(m.data as Member[]);
    if (ms.data) setMessages(ms.data as Message[]);
    if (tk.data) setTasks(tk.data as Task[]);
  }, []);

  useEffect(() => {
    if (!supabaseConfigured()) { setError("Supabase 환경변수가 설정되지 않았어요."); setLoading(false); return; }
    const sb = getSupabase();
    let channel: ReturnType<typeof sb.channel> | null = null;
    let cancelled = false;
    (async () => {
      const { data, error: err } = await sb.from("teams").select("*").eq("invite_code", code).maybeSingle();
      if (cancelled) return;
      if (err || !data) { setError("팀을 찾을 수 없어요. 초대 코드를 확인해주세요."); setLoading(false); return; }
      setTeam(data as Team);
      teamIdRef.current = data.id;
      await refetch(data.id);
      setLoading(false);
      channel = sb
        .channel(`team-${data.id}`)
        .on("postgres_changes", { event: "*", schema: "public", table: "messages", filter: `team_id=eq.${data.id}` }, () => refetch(data.id))
        .on("postgres_changes", { event: "*", schema: "public", table: "tasks", filter: `team_id=eq.${data.id}` }, () => refetch(data.id))
        .on("postgres_changes", { event: "*", schema: "public", table: "members", filter: `team_id=eq.${data.id}` }, () => refetch(data.id))
        .subscribe();
    })();
    // 실시간 연결이 끊겨도 동작하도록 가벼운 폴링을 병행합니다.
    const poll = setInterval(() => { if (teamIdRef.current) refetch(teamIdRef.current); }, 8000);
    return () => { cancelled = true; clearInterval(poll); if (channel) sb.removeChannel(channel); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code, refetch]);

  const me = useMemo(() => members.find((m) => m.id === meId) ?? null, [members, meId]);

  async function sendMessage(text: string) {
    if (!team || !me) return;
    const res = await fetch("/api/process", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        text,
        lang: me.lang,
        isLeader: me.role === "leader",
        memberNames: members.filter((m) => m.id !== me.id).map((m) => m.name),
      }),
    });
    const r = res.ok ? await res.json() : { text_ko: null, text_zh: null, instruction: null };
    const { error: err } = await getSupabase().from("messages").insert({
      team_id: team.id,
      member_id: me.id,
      text,
      lang: me.lang,
      text_ko: me.lang === "ko" ? text : r.text_ko,
      text_zh: me.lang === "zh" ? text : r.text_zh,
      instruction: r.instruction,
    });
    if (err) setError(`메시지 전송 실패: ${err.message}`);
    await refetch(team.id);
  }

  async function quizCorrect(m: Message) {
    if (!team || !me || !m.instruction) return;
    const ins = m.instruction;
    const { error: err } = await getSupabase().from("tasks").insert({
      team_id: team.id,
      title: me.lang === "ko" ? ins.title_ko : ins.title_zh,
      title_ko: ins.title_ko,
      title_zh: ins.title_zh,
      deliverable: ins.deliverable || null,
      assignee_id: me.id,
      deadline: ins.deadline || null,
      status: "todo",
      confirmed: true,
      source_message_id: m.id,
    });
    // 23505: 이미 등록된 경우(중복 제출)는 무시
    if (err && err.code !== "23505") setError(`업무 등록 실패: ${err.message}`);
    await refetch(team.id);
  }

  async function addTask(title: string, assigneeId: string | null, deadline: string) {
    if (!team) return;
    const { error: err } = await getSupabase().from("tasks").insert({
      team_id: team.id, title, assignee_id: assigneeId, deadline: deadline || null, status: "todo", confirmed: false,
    });
    if (err) setError(`할 일 추가 실패: ${err.message}`);
    await refetch(team.id);
  }

  async function setStatus(id: string, status: Status) {
    setTasks((ts) => ts.map((x) => (x.id === id ? { ...x, status } : x)));
    await getSupabase().from("tasks").update({ status }).eq("id", id);
  }

  async function join(e: React.FormEvent) {
    e.preventDefault();
    if (!team || !joinName.trim()) return;
    setJoinBusy(true);
    const { data, error: err } = await getSupabase()
      .from("members")
      .insert({ team_id: team.id, name: joinName.trim(), role: "member", lang: joinLang })
      .select("id")
      .single();
    setJoinBusy(false);
    if (err) { setError(`합류 실패: ${err.message}`); return; }
    saveMemberId(code, data.id);
    setMeId(data.id);
    await refetch(team.id);
  }

  async function copyCode() {
    try { await navigator.clipboard.writeText(code); setCopied(true); setTimeout(() => setCopied(false), 1500); } catch { /* ignore */ }
  }

  if (loading) return <main className="shell"><div className="muted">…</div></main>;

  if (error && !team) {
    return (
      <main className="shell">
        <div className="card">
          <Logo />
          <div className="error" style={{ margin: "16px 0" }}>{error}</div>
          <Link href="/"><button className="primary">처음으로</button></Link>
        </div>
      </main>
    );
  }

  if (!me) {
    return (
      <main className="shell">
        <form className="card" onSubmit={join}>
          <Logo />
          <div className="tagline">{team?.name} · 초대 코드 {code}</div>
          <input className="field" placeholder="내 이름" value={joinName} onChange={(e) => setJoinName(e.target.value)} />
          <div className="seg">
            <button type="button" className={`pill lang ${joinLang === "ko" ? "on" : ""}`} onClick={() => setJoinLang("ko")}>KR 한국어 사용자</button>
            <button type="button" className={`pill lang ${joinLang === "zh" ? "on" : ""}`} onClick={() => setJoinLang("zh")}>CN 중국어 사용자</button>
          </div>
          {error && <div className="error">{error}</div>}
          <button className="primary" disabled={joinBusy || !joinName.trim()}>합류하기</button>
        </form>
      </main>
    );
  }

  return (
    <div className="app">
      <header className="top">
        <div>
          <Logo />
          <div className="meta">
            {team?.name} · {members.length}{t("members", me.lang)} · {t("invite", me.lang)} {code}
            <button onClick={copyCode}>{copied ? t("copied", me.lang) : t("copy", me.lang)}</button>
          </div>
        </div>
        <nav className="tabs">
          {(["chat", "status", "board"] as Tab[]).map((k) => (
            <button key={k} className={`tab ${tab === k ? "on" : ""}`} onClick={() => setTab(k)}>
              {t(k === "chat" ? "chatTab" : k === "status" ? "statusTab" : "boardTab", me.lang)}
            </button>
          ))}
        </nav>
      </header>
      {error && <div className="error" onClick={() => setError("")}>{error}</div>}
      {tab === "chat" && (
        <ChatTab me={me} members={members} messages={messages} tasks={tasks} onSend={sendMessage} onQuizCorrect={quizCorrect} />
      )}
      {tab === "status" && <StatusTab me={me} members={members} tasks={tasks} messages={messages} />}
      {tab === "board" && <BoardTab me={me} members={members} tasks={tasks} onAdd={addTask} onStatus={setStatus} />}
    </div>
  );
}
