"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { db, auth } from "../firebase"; // 📍 auth 추가
import { collection, query, orderBy, onSnapshot, doc, getDoc, where } from "firebase/firestore"; // 📍 doc, getDoc 추가
import { onAuthStateChanged } from "firebase/auth"; // 📍 추가

export default function CommunityPage() {
  const router = useRouter();
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // 📍 추가하는 상태 변수들
  const [user, setUser] = useState<any>(null);
  const [verifiedRegion, setVerifiedRegion] = useState<string | null>(null); // 인증된 동네
  const [currentLocation, setCurrentLocation] = useState<string | null>(null); // 현재 GPS 동네
  const [viewMode, setViewMode] = useState<"verified" | "current">("verified"); // 보기 모드

  // 1. 게시글 데이터 실시간으로 가져오기
  // 📍 23번 줄 바로 아래에 붙여넣으세요.
  useEffect(() => {
    setLoading(true);

    // 기준점: 모드에 따라 어떤 동네 글을 가져올지 정합니다.
    let targetRegion = viewMode === "verified" ? verifiedRegion : currentLocation;

    let q;
    if (targetRegion) {

      // 🥒 [수정] 전체 지역명으로 비교 ("동구 화정동")
      q = query(
        collection(db, "posts"),
        where("region", "==", targetRegion), // 전체 지역명으로 매칭!
        orderBy("createdAt", "desc")
      );
    } else {
      // 정보가 없다면 일단 전체 글을 최신순으로 가져옵니다.
      q = query(collection(db, "posts"), orderBy("createdAt", "desc"));
    }

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedPosts = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setPosts(fetchedPosts);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [viewMode, verifiedRegion, currentLocation]); // 📍 이 변수들이 바뀔 때마다 다시 실행됩니다.
  // 📍 유저 정보 및 인증 동네 가져오기
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (u) {
        const userSnap = await getDoc(doc(db, "users", u.uid));
        if (userSnap.exists()) setVerifiedRegion(userSnap.data().region || null);
      }
    });
    return () => unsub();
  }, []);

  // 📍 현재 GPS 위치 가져오는 함수 (인증과 별개로 조회용)
  const fetchCurrentLocation = async () => {
    if (!navigator.geolocation) return alert("위치 정보를 사용할 수 없습니다.");

    setCurrentLocation("찾는 중...");
    navigator.geolocation.getCurrentPosition(async (pos) => {
      const { latitude, longitude } = pos.coords;
      const naver = (window as any).naver;
      if (!naver) return;

      naver.maps.Service.reverseGeocode({
        coords: new naver.maps.LatLng(latitude, longitude),
      }, (status: any, response: any) => {
        if (status === naver.maps.Service.Status.OK) {
          const addr = response.v2.results[0].region.area3.name; // '화정동' 등
          setCurrentLocation(addr);
          setViewMode("current"); // 모드를 현재 위치로 변경
        }
      });
    }, () => alert("위치 권한을 허용해 주세요!"));
  };
  return (
    <main style={{ padding: "15px", maxWidth: "800px", margin: "0 auto", paddingBottom: "80px" }}>
      {/* 상단 헤더 */}
      <div style={{ marginBottom: "20px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "15px" }}>
          <h1 style={{ fontSize: "22px", fontWeight: "bold", margin: 0 }}>동네 소식 💬</h1>

        </div>

        {/* 📍 동네 필터 버튼 섹션 */}
        <div style={{ display: "flex", gap: "10px" }}>
          <button
            onClick={() => setViewMode("verified")}
            style={{
              flex: 1, padding: "10px", borderRadius: "10px", border: "none",
              background: viewMode === "verified" ? "#2D5A27" : "#f1f1f1",
              color: viewMode === "verified" ? "white" : "#666", fontWeight: "bold"
            }}
          >
            🏠 {verifiedRegion ? verifiedRegion.split(' ').pop() : "인증 동네"}
          </button>
          <button
            onClick={fetchCurrentLocation}
            style={{
              flex: 1, padding: "10px", borderRadius: "10px", border: "none",
              background: viewMode === "current" ? "#2D5A27" : "#f1f1f1",
              color: viewMode === "current" ? "white" : "#666", fontWeight: "bold"
            }}
          >
            📍 {currentLocation || "지금 내 주변"}
          </button>
        </div>
      </div>
      <button
        onClick={() => router.push("/community/write")}
        style={{
          padding: "8px 16px", background: "#3182ce", color: "white",
          border: "none", borderRadius: "8px", fontWeight: "bold", cursor: "pointer"
        }}
      >
        글쓰기
      </button>


      {/* 로딩 중 표시 */}
      {loading && <div style={{ textAlign: "center", padding: "40px" }}>소식을 불러오는 중... ⏳</div>}

      {/* 게시글 리스트 */}
      <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
        {posts.length > 0 ? (
          posts.map((post) => (
            <div
              key={post.id}
              onClick={() => router.push(`/community/${post.id}`)}
              style={{
                padding: "15px", background: "white", borderRadius: "12px",
                border: "1px solid #eee", cursor: "pointer", boxShadow: "0 2px 4px rgba(0,0,0,0.02)"
              }}
            >
              <h3 style={{ fontSize: "16px", fontWeight: "bold", marginBottom: "5px", color: "#2d3748" }}>
                {post.title}
              </h3>
              <p style={{
                fontSize: "14px", color: "#4a5568", marginBottom: "10px",
                display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden"
              }}>
                {post.content}
              </p>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "12px", color: "#a0aec0" }}>
                <span>{post.author || "익명"}</span>
                {/* 날짜가 있는 경우에만 표시 */}
                <span>{post.createdAt?.toDate ? post.createdAt.toDate().toLocaleDateString() : ""}</span>
              </div>
            </div>
          ))
        ) : (
          !loading && (
            <div style={{ textAlign: "center", padding: "60px 0", color: "#a0aec0" }}>
              아직 게시글이 없습니다. 첫 소식을 남겨보세요! 😊
            </div>
          )
        )}
      </div>
    </main>
  );
}