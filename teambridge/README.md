# TeamBridge — 언어 장벽 없이 팀플하기

한국어·중국어 사용자가 한 팀으로 협업할 수 있도록 **채팅 → 이해 확인 퀴즈 → 진행 보드**를 하나의 흐름으로 연결한 앱입니다.

- 팀 만들기 / 초대 코드로 로그인 없이 합류 (조장·팀원, 한국어·중국어 선택)
- 실시간 채팅 + 자동 번역 (Claude)
- 조장의 업무 지시를 할 일·결과물·마감·담당자로 자동 구조화
- 팀원 화면에 3지선다 이해 확인 퀴즈 자동 등장 (오답 → 쉬운 설명, 정답 → "이해 완료")
- 팀 현황: 팀원별로 실제 이해·확인된 업무만 표시
- 진행 보드: 대기 · 진행중 · 완료, 드롭다운으로 자유롭게 상태 변경, "번역 보기"
- 첫 화면 "?" 버튼으로 4단계 이용 가이드

## 설정

1. [Supabase](https://supabase.com)에서 프로젝트를 만들고 `supabase/schema.sql`을 SQL Editor에서 실행합니다.
2. 환경변수를 설정합니다 (로컬: `.env.local`, 배포: Vercel → Settings → Environment Variables).

```
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
ANTHROPIC_API_KEY=...
```

3. 실행

```bash
npm install
npm run dev
```

## Vercel 배포

저장소를 Vercel에 연결하고 **Root Directory를 `teambridge`** 로 지정한 뒤 위 환경변수 3개를 넣고 배포하세요.

## 참고

- 로그인 없는 MVP 구조라 Supabase RLS 정책이 anon 읽기/쓰기를 허용합니다. 실서비스 전에는 인증과 정책 강화가 필요합니다.
- `ANTHROPIC_API_KEY`가 없으면 번역·퀴즈 없이 일반 채팅으로만 동작합니다.
