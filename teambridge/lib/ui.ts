import type { Lang } from "./types";

type Dict = Record<string, { ko: string; zh: string }>;

const dict: Dict = {
  chatTab: { ko: "채팅", zh: "聊天" },
  statusTab: { ko: "팀 현황", zh: "团队现状" },
  boardTab: { ko: "진행 보드", zh: "进度看板" },
  send: { ko: "보내기", zh: "发送" },
  placeholderKo: { ko: "한국어로 메시지를 입력하세요", zh: "请用韩语输入消息" },
  placeholderZh: { ko: "중국어로 메시지를 입력하세요", zh: "请用中文输入消息" },
  noMessages: { ko: "아직 메시지가 없어요. 첫 메시지를 보내보세요!", zh: "还没有消息，发送第一条吧！" },
  quizTitle: { ko: "이해 확인 퀴즈", zh: "理解确认测验" },
  quizWrong: { ko: "틀렸어요. 쉬운 설명을 다시 읽어보세요.", zh: "答错了，请再看一遍简单说明。" },
  quizRight: { ko: "이해 완료! 진행 보드에 등록되었어요.", zh: "理解完成！已登记到进度看板。" },
  submit: { ko: "제출", zh: "提交" },
  understood: { ko: "이해 완료", zh: "理解完成" },
  waiting: { ko: "확인 대기", zh: "待确认" },
  noTasks: { ko: "아직 확인한 업무가 없어요", zh: "还没有已确认的任务" },
  statusHint: {
    ko: "채팅에서 지시된 업무를 팀원이 이해 확인 퀴즈로 맞히면 여기에 자동으로 모여요",
    zh: "团队成员通过理解确认测验答对聊天中下达的任务后，会自动汇总在这里",
  },
  todo: { ko: "대기", zh: "待办" },
  doing: { ko: "진행중", zh: "进行中" },
  done: { ko: "완료", zh: "完成" },
  newTask: { ko: "새 할 일 제목", zh: "新任务标题" },
  assignee: { ko: "담당자", zh: "负责人" },
  deadline: { ko: "마감(예: 8/30)", zh: "截止(如 8/30)" },
  add: { ko: "추가", zh: "添加" },
  viewTranslation: { ko: "번역 보기", zh: "查看翻译" },
  hideTranslation: { ko: "원문 보기", zh: "查看原文" },
  boardHint: { ko: "드롭다운에서 상태를 자유롭게 변경할 수 있어요", zh: "可通过下拉菜单自由更改状态" },
  invite: { ko: "초대 코드", zh: "邀请码" },
  members: { ko: "명", zh: "人" },
  unassigned: { ko: "미정", zh: "未定" },
  instructionBadge: { ko: "업무 지시", zh: "任务指示" },
  what: { ko: "할 일", zh: "任务" },
  deliverable: { ko: "결과물", zh: "成果物" },
  due: { ko: "마감", zh: "截止" },
  who: { ko: "담당", zh: "负责人" },
  analyzing: { ko: "분석 중…", zh: "分析中…" },
  copy: { ko: "복사", zh: "复制" },
  copied: { ko: "복사됨", zh: "已复制" },
};

export function t(key: keyof typeof dict, lang: Lang) {
  return dict[key][lang];
}
