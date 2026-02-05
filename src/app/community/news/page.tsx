"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { BottomNav } from "../../../components/BottomNav";
import { auth, db } from "../../firebase";
import { checkIsAdmin } from "../../adminConfig"; // ✅ 여기서 가져옵니다.
import { onAuthStateChanged } from "firebase/auth"; // ✅ 에러 방지를 위해 꼭 추가!
import { collection, query, where, orderBy, onSnapshot, doc, getDoc } from "firebase/firestore";

export default function NewsRoom() {
  const router = useRouter();
  const mainGreen = "#2D5A27";
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 🥒 [수정] 사용자가 확실히 로그인될 때까지 기다렸다가 데이터를 불러옵니다.
    const unsubscribeAuth = onAuthStateChanged(auth, async (currentUser) => {
      setLoading(true);

      if (!currentUser) {
        setLoading(false);
        return;
      }

      // 1. 관리자 확인
      const isAdmin = checkIsAdmin(currentUser.email);

      // 2. 지역 정보 가져오기
      const userDoc = await getDoc(doc(db, "users", currentUser.uid));
      const userRegion = userDoc.exists() ? userDoc.data().region : null;

      let q;

      if (isAdmin) {
        // 👑 관리자: 지역 상관없이 모든 'news' 카테고리 글 가져오기
        q = query(
          collection(db, "posts"),
          where("category", "==", "news"),
          orderBy("createdAt", "desc")
        );
      } else if (userRegion) {
        // 👤 일반 유저: 내 동네 'news' 글만 가져오기
        q = query(
          collection(db, "posts"),
          where("category", "==", "news"),
          where("region", "==", userRegion),
          orderBy("createdAt", "desc")
        );
      } else {
        setPosts([]);
        setLoading(false);
        return;
      }

      // 3. 실시간 데이터 감시 (리스너)
      const unsubscribePosts = onSnapshot(q, (snapshot) => {
        const postData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setPosts(postData);
        setLoading(false);
      }, (error) => {
        console.error("데이터 로드 에러:", error);
        setLoading(false);
      });

      return () => unsubscribePosts();
    });

    return () => unsubscribeAuth();
  }, []);

  const formatDateTime = (timestamp: any) => {
    if (!timestamp) return "방금 전";
    const date = timestamp.toDate();
    return date.toLocaleString('ko-KR', {
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit',
    });
  };

  const handleWriteClick = () => {
    if (!auth.currentUser) {
      alert("글을 쓰려면 로그인이 필요합니다! 😊");
      router.push("/login");
      return;
    }
    router.push("/community/write?type=news");
  };

  return (
    <div style={{ background: "#FDFBF7", minHeight: "100vh", paddingBottom: "100px" }}>
      <header style={{ padding: "20px 5%", display: "flex", alignItems: "center", borderBottom: "1px solid #EEE", backgroundColor: "white", position: "sticky", top: 0, zIndex: 10 }}>
        <Link href="/" style={{ textDecoration: "none", fontSize: "1.5rem", marginRight: "15px" }}>🔙</Link>
        <h1 style={{ fontSize: "1.3rem", fontWeight: "800", margin: 0 }}>📢 동네뉴스</h1>
      </header>

      <section style={{ padding: "30px 5%", backgroundColor: "#E3F2FD" }}>
        <p style={{ margin: 0, fontWeight: "700", color: "#1976D2" }}>우리 동네 소식을 이웃과 나누어 보세요! 🌱</p>
      </section>

      <main style={{ padding: "20px 5%" }}>
        {loading ? (
          <div style={{ textAlign: "center", padding: "50px 0", color: "#AAA" }}>소식을 불러오는 중...</div>
        ) : posts.length > 0 ? (
          <div style={{ display: "flex", flexDirection: "column", gap: "15px" }}>
            {posts.map((post) => (
              <div
                key={post.id}
                onClick={() => router.push(`/community/${post.id}`)}
                style={{ padding: "20px", backgroundColor: "white", borderRadius: "16px", border: "1px solid #E8E3D8", boxShadow: "0 2px 8px rgba(0,0,0,0.02)", cursor: "pointer" }}
              >
                <h3 style={{ fontSize: "1.1rem", margin: "0 0 10px 0", color: "#333", fontWeight: "800" }}>{post.title}</h3>
                <p style={{ fontSize: "0.95rem", color: "#666", lineHeight: "1.5", marginBottom: "15px" }}>
                  {post.content.length > 80 ? post.content.substring(0, 80) + "..." : post.content}
                </p>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.85rem", color: "#999" }}>
                  <span>👤 {post.author} | 👁️ {post.views || 0}</span>
                  <span>{formatDateTime(post.createdAt)}</span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ textAlign: "center", padding: "50px 0", color: "#AAA" }}>아직 올라온 뉴스가 없어요.</div>
        )}
      </main>

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