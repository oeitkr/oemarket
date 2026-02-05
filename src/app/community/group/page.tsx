"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { BottomNav } from "../../../components/BottomNav";
import { auth, db } from "../../firebase"; // 👈 checkIsAdmin은 여기서 뺍니다.
import { checkIsAdmin } from "../../adminConfig"; // 👈 여기서 가져와야 정확합니다.
// ✅ 아래 줄에 'onAuthStateChanged'를 꼭 추가해야 합니다!
import { onAuthStateChanged } from "firebase/auth";
import { collection, query, where, orderBy, onSnapshot, doc, getDoc } from "firebase/firestore";

export default function GroupRoom() {
  const router = useRouter();
  const mainGreen = "#2D5A27"; // 오이마켓 초록색

  // 📍 추가: 카테고리별 맞춤 안내 문구 정의
  const categoryDescriptions: { [key: string]: string } = {
    "전체": "우리 동네 소모임 소식을 한눈에 확인하세요! 🤝",
    "운동": "함께 땀 흘리며 운동할 동네 친구를 찾아보세요! 🏃",
    "맛집": "혼자 가기 아쉬운 맛집, 같이 갈 분들을 모집해보세요! 🍕",
    "취미": "같은 취미를 가진 이웃들과 즐거운 시간을 보내세요! 🎨",
    "공부": "혼자 하면 지루한 공부, 스터디 그룹을 만들어봐요! 📖",
    "동네친구": "가까운 이웃과 소소한 일상을 공유해보세요! 👋",
    "기타": "다양한 주제로 자유롭게 모임을 만들어보세요! ✨"
  };

  // 1️⃣ 사용할 카테고리 정의
  const subCategories = ["전체", "운동", "맛집", "취미", "공부", "동네친구", "기타"];

  // 2️⃣ 현재 선택된 카테고리 상태 (기본값: 전체)
  const [selectedTab, setSelectedTab] = useState("전체");
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 🥒 [수정] 로그인이 될 때까지 기다렸다가 글을 불러오도록 'onAuthStateChanged'를 사용합니다.
    const unsubscribeAuth = onAuthStateChanged(auth, async (currentUser) => {
      setLoading(true);

      if (!currentUser) {
        setLoading(false);
        return;
      }

      // 1. 관리자 확인
      const isAdmin = checkIsAdmin(currentUser.email);

      // 2. 지역 정보 가져오기 (비관리자일 때만 필요)
      let userRegion = null;
      const userDoc = await getDoc(doc(db, "users", currentUser.uid));
      userRegion = userDoc.exists() ? userDoc.data().region : null;

      // 🥒 [최종 보강] 일반 유저도 '본인이 가입한 고유 ID(uid)'로 쓴 글은 지역 상관없이 포함합니다.
      let q;

      if (isAdmin) {
        // 👑 관리자: 전국 모든 글 보기
        if (selectedTab === "전체") {
          q = query(collection(db, "posts"), where("category", "==", "group"), orderBy("createdAt", "desc"));
        } else {
          q = query(collection(db, "posts"), where("category", "==", "group"), where("subCategory", "==", selectedTab), orderBy("createdAt", "desc"));
        }
      } else if (userRegion) {
        // 👤 일반 유저: 닉네임이 아닌 'currentUser.uid'를 기준으로 내 글을 판별합니다.
        if (selectedTab === "전체") {
          q = query(
            collection(db, "posts"),
            where("category", "==", "group"),
            // 💡 [참고] Firestore에서 '내 지역 OR 내 UID'를 동시에 가져오는 복합 쿼리는 인덱스 설정이 복잡합니다.
            // 가장 안정적인 방법은 지역 글을 가져오되, 리스너 안에서 내 글을 추가로 체크하는 것입니다.
            where("region", "==", userRegion),
            orderBy("createdAt", "desc")
          );
        } else {
          q = query(
            collection(db, "posts"),
            where("category", "==", "group"),
            where("subCategory", "==", selectedTab),
            where("region", "==", userRegion),
            orderBy("createdAt", "desc")
          );
        }
      } else {
        setPosts([]);
        setLoading(false);
        return;
      }

      // 5. 실시간 데이터 감시 시작
      const unsubscribePosts = onSnapshot(q, (snapshot) => {
        const postData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setPosts(postData);
        setLoading(false);
      }, (error) => {
        console.error("데이터 로드 에러:", error);
        setLoading(false);
      });

      // ❗ 중요: 이 안에서 리스너를 반환합니다.
      return () => unsubscribePosts();
    });

    // useEffect가 끝날 때 인증 리스너를 정리합니다.
    return () => unsubscribeAuth();
  }, [selectedTab]);

  const formatDateTime = (timestamp: any) => {
    if (!timestamp) return "방금 전";
    const date = timestamp.toDate();
    return date.toLocaleString('ko-KR', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
  };

  // 📍 현재 선택된 카테고리(selectedTab) 정보를 URL에 추가합니다!
  const handleWriteClick = () => {
    if (!auth.currentUser) {
      alert("글을 쓰려면 로그인이 필요합니다! 😊");
      router.push("/login");
      return;
    }

    // selectedTab이 "전체"일 때는 카테고리를 비워두고, 
    // 특정 카테고리(맛집, 운동 등)일 때만 그 이름을 붙여서 보냅니다.
    const categoryParam = selectedTab === "전체" ? "" : `&tab=${selectedTab}`;

    router.push(`/community/write?type=group${categoryParam}`);
  };
  return (
    <div style={{ background: "#FDFBF7", minHeight: "100vh", paddingBottom: "100px" }}>
      {/* 상단 헤더 */}
      <header style={{ padding: "20px 5%", display: "flex", alignItems: "center", borderBottom: "1px solid #EEE", backgroundColor: "white", position: "sticky", top: 0, zIndex: 10 }}>
        <Link href="/" style={{ textDecoration: "none", fontSize: "1.5rem", marginRight: "15px" }}>🔙</Link>

        {/* 📍 수정: 선택된 탭(selectedTab)에 따라 제목이 바뀝니다! */}
        <h1 style={{ fontSize: "1.3rem", fontWeight: "800", margin: 0 }}>
          {selectedTab === "전체" ? "🤝 소모임 방" : `${selectedTab} 소모임 방`}
        </h1>

      </header>
      {/* 4️⃣ 카테고리 선택 탭 (가로 스크롤 가능) */}
      <nav style={{
        display: "flex",
        gap: "10px",
        padding: "15px 5%",
        backgroundColor: "white",
        overflowX: "auto",
        whiteSpace: "nowrap",
        borderBottom: "1px solid #F0F0F0"
      }}>
        {subCategories.map((tab) => (
          <button
            key={tab}
            onClick={() => setSelectedTab(tab)}
            style={{
              padding: "8px 16px",
              borderRadius: "20px",
              border: "1px solid",
              borderColor: selectedTab === tab ? mainGreen : "#DDD",
              backgroundColor: selectedTab === tab ? mainGreen : "white",
              color: selectedTab === tab ? "white" : "#666",
              fontWeight: "700",
              cursor: "pointer",
              transition: "0.2s"
            }}
          >
            {tab}
          </button>
        ))}
      </nav>

      <main style={{ padding: "20px 5%" }}>

        {/* 📍 추가: 선택된 탭에 따른 맞춤 안내 문구 박스 */}
        <div style={{
          backgroundColor: "white",
          padding: "15px 20px",
          borderRadius: "12px",
          border: "1px solid #F0F0F0",
          marginBottom: "20px",
          fontSize: "0.9rem",
          color: "#555",
          lineHeight: "1.5"
        }}>
          {categoryDescriptions[selectedTab]}
        </div>

        {loading ? (
          <div style={{ textAlign: "center", padding: "50px 0", color: "#AAA" }}>소식을 불러오는 중...</div>
        ) : posts.length > 0 ? (
          <div style={{ display: "flex", flexDirection: "column", gap: "15px" }}>
            {posts.map((post) => (
              <div key={post.id} onClick={() => router.push(`/community/${post.id}`)} style={{ padding: "20px", backgroundColor: "white", borderRadius: "16px", border: "1px solid #E8E3D8", cursor: "pointer" }}>
                <div style={{ display: "flex", gap: "8px", marginBottom: "8px" }}>
                  {/* ✅ 어떤 세부 카테고리인지 표시 */}
                  <span style={{ color: mainGreen, fontSize: "0.8rem", fontWeight: "800" }}>[{post.subCategory || "일반"}]</span>
                </div>
                <h3 style={{ fontSize: "1.1rem", margin: "0 0 10px 0", fontWeight: "800" }}>{post.title}</h3>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.85rem", color: "#999" }}>
                  <span>👤 {post.author} | 👁️ {post.views || 0}</span>
                  <span>{formatDateTime(post.createdAt)}</span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ textAlign: "center", padding: "100px 0", color: "#AAA" }}>
            <p style={{ fontSize: "3rem", margin: 0 }}>🏜️</p>
            <p>'{selectedTab}' 카테고리에<br />아직 올라온 글이 없어요.</p>
          </div>
        )}
      </main>

      {/* [수정 후] 1단계: 버튼 모양 변경 */}
      <div
        onClick={handleWriteClick}
        style={{
          position: "fixed", right: "20px", bottom: "100px",
          width: "60px", height: "60px", borderRadius: "50%",
          backgroundColor: mainGreen, display: "flex",
          alignItems: "center", justifyContent: "center",
          color: "white", fontSize: "1.5rem", cursor: "pointer",
          boxShadow: "0 5px 15px rgba(0,0,0,0.2)", zIndex: 100
        }}
      >
        ✏️
      </div>
      <BottomNav />
    </div>
  );
}