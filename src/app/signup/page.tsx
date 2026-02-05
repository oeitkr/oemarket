"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createUserWithEmailAndPassword, updateProfile } from "firebase/auth";
import { auth, db, messaging } from "../firebase";
import { doc, setDoc, collection, query, where, getDocs, serverTimestamp, runTransaction } from "firebase/firestore";
import { getToken } from "firebase/messaging";

export default function SignupForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [nickname, setNickname] = useState("");
  const [termsAgreed, setTermsAgreed] = useState(false);
  const [privacyAgreed, setPrivacyAgreed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isGoogleUser, setIsGoogleUser] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState({
    hasMinLength: false,
    hasLetter: false,
    hasNumber: false,
    hasSpecial: false,
  });

  // 구글 로그인 사용자인지 확인
  useEffect(() => {
    const currentUser = auth.currentUser;
    if (currentUser) {
      const providerData = currentUser.providerData[0];
      if (providerData?.providerId === "google.com") {
        setIsGoogleUser(true);
        setEmail(currentUser.email || "");
      }
    }
  }, []);

  // 🔥 FCM 토큰 가져오기 함수 (권한 요청 포함!)
  const getFCMToken = async () => {
    try {
      if (typeof window !== "undefined" && messaging) {
        // 1. 알림 권한 요청
        const permission = await Notification.requestPermission();
        
        if (permission === "granted") {
          console.log("✅ 알림 권한 허용됨");
          const token = await getToken(messaging, { 
            vapidKey: "BHuHI1KEPSWfX_kToHuhYVNcUIhM04VpFsgqCQJ4uXK7vmgnKtcbjEQ9rLtpB5hTllzPHvC-LgsF8gXvm-fWSfQ" 
          });
          return token || null;
        } else {
          console.log("⚠️ 알림 권한 거부됨");
          return null;
        }
      }
      return null;
    } catch (error) {
      console.log("FCM 토큰 가져오기 실패:", error);
      return null;
    }
  };

  // 비밀번호 유효성 검사 함수
  const validatePassword = (pwd: string) => {
    const strength = {
      hasMinLength: pwd.length >= 8,
      hasLetter: /[a-zA-Z]/.test(pwd),
      hasNumber: /[0-9]/.test(pwd),
      hasSpecial: /[!@#$%^&*(),.?":{}|<>]/.test(pwd),
    };
    setPasswordStrength(strength);
    return Object.values(strength).every(Boolean);
  };

  // 비밀번호 입력 핸들러
  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const pwd = e.target.value;
    setPassword(pwd);
    validatePassword(pwd);
  };

  // 닉네임 중복 체크 함수
  const checkNicknameDuplicate = async (nickname: string) => {
    const q = query(
      collection(db, "users"),
      where("nickname", "==", nickname)
    );
    const snapshot = await getDocs(q);
    return !snapshot.empty;
  };
// 🔥 자동으로 '손님1, 손님2...' 닉네임을 만드는 함수
  const getNextGuestNickname = async () => {
    // metadata 라는 컬렉션의 userCounter 문서를 사용합니다.
    const counterRef = doc(db, "metadata", "userCounter");
    
    try {
      // 1. 숫자를 안전하게 하나 올리는 과정 (트랜잭션)
      const nextNumber = await runTransaction(db, async (transaction) => {
        const counterDoc = await transaction.get(counterRef);
        
        // 문서가 없으면 처음으로 1번을 만듭니다.
        if (!counterDoc.exists()) {
          transaction.set(counterRef, { count: 1 });
          return 1;
        }
        
        // 문서가 있으면 기존 번호에 1을 더합니다.
        const newCount = counterDoc.data().count + 1;
        transaction.update(counterRef, { count: newCount });
        return newCount;
      });
      
      return `손님${nextNumber}`; // 예: 손님5
    } catch (e) {
      console.error("닉네임 생성 실패:", e);
      // 에러가 나면 아주 큰 랜덤 숫자를 붙여서 겹치지 않게 방어합니다.
      return `손님${Math.floor(Math.random() * 100000)}`;
    }
  };
  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();

    // 1. 필수 약관 동의 체크
    if (!termsAgreed || !privacyAgreed) {
      alert("약관에 동의해주세요.");
      return;
    }

    // 2. 이메일 가입자인데 비밀번호가 서로 다르면 중단
    if (!isGoogleUser && password !== passwordConfirm) {
      alert("비밀번호가 일치하지 않습니다.");
      return;
    }

    setIsLoading(true);

    try {
      // 🔥 [핵심] 닉네임 결정 로직
      let finalNickname = nickname.trim();

      if (!finalNickname) {
        // 닉네임을 안 적었다면 자동으로 '손님N' 생성
        finalNickname = await getNextGuestNickname();
      } else {
        // 닉네임을 적었다면 형식 검사
        const nicknameRegex = /^[가-힣a-zA-Z0-9_]{2,10}$/;
        if (!nicknameRegex.test(finalNickname)) {
          alert("닉네임은 한글, 영문, 숫자, 언더바(_)만 2~10자 이내로 사용 가능합니다.");
          setIsLoading(false);
          return;
        }
        // 중복 체크
        const isDuplicate = await checkNicknameDuplicate(finalNickname);
        if (isDuplicate) {
          alert("이미 사용 중인 닉네임입니다.");
          setIsLoading(false);
          return;
        }
      }

      let user = auth.currentUser;

      // 3. 이메일 가입 진행 (구글 사용자가 아닐 때만)
      if (!isGoogleUser) {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        user = userCredential.user;
      }

      if (!user) throw new Error("사용자 정보를 가져올 수 없습니다.");

      // 4. 프로필에 닉네임 저장
      await updateProfile(user, { displayName: finalNickname });

      // 5. 알림 권한 및 FCM 토큰 처리
      let fcmToken = null;
      if (window.confirm("🎉 가입을 축하합니다!\n새 메시지 알림을 받으시겠어요?")) {
        fcmToken = await getFCMToken();
      }

      // 6. Firestore에 최종 사용자 정보 저장
      await setDoc(doc(db, "users", user.uid), {
        uid: user.uid,
        email: user.email,
        nickname: finalNickname, // ✨ 결정된 최종 닉네임 저장
        fcmToken: fcmToken,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      router.push("/list");
    } catch (error: any) {
      console.error("회원가입 오류:", error);
      alert("오류가 발생했습니다: " + (error.message || "다시 시도해주세요."));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex justify-center items-center min-h-screen bg-[#F7F8FA] py-10 px-4">
      {/* 폼 전체를 감싸는 세련된 카드박스 */}
      <div className="max-w-md w-full bg-white shadow-[0_8px_30px_rgb(0,0,0,0.04)] rounded-[32px] p-8 border border-gray-100">
        <h2 className="text-2xl font-bold mb-8 text-center text-gray-900 tracking-tight">
          {isGoogleUser ? "닉네임 설정" : "회원가입"}
        </h2>

        <form onSubmit={handleSignup} className="space-y-6">
          {/* 이메일 입력창 */}
          <div>
            <label className="block text-sm font-bold mb-2 text-gray-700 ml-1">이메일</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={isGoogleUser}
              placeholder="example@email.com"
              className={`w-full px-5 py-4 border rounded-2xl outline-none transition-all ${
                isGoogleUser 
                ? "bg-gray-50 text-gray-400 cursor-not-allowed border-gray-200" 
                : "border-gray-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-50"
              }`}
              required
            />
          </div>

          {/* 닉네임 입력창 */}
          <div>
            <label className="block text-sm font-bold mb-2 text-gray-700 ml-1">닉네임 (선택)</label>
            <input
              type="text"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              placeholder="안 적으시면 '손님N'이 됩니다"
              className="w-full px-5 py-4 border border-gray-200 rounded-2xl focus:border-blue-500 focus:ring-4 focus:ring-blue-50 outline-none transition-all"
            />
          </div>

          {/* 비밀번호 섹션 - 보이기 버튼이 칸 안으로 쏙! */}
          {!isGoogleUser && (
            <div className="space-y-5">
              <div className="relative">
                <label className="block text-sm font-bold mb-2 text-gray-700 ml-1">비밀번호</label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={handlePasswordChange}
                    placeholder="8자 이상, 영문·숫자·특수문자"
                    className="w-full pl-5 pr-14 py-4 border border-gray-200 rounded-2xl focus:border-blue-500 focus:ring-4 focus:ring-blue-50 outline-none transition-all"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-gray-400 hover:text-blue-600 transition-colors"
                  >
                    {showPassword ? "숨기기" : "보이기"}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold mb-2 text-gray-700 ml-1">비밀번호 확인</label>
                <input
                  type={showPassword ? "text" : "password"}
                  value={passwordConfirm}
                  onChange={(e) => setPasswordConfirm(e.target.value)}
                  placeholder="한 번 더 입력해주세요"
                  className="w-full px-5 py-4 border border-gray-200 rounded-2xl focus:border-blue-500 focus:ring-4 focus:ring-blue-50 outline-none transition-all"
                  required
                />
                {passwordConfirm && password !== passwordConfirm && (
                  <p className="mt-2 ml-1 text-xs text-red-500 font-medium">비밀번호가 서로 달라요! 확인해주세요.</p>
                )}
              </div>
            </div>
          )}

          {/* 약관 동의 - 깔끔한 정렬 박스 */}
          <div className="bg-gray-50 p-5 rounded-[24px] space-y-4 border border-gray-100">
            <label className="flex items-center space-x-3 cursor-pointer group">
              <input
                type="checkbox"
                checked={termsAgreed}
                onChange={(e) => setTermsAgreed(e.target.checked)}
                className="w-5 h-5 rounded-md border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
              />
              <span className="text-[14px] text-gray-600 group-hover:text-gray-900 font-medium">이용약관 동의 (필수)</span>
            </label>
            <label className="flex items-center space-x-3 cursor-pointer group">
              <input
                type="checkbox"
                checked={privacyAgreed}
                onChange={(e) => setPrivacyAgreed(e.target.checked)}
                className="w-5 h-5 rounded-md border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
              />
              <span className="text-[14px] text-gray-600 group-hover:text-gray-900 font-medium">개인정보처리방침 동의 (필수)</span>
            </label>
          </div>

          {/* 가입 완료 버튼 */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-blue-600 text-white py-5 rounded-2xl font-bold text-[16px] hover:bg-blue-700 active:scale-[0.98] transition-all disabled:bg-gray-300 shadow-lg shadow-blue-100"
          >
            {isLoading ? "처리 중..." : isGoogleUser ? "설정 완료" : "가입하기"}
          </button>
        </form>

        {!isGoogleUser && (
          <div className="mt-8 text-center text-sm text-gray-500">
            이미 계정이 있으신가요?{" "}
            <button 
              onClick={() => router.push("/login")} 
              className="text-blue-600 font-bold hover:underline ml-1"
            >
              로그인하기
            </button>
          </div>
        )}
      </div>
    </div>
  );
}