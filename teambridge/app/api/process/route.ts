import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";
import type { Instruction, Lang } from "@/lib/types";

export const maxDuration = 30;

interface Body {
  text: string;
  lang: Lang;
  isLeader: boolean;
  memberNames: string[];
}

const SYSTEM = `You are the engine of TeamBridge, a chat app for Korean-Chinese student teams.
Given one chat message, return ONLY a JSON object (no markdown fences) with this shape:
{
  "text_ko": string,   // natural Korean version of the message (the original if it is already Korean)
  "text_zh": string,   // natural Simplified Chinese version (the original if already Chinese)
  "instruction": null | {
    "title_ko": string, "title_zh": string,   // the task, short and concrete
    "deliverable": string,                    // expected output, in the message's original language; "" if none
    "deadline": string,                       // e.g. "8/30"; "" if none
    "assignee_name": string | null,           // must exactly match one of the provided member names, else null
    "quiz": {
      "question_ko": string, "question_zh": string,
      "options_ko": [string, string, string],
      "options_zh": [string, string, string],
      "answer": 0 | 1 | 2,                    // index of the single correct option
      "easy_ko": string, "easy_zh": string    // 1-2 sentence plain-language explanation of the task
    }
  }
}
Rules:
- "instruction" is non-null ONLY when the message assigns or requests concrete work (a task, deliverable, or deadline). Greetings, chit-chat and questions get null.
- Translate colloquial instructions by meaning, not word by word; keep names and numbers intact.
- The quiz checks that the reader understood what to do. Make the question about the task / deliverable / deadline. Exactly one option is correct; distractors must be plausible but wrong. Vary the position of the correct answer.
- options_ko[i] and options_zh[i] must express the same option.
- Use easy, short vocabulary in the explanations (for a beginner-level Korean learner on the Chinese side).`;

function extractJson(s: string) {
  const start = s.indexOf("{");
  const end = s.lastIndexOf("}");
  if (start < 0 || end < 0) throw new Error("no json");
  return JSON.parse(s.slice(start, end + 1));
}

function validInstruction(i: unknown): i is Instruction {
  if (!i || typeof i !== "object") return false;
  const x = i as Instruction;
  const q = x.quiz;
  return (
    typeof x.title_ko === "string" &&
    typeof x.title_zh === "string" &&
    !!q &&
    Array.isArray(q.options_ko) && q.options_ko.length === 3 &&
    Array.isArray(q.options_zh) && q.options_zh.length === 3 &&
    [0, 1, 2].includes(q.answer)
  );
}

export async function POST(req: Request) {
  const body = (await req.json()) as Body;
  const { text, lang, isLeader, memberNames } = body;
  if (!text || !text.trim()) return NextResponse.json({ error: "empty" }, { status: 400 });

  const fallback = {
    text_ko: lang === "ko" ? text : null,
    text_zh: lang === "zh" ? text : null,
    instruction: null as Instruction | null,
    degraded: true,
  };

  if (!process.env.ANTHROPIC_API_KEY) return NextResponse.json(fallback);

  try {
    const client = new Anthropic();
    const res = await client.messages.create({
      model: process.env.ANTHROPIC_MODEL || "claude-haiku-4-5-20251001",
      max_tokens: 1500,
      system: SYSTEM,
      messages: [
        {
          role: "user",
          content: JSON.stringify({
            message: text,
            message_language: lang === "ko" ? "Korean" : "Chinese",
            sender_is_leader: isLeader,
            member_names: memberNames,
            analyze_instruction: isLeader,
          }),
        },
      ],
    });
    const out = res.content.map((b) => (b.type === "text" ? b.text : "")).join("");
    const json = extractJson(out);
    let instruction: Instruction | null = isLeader && validInstruction(json.instruction) ? json.instruction : null;
    if (instruction && instruction.assignee_name && !memberNames.includes(instruction.assignee_name)) {
      instruction = { ...instruction, assignee_name: null };
    }
    return NextResponse.json({
      text_ko: typeof json.text_ko === "string" ? json.text_ko : fallback.text_ko,
      text_zh: typeof json.text_zh === "string" ? json.text_zh : fallback.text_zh,
      instruction,
      degraded: false,
    });
  } catch (e) {
    console.error("process failed", e);
    return NextResponse.json(fallback);
  }
}
