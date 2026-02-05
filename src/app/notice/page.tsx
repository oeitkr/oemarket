"use client";

import { useEffect, useState } from "react";
import { db } from "../firebase";
import { collection, query, orderBy, onSnapshot } from "firebase/firestore";
import { useRouter } from "next/navigation";
import { BottomNav } from "../../components/BottomNav";

export default function NoticeListPage() {
  const [notices, setNotices] = useState<any[]>([]);
  const router = useRouter();
  const mainGreen = "#2D5A27";

  useEffect(() => {
    // 📢 파이어베이스에서 공지사항 목록을 최신순으로 가져옵니다.
    const q = query(collection(db, "notices"), orderBy("createdAt", "desc"));
    const unsub = onSnapshot(q, (snap) => {
      const fetched = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setNotices(fetched);
    });
    return () => unsub();
  }, []);

  return (
    <div style={{ background: "linear-gradient(135deg, #FDFBF7 0%, #F5F0E8 100%)", minHeight: "100vh", paddingBottom: "100px" }}>
      {/* 1. 상단 헤더 */}
      <header style={{ padding: "20px", display: "flex", justifyContent: "space-between", alignItems: "center", background: "white", borderBottom: "1px solid #E0D7C6" }}>
        <h1 style={{ fontSize: "20px", fontWeight: "900", color: mainGreen, margin: 0 }}>📢 공지사항</h1>
        <button 
          onClick={() => router.push("/notice/write")}
          style={{ padding: "8px 16px", background: mainGreen, color: "white", border: "none", borderRadius: "10px", fontWeight: "bold", cursor: "pointer" }}
        >
          공지등록
        </button>
      </header>

      {/* 2. 공지사항 리스트 구역 */}
      <main style={{ padding: "20px" }}>
        {notices.length > 0 ? (
          notices.map((notice) => (
            <div 
              key={notice.id}
              /* 📍 [수정 핵심] 클릭하면 상세 페이지로 이동하게 만듭니다! */
              onClick={() => router.push(`/notice/${notice.id}`)}
              style={{ 
                background: "white", 
                borderRadius: "20px", 
                padding: "20px", 
                marginBottom: "15px", 
                border: "1px solid rgba(224, 215, 198, 0.6)", 
                cursor: "pointer",
                boxShadow: "0 4px 12px rgba(0,0,0,0.02)"
              }}
            >
              <h3 style={{ fontSize: "16px", fontWeight: "700", color: "#333", margin: "0 0 8px 0" }}>
                {notice.title}
              </h3>
              <div style={{ fontSize: "12px", color: "#999" }}>
                {notice.createdAt?.toDate ? notice.createdAt.toDate().toLocaleDateString() : "2026. 1. 23."}
              </div>
            </div>
          ))
        ) : (
          <div style={{ textAlign: "center", padding: "50px 0", color: "#999" }}>등록된 공지사항이 없습니다. 🥒</div>
        )}
      </main>

      <BottomNav />
    </div>
  );
}