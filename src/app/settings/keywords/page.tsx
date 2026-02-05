"use client";

import { useState, useEffect } from "react";
import { auth, db } from "../../firebase"; // 📂 경로 확인!
import { doc, getDoc, updateDoc, arrayUnion, arrayRemove } from "firebase/firestore";
import { useRouter } from "next/navigation";

export default function KeywordSettingPage() {
  const [keyword, setKeyword] = useState("");
  const [myKeywords, setMyKeywords] = useState<string[]>([]);
  const [user, setUser] = useState<any>(null);
  const router = useRouter();

  // 1. 로그인 유저 확인 및 기존 키워드 불러오기
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        const userRef = doc(db, "users", currentUser.uid);
        const userSnap = await getDoc(userRef);
        if (userSnap.exists()) {
          setMyKeywords(userSnap.data().keywords || []);
        }
      } else {
        router.push("/login");
      }
    });
    return () => unsubscribe();
  }, [router]);

  // 2. 키워드 추가 함수
  const handleAddKeyword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!keyword.trim()) return;
    if (myKeywords.length >= 10) return alert("키워드는 최대 10개까지 가능합니다.");
    if (myKeywords.includes(keyword)) return alert("이미 등록된 키워드입니다.");

    try {
      const userRef = doc(db, "users", user.uid);
      await updateDoc(userRef, {
        keywords: arrayUnion(keyword.trim())
      });
      setMyKeywords([...myKeywords, keyword.trim()]);
      setKeyword("");
    } catch (error) {
      alert("추가 실패: " + error);
    }
  };

  // 3. 키워드 삭제 함수
  const handleDeleteKeyword = async (target: string) => {
    try {
      const userRef = doc(db, "users", user.uid);
      await updateDoc(userRef, {
        keywords: arrayRemove(target)
      });
      setMyKeywords(myKeywords.filter(k => k !== target));
    } catch (error) {
      alert("삭제 실패");
    }
  };

  return (
    <main style={{ padding: "20px", maxWidth: "500px", margin: "0 auto" }}>
      <button onClick={() => router.back()} style={{ border: "none", background: "none", color: "#3182ce", cursor: "pointer", marginBottom: "20px" }}>
        ← 뒤로가기
      </button>
      
      <h1 style={{ fontSize: "22px", fontWeight: "bold", marginBottom: "10px" }}>관심 키워드 알림 🔍</h1>
      <p style={{ fontSize: "14px", color: "#666", marginBottom: "30px" }}>관심 있는 단어를 등록하면 관련 물건이 올라올 때 알려드려요.</p>

      {/* 키워드 입력창 */}
      <form onSubmit={handleAddKeyword} style={{ display: "flex", gap: "10px", marginBottom: "30px" }}>
        <input 
          type="text" 
          placeholder="키워드 입력 (예: 캠핑)" 
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          style={{ flex: 1, padding: "12px", borderRadius: "8px", border: "1px solid #ddd" }}
        />
        <button type="submit" style={{ padding: "0 20px", background: "#3182ce", color: "white", border: "none", borderRadius: "8px", fontWeight: "bold", cursor: "pointer" }}>
          등록
        </button>
      </form>

      {/* 등록된 키워드 목록 */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: "10px" }}>
        {myKeywords.length === 0 && <p style={{ color: "#999", fontSize: "14px" }}>등록된 키워드가 없습니다.</p>}
        {myKeywords.map((k) => (
          <div key={k} style={{ background: "#edf2f7", padding: "8px 15px", borderRadius: "20px", display: "flex", alignItems: "center", gap: "8px", fontSize: "14px" }}>
            <span>{k}</span>
            <button 
              onClick={() => handleDeleteKeyword(k)}
              style={{ border: "none", background: "none", color: "#e53e3e", cursor: "pointer", fontWeight: "bold" }}
            >
              ×
            </button>
          </div>
        ))}
      </div>
    </main>
  );
}