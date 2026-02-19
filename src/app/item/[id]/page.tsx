"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Script from "next/script";
import { db, auth } from "../../firebase";
import { doc, updateDoc, setDoc, deleteDoc, onSnapshot, getDoc, runTransaction, serverTimestamp, increment, addDoc, collection } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import BidSection from '../../../components/BidSection';
import { BottomNav } from "../../../components/BottomNav";
// 헬퍼 함수: 날짜 변환
const getSafeDate = (timeData: any): Date | null => {
  if (!timeData) return null;
  if (typeof timeData.toDate === 'function') return timeData.toDate();
  return new Date(timeData);
};

export default function ItemDetailPage() {
  const [isMapLoaded, setIsMapLoaded] = useState(false);
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  // 📍 상세 페이지 파일 안쪽에 이 계산기를 넣어주세요
  const getStepAmount = (price: number) => {
    if (price < 10000) return 500;
    if (price < 100000) return 1000;
    if (price < 500000) return 5000;
    return 10000; // 50만원 이상은 1만원씩!
  };
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [meUid, setMeUid] = useState<string | null>(null);
  const [isLiked, setIsLiked] = useState(false);
  const [flashColor, setFlashColor] = useState("white");
  const [timeLeft, setTimeLeft] = useState<string>("계산 중...");
  const [isExpired, setIsExpired] = useState(false);
  const [isViewerOpen, setIsViewerOpen] = useState(false);
  const [viewerIndex, setViewerIndex] = useState(0);
  const [mildangBidPrice, setMildangBidPrice] = useState(0);
  const [sellerPhoto, setSellerPhoto] = useState<string | null>(null);
  const [isSellerPhotoOpen, setIsSellerPhotoOpen] = useState(false);

  // 2. 현재 가격을 안전하게 가져오는 변수 (위치를 위로 올렸습니다)
  const displayPrice = data?.currentPrice ?? data?.startPrice ?? 0;

  // 3. 상품 데이터가 들어오면 입찰 예정가를 자동으로 세팅
  useEffect(() => {
    if (data) {
      // 현재가에 한 단계를 더한 금액을 입찰 초기값으로 세팅
      setMildangBidPrice(displayPrice + getStepAmount(displayPrice));
    }
  }, [data, displayPrice]);


  // 1. 로그인 확인
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      setMeUid(user ? user.uid : null);
    });
    return () => unsub();
  }, []);

 // ... (위쪽 1. 로그인 확인 코드 생략)

  // 2. [최종 수정] 지도가 그려질 때까지 0.3초마다 끈질기게 확인하여 지도를 그립니다.
  useEffect(() => {
    const initMap = () => {
      const mapElement = document.getElementById("map");
      // @ts-ignore
      const naver = window.naver;

      // ... (약 72라인)
      // 🥒 [수정] 데이터가 location이라는 보관함 안에 있는지 먼저 확인합니다.
      const lat = data?.location?.latitude || data?.latitude;
      const lng = data?.location?.longitude || data?.longitude;

      if (lat && lng && naver?.maps && mapElement) {
        
        // 숫자로 안전하게 변환합니다.
        const finalLat = Number(lat);
        const finalLng = Number(lng);

        const mapOptions = {
          center: new naver.maps.LatLng(finalLat, finalLng),
          zoom: 14,
        };
        const map = new naver.maps.Map("map", mapOptions);

        // 디자인 로직 (파란색 원 유지)
        const offsetLat = (Math.random() - 0.5) * 0.0015;
        const offsetLng = (Math.random() - 0.5) * 0.0015;
        const blurredLocation = new naver.maps.LatLng(finalLat + offsetLat, finalLng + offsetLng);

        new naver.maps.Circle({
          map: map, center: blurredLocation, radius: 500,
          fillColor: '#3182ce', fillOpacity: 0.2, strokeColor: '#3182ce',
          strokeOpacity: 0.4, strokeWeight: 2, clickable: false
        });
// ... (이하 생략)
        console.log("✅ 새로고침 없이 지도 연결 성공!");
      } else {
        // ⏳ 아직 하나라도 준비가 안 됐다면(특히 로딩 중이라 그릇이 없으면) 0.3초 뒤에 다시 시도합니다.
        setTimeout(initMap, 300);
      }
    };

    initMap();
  }, [data, loading]); // 🥒 체크리스트에 'loading'을 추가하여 로딩 화면이 사라지는 순간 지도를 그리게 합니다.

// ... (아래쪽 5. 자동 재등록 로직 생략)

  // 📍 5. 자동 재등록 로직 (입찰자 없을 때 시간 연장)
  useEffect(() => {
    if (!data || data.status !== "active") return;

    const now = new Date();
    const endTime = getSafeDate(data.endTime);

    // 조건: 마감시간 지남 + 입찰자 0명 + 재등록 횟수 남음
    if (endTime && now > endTime && (data.bidCount || 0) === 0 && (data.relistCount || 0) > 0) {
      const itemRef = doc(db, "items", id);

      updateDoc(itemRef, {
        // 원래 설정했던 시간(durationMin)만큼 다시 늘려줍니다.
        endTime: new Date(Date.now() + (data.durationMin || 1440) * 60 * 1000),
        relistCount: data.relistCount - 1, // 횟수 하나 까기
        createdAt: serverTimestamp(), // 등록 시간도 지금으로 갱신
      }).then(() => {
        alert("입찰자가 없어 경매가 자동으로 연장되었습니다! 🥒");
      });
    }
  }, [data, id]);

  // 3. 상품 데이터 실시간 감시 (onSnapshot)
  useEffect(() => {
    if (!id) return;
    const itemRef = doc(db, "items", id);
    const unsubItem = onSnapshot(itemRef, async (snap) => { // 🥒 async를 추가했습니다.
      if (snap.exists()) {
        const item = snap.data();
        setData(item);
        console.log("아이템 데이터 확인:", item); // 👈 이 코드를 추가해 주세요!

        // 🥒 [추가] 판매자 아이디(sellerUid)로 유저 정보를 찾아 사진 주소를 가져옵니다.
        if (item.sellerUid) {
            const userSnap = await getDoc(doc(db, "users", item.sellerUid));
            if (userSnap.exists()) {
                setSellerPhoto(userSnap.data().photoURL || null);
            }
        }
      } else {
        alert("존재하지 않는 상품입니다.");
        router.replace("/list");
      }
      setLoading(false);
    });

    let unsubLike = () => { };
    if (meUid) {
      const likeRef = doc(db, "users", meUid, "watchlist", id);
      unsubLike = onSnapshot(likeRef, (docSnap) => {
        setIsLiked(docSnap.exists());
      });
    }
    return () => { unsubItem(); unsubLike(); };
  }, [id, meUid, router]);

  // 4. 타이머 로직 (즉시구매 시 시계가 멈추도록 수정)
  useEffect(() => {
    if (!data || data.type === "fixed" || !data.endTime || data.status === "예약중" || data.status === "sold") {
      if (data?.status === "예약중") setTimeLeft("예약됨");
      if (data?.status === "sold") setTimeLeft("판매완료");
      return;
    }
    const targetDate = getSafeDate(data.endTime);
    if (!targetDate) return;
    const tick = () => {
      const now = new Date();
      const diff = targetDate.getTime() - now.getTime();
      if (diff <= 0) {
        setIsExpired(true);
        setTimeLeft("마감됨");
        return;
      }
      const hours = Math.floor((diff / (1000 * 60 * 60)));
      const minutes = Math.floor((diff / (1000 * 60)) % 60);
      const seconds = Math.floor((diff / 1000) % 60);
      setTimeLeft(`${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`);
    };
    const timerId = setInterval(tick, 1000);
    return () => clearInterval(timerId);
  }, [data]);

  const toggleLike = async () => {
    if (!meUid) return alert("로그인이 필요합니다.");
    const likeRef = doc(db, "users", meUid, "watchlist", id);
    const itemRef = doc(db, "items", id); // 🆕 상품 문서 위치 정보 추가

    try {
      if (isLiked) {
        // 이미 찜 상태라면? 삭제!
        await deleteDoc(likeRef);
        await updateDoc(itemRef, { wishCount: increment(-1) }); // 🆕 찜 숫자 -1
      } else {
        // 찜 안 된 상태라면? 추가!
        await setDoc(likeRef, {
          title: data.title,
          currentPrice: data.currentPrice || data.startPrice,
          images: data.images,
          createdAt: Date.now()
        });
        await updateDoc(itemRef, { wishCount: increment(1) }); // 🆕 찜 숫자 +1
      }
    } catch (e) {
      console.error(e);
    }
  };

  // 📍 입찰 함수: 5분 미만일 때 입찰 시 2분 연장 로직 적용
  // 📍 ItemDetailPage (app/item/[id]/page.tsx) 파일 내의 함수를 찾으세요.

  const handlePriceUpdate = async (targetPrice: number) => {
    alert("🔔 입찰 함수 실행됨!"); // 테스트용
    if (!meUid) return alert("로그인이 필요합니다.");

    if (isExpired || data?.status !== "active") {
      return alert("이미 예약되었거나 종료된 경매입니다.");
    }

    // 🥒 [추가] 밀당 경매일 때 최소 희망가(minPrice) 이하 입찰 차단 로직
    if (data?.isMinusAuction && data?.minPrice) {
      if (targetPrice < data.minPrice) {
        return alert(`이 상품의 최소 희망가는 ${data.minPrice.toLocaleString()}원입니다. 그 이하로는 입찰할 수 없습니다. 🥒`);
      }
    }

    if (!window.confirm(`${targetPrice.toLocaleString()}원에 입찰하시겠습니까?`)) return;

    try {
      const itemRef = doc(db, "items", id);
      setFlashColor("#fff5f5");
      setTimeout(() => setFlashColor("white"), 500);

      // 1️⃣ [DB 업데이트] 먼저 물건 가격을 올립니다.
      await runTransaction(db, async (transaction) => {
        const itemDoc = await transaction.get(itemRef);
        if (!itemDoc.exists()) throw "존재하지 않는 상품입니다.";
        const itemData = itemDoc.data();

        if (itemData.lastBidderUid === meUid) throw "이미 현재 최고 입찰자입니다. 🥒";

        // --- [밀당경매 연장 로직] ---
        const now = Date.now();
        const currentEndTime = getSafeDate(itemData.endTime)?.getTime() || 0;
        let newEndTime = itemData.endTime;

        if (currentEndTime > 0) {
          const diff = currentEndTime - now;
          const triggerTime = 180 * 1000;   // 3분 기준
          const extensionTime = 120 * 1000; // 2분 연장

          if (diff > 0 && diff < triggerTime) {
            newEndTime = new Date(currentEndTime + extensionTime);
          }
        }

        transaction.update(itemRef, {
          currentPrice: targetPrice,
          bidCount: (itemData.bidCount || 0) + 1,
          lastBidderUid: meUid,
          lastBidderNickname: auth.currentUser?.displayName || "익명",
          endTime: newEndTime,
        });
      });

     // 2️⃣ [성공 지점] 가격 올리기가 성공했으니, 이제 판매자에게 알립니다!
      
      console.log("🔔 [입찰] 알림 전송 시작 - 판매자 UID:", data.sellerUid);
      
      // (A) 마이페이지 알림 목록에 저장
      await addDoc(collection(db, "users", data.sellerUid, "notifications"), {
        type: "bid",
        title: "🔨 새로운 입찰 알림",
        text: `'${data.title}' 상품에 ${targetPrice.toLocaleString()}원 입찰이 들어왔습니다!`,
        itemId: id,
        createdAt: serverTimestamp(),
        isRead: false
      });
      console.log("✅ [입찰] Firestore 알림 저장 완료");

      // (B) 판매자 핸드폰에 푸시 알림(카톡처럼) 쏘기
      const sellerDoc = await getDoc(doc(db, "users", data.sellerUid));
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
            body: `'${data.title}' 상품에 새로운 입찰이 들어왔습니다!`,
             data: { url: `/item/${id}`, type: "bid" } // 👈 type 추가!
          }),
        });
        
        const result = await response.json();
        console.log("📥 [입찰] FCM 응답:", result);
      } else {
        console.error("❌ [입찰] 판매자 FCM 토큰이 없어서 푸시 알림을 보낼 수 없습니다");
      }

      // 3️⃣ 최종 성공 메시지
      alert("🎉 입찰 완료! (마감 임박 시 시간이 연장됩니다)");

    } catch (e: any) {
      // ❌ [실패 지점] 입찰 중 에러가 나면 알림을 보내지 않고 여기로 점프합니다.
      console.error("입찰 에러 상세:", e);
      alert(typeof e === 'string' ? e : "처리 실패");
    }
  };

  // 📍 즉시구매 함수: 상태 변경 및 타이머 종료(endTime 업데이트) 반영
  const handleBuyNow = async (targetPrice: number) => {
    if (!meUid) return alert("로그인이 필요합니다.");
    if (isExpired || data?.status !== "active") return alert("종료된 상품입니다.");
    if (!window.confirm(`${targetPrice.toLocaleString()}원에 즉시 구매하시겠습니까?\n구매 시 상품이 '예약중' 상태로 변경됩니다.`)) return;

    try {
      const itemRef = doc(db, "items", id);
      await runTransaction(db, async (transaction) => {
        const itemDoc = await transaction.get(itemRef);
        if (!itemDoc.exists()) throw "존재하지 않는 상품입니다.";

        transaction.update(itemRef, {
          currentPrice: targetPrice,
          lastBidderUid: meUid,
          lastBidderNickname: auth.currentUser?.displayName || "익명",
          status: "예약중", // 예약중으로 변경하여 입찰 버튼 숨김
          isSold: true,
          endTime: new Date(), // 타이머를 즉시 0으로 만듦
          bidCount: (itemDoc.data().bidCount || 0) + 1
        });
      });
      // 🔔 판매자에게 실시간 판매 알림 보내기
      await addDoc(collection(db, "users", data.sellerUid, "notifications"), {
        type: "sold",
        title: "🎉 상품 판매 완료!",
        text: `'${data.title}' 상품이 ${targetPrice.toLocaleString()}원에 즉시구매되었습니다. 채팅을 확인해 보세요!`,
        itemId: id,
        createdAt: serverTimestamp(),
        isRead: false
      });
      // 🔔 [추가] 판매자에게 진짜 '푸시 알림' 쏘기
      const sellerDoc = await getDoc(doc(db, "users", data.sellerUid));
      const sellerToken = sellerDoc.data()?.fcmToken;

      if (sellerToken) {
        await fetch("/api/send-notification", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            tokens: [sellerToken],
            title: "🎉 상품 판매 완료!",
            body: `'${data.title}' 상품이 즉시구매되었습니다.`,
            data: { url: `/item/${id}` } 
          }),
        });
      }
      
      // ✅ 팝업을 먼저 띄워서 브라우저의 허락을 받습니다.
openChatPopup(); 
alert("🎉 즉시 구매 예약이 완료되었습니다! 판매자와 채팅을 시작하세요.");
    } catch (e: any) {
      alert(typeof e === 'string' ? e : "처리 실패");
    }
  };


  const handleRestartAuction = async () => {
    if (!window.confirm("구매자가 취소했나요? 예약을 취소하고 재판매를 시작하시겠습니까?")) return;

    try {
      const itemRef = doc(db, "items", id);
      await updateDoc(itemRef, {
        status: "active",
        isSold: false,
        // 🟢 시간을 다시 설정 (기존 설정 시간만큼 현재부터 연장)
        endTime: new Date(Date.now() + (data.durationMin || 1440) * 60 * 1000),
      });
      alert("재판매가 시작되었습니다! 이제 다시 입찰이 가능합니다. 🥒");
    } catch (e) {
      console.error(e);
      alert("처리 중 오류가 발생했습니다.");
    }
  };
  const handleComplete = async () => {
  if (!window.confirm("거래가 완료되었나요? 판매완료 처리하시겠습니까?")) return;

  try {
    const itemRef = doc(db, "items", id);
    await updateDoc(itemRef, {
      status: "completed",
      isSold: true,
    });
    alert("판매 완료 처리되었습니다! 🎉");
  } catch (e) {
    console.error(e);
    alert("처리 중 오류가 발생했습니다.");
  }
};
const handleSetReserved = async () => {
  if (!window.confirm("이 상품을 예약중으로 변경하시겠습니까?")) return;

  try {
    const itemRef = doc(db, "items", id);
    await updateDoc(itemRef, {
      status: "예약중",
    });
    alert("예약중으로 변경되었습니다! 🥒");
  } catch (e) {
    console.error(e);
    alert("처리 중 오류가 발생했습니다.");
  }
};
  // 📍 원래 있던 삭제 함수를 제대로 닫아주는 코드입니다.
  const handleDelete = async () => {
    if (data.bidCount > 0) return alert("참여자가 있어 삭제할 수 없습니다.");
    if (confirm("정말 삭제하시겠습니까?")) {
      await deleteDoc(doc(db, "items", id));
      router.replace("/list");
    }
  };
  const handleReport = async () => {
    if (!meUid) return alert("로그인이 필요합니다.");
    const reason = window.prompt("신고 사유를 입력해주세요");
    if (!reason) return;
    const { addDoc, collection, serverTimestamp } = await import("firebase/firestore");
    await addDoc(collection(db, "reports"), {
      reporterUid: meUid, reportedUid: data.sellerUid, reason, itemId: id, createdAt: serverTimestamp(),
    });
    alert("신고가 접수되었습니다.");
  };

  const handleBlock = async () => {
    if (!meUid) return alert("로그인이 필요합니다.");
    if (!confirm(`${data.sellerNickname}님을 차단하시겠습니까?`)) return;
    const { updateDoc, doc, arrayUnion } = await import("firebase/firestore");
    await updateDoc(doc(db, "users", meUid), { blockedUsers: arrayUnion(data.sellerUid) });
    alert("차단되었습니다.");
    router.replace("/list");
  };

  const openChatPopup = () => {
    const w = 450; const h = 650;
    const left = (window.screen.width / 2) - (w / 2);
    const top = (window.screen.height / 2) - (h / 2);
    window.open(`/chat/${id}`, '_blank', `width=${w},height=${h},left=${left},top=${top}`);
  };

  if (loading || !data) return <div style={{ padding: 50, textAlign: "center" }}>로딩 중...</div>;

  const isOwner = meUid === data.sellerUid;

  const isAuction = data.type === "auction";

  return (
    <>
   
      {/* 🥒 [수정됨] 지도가 다 불려오면 'isMapLoaded'를 true로 바꿔주는 스위치를 달았습니다! */}
      <Script
        src={`https://openapi.map.naver.com/openapi/v3/maps.js?ncpClientId=${process.env.NEXT_PUBLIC_NAVER_MAP_CLIENT_ID}`}
        onLoad={() => setIsMapLoaded(true)} 
      />
      <main style={{ padding: "15px 10px", maxWidth: 800, margin: "0 auto", paddingBottom: 100, background: "#fff", minHeight: "100vh" }}>

        {/* 1. 상단 제목 영역 */}
        <div style={{ marginBottom: 15 }}>
          <div style={{ marginBottom: 6 }}>
            {data.status === "completed" ? (
  <span style={{ background: "#718096", color: "white", padding: "3px 8px", borderRadius: 4, fontSize: 11, fontWeight: "bold" }}>✅ 판매완료</span>
) : data.status === "예약중" ? (
  <span style={{ background: "#ed8936", color: "white", padding: "3px 8px", borderRadius: 4, fontSize: 11, fontWeight: "bold" }}>🕒 예약중</span>
            ) : data.isMinusAuction ? (
              <span style={{ background: "#e53e3e", color: "white", padding: "3px 8px", borderRadius: 4, fontSize: 11, fontWeight: "bold" }}>🔥 밀당경매</span>
            ) : isAuction ? (
              <span style={{ background: "#3CB371", color: "white", padding: "3px 8px", borderRadius: 4, fontSize: 11, fontWeight: "bold" }}>🔨 일반경매</span>
            ) : (
              <span style={{ background: "#4A5568", color: "white", padding: "3px 8px", borderRadius: 4, fontSize: 11, fontWeight: "bold" }}>🛍️ 일반판매</span>
            )}
          </div>
          <h1 style={{ fontSize: 22, fontWeight: "bold", color: "#333" }}>{data.title}</h1>
        </div>

        {/* 2. 메인 컨텐츠 (Flex 컨테이너) */}
        <div style={{ display: "flex", gap: "20px", flexWrap: "wrap", marginBottom: "15px" }}>

          {/* 왼쪽: 이미지 및 설명 */}
          <div style={{ flex: "1.2", minWidth: "300px" }}>
            <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 10 }}>
              {data.images && data.images.length > 0 ? (
                data.images.map((src: string, idx: number) => (
                  <div
                    key={idx}
                    style={{
                      width: "100%",
                      minWidth: "100%",
                      height: "350px",
                      backgroundColor: "#f0f0f0", // 로딩 전 기본 배경색
                      borderRadius: "16px",
                      overflow: "hidden",
                      position: "relative", // 배경을 겹치기 위해 필요
                      display: "flex",
                      justifyContent: "center",
                      alignItems: "center",
                      flexShrink: 0
                    }}
                  >
                    {/* 1. 배경용 이미지: 흐릿하게(Blur) 처리해서 여백을 채움 */}
                    <div
                      style={{
                        position: "absolute",
                        top: 0, left: 0, right: 0, bottom: 0,
                        backgroundImage: `url(${src})`,
                        backgroundSize: "cover",
                        backgroundPosition: "center",
                        filter: "blur(15px) brightness(0.7)", // 15만큼 흐리게, 조금 어둡게
                        transform: "scale(1.1)", // 끝부분 하얀 테두리 방지
                        zIndex: 0
                      }}
                    />

                    {/* 2. 실제 이미지: 원본 비율 유지하며 축소 (안 잘림) */}
                    <img
                      src={src}
                      onClick={() => { setViewerIndex(idx); setIsViewerOpen(true); }}
                      style={{
                        maxWidth: "100%",
                        maxHeight: "100%",
                        objectFit: "contain",
                        cursor: "pointer",
                        position: "relative", // 배경 위로 올라오게
                        zIndex: 1,
                        boxShadow: "0 0 20px rgba(0,0,0,0.3)" // 사진과 배경 구분용 그림자
                      }}
                      alt="상품"
                    />
                  </div>
                ))
              ) : (
                <div style={{
                  width: "100%", height: "300px", display: "flex", flexDirection: "column",
                  justifyContent: "center", alignItems: "center", background: "#FFFFFF",
                  borderRadius: "16px", border: "1px solid #edf2f7", color: "#CBD5E0"
                }}>
                  <span style={{ fontSize: "50px", marginBottom: "12px" }}>📸</span>
                  <div style={{ fontSize: "15px", fontWeight: "500" }}>등록된 이미지가 없습니다.</div>
                </div>
              )}
            </div>

            {/* 🆕 조회수 및 찜 수 표시 줄 */}
            <div style={{ display: "flex", gap: "15px", padding: "12px 5px", fontSize: "14px", color: "#718096", borderBottom: "1px solid #f0f0f0", marginBottom: "5px" }}>
              <span>👀 조회 {data?.viewCount || 0}</span>
              <span>🧡 관심 {data?.wishCount || 0}</span>
            </div>

            <div style={{ marginTop: 15, padding: "15px", background: "#f0f0f0", borderRadius: "16px", color: "#444", lineHeight: "1.5", whiteSpace: "pre-wrap", fontSize: "15px" }}>
              {data.description}
            </div>
          </div>

          {/* 오른쪽: 정보 및 버튼 */}
          <div style={{ flex: "1", minWidth: "280px", display: "flex", flexDirection: "column", gap: "10px" }}>

            {/* 판매자 정보창 */}
            <div style={{ padding: "8px 15px", border: "1px solid #eee", borderRadius: "12px", display: "flex", alignItems: "center", justifyContent: "space-between", background: "white" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
    {/* 📸 동그란 사진 칸 */}
    <div 
      onClick={() => { if(sellerPhoto) setIsSellerPhotoOpen(true); }}
      style={{ 
        width: "35px", height: "35px", borderRadius: "50%", background: "#F7FAFC", 
        overflow: "hidden", display: "flex", justifyContent: "center", alignItems: "center",
        border: "1px solid #E2E8F0", cursor: sellerPhoto ? "pointer" : "default"
      }}
    >
      {sellerPhoto ? (
        <img src={sellerPhoto} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
      ) : (
        <img src="https://cdn-icons-png.flaticon.com/512/149/149071.png" style={{ width: "100%", height: "100%", objectFit: "cover", opacity: 0.5 }} />
      )}
    </div>
    
    {/* 🏷️ 원래 있던 닉네임 (아이콘 👤 만 뺐어요!) */}
    <span style={{ fontWeight: "bold", fontSize: "14px" }}>{data.sellerNickname || "판매자"}님</span>
  </div>
              {!isOwner && (
                <div style={{ display: "flex", gap: "4px" }}>
                  <button onClick={handleReport} style={{ padding: "2px 5px", fontSize: "10px", background: "#fff5f5", border: "1px solid #feb2b2", borderRadius: "4px", color: "#e53e3e" }}>신고</button>
                  <button onClick={handleBlock} style={{ padding: "2px 5px", fontSize: "10px", background: "#f7fafc", border: "1px solid #e2e8f0", borderRadius: "4px", color: "#4a5568" }}>차단</button>
                </div>
              )}
            </div>

            {!isOwner && (
  <button 
    onClick={() => {
      if (data.lastBidderUid !== meUid) {
        return alert("입찰 후에 대화할 수 있습니다! 🥒");
      }
      openChatPopup();
    }}
    disabled={data.lastBidderUid !== meUid}
    style={{ 
      width: "100%", 
      padding: "10px", 
      background: data.lastBidderUid !== meUid ? "#E0D7C6" : ((data.status === "예약중" && data.lastBidderUid === meUid) ? "#3182ce" : "#3CB371"), 
      color: "white", 
      border: "none", 
      borderRadius: "10px", 
      fontWeight: "bold", 
      fontSize: "14px", 
      cursor: data.lastBidderUid !== meUid ? "not-allowed" : "pointer",
      opacity: data.lastBidderUid !== meUid ? 0.5 : 1
    }}
  >
    💬 {data.lastBidderUid !== meUid ? "입찰 후 대화 가능" : `${data.sellerNickname}님과 대화하기`}
  </button>
)}

            {/* 가격 카드 */}
            <div style={{ padding: "15px 20px", background: flashColor, borderRadius: "16px", border: "1px solid #edf2f7", position: "relative" }}>
              {/* 🧡 여기에 하트 버튼을 넣습니다! */}
              <button
                onClick={toggleLike}
                style={{ position: "absolute", top: "15px", right: "15px", background: "none", border: "none", fontSize: "24px", cursor: "pointer" }}
              >
                {isLiked ? "🧡" : "🤍"}
              </button>
              
              {/* ---------------- 수정 후 코드 시작 ---------------- */}
<div style={{ padding: "15px 20px", background: flashColor, borderRadius: "16px", border: "1px solid #edf2f7" }}>
  
  {/* 1. 경매 상태 (경매 종료 문구 등) */}
  {isAuction && (
    <div style={{ fontSize: "14px", color: data.status === "예약중" ? "#ed8936" : "#e53e3e", fontWeight: "bold", marginBottom: "12px" }}>
      {data.status === "예약중" ? "🕒 예약 완료" : (!isExpired ? `⏱ ${timeLeft}` : "⏳ 경매 종료")}
    </div>
  )}

  {/* 2. 최고가 안내 */}
  <div style={{ color: "#718096", fontSize: "13px", fontWeight: "bold", marginBottom: "2px" }}>
    {isAuction ? "현재 최고가" : "판매 가격"}
  </div>

  {/* 3. 금액과 시작가를 한 줄에 배치 */}
  <div style={{ display: "flex", alignItems: "baseline", gap: "10px" }}>
    {/* 현재 금액 */}
    <div style={{ fontSize: "28px", fontWeight: "900", color: "#2d3748" }}>
      {displayPrice.toLocaleString()}원
    </div>

    {/* 금액 바로 옆 시작가 */}
    {(isAuction || data.isMinusAuction) && (
      <div style={{ fontSize: "12px", color: "#A0AEC0", fontWeight: "normal" }}>
        (시작가 {data.startPrice?.toLocaleString()}원)
      </div>
    )}
  </div>
</div>
{/* ---------------- 수정 후 코드 끝 ---------------- */}

              {!isOwner && isAuction && !isExpired && data.status === "active" && data.buyNowPrice && (
                <button
                  onClick={() => handleBuyNow(Number(String(data.buyNowPrice).replace(/[^0-9]/g, "")))}
                  style={{ width: "100%", padding: "12px", background: "#f6ad55", color: "white", border: "none", borderRadius: "10px", fontWeight: "bold", fontSize: "15px", marginTop: "10px", cursor: "pointer" }}
                >
                  💰 {Number(String(data.buyNowPrice).replace(/[^0-9]/g, "")).toLocaleString()}원에 즉시 구매
                </button>
              )}

              {isOwner && (
  <div style={{ marginTop: "10px", display: "flex", flexDirection: "column", gap: "8px" }}>
    {/* 판매완료 상태 */}
    {data.status === "completed" && (
      <div style={{ padding: "15px", background: "#F7FAFC", borderRadius: "10px", textAlign: "center", color: "#718096", fontWeight: "bold" }}>
        ✅ 거래가 완료되었습니다
      </div>
    )}
    
    {/* 예약중 상태 */}
    {data.status === "예약중" && (
      <>
        <button onClick={openChatPopup} style={{ width: "100%", padding: "10px", background: "#3182ce", color: "white", border: "none", borderRadius: "10px", fontWeight: "bold", fontSize: "14px" }}>💬 구매자와 대화</button>
        <button onClick={handleComplete} style={{ width: "100%", padding: "10px", background: "#3CB371", color: "white", border: "none", borderRadius: "10px", fontWeight: "bold", fontSize: "14px" }}>✅ 판매 완료</button>
        <button onClick={handleRestartAuction} style={{ width: "100%", padding: "8px", background: "#fff", color: "#e53e3e", border: "1px solid #e53e3e", borderRadius: "10px", fontSize: "13px" }}>🚫 예약 취소</button>
      </>
    )}

                  {/* 🥒 [수정] 예약중으로 변경 버튼 - 입찰자가 있거나 즉시구매 시 */}
{data.status !== "예약중" && data.status !== "completed" && (
  data.bidCount > 0 || // 입찰자 있음
  data.isSold // 즉시구매 완료
) && (
      <button 
        onClick={handleSetReserved} 
        style={{ 
          width: "100%", 
          padding: "10px", 
          background: "#ed8936", 
          color: "white", 
          border: "none", 
          borderRadius: "10px", 
          fontWeight: "bold", 
          fontSize: "14px",
          cursor: "pointer"
        }}
      >
        🕒 예약중으로 변경
      </button>
    )}
                  {/* 📍 수정/삭제 버튼 영역: 입찰자가 있으면 막는 로직 추가 */}
                  <div style={{ display: "flex", gap: "8px" }}>
                    {/* 1. 수정 버튼 */}
                    <button
                      onClick={() => {
                        // ✅ 입찰 수(bidCount)가 0보다 크면 수정을 막습니다.
                        if ((data.bidCount || 0) > 0) {
                          return alert("이미 입찰이 진행된 상품은 수정할 수 없습니다. 🥒");
                        }
                        router.push(`/item/${id}/edit`);
                      }}
                      style={{
                        flex: 1,
                        padding: "10px",
                        // 입찰자가 있으면 배경색을 회색으로 바꿔서 '비활성' 느낌을 줍니다.
                        background: (data.bidCount || 0) > 0 ? "#f7fafc" : "#edf2f7",
                        color: (data.bidCount || 0) > 0 ? "#cbd5e0" : "#4a5568",
                        border: "none",
                        borderRadius: "10px",
                        fontWeight: "bold",
                        fontSize: "14px",
                        cursor: (data.bidCount || 0) > 0 ? "not-allowed" : "pointer"
                      }}
                    >
                      수정
                    </button>

                    {/* 2. 삭제 버튼 */}
                    <button
                      onClick={handleDelete} // 💡 실제 막는 로직은 위쪽 handleDelete 함수 안에 들어있어야 합니다!
                      style={{
                        flex: 1,
                        padding: "10px",
                        background: (data.bidCount || 0) > 0 ? "#fff" : "#fff5f5",
                        color: (data.bidCount || 0) > 0 ? "#cbd5e0" : "#e53e3e",
                        border: (data.bidCount || 0) > 0 ? "1px solid #edf2f7" : "1px solid #e53e3e",
                        borderRadius: "10px",
                        fontWeight: "bold",
                        fontSize: "14px",
                        cursor: (data.bidCount || 0) > 0 ? "not-allowed" : "pointer"
                      }}
                    >
                      삭제
                    </button>
                  </div>
                </div>
              )}
            </div>

                        {/* 입찰 섹션 (오른쪽 섹션 안으로 포함) */}
{!isOwner && isAuction && !isExpired && data.status === "active" && (
              <div style={{ padding: "15px", background: "white", borderRadius: "16px", border: "1px solid #3CB371", marginTop: "10px" }}>
                <h3 style={{ fontSize: "14px", fontWeight: "bold", marginBottom: "8px" }}>🔨 입찰하기</h3>
                                {/* 📍 밀당경매 UI: 일반경매처럼 금액 조절 후 입찰하도록 변경 */}
                {data.isMinusAuction ? (
                  <div style={{ padding: "15px", background: "white", borderRadius: "16px", border: "1px solid #E53E3E", marginTop: "10px" }}>
                    <h3 style={{ fontSize: "14px", fontWeight: "bold", marginBottom: "8px", color: "#E53E3E" }}>🔥 밀당경매 금액 조절</h3>

                    {/* - / + 조절 버튼 (눌러도 입찰 안 되고 금액만 바뀜) */}
                    <div style={{ display: "flex", gap: "10px", marginBottom: "12px" }}>
                      <button
                        type="button"
                        onClick={() => setMildangBidPrice(prev => Math.max(0, prev - getStepAmount(displayPrice)))}
                        style={{ flex: 1, padding: "15px", background: "#edf2f7", color: "#4a5568", borderRadius: "10px", border: "none", fontWeight: "bold", cursor: "pointer" }}
                      >
                        - {getStepAmount(displayPrice).toLocaleString()}원
                      </button>

                      <button
                        type="button"
                        onClick={() => setMildangBidPrice(prev => prev + getStepAmount(displayPrice))}
                        style={{ flex: 1, padding: "15px", background: "#ebf8ff", color: "#3182ce", borderRadius: "10px", border: "none", fontWeight: "bold", cursor: "pointer" }}
                      >
                        + {getStepAmount(displayPrice).toLocaleString()}원
                      </button>
                    </div>

                    {/* 금액 입력란 + 입찰(오이) 버튼 */}
                    <div style={{ display: "flex", alignItems: "center", gap: "10px", height: "56px" }}>
                      <input
                        type="number"
                        value={mildangBidPrice}
                        onChange={(e) => setMildangBidPrice(Number(e.target.value))}
                        style={{
                          flex: 1, height: "100%", border: "2px solid #e2e8f0", borderRadius: "10px",
                          padding: "0 15px", fontSize: "20px", fontWeight: "bold", textAlign: "right"
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => handlePriceUpdate(mildangBidPrice)}
                        style={{ height: "100%", background: "none", border: "none", cursor: "pointer", padding: "0 5px" }}
                      >
                        <img src="/images/cucumber-bid.png" alt="입찰" style={{ height: "100%", objectFit: "contain" }} />
                      </button>
                    </div>

                    <p style={{ fontSize: "11px", color: "#a0aec0", marginTop: "10px", textAlign: "right" }}>
                      * 위 버튼으로 금액을 맞춘 후 오이를 눌러 입찰하세요! 🥒
                    </p>
                  </div>
                ) : (
                  <BidSection id={id} currentPrice={displayPrice} onBidSuccess={() => { }} />
                )}
              </div>
            )}
          </div> {/* 오른쪽 섹션 끝 */}
        </div> {/* 메인 Flex 컨테이너 끝 */}

        {/* 4. 지도 영역 (수정됨) */}
{(data.location?.latitude || data.latitude) && (
  <div style={{ marginTop: "20px", borderTop: "1px solid #eee", paddingTop: "15px" }}>
    <label style={{ fontWeight: "bold", display: "block", marginBottom: "10px", fontSize: "14px" }}>📍 거래 희망 장소</label>
    <div id="map" style={{ width: "100%", height: "250px", borderRadius: "16px", border: "1px solid #eee" }}></div>
  </div>
)}
      </main>
 
      {/* 📍 [수정된 코드] 이미지 확대 및 슬라이드 뷰어 */}
      {isViewerOpen && (
        <div
          style={{
            position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
            background: "rgba(0,0,0,0.95)", zIndex: 2000,
            display: "flex", justifyContent: "center", alignItems: "center",
            userSelect: "none"
          }}
          onClick={() => setIsViewerOpen(false)}
        >
          {/* 1. 닫기 버튼 */}
          <button
            style={{ position: "absolute", top: 20, right: 20, background: "none", border: "none", color: "white", fontSize: 30, cursor: "pointer", zIndex: 2100 }}
            onClick={() => setIsViewerOpen(false)}
          >✕</button>

          {/* 2. 이전 버튼 (사진이 여러 장일 때만 표시) */}
          {data.images.length > 1 && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setViewerIndex((prev) => (prev > 0 ? prev - 1 : data.images.length - 1));
              }}
              style={{ position: "absolute", left: 10, background: "rgba(255,255,255,0.1)", color: "white", border: "none", borderRadius: "50%", width: 44, height: 44, fontSize: 24, cursor: "pointer", zIndex: 2100 }}
            >❮</button>
          )}

          {/* 3. 현재 이미지 */}
          <div style={{ position: "relative", width: "90%", height: "80%", display: "flex", justifyContent: "center", alignItems: "center" }} onClick={(e) => e.stopPropagation()}>
            <img
              src={data.images[viewerIndex]}
              style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain", borderRadius: 8 }}
              alt="확대 이미지"
            />

            {/* 4. 이미지 순서 표시 (예: 1 / 3) */}
            <div style={{ position: "absolute", bottom: -40, color: "white", fontSize: 14, fontWeight: "bold", background: "rgba(0,0,0,0.5)", padding: "5px 12px", borderRadius: 20 }}>
              {viewerIndex + 1} / {data.images.length}
            </div>
          </div>

          {/* 5. 다음 버튼 (사진이 여러 장일 때만 표시) */}
          {data.images.length > 1 && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setViewerIndex((prev) => (prev < data.images.length - 1 ? prev + 1 : 0));
              }}
              style={{ position: "absolute", right: 10, background: "rgba(255,255,255,0.1)", color: "white", border: "none", borderRadius: "50%", width: 44, height: 44, fontSize: 24, cursor: "pointer", zIndex: 2100 }}
            >❯</button>
          )}
        </div>
      )}

      )

      {/* 🥒 [추가] 판매자 프로필 사진 크게 보기 모달창 */}
      {isSellerPhotoOpen && (
        <div 
          onClick={() => setIsSellerPhotoOpen(false)} 
          style={{
            position: "fixed", top: 0, left: 0, width: "100%", height: "100%",
            backgroundColor: "rgba(0,0,0,0.9)", // 90% 불투명한 검정 배경
            display: "flex", flexDirection: "column",
            justifyContent: "center", alignItems: "center",
            zIndex: 3000, cursor: "zoom-out"
          }}
        >
          <img 
            src={sellerPhoto || ""} 
            alt="판매자 프로필" 
            style={{ 
              width: "70%", maxWidth: "350px", height: "auto", 
              borderRadius: "50%", border: "4px solid white",
              boxShadow: "0 0 30px rgba(0,0,0,0.5)"
            }} 
          />
          <div style={{ color: "white", marginTop: "20px", fontWeight: "bold", fontSize: "18px" }}>
            {data.sellerNickname}님의 프로필 ✖️
          </div>
        </div>
      )}
      {/* 하단 네비게이션 */}
      <BottomNav />
    </>
  );
}