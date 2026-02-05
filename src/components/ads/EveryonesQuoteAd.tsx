import React from 'react';

// 광고 카드 스타일 (여기로 옮겨왔어요)
const adCardStyle = {
  marginTop: "12px",
  padding: "16px",
  background: "#fff",
  borderRadius: "12px",
  border: "1px solid #ebf8ff",
  boxShadow: "0 2px 8px rgba(49, 130, 206, 0.1)",
  cursor: "pointer",
  backgroundImage: "linear-gradient(135deg, #fff 0%, #f0f9ff 100%)"
};

export default function EveryonesQuoteAd() {
  const handleClick = () => {
    window.open("https://play.google.com/store/apps/details?id=com.gas17.everyonesquote", "_blank");
  };

  return (
    <div onClick={handleClick} style={adCardStyle}>
      <div style={{ display: "flex", justifyContent: "space-between" }}>
        <span style={{ fontSize: 11, color: "#3182ce", fontWeight: "bold" }}>사장님 추천 앱 🥒</span>
        <span style={{ fontSize: 11, color: "#999" }}>AD</span>
      </div>
      <h4 style={{ margin: "8px 0 4px 0", color: "#2c5282" }}>📝 모두의 견적서</h4>
      <p style={{ fontSize: 12, color: "#4a5568", margin: 0 }}>
        일정 관리와 견적서 작성을 한 번에 해결하세요!
      </p>
    </div>
  );
}