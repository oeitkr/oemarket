"use client";

import { useRouter } from "next/navigation";
import { auth, db } from "../firebase"; // 📍 db 추가 임포트
import { signOut, deleteUser } from "firebase/auth";
// 📍 Firestore 데이터 삭제를 위해 doc, deleteDoc 추가
import { doc, deleteDoc } from "firebase/firestore";

export default function SettingsPage() {
  const router = useRouter();

  // 🎨 오이마켓 시그니처 테마 컬러
  const mainGreen = "#2D5A27";
  const subGreen = "#4A7c44";
  const warmBeige = "#F5F0E8";
  const bgGradient = "linear-gradient(135deg, #FDFBF7 0%, #F5F0E8 100%)";
  const cardShadow = "0 8px 20px rgba(45, 90, 39, 0.06)";

  // --- [기능 로직] ---
  const handleLogout = async () => {
    if (confirm("로그아웃 하시겠습니까?")) {
      await signOut(auth);
      router.push("/login");
    }
  };

  const handleDeleteAccount = async () => {
    const user = auth.currentUser;
    if (!user) return;

    if (confirm("정말로 탈퇴하시겠습니까? 등록된 모든 정보가 삭제됩니다.")) {
      try {
        // 1️⃣ [추가] Firestore에서 사용자 문서 먼저 삭제 (권한이 있을 때 지워야 함)
        const userDocRef = doc(db, "users", user.uid);
        await deleteDoc(userDocRef);
        console.log("DB 데이터 삭제 완료");

        // 2️⃣ 인증 계정 삭제
        await deleteUser(user);
        
        alert("탈퇴 처리가 완료되었습니다. 그동안 이용해주셔서 감사합니다.");
        router.push("/login");
      } catch (error: any) {
        console.error("탈퇴 에러:", error.code);

        // 📍 보안 에러 처리: 로그인한 지 오래되면 탈퇴가 거부됩니다.
        if (error.code === "auth/requires-recent-login") {
          alert("보안을 위해 다시 로그인 후 탈퇴를 진행해 주세요. 🔒");
          await signOut(auth); // 강제 로그아웃 시켜서 다시 로그인하게 유도
          router.push("/login");
        } else {
          alert("탈퇴 중 오류가 발생했습니다: " + error.message);
        }
      }
    }
  };

  return (
    <main style={{ padding: "40px 20px", maxWidth: "1000px", margin: "0 auto", paddingBottom: "120px", minHeight: "100vh" }}>
      <style jsx>{`
        .settings-container {
          display: grid;
          grid-template-columns: 1fr;
          gap: 25px;
        }
        @media (min-width: 768px) {
          .settings-container {
            grid-template-columns: 1fr 1fr;
          }
          .full-width {
            grid-column: span 2;
          }
        }
        .menu-card {
          width: 100%;
          padding: 20px;
          text-align: left;
          background: white;
          border: 1px solid rgba(224, 215, 198, 0.5);
          border-radius: 20px;
          font-size: 16px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
          display: flex;
          align-items: center;
          justify-content: space-between;
          box-shadow: ${cardShadow};
          color: #333;
        }
        .menu-card:hover {
          transform: translateY(-2px);
          border-color: ${mainGreen};
          background: #FDFBF7;
        }
        .section-title {
          font-size: 14px;
          color: ${mainGreen};
          font-weight: 800;
          margin-bottom: 15px;
          margin-left: 5px;
          display: block;
        }
      `}</style>

      {/* 헤더 */}
      <h1 style={{ fontSize: "28px", fontWeight: "900", color: mainGreen, marginBottom: "35px" }}>설정 ⚙️</h1>

      {/* 홍보 배너 */}
      <div className="full-width" style={{ 
        background: "white", 
        padding: "25px", 
        borderRadius: "24px", 
        marginBottom: "10px", 
        border: `1px solid ${mainGreen}20`, 
        boxShadow: cardShadow,
        display: "flex",
        flexDirection: "column",
        gap: "8px",
        cursor: "pointer",
        position: "relative",
        overflow: "hidden"
      }}>
        <div style={{ position: "absolute", top: 0, left: 0, width: "6px", height: "100%", background: mainGreen }}></div>
        <span style={{ fontSize: "12px", color: mainGreen, fontWeight: "bold", letterSpacing: "1px" }}>오이마켓 사장님 추천 앱</span>
        <h3 style={{ margin: 0, color: "#1A3A17", fontSize: "18px", fontWeight: "800" }}>📝 광고배너자리</h3>
        <p style={{ fontSize: "14px", color: "#666", margin: 0 }}>일정 관리와 계획을 한 번에! 지금 바로 사용해보세요.</p>
      </div>

      {/* 설정 메뉴 그리드 */}
      <div className="settings-container" style={{ marginTop: "20px" }}>
        
        <div>
          <span className="section-title">서비스 설정</span>
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            <button onClick={() => router.push("/settings/keywords")} className="menu-card">
              <span>🔍 관심 키워드 알림 설정</span>
              <span style={{ color: "#CCC" }}>❯</span>
            </button>
          </div>
        </div>

        <div>
          <span className="section-title">정보 및 약관</span>
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            <button onClick={() => router.push("/settings/privacy")} className="menu-card">
              <span>📄 개인정보 처리방침</span>
              <span style={{ color: "#CCC" }}>❯</span>
            </button>
            <button onClick={() => router.push("/settings/terms")} className="menu-card">
              <span>⚖️ 이용약관</span>
              <span style={{ color: "#CCC" }}>❯</span>
            </button>
          </div>
        </div>

        <div className="full-width" style={{ marginTop: "20px" }}>
          <span className="section-title">계정 관리</span>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "15px" }}>
            <button onClick={handleLogout} className="menu-card" style={{ color: "#3182ce", border: "1px solid #ebf4ff" }}>
              <span>🚪 로그아웃</span>
            </button>

            <button onClick={handleDeleteAccount} className="menu-card" style={{ color: "#e53e3e", border: "1px solid #fff5f5" }}>
              <span>💔 회원 탈퇴</span>
            </button>
          </div>
        </div>

      </div>

      <div style={{ textAlign: "center", marginTop: "50px", color: "#A0AEC0", fontSize: "13px" }}>
        오이마켓 Version 1.0.0 🌱
      </div>
    </main>
  );
}