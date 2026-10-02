"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Logo from "@/components/Logo";
import GuideModal from "@/components/GuideModal";
import { getSupabase, supabaseConfigured } from "@/lib/supabase";
import { makeInviteCode, saveMemberId } from "@/lib/util";
import type { Lang, Role } from "@/lib/types";

export default function Home() {
  const router = useRouter();
  const [mode, setMode] = useState<"create" | "join">("create");
  const [teamName, setTeamName] = useState("");
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState<Role>("leader");
  const [lang, setLang] = useState<Lang>("ko");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [guide, setGuide] = useState(false);

  const configured = supabaseConfigured();

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!configured) { setError("Supabase 환경변수가 설정되지 않았어요. (README 참고)"); return; }
    if (!name.trim()) { setError("내 이름을 입력해주세요."); return; }
    setBusy(true);
    try {
      const sb = getSupabase();
      let inviteCode: string;
      let teamId: string;

      if (mode === "create") {
        if (!teamName.trim()) throw new Error("팀 이름을 입력해주세요.");
        let created: { id: string; invite_code: string } | null = null;
        for (let i = 0; i < 5 && !created; i++) {
          const { data, error: err } = await sb
            .from("teams")
            .insert({ name: teamName.trim(), invite_code: makeInviteCode() })
            .select("id, invite_code")
            .single();
          if (!err) created = data;
          else if (err.code !== "23505") throw new Error(`팀 생성 실패: ${err.message}`);
        }
        if (!created) throw new Error("초대 코드 생성에 실패했어요. 다시 시도해주세요.");
        teamId = created.id;
        inviteCode = created.invite_code;
      } else {
        const c = code.trim().toUpperCase();
        if (!c) throw new Error("초대 코드를 입력해주세요.");
        const { data, error: err } = await sb.from("teams").select("id, invite_code").eq("invite_code", c).maybeSingle();
        if (err) throw new Error(`조회 실패: ${err.message}`);
        if (!data) throw new Error("해당 초대 코드의 팀을 찾을 수 없어요.");
        teamId = data.id;
        inviteCode = data.invite_code;
      }

      const { data: member, error: mErr } = await sb
        .from("members")
        .insert({ team_id: teamId, name: name.trim(), role: mode === "create" ? "leader" : role, lang })
        .select("id")
        .single();
      if (mErr) throw new Error(`멤버 등록 실패: ${mErr.message}`);

      saveMemberId(inviteCode, member.id);
      router.push(`/team/${inviteCode}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "알 수 없는 오류가 발생했어요.");
      setBusy(false);
    }
  }

  return (
    <main className="shell">
      <form className="card" onSubmit={submit}>
        <button type="button" className="help-btn" aria-label="이용 가이드" onClick={() => setGuide(true)}>?</button>
        <Logo />
        <div className="tagline">언어 장벽 없이 팀플하기</div>

        {!configured && (
          <div className="warn">Supabase 환경변수(NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY)가 아직 설정되지 않았어요.</div>
        )}

        <div className="seg">
          <button type="button" className={`pill ${mode === "create" ? "on" : ""}`} onClick={() => { setMode("create"); setRole("leader"); }}>팀 만들기</button>
          <button type="button" className={`pill ${mode === "join" ? "on" : ""}`} onClick={() => { setMode("join"); setRole("member"); }}>초대 코드로 합류</button>
        </div>

        {mode === "create" ? (
          <input className="field" placeholder="팀 이름 (예: 마케팅 조사 3조)" value={teamName} onChange={(e) => setTeamName(e.target.value)} />
        ) : (
          <input className="field" placeholder="초대 코드 (예: BVRJKB)" value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} maxLength={8} />
        )}
        <input className="field" placeholder="내 이름" value={name} onChange={(e) => setName(e.target.value)} />

        {mode === "join" && (
          <div className="seg">
            <button type="button" className={`pill ${role === "leader" ? "on" : ""}`} onClick={() => setRole("leader")}>조장</button>
            <button type="button" className={`pill ${role === "member" ? "on" : ""}`} onClick={() => setRole("member")}>팀원</button>
          </div>
        )}
        {mode === "create" && (
          <div className="seg">
            <button type="button" className="pill on">조장</button>
            <button type="button" className="pill" disabled>팀원</button>
          </div>
        )}

        <div className="seg">
          <button type="button" className={`pill lang ${lang === "ko" ? "on" : ""}`} onClick={() => setLang("ko")}>KR 한국어 사용자</button>
          <button type="button" className={`pill lang ${lang === "zh" ? "on" : ""}`} onClick={() => setLang("zh")}>CN 중국어 사용자</button>
        </div>

        {error && <div className="error">{error}</div>}
        <button className="primary" disabled={busy}>
          {busy ? "처리 중…" : mode === "create" ? "팀 만들고 시작하기" : "합류하기"}
        </button>
      </form>
      {guide && <GuideModal onClose={() => setGuide(false)} />}
    </main>
  );
}
