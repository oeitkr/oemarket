"use client";

import Image from "next/image";
import Link from "next/link";
import { useState, useEffect } from "react";
import { auth, db } from "./firebase";
import { onAuthStateChanged } from "firebase/auth";
// ✅ 수정 후 (increment와 updateDoc을 명단에 추가했습니다)
import { doc, setDoc, increment, updateDoc, getDoc, collection, query, where, onSnapshot, orderBy, limit } from "firebase/firestore";
import { useRouter } from "next/navigation";
import { BottomNav } from "../components/BottomNav";
import { checkIsAdmin } from "./adminConfig"; // 파일 위치에 따라 ../adminConfig 일 수 있음

const MESSAGES = [
  "사는 재미, 파는 설렘. 오이마켓에 다 있어요 🌱",
  "가까운 이웃이라 더 믿음직한 우리 동네 거래 🏘️",
  "잠자던 물건이 누군가의 보물이 되는 순간 💎",
  "두근두근 경매로 즐기는 이웃과의 기분 좋은 나눔 🔨"
];

const BOARD_ROOMS = [
  { id: "notice", title: "공지사항", icon: "🔔", desc: "오이마켓의 새소식", color: "#F5F5F5", link: "/notice" },
  { id: "news", title: "동네뉴스", icon: "📢", desc: "우리 동네 최신 소식", color: "#E3F2FD", link: "/community/news" },
  { id: "group", title: "소모임", icon: "🤝", desc: "함께 취미를 나눠요", color: "#F1F8E9", link: "/community/group" },
  { id: "fix", title: "도와줘요", icon: "🆘", desc: "급한 도움이 필요할 때", color: "#FFEBEE", link: "/community/fix" },
  { id: "tea", title: "준비중", icon: "⏳", desc: "곧 오픈 예정입니다", color: "#F5F5F5", link: "#" },
];

export default function Home() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  // 📍 관리자 계정인지 확인하는 이름표를 만듭니다.
  const isAdmin = checkIsAdmin(user?.email);
  const [nickname, setNickname] = useState<string>("");
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [currentTextIndex, setCurrentTextIndex] = useState(0);
  const [latestNotice, setLatestNotice] = useState<any>(null);
  const [recentPosts, setRecentPosts] = useState<any[]>([]);
  const [userRegion, setUserRegion] = useState<string>("로딩 중...");

  // 1. 데이터 실시간 감시 (공지사항 + 진짜 내 동네 최근글 3개)
  useEffect(() => {
    // 지역 정보가 아직 로딩 중이면 데이터를 가져오지 않고 기다립니다.
    if (userRegion === "로딩 중...") return;

    // 📢 1. 공지사항 가져오기
    const qNotice = query(collection(db, "notices"), orderBy("createdAt", "desc"), limit(1));
    const unsubNotice = onSnapshot(qNotice, (snap) => {
      if (!snap.empty) setLatestNotice({ id: snap.docs[0].id, ...snap.docs[0].data() });
    });

    // ✅ 수정된 코드 (관리자면 전지역, 일반인이면 우리동네 글을 가져옵니다)
    const qPost = isAdmin
      ? query(collection(db, "posts"), orderBy("createdAt", "desc"), limit(3))
      : query(collection(db, "posts"), where("region", "==", userRegion), orderBy("createdAt", "desc"), limit(3));

    const unsubPost = onSnapshot(qPost, (snap) => {
      const postsData = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setRecentPosts(postsData);
    });

    return () => {
      unsubNotice();
      unsubPost();
    };
  }, [userRegion]); // 📍 이제 딱 하나(userRegion)만 일관되게 감시합니다!
  // 2. 문구 변경 타이머
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTextIndex((prev) => (prev + 1) % MESSAGES.length);
    }, 3000);
    return () => clearInterval(timer);
  }, []);

  // 3. 로그인 및 알림 확인
  useEffect(() => {
    let unsubUnread: (() => void) | null = null;
    const unsubAuth = onAuthStateChanged(auth, async (u) => {
      if (unsubUnread) { unsubUnread(); unsubUnread = null; }
      setUser(u);
      if (!u) { setNickname(""); setUnreadCount(0); return; }

      const q = query(collection(db, "users", u.uid, "notifications"), where("isRead", "==", false));
      unsubUnread = onSnapshot(q, (snapshot) => { setUnreadCount(snapshot.docs.length); });

      // 📍 수정: 닉네임과 함께 진짜 지역(region) 정보도 가져옵니다.
      const userSnap = await getDoc(doc(db, "users", u.uid));
      if (userSnap.exists()) {
        const userData = userSnap.data() as any;
        setNickname(userData.nickname || u.displayName || "마이");
        setUserRegion(userData.region || "지역 미인증"); // 진짜 동네 이름을 바구니에 담습니다!
        // ---------------------------------------------------------
        // 📍 [업그레이드: 하루 한 번 방문 카운팅]
        const todayStr = new Date().toLocaleDateString('en-CA'); // 오늘 날짜 (예: "2026-01-26")

        if (userData.lastVisitDate !== todayStr) {
          // 1. 전체 통계 문서 업데이트 (누적 방문 + 오늘 방문)
          await setDoc(doc(db, "settings", "stats"), {
            totalVisitors: increment(1),
            [`today_${todayStr}`]: increment(1) // 오늘 날짜 칸에 +1
          }, { merge: true });

          // 2. 이 사용자 정보에 오늘 날짜 도장 쾅!
          await updateDoc(doc(db, "users", u.uid), {
            lastVisitDate: todayStr
          });
        }
        // ---------------------------------------------------------
      } else {
        setNickname(u.displayName || "마이");
        setUserRegion("지역 미인증");
      }
    });
    return () => { unsubAuth(); if (unsubUnread) unsubUnread(); };
  }, []);

  const mainGreen = "#2D5A27";

  return (
    <div style={{ background: "linear-gradient(135deg, #FDFBF7 0%, #F5F0E8 100%)", minHeight: "100vh", width: "100%", fontFamily: "'Noto Sans KR', sans-serif" }}>

      <style>{`
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes slide-text {
          0% { transform: translateX(0); }
          25% { transform: translateX(0); }
          85% { transform: translateX(-105%); }
          100% { transform: translateX(-105%); }
        }
        .sliding-container { display: inline-block; white-space: nowrap; width: auto; }
        .is-long { animation: slide-text 12s linear infinite; }

        .main-container { display: flex; flex-direction: row; flex-wrap: wrap; gap: 40px; width: 100% !important; max-width: 100% !important; padding: 40px 3% !important; }
        .sidebar { order: 1; flex: 0 0 220px; text-align: left; }
        .content { order: 2; flex: 1; min-width: 320px; }

        /* 📍 모바일 대응 핵심: 헤더를 위아래 2층으로 쌓습니다 */
        @media (max-width: 600px) {
          .main-header { flex-direction: column !important; gap: 15px !important; padding: 15px 5% !important; }
          .header-right { width: 100% !important; justify-content: space-between !important; }
          .ticker-box { max-width: 70% !important; }
        }

        @media (max-width: 1000px) {
          .main-container { flex-direction: column; padding: 20px 5% !important; }
          .sidebar { order: 2; flex: 1; max-width: 100%; margin-top: 40px; border-top: 1px solid #E0D7C6; padding-top: 30px; } 
          .content { order: 1; width: 100%; }
        }
      `}</style>

      {/* 1️⃣ 헤더 부분 (이름표 className을 모두 붙였습니다) */}
      <header className="main-header" style={{ padding: "20px 3%", display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%", gap: "15px" }}>
        <Link href="/" style={{ textDecoration: "none", flexShrink: 0 }}>
          <div style={{ fontSize: "1.8rem", fontWeight: "900", color: mainGreen }}>🥒 오이마켓</div>
        </Link>

        <div className="header-right" style={{ display: "flex", alignItems: "center", gap: "12px", justifyContent: "flex-end", flex: 1, minWidth: 0 }}>
          <div className="ticker-box" style={{ textAlign: "right", display: "flex", flexDirection: "column", gap: "2px", maxWidth: "180px", overflow: "hidden", flexShrink: 1 }}>
            <div onClick={() => latestNotice && router.push(`/notice/${latestNotice.id}`)} style={{ fontSize: "11px", color: "#666", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "flex-end" }}>
              <span style={{ fontWeight: "700", color: mainGreen, flexShrink: 0, marginRight: "4px", background: "white", zIndex: 1 }}>📢 공지:</span>
              <div style={{ flex: 1, display: "flex", justifyContent: "flex-start", overflow: "hidden" }}>
                <div className={`sliding-container ${(latestNotice?.title?.length || 0) >= 14 ? "is-long" : ""}`}>
                  {latestNotice?.title || "공지사항 없음"}
                </div>
              </div>
            </div>
            {/* 📍 수정: latestPost 대신 recentPosts[0] (목록의 첫 번째 글)을 사용합니다. */}
            <div onClick={() => recentPosts[0] && router.push(`/community/${recentPosts[0].id}`)} style={{ fontSize: "11px", color: "#666", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "flex-end" }}>
              <span style={{ fontWeight: "700", color: "#4A90E2", flexShrink: 0, marginRight: "4px", background: "white", zIndex: 1 }}>🆕 최근글:</span>
              <div style={{ flex: 1, display: "flex", justifyContent: "flex-start", overflow: "hidden" }}>
                <div className={`sliding-container ${(recentPosts[0]?.title?.length || 0) >= 14 ? "is-long" : ""}`}>
                  {recentPosts[0]?.title || "최신글 없음"}
                </div>
              </div>
            </div>
          </div>

          <div style={{ flexShrink: 0 }}>
            <Link href={user ? "/profile" : "/login"} style={{ fontSize: "0.9rem", color: "#666", textDecoration: "none", padding: "8px 18px", borderRadius: "10px", border: "1px solid #E0D7C6", backgroundColor: "white", fontWeight: "700", whiteSpace: "nowrap" }}>
              {user ? `${nickname || "마이"}님` : "로그인"}
              {user && unreadCount > 0 && (
                <span style={{ marginLeft: "5px", color: "#E53E3E" }}>({unreadCount})</span>
              )}
            </Link>
          </div>
        </div>
      </header>

      {/* 2️⃣ 메인 영역 */}
      <main className="main-container">
        <aside className="sidebar">
          <h3 style={{ fontSize: "1.2rem", fontWeight: "800", color: mainGreen, marginBottom: "25px" }}></h3>
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            {BOARD_ROOMS.map((room) => (
              <Link key={room.id} href={room.link || "#"} style={{ textDecoration: "none", color: "inherit", display: "block" }}>
                <div style={{ padding: "18px", backgroundColor: room.color, borderRadius: "20px", cursor: "pointer", border: "1px solid rgba(0,0,0,0.03)", transition: "transform 0.2s ease" }}
                  onMouseEnter={(e) => (e.currentTarget.style.transform = "scale(1.03)")}
                  onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1.0)")}>
                  <div style={{ fontSize: "1.1rem", fontWeight: "800", marginBottom: "4px" }}>{room.icon} {room.title}</div>
                  <div style={{ fontSize: "0.85rem", color: "#777", fontWeight: "500" }}>{room.desc}</div>
                </div>
              </Link>
            ))}
          </div>
        </aside>

        <div className="content">
          <section style={{ textAlign: "left", marginBottom: "50px", minHeight: "80px" }}>
            <h2 key={currentTextIndex} style={{ color: "#333", fontSize: "2.5rem", lineHeight: "1.4", fontWeight: "800", animation: "fadeInUp 0.8s ease-out" }}>
              {MESSAGES[currentTextIndex]}
            </h2>
          </section>

          <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "30px", marginBottom: "40px" }}>
            <div style={{ padding: "1px 30px 10px", backgroundColor: "white", borderRadius: "28px", border: "1px solid #E8E3D8" }}>
              <div style={{ marginBottom: "20px" }}>
                {/* 📍 겉모습은 그대로지만, 클릭하면 게시판으로 이동하게 Link를 입혔습니다. */}
                <Link href="/community" style={{ textDecoration: "none", color: "inherit" }}>
                  <h2 style={{ fontSize: "1.4rem", fontWeight: "800", color: mainGreen, marginBottom: "6px", cursor: "pointer" }}>
                    💬 동네 소식판
                  </h2>
                </Link>

                {/* 동네 이름 (이건 클릭이 안 되도록 Link 밖에 둡니다) */}
                <div style={{ fontSize: "1rem", fontWeight: "600", color: "#666", paddingLeft: "5px" }}>
                  ({userRegion})
                </div>
              </div>

              {/* 📍 수정: 가짜 문구를 지우고, 진짜 글 목록 3개를 세로로 나열합니다. */}
              <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                {recentPosts.length > 0 ? (
                  recentPosts.map((post) => (
                    <div
                      key={post.id}
                      onClick={() => router.push(`/community/${post.id}`)}
                      style={{ cursor: "pointer", display: "flex", alignItems: "center", gap: "8px" }}
                    >
                      <span style={{ color: mainGreen }}>•</span>
                      <span style={{ color: "#444", fontSize: "1rem", fontWeight: "500", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {post.title}
                      </span>
                    </div>
                  ))
                ) : (
                  <p style={{ color: "#AAA", fontSize: "0.9rem" }}>아직 올라온 소식이 없어요. 🥒</p>
                )}
              </div>
            </div>
            <div style={{ padding: "1px 30px 10px", background: "linear-gradient(135deg, #F5F0E8 0%, #E8E3D8 100%)", borderRadius: "28px" }}>
              <h2 style={{ fontSize: "1.4rem", fontWeight: "800", color: mainGreen, marginBottom: "15px" }}>🥒 오이마켓 안내</h2>
              <div style={{ fontSize: "14px", display: "flex", flexDirection: "column", gap: "12px" }}>
                <div><strong>🏘️ 동네 기반</strong>: 가까운 이웃과 안전한 거래</div>
                <div><strong>⏰ 실시간 경매</strong>: 합리적인 낙찰가</div>
                <div><strong>⏰ 커뮤니티</strong>: 함께하는 동네생활</div>
              </div>
            </div>
          </section>

          <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "30px" }}>
            <Link href="/list" style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "45px", background: mainGreen, color: "white", borderRadius: "32px", textDecoration: "none", boxShadow: "0 15px 35px rgba(45, 90, 39, 0.2)" }}>
              <span style={{ fontSize: "3.5rem", marginBottom: "10px" }}>🛍️</span>
              <div style={{ fontSize: "1.5rem", fontWeight: "800" }}>동네 물건 구경하기</div>
            </Link>
            <Link href="/create" style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "45px", backgroundColor: "white", color: mainGreen, borderRadius: "32px", border: "3px solid #E0D7C6", textDecoration: "none" }}>
              <span style={{ fontSize: "3.5rem", marginBottom: "10px" }}>📦</span>
              <div style={{ fontSize: "1.5rem", fontWeight: "800" }}>내 물건 내놓기</div>
            </Link>
          </section>
        </div>
      </main>

      <BottomNav />
    </div>
  );
}