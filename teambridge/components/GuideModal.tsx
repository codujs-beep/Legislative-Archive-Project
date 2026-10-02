"use client";

export default function GuideModal({ onClose }: { onClose: () => void }) {
  return (
    <div className="modal-bg" onClick={onClose}>
      <div className="guide" onClick={(e) => e.stopPropagation()}>
        <h3>TeamBridge 이용 가이드 · 使用指南</h3>
        <ul>
          <li>① 역할·언어 선택 후 팀 시작<br />选择角色和语言后开始团队</li>
          <li>② 채팅으로 업무 지시 확인<br />通过聊天确认任务指示</li>
          <li>③ 이해 확인 퀴즈 풀기<br />完成理解确认测验</li>
          <li>④ 진행 보드 자동 반영 확인<br />确认进度看板自动更新</li>
        </ul>
        <button onClick={onClose}>닫기 · 关闭</button>
      </div>
    </div>
  );
}
