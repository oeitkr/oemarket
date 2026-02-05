"use client";

import { useState, useEffect } from "react";

// 날짜 변환 도우미 (안전하게 처리)
const getSafeDate = (timeData: any): Date | null => {
  if (!timeData) return null;
  if (typeof timeData.toDate === 'function') return timeData.toDate();
  return new Date(timeData);
};

export default function CountdownTimer({ endTime }: { endTime: any }) {
  const [timeLeft, setTimeLeft] = useState<string>("");
  const [isExpired, setIsExpired] = useState(false);

  useEffect(() => {
    const targetDate = getSafeDate(endTime);
    if (!targetDate) return;

    const updateTimer = () => {
      const now = new Date();
      const diff = targetDate.getTime() - now.getTime();

      if (diff <= 0) {
        setIsExpired(true);
        setTimeLeft("마감됨");
        return;
      }

      // 남은 시간 계산 (일, 시간, 분, 초)
      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
      const minutes = Math.floor((diff / (1000 * 60)) % 60);
      const seconds = Math.floor((diff / 1000) % 60);

      // 예쁘게 포맷팅 (00:00:00)
      if (days > 0) {
        setTimeLeft(`${days}일 ${hours}시간 남음`);
      } else {
        // 시간이 한 자리 수일 때 앞에 0 붙이기
        const h = String(hours).padStart(2, "0");
        const m = String(minutes).padStart(2, "0");
        const s = String(seconds).padStart(2, "0");
        setTimeLeft(`${h}:${m}:${s}`);
      }
    };

    updateTimer(); // 처음 한번 실행
    const timerId = setInterval(updateTimer, 1000); // 1초마다 실행

    // 청소하기 (컴포넌트 사라질 때 타이머 끄기)
    return () => clearInterval(timerId);
  }, [endTime]);

  return (
    <span style={{ 
      color: isExpired ? "#888" : "#e53e3e", 
      fontWeight: "bold",
      fontSize: "14px"
    }}>
      {isExpired ? "🚫 종료됨" : `⏰ ${timeLeft}`}
    </span>
  );
}
