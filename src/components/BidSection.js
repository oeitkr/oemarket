"use client";

import { useState, useEffect } from 'react';
import { db, auth } from '../app/firebase'; 
import { doc, runTransaction } from 'firebase/firestore';

export default function BidSection({ id, currentPrice, onBidSuccess }) {
  const [displayPrice, setDisplayPrice] = useState(currentPrice || 0);
  const [myBidPrice, setMyBidPrice] = useState(0);

  // ✅ 1. 에러의 원인이었던 함수입니다. 반드시 이 위치에 있어야 합니다.
  const getStepAmount = (price) => {
    if (price < 10000) return 500;
    if (price < 100000) return 1000;
    if (price < 500000) return 5000;
    return 10000;
  };

  // 현재가 바뀌면 입찰가 자동 세팅
  useEffect(() => {
    const step = getStepAmount(currentPrice);
    setDisplayPrice(currentPrice);
    setMyBidPrice(currentPrice + step);
  }, [currentPrice]);

  const handleBid = async () => {
    // 아이폰 대응: 포커스 해제
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }

    const user = auth.currentUser;
    if (!user) return window.alert("로그인이 필요합니다.");
    
    if (myBidPrice <= displayPrice) {
      return window.alert(`현재가보다 높게 입찰해야 합니다!`);
    }
    
    // 아이폰 대응: 0.1초 뒤에 팝업 실행
    setTimeout(async () => {
      if (!window.confirm(`${myBidPrice.toLocaleString()}원에 입찰하시겠습니까?`)) return;

      // 📍 BidSection.js 의 handleBid 함수 내부 runTransaction 부분입니다.

      try {
        // 실제로 시간이 연장되었는지 확인하기 위한 변수
        let isExtended = false;

        // 1. 시간을 안전하게 변환하는 도우미 함수
        const getSafeDate = (timeData) => {
          if (!timeData) return null;
          if (typeof timeData.toDate === 'function') return timeData.toDate();
          return new Date(timeData);
        };

        await runTransaction(db, async (transaction) => {
          const itemRef = doc(db, "items", id);
          const itemDoc = await transaction.get(itemRef);
          if (!itemDoc.exists()) throw "삭제된 상품입니다.";
          
          const itemData = itemDoc.data();
          if (itemData.lastBidderUid === user.uid) throw "이미 최고 입찰자입니다. 🥒";

          const currentHighest = itemData.currentPrice || itemData.startPrice || 0;
          if (myBidPrice <= currentHighest) throw `다른 분이 먼저 입찰했습니다!`;

          // --- [🆕 3분 미만일 때 2분 연장 로직] ---
          const now = Date.now();
          const endTimeDate = getSafeDate(itemData.endTime);
          let newEndTime = itemData.endTime; // 기본값 유지

          if (endTimeDate) {
            const currentEndTimeMs = endTimeDate.getTime();
            const diff = currentEndTimeMs - now; 
            
            const triggerTime = 180 * 1000;   // 3분 (180초) 기준
            const extensionTime = 120 * 1000; // 2분 (120초) 연장

            // 브라우저 콘솔(F12)에서 남은 시간을 확인할 수 있습니다.
            console.log("남은 시간(초):", diff / 1000);

            // 📍 남은 시간이 3분(180,000ms)보다 작을 때만 실행
            if (diff > 0 && diff < triggerTime) {
              console.log("3분 미만 감지! 2분 연장합니다.");
              // 지금 기준이 아니라 '원래 마감 시간'에 2분을 더합니다.
              newEndTime = new Date(currentEndTimeMs + extensionTime);
              isExtended = true;
            }
          }
          // --- [연장 로직 끝] ---

          transaction.update(itemRef, {
            currentPrice: myBidPrice,
            lastBidderUid: user.uid,
            lastBidderNickname: user.displayName || "익명",
            bidCount: (itemData.bidCount || 0) + 1,
            endTime: newEndTime // 연장된 시간 적용
          });
        });
       
        
        // 🔔 [추가] 입찰 성공 후 판매자에게 알림 전송
        console.log("🔔 [입찰] 알림 전송 시작");
        
        try {
          // 1. 판매자 정보 가져오기
          const itemRef = doc(db, "items", id);
          const { getDoc } = await import("firebase/firestore");
          const itemSnap = await getDoc(itemRef);
          
          if (itemSnap.exists()) {
            const itemData = itemSnap.data();
            const sellerUid = itemData.sellerUid;
            const itemTitle = itemData.title;
            
            // 2. Firestore 알림 저장
            const { addDoc, collection, serverTimestamp } = await import("firebase/firestore");
            await addDoc(collection(db, "users", sellerUid, "notifications"), {
              type: "bid",
              title: "🔨 새로운 입찰 알림",
              text: `'${itemTitle}' 상품에 ${myBidPrice.toLocaleString()}원 입찰이 들어왔습니다!`,
              itemId: id,
              createdAt: serverTimestamp(),
              isRead: false
            });
            console.log("✅ [입찰] Firestore 알림 저장 완료");
            
            // 3. FCM 푸시 알림 전송
            const sellerDoc = await getDoc(doc(db, "users", sellerUid));
            const sellerToken = sellerDoc.data()?.fcmToken;
            
            console.log("🔍 [입찰] 판매자 FCM 토큰:", sellerToken ? "있음 ✅" : "없음 ❌");
            
            if (sellerToken) {
              console.log("📤 [입찰] FCM 알림 전송 시도...");
              const response = await fetch("/api/send-notification", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  tokens: [sellerToken],
                  title: "🔨 새로운 입찰 알림",
                  body: `'${itemTitle}' 상품에 새로운 입찰이 들어왔습니다!`,
                   data: { url: `/item/${id}`, type: "bid" } // 👈 type 추가!
                }),
              });
              
              const result = await response.json();
              console.log("📥 [입찰] FCM 응답:", result);
            }
          }
        } catch (notifError) {
          console.error("❌ [입찰] 알림 전송 실패:", notifError);
        }
        
        
        // 실제로 연장되었을 때만 다른 메시지를 보여줍니다.
        if (isExtended) {
          window.alert("🎉 입찰 성공! 마감 임박으로 시간이 2분 더 연장되었습니다.");
        } else {
          window.alert("🎉 입찰 성공!");
        }
        
        if (onBidSuccess) onBidSuccess(); 
      } catch (e) {
        window.alert(e.toString());
      }
    }, 100);
  };

  return (
    <div className="p-5 bg-white rounded-xl shadow-sm border-2 border-green-100" style={{ marginTop: "10px" }}>
      
      {/* 2. +/- 버튼 영역 (이제 getStepAmount가 정의되어 에러가 나지 않습니다) */}
      <div style={{ display: "flex", gap: "10px", marginBottom: "15px" }}>
        <button 
          type="button"
          onClick={() => setMyBidPrice(prev => Math.max(displayPrice + getStepAmount(displayPrice), prev - getStepAmount(displayPrice)))}
          style={{ flex: 1, padding: "15px", background: "#edf2f7", color: "#4a5568", borderRadius: "10px", border: "none", fontWeight: "bold", cursor: "pointer" }}
        >
          - {getStepAmount(displayPrice).toLocaleString()}원
        </button>
        <button 
          type="button"
          onClick={() => setMyBidPrice(prev => prev + getStepAmount(displayPrice))}
          style={{ flex: 1, padding: "15px", background: "#ebf8ff", color: "#3182ce", borderRadius: "10px", border: "none", fontWeight: "bold", cursor: "pointer" }}
        >
          + {getStepAmount(displayPrice).toLocaleString()}원
        </button>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: "10px", height: "56px" }}>
        <input 
          type="number"
          inputMode="numeric"
          value={myBidPrice}
          onChange={(e) => setMyBidPrice(Number(e.target.value))}
          disabled={displayPrice < 1000000}
          style={{ 
            flex: 1, height: "100%", border: "2px solid #e2e8f0", borderRadius: "10px", 
            padding: "0 15px", fontSize: "20px", fontWeight: "bold", textAlign: "right",
            backgroundColor: displayPrice < 1000000 ? "#f7fafc" : "white"
          }}
        />
        <button type="button" onClick={handleBid} style={{ height: "100%", background: "none", border: "none", cursor: "pointer", padding: "0 5px" }}>
          <img src="/images/cucumber-bid.png" alt="입찰" style={{ height: "100%", objectFit: "contain" }} />
        </button>
      </div>
      
      <p style={{ fontSize: "12px", color: "#a0aec0", marginTop: "10px", textAlign: "right" }}>
        {displayPrice < 1000000 
          ? "* 100만원 미만은 버튼으로만 조절 가능합니다." 
          : "* 원하는 금액을 직접 입력할 수 있습니다."}
      </p>
    </div>
  );
}