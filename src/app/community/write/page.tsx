"use client";

import { useState, useEffect, Suspense } from "react"; // 📍 Suspense 추가
import { useRouter, useSearchParams } from "next/navigation";
import { db, auth } from "../../firebase";
import { collection, addDoc, serverTimestamp, doc, getDoc } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";

// 1️⃣ 실제 글쓰기 화면을 담당하는 컴포넌트
function WriteFormContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const categoryType = searchParams.get("type") || "news";
  const initialTab = searchParams.get("tab") || "기타";
  const SUB_CATEGORIES = ["운동", "맛집", "취미", "공부", "동네친구", "기타"];
  const [subCategory, setSubCategory] = useState(initialTab);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [userRegion, setUserRegion] = useState<string>(""); // 👈 추가!

  const mainGreen = "#2D5A27";

  // 로그인 체크
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      if (!u) {
        alert("로그인이 필요합니다! 🥒");
        router.push("/login");
      } else {
        setUser(u);

        // 🥒 [추가] 사용자 지역 가져오기
        const userDoc = await getDoc(doc(db, "users", u.uid));
        if (userDoc.exists()) {
          setUserRegion(userDoc.data().region || "");
        }
      }
    });
    return () => unsub();
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) return alert("제목과 내용을 입력해주세요.");

    // 🥒 [추가] 지역 인증 확인
    if (!userRegion) {
      if (confirm("📍 동네 인증이 필요합니다!\n마이페이지에서 동네 인증을 하시겠습니까? 🥒")) {
        router.push("/profile");
      }
      return;
    }

    setLoading(true);
    try {

      await addDoc(collection(db, "posts"), {
        title: title,
        content: content,
        category: categoryType,
        subCategory: categoryType === "group" ? subCategory : null,
        region: userRegion,
        uid: user?.uid,
        author: user?.displayName || "익명",
        createdAt: serverTimestamp(),
        views: 0,
      });

      alert("소식이 성공적으로 등록되었습니다! 📢");
      router.push(`/community/${categoryType}`); // 📍 등록한 카테고리 방으로 이동
    } catch (error) {
      console.error("등록 에러:", error);
      alert("글 등록에 실패했습니다.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main style={{ padding: 20, maxWidth: 600, margin: "0 auto", background: "#FDFBF7", minHeight: "100vh" }}>

      <h2 style={{ fontSize: "1.3rem", fontWeight: "800", color: "#333", marginBottom: "25px" }}>
        {categoryType === "group" ? `🤝 ${subCategory}` : "📢 동네뉴스 소식 올리기"}
      </h2>

      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 15 }}>
        {/* 소모임일 때만 카테고리 선택창 표시 */}
        {categoryType === "group" && !searchParams.get("tab") && (
          <div style={{ marginBottom: "5px" }}>
            <label style={{ display: "block", fontSize: "14px", fontWeight: "bold", marginBottom: "8px", color: mainGreen }}>
              어떤 모임인가요?
            </label>
            <select
              value={subCategory}
              onChange={(e) => setSubCategory(e.target.value)}
              style={{ width: "100%", padding: "12px", borderRadius: 8, border: "1px solid #cbd5e0", fontSize: "16px", outline: "none" }}
            >
              {SUB_CATEGORIES.map(sub => <option key={sub} value={sub}>{sub}</option>)}
            </select>
          </div>
        )}

        <input
          type="text"
          placeholder="제목을 입력하세요"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          style={{ padding: "12px", borderRadius: 8, border: "1px solid #cbd5e0", fontSize: 16, outline: "none" }}
        />

        <textarea
          placeholder="우리 동네 이야기를 들려주세요."
          value={content}
          onChange={(e) => setContent(e.target.value)}
          style={{ padding: "12px", borderRadius: 8, border: "1px solid #cbd5e0", fontSize: 16, outline: "none", minHeight: "250px", resize: "none" }}
        />

        <div style={{ display: "flex", gap: 10 }}>
          <button
            type="button"
            onClick={() => router.back()}
            style={{ flex: 1, padding: "12px", borderRadius: 8, border: "1px solid #cbd5e0", background: "white", cursor: "pointer", fontWeight: "bold" }}
          >
            취소
          </button>
          <button
            type="submit"
            disabled={loading}
            style={{
              flex: 2, padding: "12px", borderRadius: 12, border: "none",
              background: mainGreen, color: "white", fontWeight: "800", cursor: "pointer",
              boxShadow: "0 4px 12px rgba(45, 90, 39, 0.2)",
              opacity: loading ? 0.7 : 1
            }}
          >
            {loading ? "전하는 중..." : "등록 완료"}
          </button>
        </div>
      </form>
    </main>
  );
}

// 2️⃣ 📍 버셀 빌드 에러 해결의 핵심! Suspense 보호막을 입혀서 내보냅니다.
export default function CommunityWritePage() {
  return (
    <Suspense fallback={<div style={{ padding: 50, textAlign: "center" }}>화면을 준비 중입니다... 🥒</div>}>
      <WriteFormContent />
    </Suspense>
  );
}