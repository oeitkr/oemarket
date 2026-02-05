"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  signInWithEmailAndPassword,
  onAuthStateChanged,
  getRedirectResult,
} from "firebase/auth";
import { auth, db } from "../firebase";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [status, setStatus] = useState("준비 중...");
  const isProcessing = useRef(false);

  useEffect(() => {
    let isMounted = true;
    let unsubscribe: (() => void) | undefined;

    const checkAuth = async () => {
      try {
        console.log("🔍 1. 인증 확인 시작...");
        
        // 리다이렉트 결과 확인
        const result = await getRedirectResult(auth);
        if (result) {
          console.log("✅ 리다이렉트 결과 있음:", result.user.email);
        } else {
          console.log("ℹ️ 리다이렉트 결과 없음 (처음 접속이거나 로그인 전)");
        }

        unsubscribe = onAuthStateChanged(auth, async (user) => {
          if (!isMounted) return;

          if (user && !isProcessing.current) {
            isProcessing.current = true;
            console.log("👤 2. 로그인된 사용자:", user.email);
            setStatus(`${user.email} 확인 중...`);

            try {
              const userRef = doc(db, "users", user.uid);
              console.log("📂 3. Firestore에서 사용자 정보 조회 중...");
              
              const userDoc = await getDoc(userRef);

              if (userDoc.exists()) {
                console.log("✅ 4. 기존 회원입니다! 데이터:", userDoc.data());
                setStatus(`${userDoc.data().nickname}님 환영합니다!`);
                if (isMounted) {
                  router.replace("/list");
                }
              } else {
                // 🔥 [수정] 구글 로그인인 경우 자동으로 Firestore에 저장
                const providerData = user.providerData[0];
                if (providerData?.providerId === "google.com") {
                  console.log("📝 4. 구글 신규 회원 - 자동 등록합니다.");
                  
                  await setDoc(userRef, {
                    uid: user.uid,
                    email: user.email,
                    nickname: user.displayName || "구글사용자",
                    createdAt: serverTimestamp(),
                    updatedAt: serverTimestamp(),
                  });
                  
                  setStatus(`${user.displayName}님 환영합니다!`);
                  if (isMounted) {
                    router.replace("/list");
                  }
                } else {
                  // 이메일 로그인인 경우에만 회원가입 페이지로
                  console.log("📝 4. 이메일 신규 회원 - 가입 페이지로 이동");
                  setStatus("가입 정보를 작성해주세요");
                  if (isMounted) {
                    router.replace("/signup");
                  }
                }
              }
            } catch (error: any) {
              console.error("❌ Firestore 조회 에러:", error);
              setStatus("데이터 조회 실패: " + error.message);
              isProcessing.current = false;
            }
          } else if (!user) {
            console.log("🔓 2. 로그인되지 않은 상태");
            setStatus("로그인이 필요합니다 🥒");
            isProcessing.current = false;
          }
        });
      } catch (error: any) {
        console.error("❌ 인증 확인 에러:", error);
        console.error("에러 코드:", error.code);
        console.error("에러 메시지:", error.message);
        setStatus("오류: " + error.message);
      }
    };

    checkAuth();

    // cleanup 함수
    return () => {
      isMounted = false;
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [router]);

  const handleGoogleLogin = async () => {
    if (isLoading) return;
    
    console.log("🔵 구글 로그인 버튼 클릭됨");
    setIsLoading(true);
    setStatus("구글 로그인 페이지로 이동 중...");

    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: "select_account" });

    
      try {
  const result = await signInWithPopup(auth, provider);   
  // 이 아래 코드는 실행되지 않습니다 (페이지가 이동되므로)
} catch (error: any) {
      console.error("❌ 구글 로그인 에러:", error);
      
      // 사용자가 팝업을 닫은 경우는 조용히 처리
      if (error.code === "auth/popup-closed-by-user" || 
          error.code === "auth/cancelled-popup-request") {
        console.log("ℹ️ 사용자가 로그인을 취소했습니다.");
        setStatus("로그인이 취소되었습니다.");
      } else {
        alert("로그인 실패: " + error.message);
        setStatus("로그인 실패");
      }
      
      setIsLoading(false);
    }
  };

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log("📧 이메일 로그인 시도:", email);
    setIsLoading(true);
    setStatus("로그인 중...");

    try {
      const result = await signInWithEmailAndPassword(auth, email, password);
      console.log("✅ 이메일 로그인 성공:", result.user.email);
    } catch (error: any) {
      console.error("❌ 이메일 로그인 에러:", error.code, error.message);
      alert("로그인 실패: " + error.message);
      setStatus("로그인 실패");
      setIsLoading(false);
    }
  };

  return (
    <main style={{ padding: 20, maxWidth: 420, margin: "50px auto", textAlign: "center" }}>
      <h1 style={{ fontSize: 24, fontWeight: "bold", marginBottom: 20 }}>오이 농장 🥒</h1>
      
      <div style={{ 
        marginBottom: 20, 
        padding: 15, 
        background: "#f0f7ff", 
        borderRadius: 10, 
        color: "#0056b3", 
        fontSize: 14 
      }}>
        {status}
      </div>

      <button 
        onClick={handleGoogleLogin} 
        disabled={isLoading} 
        style={googleButtonStyle}
      >
        <img 
          src="https://www.svgrepo.com/show/475656/google-color.svg" 
          alt="구글" 
          width={20} 
        />
        구글 계정으로 시작하기
      </button>

      <div style={{ margin: "20px 0", color: "#999" }}>또는</div>

      <form onSubmit={handleEmailLogin} style={{ 
        display: "flex", 
        flexDirection: "column", 
        gap: 10 
      }}>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="이메일"
          style={inputStyle}
          required
        />
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="비밀번호"
          style={inputStyle}
          required
        />
        <button type="submit" disabled={isLoading} style={submitButtonStyle}>
          {isLoading ? "처리 중..." : "로그인"}
        </button>
      </form>

      <p style={{ marginTop: 20, fontSize: 14 }}>
        계정이 없으신가요?{" "}
        <button
          onClick={() => router.push("/signup")}
          style={{
            color: "#3182ce",
            background: "none",
            border: "none",
            cursor: "pointer",
            textDecoration: "underline",
          }}
        >
          회원가입
        </button>
      </p>

      <div style={{ 
        marginTop: 30, 
        padding: 10, 
        background: "#fff3cd", 
        borderRadius: 5, 
        fontSize: 12,
        color: "#856404"
      }}>
        💡 F12를 눌러 Console 탭을 확인하면 더 자세한 로그를 볼 수 있어요
      </div>
    </main>
  );
}

const googleButtonStyle = {
  width: "100%",
  padding: 15,
  background: "white",
  border: "1px solid #ddd",
  borderRadius: 8,
  fontSize: 16,
  fontWeight: "bold" as const,
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 10,
};

const inputStyle = {
  padding: 15,
  fontSize: 16,
  border: "1px solid #ddd",
  borderRadius: 8,
};

const submitButtonStyle = {
  padding: 15,
  background: "#3182ce",
  color: "white",
  border: "none",
  borderRadius: 8,
  fontSize: 16,
  fontWeight: "bold" as const,
  cursor: "pointer",
};