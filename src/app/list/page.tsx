"use client";
import { BottomNav } from "../../components/BottomNav"; // 경로 수정: ../ -> ../../
import Link from "next/link"; // Link 가져오기 추가
import CountdownTimer from "@/components/CountdownTimer";
import { useEffect, useState, Fragment } from "react";
import { useRouter } from "next/navigation";
import { db, auth } from "../firebase";
import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  doc,
  getDoc, // 🆕 추가
  setDoc, // 🆕 추가
  deleteDoc,
  updateDoc,
  serverTimestamp,
  increment,
  limit,
} from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import EveryonesQuoteAd from "../../components/ads/EveryonesQuoteAd";
import { checkIsAdmin } from "../adminConfig"; // 파일 위치에 따라 ../adminConfig 일 수 있음

// --- [도우미 함수 및 상수 - 기존 로직 유지] ---
const getSafeDate = (timeData: any): Date | null => {
  if (!timeData) return null;
  if (typeof timeData.toDate === "function") return timeData.toDate();
  return new Date(timeData);
};
const getDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
  const R = 6371;
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) *
    Math.cos(lat2 * (Math.PI / 180)) *
    Math.sin(dLon / 2) *
    Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};
const waitForNaver = (timeoutMs = 8000, intervalMs = 100) => {
  return new Promise<any>((resolve, reject) => {
    const start = Date.now();
    const timer = setInterval(() => {
      // @ts-ignore
      const naver = window.naver;
      if (naver?.maps?.Service && naver?.maps?.LatLng) {
        clearInterval(timer);
        resolve(naver);
        return;
      }
      if (Date.now() - start > timeoutMs) {
        clearInterval(timer);
        reject(new Error("NAVER_MAP_TIMEOUT"));
      }
    }, intervalMs);
  });
};
const getMyPosition = () => {
  return new Promise<GeolocationPosition>((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(resolve, reject);
  });
};
const CATEGORIES = [
  "카테고리",
  "디지털기기", "생활가전", "가구/인테리어", "생활/주방용품",
  "여성의류", "여성잡화", "남성의류", "남성잡화", "신발",
  "시계/쥬얼리", "수입 명품", "뷰티/미용", "유아동", "유아도서",
  "스포츠/레저", "자전거/킥보드", "낚시/캠핑", "취미/게임/음반",
  "피규어/수집품", "예술/희귀품", "도서/티켓/문구", "반려동물용품",
  "식물", "가공식품", "신선식품", "자동차/오토바이", "공구/산업용품",
  "재능/서비스", "기타",
];
// 📍 이 함수를 ListPage 함수 바깥(위쪽)에 붙여넣으세요.
const formatTimeAgo = (date: any) => {
  if (!date) return "";
  const d = typeof date.toDate === 'function' ? date.toDate() : new Date(date);
  const now = new Date();
  const diff = (now.getTime() - d.getTime()) / 1000; // 초 단위 차이
  if (diff < 60) return "방금 전";
  if (diff < 3600) return `${Math.floor(diff / 60)}분 전`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}시간 전`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}일 전`;
  return d.toLocaleDateString('ko-KR', { month: '2-digit', day: '2-digit' });
};
export default function ListPage() {
  const router = useRouter();
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  // 📍 현재 사용자 계정이 관리자인지 확인하는 이름표입니다.
  const isAdmin = checkIsAdmin(user?.email);
  const [now, setNow] = useState(Date.now());
  const [searchTerm, setSearchTerm] = useState("");
  const [isWatchlistOpen, setIsWatchlistOpen] = useState(false);
  const [watchlist, setWatchlist] = useState<any[]>([]);
  const [selectedCategory, setSelectedCategory] = useState("전체");
  const [selectedSaleMethod, setSelectedSaleMethod] = useState("전체방식");
  const [isFabMenuOpen, setIsFabMenuOpen] = useState(false);
  const [isAlbaMenuOpen, setIsAlbaMenuOpen] = useState(false);
  const [isNewsMenuOpen, setIsNewsMenuOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    // 화면 크기를 체크해서 768px보다 작으면 '참(true)'으로 바꿉니다.
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    handleResize(); // 처음 실행할 때 체크
    window.addEventListener('resize', handleResize); // 창 크기 변할 때마다 체크
    return () => window.removeEventListener('resize', handleResize); // 정리
  }, []);
  const [myLocation, setMyLocation] = useState("위치 확인 중...");
  const [selectedRange, setSelectedRange] = useState("우리동네");
  const [myCoords, setMyCoords] = useState<any>(null); // 👈 좌표를 null로 비워둡니다.
  const [isRangeMenuOpen, setIsRangeMenuOpen] = useState(false);
  const [isCategoryOpen, setIsCategoryOpen] = useState(false);
  const [isSaleMethodOpen, setIsSaleMethodOpen] = useState(false);

  // 📍 아래 두 줄을 추가해 주세요
  const [verifiedRegion, setVerifiedRegion] = useState<string | null>(null);
  const [isVerifiedOnly, setIsVerifiedOnly] = useState(false);

  // 📍 최신 공지와 최신글을 저장할 상자
  const [latestNotice, setLatestNotice] = useState<any>(null);
  const [latestPost, setLatestPost] = useState<any>(null);
  // 📍 최신 공지 1개를 가져오는 일꾼
  useEffect(() => {
    const q = query(collection(db, "notices"), orderBy("createdAt", "desc"), limit(1));
    const unsub = onSnapshot(q, (snap) => {
      if (!snap.empty) setLatestNotice({ id: snap.docs[0].id, ...snap.docs[0].data() });
    });
    return () => unsub();
  }, []);
  // 📍 최근 게시글 1개를 가져오는 일꾼
  useEffect(() => {
    const q = query(collection(db, "posts"), orderBy("createdAt", "desc"), limit(1));
    const unsub = onSnapshot(q, (snap) => {
      if (!snap.empty) setLatestPost({ id: snap.docs[0].id, ...snap.docs[0].data() });
    });
    return () => unsub();
  }, []);
  // --- [useEffect 로직 - 기존 기능 유지] ---
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);
  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, (u) => setUser(u));
    return () => unsubAuth();
  }, []);
  // 📍 [방문자 카운팅 + 지역 정보 가져오기]
  useEffect(() => {
    if (!user) { setVerifiedRegion(null); return; }
    const fetchUserRegion = async () => {
      const userSnap = await getDoc(doc(db, "users", user.uid));
      if (userSnap.exists()) {
        const userData = userSnap.data() as any;
        setVerifiedRegion(userData.region || null);

        // ---------------------------------------------------------
        // 📍 [업그레이드: 리스트 페이지도 하루 한 번만 카운팅]
        const todayStr = new Date().toLocaleDateString('en-CA');

        if (userData.lastVisitDate !== todayStr) {
          // 1. 전체 통계 업데이트 (누적 + 오늘 날짜별)
          await setDoc(doc(db, "settings", "stats"), {
            totalVisitors: increment(1),
            [`today_${todayStr}`]: increment(1)
          }, { merge: true });

          // 2. 이 사용자 정보에 오늘 날짜 도장 쾅!
          await updateDoc(doc(db, "users", user.uid), {
            lastVisitDate: todayStr
          });
        }
        // ---------------------------------------------------------
      }
    };
    fetchUserRegion();
  }, [user]);
  useEffect(() => {
    const run = async () => {
      if (!("geolocation" in navigator)) {
        setMyLocation("❌ 위치 미지원");
        return;
      }
      try {
        setMyLocation("📡 위치 확인 중...");
        const pos = await getMyPosition();
        const { latitude, longitude } = pos.coords;
        setMyCoords({ lat: latitude, lng: longitude });
        setMyLocation("🗺️ 주소 변환 중...");
        const naver = await waitForNaver();
        naver.maps.Service.reverseGeocode(
          { coords: new naver.maps.LatLng(latitude, longitude) },
          (status: any, response: any) => {
            if (status === naver.maps.Service.Status.OK) {
              const addr = response?.v2?.results?.[0]?.region?.area3?.name;
              setMyLocation(addr || "주소 확인됨");
            } else {
              setMyLocation("주소 변환 실패");
            }
          }
        );
      } catch (err: any) {
        setMyLocation("📍 위치 정보 없음");
        // 🥒 [추가] 권한 거부 시 새로고침 유도
        if (confirm("📍 위치 권한이 필요합니다!\nGPS 권한을 허용하고 페이지를 새로고침 하시겠습니까? 🥒")) {
          window.location.reload();
        }
      }
    };
    run();
  }, []);
  useEffect(() => {
    // 🔥 서버에서 'status'가 'active'인 보물만 골라서 가져옵니다.
    const q = query(
      collection(db, "items"),
      //where("status", "==", "active"),
      orderBy("createdAt", "desc")
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedItems = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      setItems(fetchedItems);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);
  // 자동 재등록 일꾼 로직
  useEffect(() => {
    if (!items || items.length === 0) return;
    const currentTime = new Date();
    items.forEach(async (item: any) => {
      const endTime = getSafeDate(item.endTime);
      if (item.status === "active" && endTime && endTime.getTime() < currentTime.getTime() && (item.bidCount || 0) === 0 && (item.relistCount || 0) > 0) {
        try {
          const itemRef = doc(db, "items", item.id);
          await updateDoc(itemRef, {
            endTime: new Date(Date.now() + (item.durationMin || 1440) * 60 * 1000),
            relistCount: item.relistCount - 1,
            createdAt: serverTimestamp(),
          });
        } catch (error) { console.error("자동 연장 실패:", error); }
      }
    });
  }, [items, now]);
  useEffect(() => {
    if (!user) { setWatchlist([]); return; }
    const unsubscribe = onSnapshot(query(collection(db, "users", user.uid, "watchlist"), orderBy("createdAt", "desc")), (snapshot) => {
      setWatchlist(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    return () => unsubscribe();
  }, [user]);
  const handleRemoveFromWatchlist = async (e: React.MouseEvent, itemId: string) => {
    e.stopPropagation();
    if (!user || !confirm("찜한 목록에서 삭제하시겠습니까?")) return;
    try { await deleteDoc(doc(db, "users", user.uid, "watchlist", itemId)); } catch (err) { console.error(err); }
  };
  const filteredItems = items.filter((item) => {
    const targetText = `${item.title || ""} ${item.description || ""}`.toLowerCase();
    const isMatchedSearch = targetText.includes(searchTerm.toLowerCase());
    const isMatchedCategory = selectedCategory === "전체" || item.category === selectedCategory;
    const endTime = getSafeDate(item.endTime);
    const isExpired = endTime && endTime.getTime() <= now; // 시간이 지났는지?
    const isFinished = item.status === "completed" || item.isSold || isExpired;
    // 📍 여기서부터 추가
    let isMatchedVerified = true;
    if (isVerifiedOnly && verifiedRegion) {
      // 내 인증 동네(예: 수진동)가 상품 동네 정보에 포함되는지 확인합니다.
      isMatchedVerified = item.region?.includes(verifiedRegion.split(' ').pop() || "") || false;
    }
    // 📍 여기까지 추가
    let isWithinRange = true;
    // 1. 내 위치(myCoords)가 잡혔을 때만 거리 계산을 시작합니다.
    if (myCoords && item.latitude && item.longitude) {
      const dist = getDistance(myCoords.lat, myCoords.lng, item.latitude, item.longitude);
      const ranges: any = { "우리동네": 3, "옆동네": 5 };
      if (ranges[selectedRange]) {
        isWithinRange = dist <= ranges[selectedRange];
      }
    }
    // 2. 위치를 못 잡았다면(myCoords가 null이면) 모든 물건을 보여줍니다. (수진동 방지)
    let isMatchedMethod = true;
    if (selectedSaleMethod !== "전체방식") {
      if (selectedSaleMethod === "일반판매") isMatchedMethod = item.type === "fixed";
      else if (selectedSaleMethod === "일반경매") isMatchedMethod = item.type === "auction" && !item.isMinusAuction;
      else if (selectedSaleMethod === "밀당경매") isMatchedMethod = item.isMinusAuction === true;
    }
    // ✅ 최종 수정 코드
    return isMatchedSearch && isMatchedCategory && isMatchedMethod && (isAdmin || (isWithinRange && isMatchedVerified && !isFinished));
  });
  // --- [디자인 테마 설정] ---
  const mainGreen = "#2D5A27";
  const bgGradient = "linear-gradient(135deg, #FDFBF7 0%, #F5F0E8 100%)";
  if (loading)
    return (
      <div style={{
        padding: 40,
        textAlign: "center",
        fontSize: 16,
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "linear-gradient(135deg, #FDFBF7 0%, #F5F0E8 100%)"
      }}>
        <div>
          <div style={{ fontSize: 40, marginBottom: 16 }}>🥒</div>
          로딩 중...
        </div>
      </div>
    );
  return (
    <main style={{
      padding: "0 15px 100px 15px", // ✅ 상단(0), 좌우(15), 하단(100)
      maxWidth: "1200px",
      margin: "0 auto",
      minHeight: "100vh",
      background: bgGradient
    }}>
      {/* 🥒 [추가] 사이드바와 리스트를 가로로 배치하기 위한 큰 틀 */}
      <div style={{ display: "flex", gap: "30px", alignItems: "flex-start" }}>




        <aside
          className="pc-only-sidebar" // 🥒 나중에 CSS로 조절하기 쉽게 이름표를 달아줍니다.
          style={{
            width: "160px", flexShrink: 0, position: "sticky", top: "20px",
            marginTop: "235px",
            // 🥒 [수정] 화면 크기에 따라 보였다 안 보였다 하게 만들 겁니다.
            display: isMobile ? "none" : "block"
          }}
        >
          {/* 🥒 [수정] 제목을 클릭하면 메뉴가 열리고 닫히도록 onClick을 추가했습니다. */}
          <h3
            onClick={() => setIsAlbaMenuOpen(!isAlbaMenuOpen)} // 클릭하면 상태가 반대로 바뀝니다!
            style={{
              fontSize: "15px", fontWeight: "bold", marginBottom: "18px", color: "#333",
              display: "flex", alignItems: "center", gap: "6px", cursor: "pointer" // 손가락 모양 추가
            }}
          >
            <span style={{ fontSize: "18px" }}>💼</span>
            동네 알바
          </h3>

          {/* 🥒 [추가] 이름표가 '참(true)'일 때만 아래 목록이 나타납니다. */}
          {isAlbaMenuOpen && (
            <div style={{
              display: "flex", flexDirection: "column", gap: "14px", fontSize: "14px",
              color: "#666", paddingLeft: "25px", // 안쪽으로 좀 더 밀어넣어 드롭다운 느낌을 줍니다.
              marginBottom: "20px"
            }}>
              <span style={{ cursor: "pointer" }}>🧑‍🍳 서빙/주방</span>
              <span style={{ cursor: "pointer" }}>📦 편의점/배달</span>
              <span style={{ cursor: "pointer" }}>🧹 청소/기타</span>
            </div>
          )}
          {/* 🥒 [추가] 동네 소식 드롭다운 메뉴 */}
          <h3
            onClick={() => setIsNewsMenuOpen(!isNewsMenuOpen)}
            style={{ fontSize: "15px", fontWeight: "bold", marginBottom: "18px", color: "#333", display: "flex", alignItems: "center", gap: "6px", cursor: "pointer", marginTop: "10px" }}
          >
            <span style={{ fontSize: "18px" }}>📢</span> 동네 소식
          </h3>

          {/* 🥒 [최종 완성] 왼쪽 중복 제거 + 등록 버튼 복구 버전 */}
          <div style={{ position: "fixed", bottom: "100px", right: "20px", zIndex: 9999, display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "12px" }}>

            {/* 1. 메뉴 확장 구역: PC/모바일 상관없이 열려있으면(isFabMenuOpen) 모두 보여줍니다. */}
            {isFabMenuOpen && (
              <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginBottom: "5px", alignItems: "flex-end" }}>
                <button onClick={() => router.push("/alba")} style={fabSubBtnStyle}>💼 동네 알바</button>
                <button onClick={() => router.push("/news")} style={fabSubBtnStyle}>📢 동네 소식</button>

                {/* 🛍️ 실종됐던 등록 버튼을 다시 추가했습니다! */}
                <button
                  onClick={() => router.push("/create")}
                  style={{ ...fabSubBtnStyle, background: mainGreen, color: "white", border: "none" }}
                >
                  🛍️ 등록하기
                </button>
              </div>
            )}

            {/* 2. 메인 버튼: 사용자님 요청대로 항상 동그란 '+' 버튼 모양 유지 */}
            <button
              onClick={() => setIsFabMenuOpen(!isFabMenuOpen)}
              style={{
                width: "56px", height: "56px", borderRadius: "28px", background: mainGreen,
                color: "white", border: "none", fontSize: "30px", fontWeight: "bold",
                boxShadow: "0 4px 15px rgba(0,0,0,0.25)", cursor: "pointer",
                display: "flex", justifyContent: "center", alignItems: "center",
              }}
            >
              <span style={{ transform: isFabMenuOpen ? "rotate(45deg)" : "rotate(0deg)", transition: "0.2s" }}>+</span>
            </button>
          </div>
        </aside>
        {/* 2번 방: 우측 메인 구역 (검색창 + 리스트) */}
        <div style={{ flex: 1 }}>
          {/* 📍 기존에 있던 헤더, 검색창, 리스트 코드를 이 안으로 쏙 옮겨야 합니다! */}
          {/* 📍 1. 애니메이션 주문 (멈췄다가 출발하는 마법) */}
          <style jsx>{`
          @keyframes slide-text {
            0% { transform: translateX(0); }         /* 처음엔 앞머리 딱 고정 */
            25% { transform: translateX(0); }        /* 3초간 멈춰서 앞부분 다 보여주기 */
            85% { transform: translateX(-105%); }    /* 왼쪽으로 완전히 사라질 때까지 이동 */
            100% { transform: translateX(-105%); }   /* 사라진 상태 유지 */
          }
          .sliding-container { display: inline-block; white-space: nowrap; width: auto; }
          .is-long { animation: slide-text 12s linear infinite; }
        `}</style>
          {/* 1. 헤더 구역 */}
          <header style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "25px",
            paddingTop: "20px" // ✅ main에서 뺀 여백을 헤더 안쪽으로 옮겨줍니다.
          }}>            <Link href="/" style={{ textDecoration: "none" }}>
              <h1 style={{ fontSize: "1.4rem", fontWeight: "800", color: mainGreen, margin: 0 }}>🥒 오이마켓</h1>
            </Link>
            {/* 📍 2. 전광판 구역 (앞머리 사수 핵심 로직!) */}
            <div style={{
              textAlign: "right", display: "flex", flexDirection: "column", gap: "2px",
              maxWidth: "160px", overflow: "hidden"
            }}>
              {/* 공지사항 줄 */}
              <div
                onClick={() => latestNotice && router.push(`/notice/${latestNotice.id}`)}
                style={{ fontSize: "11px", color: "#666", cursor: "pointer", display: "flex", alignItems: "center" }}
              >
                <span style={{ fontWeight: "700", color: mainGreen, flexShrink: 0, marginRight: "4px", background: "#FDFBF7", zIndex: 1 }}>📢 공지:</span>
                {/* ⚠️ 여기서 justifyContent: "flex-start"가 되어야 앞글자부터 보입니다! */}
                <div style={{ flex: 1, display: "flex", justifyContent: "flex-start", overflow: "hidden" }}>
                  <div className={`sliding-container ${(latestNotice?.title?.length || 0) >= 14 ? "is-long" : ""}`}>
                    {latestNotice?.title || "공지사항 없음"}
                  </div>
                </div>
              </div>
              {/* 최근글 줄 */}
              <div
                onClick={() => latestPost && router.push(`/community/${latestPost.id}`)}
                style={{ fontSize: "11px", color: "#666", cursor: "pointer", display: "flex", alignItems: "center" }}
              >
                <span style={{ fontWeight: "700", color: "#4A90E2", flexShrink: 0, marginRight: "4px", background: "#FDFBF7", zIndex: 1 }}>🆕 최근글:</span>
                <div style={{ flex: 1, display: "flex", justifyContent: "flex-start", overflow: "hidden" }}>
                  <div className={`sliding-container ${(latestPost?.title?.length || 0) >= 14 ? "is-long" : ""}`}>
                    {latestPost?.title || "최신글 없음"}
                  </div>
                </div>
              </div>
            </div>
            {/* 로그인 버튼 (이미 있다면 이 부분은 한 번만 들어가게 주의하세요!) */}

          </header>
          {!user && (
            <button onClick={() => router.push("/login")} style={{ padding: "8px 18px", background: "white", border: "1px solid #E0D7C6", borderRadius: "10px", fontWeight: "600", fontSize: "13px", color: "#666", cursor: "pointer" }}>로그인</button>
          )}
          {/* 🥒 [수정 1] 겉을 감싸던 흰색 박스를 투명하게 만들고 여백만 남깁니다. */}
          <section style={{ marginBottom: "25px", padding: "0 5px" }}>

            {/* 📍 검색창 + 위치 버튼 통합 상자 */}
            <div style={{ position: "relative" }}>
              <input
                type="text"
                placeholder="어떤 보물을 찾으시나요? ✨"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                /* 🥒 [수정 2] 입력창에 직접 연한 녹색(mainGreen) 테두리를 적용했습니다. */
                style={{
                  width: "100%", padding: "16px 145px 16px 20px",
                  background: "white",   // 배경은 깔끔하게 흰색으로
                  borderRadius: "20px",  // 테두리를 둥글게
                  fontSize: "16px", outline: "none",
                  border: `2px solid ${mainGreen}`, // 👈 마이페이지처럼 녹색 테두리!
                  boxShadow: "0 4px 12px rgba(0,0,0,0.05)" // 아주 살짝 그림자
                }}
              />
              {/* 📍 검색창 안으로 들어온 위치 버튼 (위치는 그대로 유지) */}
              <div style={{ position: "absolute", right: "8px", top: "50%", transform: "translateY(-50%)" }}>
                <button
                  onClick={() => setIsRangeMenuOpen(!isRangeMenuOpen)}
                  style={{
                    whiteSpace: "nowrap", padding: "8px 12px", borderRadius: "12px",
                    border: "1px solid #E0D7C6", background: "white", fontSize: "13px",
                    fontWeight: "700", color: mainGreen, cursor: "pointer",
                    display: "flex", alignItems: "center", gap: "4px"
                  }}
                >
                  📍 {myLocation} {isRangeMenuOpen ? "▲" : "▼"}
                </button>
                {/* 위치 선택 메뉴 */}
                {isRangeMenuOpen && (
                  <div style={{ position: "absolute", top: "42px", right: 0, zIndex: 9999, background: "white", borderRadius: "12px", boxShadow: "0 10px 25px rgba(0,0,0,0.1)", minWidth: "120px", border: "1px solid #eee" }}>
                    {["우리동네", "옆동네"].map(r => (
                      <button key={r} onClick={() => { setSelectedRange(r); setIsRangeMenuOpen(false); }} style={{ width: "100%", textAlign: "left", padding: "12px", background: "white", border: "none", borderBottom: "1px solid #f9f9f9", fontSize: "13px", color: selectedRange === r ? mainGreen : "#333" }}>{r}</button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </section>
          {/* 3. [필터 라인] - 커스텀 드롭다운 스타일 적용 */}
          <div style={{ display: "flex", gap: "10px", alignItems: "center", marginBottom: "20px", position: "relative", zIndex: 1000 }}>
            {/* 카테고리 필터 */}
            <div style={{ position: "relative" }}>
              <button onClick={() => setIsCategoryOpen(!isCategoryOpen)} style={{ padding: "8px 15px", borderRadius: "20px", border: "1px solid #E0D7C6", background: "white", fontSize: "13px", fontWeight: "600" }}>
                카테고리 {isCategoryOpen ? "▲" : "▼"}
              </button>
              {isCategoryOpen && (
                <div style={{ position: "absolute", top: "35px", left: 0, zIndex: 9999, background: "white", borderRadius: "12px", boxShadow: "0 10px 25px rgba(0,0,0,0.1)", minWidth: "150px", maxHeight: "250px", overflowY: "auto", border: "1px solid #eee" }}>
                  {["전체", ...CATEGORIES.filter(c => c !== "카테고리")].map(cat => (
                    <button key={cat} onClick={() => { setSelectedCategory(cat); setIsCategoryOpen(false); }} style={{ width: "100%", textAlign: "left", padding: "12px", background: "white", border: "none", fontSize: "13px" }}>{cat}</button>
                  ))}
                </div>
              )}
            </div>
            {/* 판매방식 필터 */}
            <div style={{ position: "relative" }}>
              <button onClick={() => setIsSaleMethodOpen(!isSaleMethodOpen)} style={{ padding: "8px 15px", borderRadius: "20px", border: "1px solid #E0D7C6", background: "white", fontSize: "13px", fontWeight: "600" }}>
                판매방식 {isSaleMethodOpen ? "▲" : "▼"}
              </button>
              {isSaleMethodOpen && (
                <div style={{ position: "absolute", top: "35px", left: 0, zIndex: 9999, background: "white", borderRadius: "12px", boxShadow: "0 10px 25px rgba(0,0,0,0.1)", minWidth: "140px", border: "1px solid #eee" }}>
                  {["전체방식", "일반판매", "일반경매", "밀당경매"].map(m => (
                    <button key={m} onClick={() => { setSelectedSaleMethod(m); setIsSaleMethodOpen(false); }} style={{ width: "100%", textAlign: "left", padding: "12px", background: "white", border: "none", fontSize: "13px" }}>{m}</button>
                  ))}
                </div>
              )}
            </div>
            {/* 🏠 동네인증 버튼 */}
            <button
              onClick={() => {
                if (!user) return router.push("/login");
                if (!verifiedRegion) return alert("마이페이지에서 동네 인증을 먼저 해주세요! 🥒");
                setIsVerifiedOnly(!isVerifiedOnly);
              }}
              style={{ padding: "8px 15px", borderRadius: "20px", border: isVerifiedOnly ? `1px solid ${mainGreen}` : "1px solid #E0D7C6", background: isVerifiedOnly ? mainGreen : "white", fontSize: "13px", fontWeight: "600", color: isVerifiedOnly ? "white" : "#4A5568" }}
            >
              🏠 {isVerifiedOnly && verifiedRegion ? `${verifiedRegion.split(' ').pop()}만 보기` : "우리동네 상품"}
            </button>
          </div>

          {/* 4. 상품 목록 그리드 */}
          <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(165px, 1fr))", gap: "15px" }}>
            {filteredItems.map((item, index) => {
              let isExpired = false;
              if (item.endTime) {
                const end = getSafeDate(item.endTime);
                if (end && end.getTime() <= now) isExpired = true;
              }
              let statusText = item.isMinusAuction ? "밀당경매" : item.type === "fixed" ? "일반판매" : "일반경매";
let statusBgColor = item.isMinusAuction ? "#e53e3e" : item.type === "fixed" ? "#3CB371" : "#0d3ee2ff";

// 🥒 [수정] 예약중을 가장 우선으로 체크
if (item.status === "예약중") { 
  statusText = "🕒 예약중"; 
  statusBgColor = "#ed8936"; 
}
else if (item.isCanceled) { 
  statusText = "❌ 취소"; 
  statusBgColor = "#e53e3e"; 
}
else if (item.isSold || item.status === "completed") { 
  statusText = "🤝판매완료"; 
  statusBgColor = "#718096"; 
}
else if (isExpired) { 
  statusText = item.bidCount > 0 ? "🔨 낙찰됨" : "⏳ 만료"; 
  statusBgColor = item.bidCount > 0 ? "#3CB371" : "#a0aec0"; 
}
              return (
                <Fragment key={item.id}>
                  {/* 상품 카드 시작 */}
                  <div
                    onClick={async () => {
                      if (user) {
                        const viewRef = doc(db, "items", item.id, "viewers", user.uid);
                        try {
                          const viewSnap = await getDoc(viewRef);
                          // 본 기록이 없을 때만 조회수 증가
                          if (!viewSnap.exists()) {
                            await setDoc(viewRef, { viewedAt: serverTimestamp() });
                            await updateDoc(doc(db, "items", item.id), {
                              viewCount: increment(1)
                            });
                          }
                        } catch (e) {
                          console.error("조회수 처리 오류:", e);
                        }
                      }
                      // 상세 페이지 이동은 로그인 여부와 상관없이 실행
                      router.push(`/item/${item.id}`);
                    }}
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      background: "white",
                      borderRadius: "20px",
                      overflow: "hidden",
                      boxShadow: "0 4px 12px rgba(0,0,0,0.03)",
                      cursor: "pointer",
                      position: "relative",
                      border: "1px solid rgba(0,0,0,0.02)",
                      opacity: (item.status === "completed" || item.isSold || isExpired) ? 0.75 : 1
                    }}
                  >
                    {/* 이미지 영역 */}
                    <div style={{ position: "relative", width: "100%", height: "160px", background: "#f8f8f8" }}>
                      {item.images?.[0] ? (
                        <img src={item.images[0]} alt={item.title} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                      ) : (
                        <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100%", fontSize: "11px", color: "#ccc" }}>No Image</div>
                      )}
                      <span style={{ position: "absolute", top: "8px", left: "8px", background: statusBgColor, color: "white", padding: "3px 7px", borderRadius: "6px", fontSize: "10px", fontWeight: "bold" }}>
                        {statusText}
                      </span>
                    </div>
                    {/* 정보 영역 */}
                    <div style={{ padding: "12px" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                        <span style={{ fontSize: "10px", color: mainGreen, fontWeight: "700" }}>{item.category}</span>
                        <span style={{ fontSize: "10px", color: "#e53e3e", fontWeight: "bold" }}>
                          <CountdownTimer endTime={item.endTime} />
                        </span>
                      </div>
                      <h3 style={{ fontSize: "13px", fontWeight: "700", color: "#333", margin: "0 0 4px 0", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {item.title}
                      </h3>
                      <div style={{ fontSize: "11px", color: "#999", marginBottom: "8px" }}>
                        {item.region || "동네"} · {formatTimeAgo(item.createdAt)}
                      </div>
                      {/* 조회수 및 찜 수 표시 */}
                      <div style={{ display: "flex", gap: "10px", fontSize: "11px", color: "#A0AEC0", marginBottom: "8px" }}>
                        <span>👀 {item.viewCount || 0}</span>
                        <span>🧡 {item.wishCount || 0}</span>
                      </div>
                      {/* 🥒 [추가] 경매나 밀당경매일 경우 시작가를 작게 표시합니다. */}
                      {(item.type === "auction" || item.isMinusAuction) && (
                        <div style={{ fontSize: "10px", color: "#999", textAlign: "right", marginBottom: "2px" }}>
                          시작가 {item.startPrice?.toLocaleString()}원
                        </div>
                      )}
                      <div style={{ fontSize: "15px", fontWeight: "800", color: mainGreen, textAlign: "right" }}>
                        {(item.currentPrice || item.startPrice).toLocaleString()}원
                      </div>
                    </div>
                  </div>
                  {/* 상품 카드 끝 */}
                  {/* 광고 영역 */}
                  {(index + 1) % 13 === 0 && (
                    <div style={{ background: "linear-gradient(135deg, #F5F0E8 0%, #E8E3D8 100%)", borderRadius: "20px", padding: "15px", display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", border: "1px solid #E0D7C6", marginTop: "15px" }}>
                      <span style={{ fontSize: "9px", color: "#999", marginBottom: "8px" }}>ADVERTISEMENT</span>
                      <EveryonesQuoteAd />
                    </div>
                  )}
                </Fragment>
              );
            })}
          </section>
          {/* 5. 찜 목록 팝업 */}
          {isWatchlistOpen && (
            <div style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.4)", zIndex: 9999, display: "flex", justifyContent: "center", alignItems: "center", padding: 20 }} onClick={() => setIsWatchlistOpen(false)}>
              <div style={{ width: "100%", maxWidth: "400px", background: "white", borderRadius: "24px", padding: "24px", maxHeight: "80vh", overflowY: "auto", position: "relative" }} onClick={(e) => e.stopPropagation()}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
                  <h2 style={{ fontSize: "17px", fontWeight: "bold", margin: 0 }}>🧡 찜한 목록</h2>
                  <button onClick={() => setIsWatchlistOpen(false)} style={{ background: "none", border: "none", fontSize: "20px", cursor: "pointer", color: "#ccc" }}>✕</button>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  {watchlist.length > 0 ? watchlist.map((item) => (
                    <div key={item.id} onClick={() => { router.push(`/item/${item.id}`); setIsWatchlistOpen(false); }} style={{ display: "flex", gap: 12, alignItems: "center", cursor: "pointer", padding: "10px", borderRadius: "14px", background: "#F8F9FA" }}>
                      <img src={item.images?.[0]} style={{ width: 45, height: 45, borderRadius: "8px", objectFit: "cover" }} />
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: "13px", fontWeight: "bold" }}>{item.title}</div>
                        <div style={{ fontSize: "13px", color: mainGreen, fontWeight: "bold" }}>{item.currentPrice?.toLocaleString()}원</div>
                      </div>
                      <button onClick={(e) => handleRemoveFromWatchlist(e, item.id)} style={{ background: "white", border: "1px solid #eee", color: "#ccc", width: "24px", height: "24px", borderRadius: "50%", cursor: "pointer" }}>✕</button>
                    </div>
                  )) : <div style={{ textAlign: "center", padding: "30px 0", color: "#999", fontSize: "13px" }}>찜한 목록이 비어있어요.</div>}
                </div>
              </div>
            </div>
          )}
          {/* 🥒 [수정 완료] 하나의 깔끔한 플로팅 버튼 뭉치 */}
          <div style={{ position: "fixed", bottom: "100px", right: "20px", zIndex: 9999, display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "12px" }}>

            {/* 1. 메뉴 확장 구역: 플러스 버튼을 눌렀을 때만 나타납니다. */}
            {isFabMenuOpen && (
              <div style={{ display: "flex", flexDirection: "column", gap: "10px", alignItems: "flex-end" }}>
                {/* 📱 모바일(isMobile)일 때만 알바/소식을 보여줍니다. */}
                {isMobile && (
                  <>
                    <button onClick={() => router.push("/alba")} style={fabSubBtnStyle}>💼 동네 알바</button>
                    <button onClick={() => router.push("/news")} style={fabSubBtnStyle}>📢 동네 소식</button>
                  </>
                )}

                {/* 🛍️ 등록하기: PC/모바일 상관없이 메뉴 열리면 무조건 보임 */}
                <button
                  onClick={() => router.push("/create")}
                  style={{ ...fabSubBtnStyle, background: mainGreen, color: "white", border: "none" }}
                >
                  🛍️ 등록하기
                </button>
              </div>
            )}

            {/* 2. 메인 동그란 '+' 버튼 (항상 보임) */}
            <button
              onClick={() => setIsFabMenuOpen(!isFabMenuOpen)}
              style={{
                width: "56px", height: "56px", borderRadius: "28px", background: mainGreen,
                color: "white", border: "none", fontSize: "30px", fontWeight: "bold",
                boxShadow: "0 4px 15px rgba(0,0,0,0.25)", cursor: "pointer",
                display: "flex", justifyContent: "center", alignItems: "center",
              }}
            >
              <span style={{ transform: isFabMenuOpen ? "rotate(45deg)" : "rotate(0deg)", transition: "0.2s" }}>
                +
              </span>
            </button>
          </div>

          <BottomNav />
        </div> {/* 2번 방(우측 메인 구역) 닫기 */}
      </div>   {/* 큰 틀(사이드바와 메인 합친 div) 닫기 */}
    </main>
  );
}

// 🥒 디자인 설계도는 파일 맨 아래 그대로 두시면 됩니다.
const fabSubBtnStyle: React.CSSProperties = {
  padding: "10px 16px",
  borderRadius: "20px",
  background: "white",
  border: "1px solid #E0D7C6",
  boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
  fontSize: "14px",
  fontWeight: "bold",
  color: "#333",
  cursor: "pointer",
  whiteSpace: "nowrap"
};