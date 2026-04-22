// Pre-generates card summaries for the first N pages of bills via OpenAI,
// then saves to data/card-summaries.json so users never wait for AI.
// Run by GitHub Actions daily; commit the result.

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dir = path.dirname(fileURLToPath(import.meta.url));

const ASSEMBLY_KEY = 'f0af7ccb48a642fca4172e35d00f7224';
const API_BASE     = 'https://open.assembly.go.kr/portal/openapi';
const BILL_EP      = 'nzmimeepazxkubdpn';
const WORKER_URL   = 'https://old-recipe-2a66.codujs.workers.dev';

const PAGES_TO_COVER = 10; // 10 pages × 30 bills = 300 bills pre-generated
const PAGE_SIZE      = 30;

const PROMPT = (list) => `아래 한국 국회 법안 제목들을 보고, 핵심을 한 줄로 써주세요. 17살도 바로 이해할 수 있어야 합니다.

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

async function fetchPage(page) {
  const qs = new URLSearchParams({ KEY: ASSEMBLY_KEY, Type: 'json', AGE: 22, pIndex: page, pSize: PAGE_SIZE });
  const res = await fetch(`${API_BASE}/${BILL_EP}?${qs}`);
  if (!res.ok) return [];
  const data = await res.json();
  const sections = data[BILL_EP];
  if (!Array.isArray(sections)) return [];
  return sections.find(s => s.row)?.row ?? [];
}

async function genSummaries(rows) {
  const list = rows.map((r, i) => `${i + 1}. ${r.BILL_NAME}`).join('\n');
  const res = await fetch(WORKER_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      max_tokens: 2048,
      response_format: { type: 'json_object' },
      messages: [{ role: 'user', content: PROMPT(list) }],
    }),
  });
  if (!res.ok) { console.error(`Worker ${res.status}`); return []; }
  const d = await res.json();
  try { return JSON.parse(d.choices[0].message.content).summaries ?? []; }
  catch { return []; }
}

async function main() {
  const outPath = path.join(__dir, '..', 'data', 'card-summaries.json');

  // Load existing to avoid re-generating already-done bills
  let existing = {};
  if (fs.existsSync(outPath)) {
    existing = JSON.parse(fs.readFileSync(outPath, 'utf8'));
  }

  const out = { ...existing };
  let newCount = 0;

  for (let p = 1; p <= PAGES_TO_COVER; p++) {
    const rows = await fetchPage(p);
    if (!rows.length) { console.log(`Page ${p}: no rows, stopping.`); break; }

    const todo = rows.filter(r => !out[r.BILL_NO || r.BILL_NAME]);
    if (!todo.length) { console.log(`Page ${p}: all cached, skipping.`); continue; }

    const summaries = await genSummaries(todo);
    todo.forEach((r, i) => {
      if (summaries[i]) {
        out[r.BILL_NO || r.BILL_NAME] = summaries[i];
        newCount++;
      }
    });

    console.log(`Page ${p}/${PAGES_TO_COVER} — +${summaries.length} new (total: ${Object.keys(out).length})`);
    await new Promise(r => setTimeout(r, 300)); // be gentle on the API
  }

  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify(out, null, 2), 'utf8');
  console.log(`\nDone. ${newCount} new summaries added. ${Object.keys(out).length} total saved.`);
}

main().catch(e => { console.error(e); process.exit(1); });
