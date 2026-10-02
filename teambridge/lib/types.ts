export type Lang = "ko" | "zh";
export type Role = "leader" | "member";
export type Status = "todo" | "doing" | "done";

export interface Team { id: string; name: string; invite_code: string }
export interface Member { id: string; team_id: string; name: string; role: Role; lang: Lang }

export interface Quiz {
  question_ko: string;
  question_zh: string;
  options_ko: string[];
  options_zh: string[];
  answer: number;
  easy_ko: string;
  easy_zh: string;
}

export interface Instruction {
  title_ko: string;
  title_zh: string;
  deliverable: string;
  deadline: string;
  assignee_name: string | null;
  quiz: Quiz;
}

export interface Message {
  id: string;
  team_id: string;
  member_id: string;
  text: string;
  lang: Lang;
  text_ko: string | null;
  text_zh: string | null;
  instruction: Instruction | null;
  created_at: string;
}

export interface Task {
  id: string;
  team_id: string;
  title: string;
  title_ko: string | null;
  title_zh: string | null;
  deliverable: string | null;
  assignee_id: string | null;
  deadline: string | null;
  status: Status;
  confirmed: boolean;
  source_message_id: string | null;
  created_at: string;
}
