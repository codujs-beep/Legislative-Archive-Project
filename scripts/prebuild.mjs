// Pre-generates card summaries + home spotlight via OpenAI.
// Run by GitHub Actions daily; results committed to data/.

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dir = path.dirname(fileURLToPath(import.meta.url));

const ASSEMBLY_KEY = 'f0af7ccb48a642fca4172e35d00f7224';
const API_BASE     = 'https://open.assembly.go.kr/portal/openapi';
const BILL_EP      = 'nzmimeepazxkubdpn';
const WORKER_URL   = 'https://old-recipe-2a66.codujs.workers.dev';

const PAGES_TO_COVER  = 10; // 10 pages × 30 = 300 bills for card summaries
const SPOTLIGHT_PAGES = 3;  // 3 pages × 30 = 90 bills scanned for home spotlight
const PAGE_SIZE       = 30;

/* ── 카드 요약 프롬프트 ── */
const SUMMARY_PROMPT = (list) => `아래 한국 국회 법안 제목들을 보고, 핵심을 한 줄로 써주세요. 17살도 바로 이해할 수 있어야 합니다.

【가장 중요】방향 오류 절대 금지:
- 제한·금지·처벌 법안은 반드시 "못 해요", "금지됩니다", "~년간 일 못해요"처럼 제한임을 명확히 쓸 것
- 취업제한 = 일하지 못하는 것 (일할 수 있는 것 아님)
- 처벌 강화 = 더 무거워지는 것 (가벼워지는 것 아님)
- 쓰고 나서 방향이 맞는지 한 번 더 확인할 것
- 나쁜 예) "성범죄자가 아동기관에서 일할 수 있는 기간 20년" → 방향 반대
- 좋은 예) "성범죄자, 학교·학원 등에서 20년간 일 못해요"

말투:
- 숫자·금액·횟수가 핵심 → 명사형: "음주운전 3회면 면허 영구취소"
- 사람 영향이 핵심 → ~해요/~못해요: "전세사기 피해자도 긴급 대출받을 수 있어요"
- 두 스타일 섞을 것

용어:
- 낯선 단어 2개 이상이면 쉬운 말로 풀기
- 법적 고유명사 하나까지는 그대로 가능
- "강화·개선·확대·지원" 뭉뚱그린 표현 금지
- 법안 이름 그대로 반복 금지
- 25자 이내

${list}

JSON으로만 응답: {"summaries": ["1번", "2번", ...]}`;

/* ── 홈 스포트라이트 프롬프트 ── */
const SPOTLIGHT_PROMPT = (list) => `다음 한국 22대 국회 법안들을 보고, 각 법안이 아래 3가지 기준 중 어디에 해당하는지 판단하세요.

기준:
A. "표결까지 D-7 이내" — 본회의 표결이 일주일 이내로 임박했거나 표결 직전 단계에 있는 법안
B. "장기 계류 후 재심사 시작" — 발의 후 오래 계류되다 최근 다시 논의가 시작된 법안
C. "국민 생활 직결 분야" — 주거·의료·고용·교육·교통·안전·소비 등 일반 시민 일상에 직접 영향을 주는 법안

각 법안에 대해 A·B·C 중 하나(없으면 null), 그리고 25자 이내 핵심 한 줄 요약을 반환하세요.

【요약 규칙】
- 방향 오류 금지: 제한·금지는 "못 해요"/"금지", 지원·확대는 "받을 수 있어요"
- 숫자·금액이 핵심이면 명사형, 사람 영향이 핵심이면 ~해요
- 법안 이름 그대로 반복 금지

법안 목록:
${list}

JSON으로만 응답: {"results": [{"no": 1, "category": "국민 생활 직결 분야", "summary": "요약"}, {"no": 2, "category": null, "summary": null}, ...]}`;

async function fetchPage(page) {
  const qs = new URLSearchParams({ KEY: ASSEMBLY_KEY, Type: 'json', AGE: 22, pIndex: page, pSize: PAGE_SIZE });
  const res = await fetch(`${API_BASE}/${BILL_EP}?${qs}`);
  if (!res.ok) return [];
  const data = await res.json();
  const sections = data[BILL_EP];
  if (!Array.isArray(sections)) return [];
  return sections.find(s => s.row)?.row ?? [];
}

async function callWorker(body) {
  const res = await fetch(WORKER_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) { console.error(`Worker ${res.status}`); return null; }
  const d = await res.json();
  try { return JSON.parse(d.choices[0].message.content); }
  catch { return null; }
}

async function genSummaries(rows) {
  const list = rows.map((r, i) => `${i + 1}. ${r.BILL_NAME}`).join('\n');
  const result = await callWorker({
    model: 'gpt-4o-mini', max_tokens: 2048,
    response_format: { type: 'json_object' },
    messages: [{ role: 'user', content: SUMMARY_PROMPT(list) }],
  });
  return result?.summaries ?? [];
}

async function genSpotlight(rows) {
  const list = rows.map((r, i) =>
    `${i + 1}. [${r.BILL_NO}] ${r.BILL_NAME} (발의일: ${r.PROPOSE_DT || '미상'}, 위원회: ${r.COMMITTEE || '미상'})`
  ).join('\n');
  const result = await callWorker({
    model: 'gpt-4o-mini', max_tokens: 3000,
    response_format: { type: 'json_object' },
    messages: [{ role: 'user', content: SPOTLIGHT_PROMPT(list) }],
  });
  if (!result?.results) return [];
  return result.results
    .filter(r => r.category && r.summary)
    .map(r => {
      const row = rows[r.no - 1];
      if (!row) return null;
      return {
        billNo:    row.BILL_NO    || '',
        title:     row.BILL_NAME  || '',
        category:  r.category,
        summary:   r.summary,
        date:      (row.PROPOSE_DT || '').replace(/\./g, '-'),
        committee: row.COMMITTEE  || '',
        proposer:  row.PROPOSER   || '',
        procResult:row.PROC_RESULT|| '',
        sourceUrl: row.LINK_URL   || '',
      };
    })
    .filter(Boolean);
}

async function main() {
  /* ── 1. 카드 요약 생성 ── */
  const summaryPath = path.join(__dir, '..', 'data', 'card-summaries.json');
  let existing = {};
  if (fs.existsSync(summaryPath)) existing = JSON.parse(fs.readFileSync(summaryPath, 'utf8'));

  const out = { ...existing };
  let newCount = 0;
  const spotlightRows = [];

  for (let p = 1; p <= PAGES_TO_COVER; p++) {
    const rows = await fetchPage(p);
    if (!rows.length) { console.log(`Page ${p}: no rows, stopping.`); break; }
    if (p <= SPOTLIGHT_PAGES) spotlightRows.push(...rows);

    const todo = rows.filter(r => !out[r.BILL_NO || r.BILL_NAME]);
    if (!todo.length) { console.log(`Page ${p}: all cached, skipping.`); continue; }

    const summaries = await genSummaries(todo);
    todo.forEach((r, i) => {
      if (summaries[i]) { out[r.BILL_NO || r.BILL_NAME] = summaries[i]; newCount++; }
    });
    console.log(`Page ${p}/${PAGES_TO_COVER} — +${summaries.length} new (total: ${Object.keys(out).length})`);
    await new Promise(r => setTimeout(r, 300));
  }

  fs.mkdirSync(path.dirname(summaryPath), { recursive: true });
  fs.writeFileSync(summaryPath, JSON.stringify(out, null, 2), 'utf8');
  console.log(`\nCard summaries: ${newCount} new, ${Object.keys(out).length} total.`);

  /* ── 2. 홈 스포트라이트 생성 ── */
  console.log(`\nGenerating home spotlight from ${spotlightRows.length} bills...`);
  const spotlightItems = await genSpotlight(spotlightRows);
  const sorted = spotlightItems.sort((a, b) => (b.date || '').localeCompare(a.date || ''));

  const spotlightPath = path.join(__dir, '..', 'data', 'home-spotlight.json');
  fs.writeFileSync(spotlightPath, JSON.stringify({
    generated: new Date().toISOString().slice(0, 10),
    items: sorted,
  }, null, 2), 'utf8');
  console.log(`Home spotlight: ${sorted.length} bills categorized.`);
}

main().catch(e => { console.error(e); process.exit(1); });
