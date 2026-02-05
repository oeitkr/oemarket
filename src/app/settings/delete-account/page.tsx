"use client";

import { auth, db, messaging } from "../../firebase";
import { 
  deleteDoc, doc, collection, query, where, getDocs, 
  writeBatch, collectionGroup 
} from "firebase/firestore";
import { deleteToken } from "firebase/messaging";
import { useRouter } from "next/navigation";
import { deleteUser, signOut } from "firebase/auth";
import { useState } from "react";

export default function DeleteAccountPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false); // 🔥 추가

  const handleDeleteAccount = async () => {
    const user = auth.currentUser;
    if (!user) return router.push("/login");

    const finalConfirm = window.prompt('정말로 탈퇴하시려면 "탈퇴합니다"를 입력해주세요:');
    if (finalConfirm !== "탈퇴합니다") return;

    setIsLoading(true);

    try {
      console.log("🧹 오이 농장 데이터 대청소 시작...");
      const batch = writeBatch(db);

      // 1️⃣ [판매자 기록] 내가 주인인 물건(items) 찾기
      const myItemsQuery = query(collection(db, "items"), where("sellerUid", "==", user.uid));
      const myItemsSnapshot = await getDocs(myItemsQuery);
      
      console.log(`📦 내가 올린 물건: ${myItemsSnapshot.size}개`);
      
      for (const itemDoc of myItemsSnapshot.docs) {
        // 하위 컬렉션(messages)도 각각 찾아서 지우기
        const subMessages = await getDocs(collection(db, "items", itemDoc.id, "messages"));
        subMessages.forEach((msg) => batch.delete(msg.ref));
        // 부모 아이템 삭제
        batch.delete(itemDoc.ref);
      }

      // 2️⃣ [구매자 기록] 내가 마지막 입찰자(lastBidderUid)인 물건 처리
      const bidItemsQuery = query(collection(db, "items"), where("lastBidderUid", "==", user.uid));
      const bidItemsSnapshot = await getDocs(bidItemsQuery);
      
      console.log(`💰 내가 입찰한 물건: ${bidItemsSnapshot.size}개`);
      
      // 🔥 입찰자 정보를 "(탈퇴한 사용자)"로 변경
      bidItemsSnapshot.docs.forEach((itemDoc) => {
        batch.update(itemDoc.ref, {
          lastBidderUid: null,
          lastBidderNickname: "(탈퇴한 사용자)"
        });
      });

      // 3️⃣ [메시지 기록] 모든 곳에 내가 쓴 메시지(uid) 찾아 지우기
      const myAllMsgsQuery = query(collectionGroup(db, "messages"), where("uid", "==", user.uid));
      const myAllMsgsSnapshot = await getDocs(myAllMsgsQuery);
      
      console.log(`💬 내가 쓴 메시지: ${myAllMsgsSnapshot.size}개`);
      
      myAllMsgsSnapshot.docs.forEach((d) => batch.delete(d.ref));

      // 4️⃣ [알림 기록] 내 알림 삭제
      const notificationsQuery = collection(db, "users", user.uid, "notifications");
      const notificationsSnapshot = await getDocs(notificationsQuery);
      notificationsSnapshot.docs.forEach((notifDoc) => batch.delete(notifDoc.ref));

      console.log(`🔔 내 알림: ${notificationsSnapshot.size}개`);

      // 5️⃣ 내 프로필 삭제
      batch.delete(doc(db, "users", user.uid));

      // 6️⃣ DB 일괄 삭제 확정!
      await batch.commit();
      console.log("✅ 모든 Firestore 데이터 삭제 완료");

      // 7️⃣ FCM 토큰 무효화
      if (messaging) {
        try { 
          await deleteToken(messaging); 
          console.log("✅ FCM 토큰 삭제 완료");
        } catch (e) {
          console.log("⚠️ FCM 토큰 삭제 실패 (무시)");
        }
      }

      // 8️⃣ 계정 최종 삭제
      await deleteUser(user);
      console.log("✅ 계정 삭제 완료");

      alert("오이 농장에서 모든 정보가 삭제되었습니다. 이용해주셔서 감사합니다. 🌱");
      router.push("/");

    } catch (error: any) {
      console.error("❌ 탈퇴 중 에러:", error);

      if (error.code === "auth/requires-recent-login") {
        alert("🔒 보안상 다시 로그인한 직후에만 탈퇴가 가능합니다.");
        await signOut(auth);
        router.push("/login");
      } else {
        alert("탈퇴 처리 중 오류: " + error.message);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main style={{ padding: "40px 20px", maxWidth: "450px", margin: "0 auto", textAlign: "center" }}>
      <h2 style={{ color: "#e53e3e", fontSize: "24px", fontWeight: "bold", marginBottom: "20px" }}>회원 탈퇴</h2>
      
      <div style={{ background: "#fff5f5", padding: "20px", borderRadius: "15px", marginBottom: "30px", textAlign: "left", border: "1px solid #feb2b2" }}>
        <p style={{ color: "#c53030", fontWeight: "bold", marginBottom: "10px" }}>⚠️ 삭제되는 데이터</p>
        <ul style={{ fontSize: "13px", color: "#742a2a", lineHeight: "1.8", paddingLeft: "20px" }}>
          <li><b>내가 올린 물건</b>과 그 안의 대화 내역 전체</li>
          <li><b>다른 물건에 남긴 나의 모든 메시지</b></li>
          <li><b>입찰 기록</b>은 "(탈퇴한 사용자)"로 표시됨</li>
          <li><b>알림 내역</b> 전체</li>
          <li>이 작업은 취소할 수 없습니다</li>
        </ul>
      </div>

      <button 
        onClick={handleDeleteAccount} 
        disabled={isLoading}
        style={{ 
          width: "100%", 
          padding: "15px", 
          background: isLoading ? "#999" : "#e53e3e", 
          color: "white", 
          border: "none", 
          borderRadius: "12px", 
          fontWeight: "bold", 
          cursor: isLoading ? "not-allowed" : "pointer", 
          marginBottom: "10px" 
        }}
      >
        {isLoading ? "삭제 중..." : "모든 흔적을 지우고 탈퇴합니다"}
      </button>
      
      <button 
        onClick={() => router.back()} 
        disabled={isLoading}
        style={{ 
          width: "100%", 
          padding: "15px", 
          background: "#EDF2F7", 
          color: "#4A5568", 
          border: "none", 
          borderRadius: "12px", 
          fontWeight: "bold", 
          cursor: isLoading ? "not-allowed" : "pointer" 
        }}
      >
        취소
      </button>
    </main>
  );
}