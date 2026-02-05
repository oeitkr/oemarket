"use client";

import { useEffect, useState } from "react";

export default function SwResetPage() {
  const [done, setDone] = useState(false);
  const [log, setLog] = useState<string[]>([]);

  useEffect(() => {
    const run = async () => {
      try {
        // 1) 서비스워커 전부 해제
        if ("serviceWorker" in navigator) {
          const regs = await navigator.serviceWorker.getRegistrations();
          setLog((prev) => [...prev, `SW registrations: ${regs.length}`]);

          for (const reg of regs) {
            await reg.unregister();
          }
          setLog((prev) => [...prev, "✅ service workers unregistered"]);
        }

        // 2) 캐시 전부 삭제 (남아있는 구버전 스크립트 제거용)
        if ("caches" in window) {
          const keys = await caches.keys();
          for (const k of keys) await caches.delete(k);
          setLog((prev) => [...prev, `✅ caches cleared: ${keys.length}`]);
        }

        setDone(true);
      } catch (e: any) {
        setLog((prev) => [...prev, `❌ error: ${e?.message ?? String(e)}`]);
      }
    };

    run();
  }, []);

  return (
    <main style={{ padding: 20 }}>
      <h2 style={{ fontWeight: "bold", fontSize: 18 }}>SW 초기화</h2>
      <p style={{ marginTop: 10 }}>
        {done ? "초기화 완료 ✅ 이제 홈으로 돌아가서 다시 테스트하세요." : "초기화 중..."}
      </p>

      <div style={{ marginTop: 12, fontSize: 12, background: "#f5f5f5", padding: 12, borderRadius: 8 }}>
        {log.map((x, i) => (
          <div key={i}>{x}</div>
        ))}
      </div>

      <button
        onClick={() => (window.location.href = "/")}
        style={{ marginTop: 16, padding: "10px 14px", borderRadius: 10, border: "1px solid #ddd" }}
      >
        홈으로
      </button>
    </main>
  );
}
