"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

export default function ChatRoomPage() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  // ✅ 모달 열릴 때 배경 스크롤 잠그기
  useEffect(() => {
    if (!mounted) return;
    const prev = document.body.style.overflow;
    if (isModalOpen) document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [isModalOpen, mounted]);

  return (
    <div style={{ padding: "20px" }}>
      <button
        onClick={() => setIsModalOpen(true)}
        style={{
          padding: "14px 28px",
          background: "#3182ce",
          color: "white",
          border: "none",
          borderRadius: "10px",
          fontSize: "16px",
          fontWeight: "bold",
          cursor: "pointer",
        }}
      >
        채팅하기
      </button>

      {/* ✅ 핵심: Portal로 document.body에 붙이기 */}
      {mounted && isModalOpen &&
        createPortal(
          <div style={overlayStyle} onClick={() => setIsModalOpen(false)}>
            <div style={modalStyle} onClick={(e) => e.stopPropagation()}>
              {/* 헤더 */}
              <div style={modalHeaderStyle}>
                <span style={{ fontWeight: "bold" }}>상대방 닉네임</span>
                <button
                  onClick={() => setIsModalOpen(false)}
                  style={closeBtnStyle}
                >
                  ✕
                </button>
              </div>

              {/* 대화 */}
              <div style={chatBodyStyle}>
                <div style={bubbleLeftStyle}></div>
                <div style={bubbleRightStyle}></div>
              </div>

              {/* 입력 */}
              <div style={inputBarStyle}>
                <input
                  placeholder="메시지를 입력하세요..."
                  style={inputStyle}
                />
                <button style={sendBtnStyle}>전송</button>
              </div>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}

const overlayStyle: React.CSSProperties = {
  position: "fixed",
  inset: 0,
  background: "rgba(0,0,0,0.55)",
  display: "flex",
  justifyContent: "center",    // 가로 중앙 정렬은 유지
  alignItems: "flex-end",      // ✅ center 대신 flex-end를 써서 바닥에 붙입니다.
  zIndex: 2147483647,
  padding: "0",                // ✅ 바닥에 딱 붙게 여백을 없앱니다.
};

const modalStyle: React.CSSProperties = {
  width: "100%",
  height: "90dvh",             // ✅ 전체 화면보다 살짝 작게 설정 (키보드 대응)
  background: "#fff",
  borderRadius: "20px 20px 0 0", // ✅ 위쪽만 둥글게, 아래쪽은 바닥에 딱 붙게
  overflow: "hidden",
  display: "flex",
  flexDirection: "column",
  boxShadow: "0 -2px 10px rgba(0,0,0,0.1)", // ✅ 그림자를 위쪽으로 변경
};

const modalHeaderStyle: React.CSSProperties = {
  padding: "14px 16px",
  borderBottom: "1px solid #eee",
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
};

const closeBtnStyle: React.CSSProperties = {
  border: "none",
  background: "none",
  fontSize: "20px",
  cursor: "pointer",
  padding: "6px",
};

const chatBodyStyle: React.CSSProperties = {
  flex: 1,
  padding: "16px",
  overflowY: "auto",
  background: "#f8fafc",
  display: "flex",
  flexDirection: "column",
  gap: "10px",
};

const bubbleLeftStyle: React.CSSProperties = {
  alignSelf: "flex-start",
  background: "white",
  padding: "10px 14px",
  borderRadius: "14px",
  fontSize: "14px",
  boxShadow: "0 1px 2px rgba(0,0,0,0.06)",
};

const bubbleRightStyle: React.CSSProperties = {
  alignSelf: "flex-end",
  background: "#3182ce",
  color: "white",
  padding: "10px 14px",
  borderRadius: "14px",
  fontSize: "14px",
};

const inputBarStyle: React.CSSProperties = {
  padding: "12px", // 👈 기존 "12px 12px 35px 12px"에서 간단하게 변경!
  borderTop: "1px solid #eee",
  display: "flex",
  gap: "10px",
  background: "white",
};

const inputStyle: React.CSSProperties = {
  flex: 1,
  padding: "12px",
  borderRadius: "999px",
  border: "1px solid #ddd",
  outline: "none",
  fontSize: "14px",
  background: "#f7fafc",
};

const sendBtnStyle: React.CSSProperties = {
  padding: "10px 14px",
  background: "#3182ce",
  color: "white",
  border: "none",
  borderRadius: "999px",
  fontWeight: "bold",
  cursor: "pointer",
};
