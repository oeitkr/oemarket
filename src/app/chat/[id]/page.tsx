"use client";
import Link from "next/link";
import { onMessage } from "firebase/messaging";
import { useState, useEffect, use, useRef } from "react";
import { db, auth, messaging, getToken } from "../../firebase";
import {
  collection, addDoc, query, orderBy, onSnapshot, serverTimestamp,
  doc, getDoc, updateDoc, writeBatch, getDocs, where, setDoc
} from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";

export default function ChatPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const itemId = resolvedParams.id;
  const [user, setUser] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [opponentName, setOpponentName] = useState("채팅 상대");
  const [opponentPhoto, setOpponentPhoto] = useState<string | null>(null); // 📸 [추가] 상대방 사진 주소
  const [item, setItem] = useState<any>(null);
  const [viewHeight, setViewHeight] = useState("100vh");

  const startTime = useRef(Date.now());
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // 모바일 키보드 대응
  useEffect(() => {
    const win = window as any;
    if (typeof window !== "undefined" && win.visualViewport) {
      const handleResize = () => {
        setViewHeight(`${win.visualViewport.height}px`);
      };
      win.visualViewport.addEventListener("resize", handleResize);
      handleResize();
      return () => win.visualViewport?.removeEventListener("resize", handleResize);
    }
  }, []);

  // 알림 권한 및 서비스 워커 등록
  useEffect(() => {
    if (typeof window !== "undefined") {
      if ("Notification" in window && Notification.permission === "default") {
        Notification.requestPermission();
      }
      if ("serviceWorker" in navigator) {
        navigator.serviceWorker
          .register("/firebase-messaging-sw.js")
          .then((registration) => {
            console.log("✅ 서비스 워커 등록 성공:", registration.scope);
          })
          .catch((error) => {
            console.error("❌ 서비스 워커 등록 실패:", error);
          });
      }
    }
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (currentUser) setUser(currentUser);
    });
    return () => unsubscribe();
  }, []);

  // FCM 토큰 자동 업데이트
  useEffect(() => {
    const autoUpdateToken = async () => {
      try {
        if (typeof window !== "undefined" && messaging && user) {
          let permission = Notification.permission;
          if (permission === "default") {
            permission = await Notification.requestPermission();
          }
          if (permission !== "granted") {
            console.log("⚠️ 알림 권한이 거부되어 있습니다.");
            return;
          }
          const registration = await navigator.serviceWorker.register("/firebase-messaging-sw.js");
          const currentToken = await getToken(messaging, {
            vapidKey: "BHuHI1KEPSWfX_kToHuhYVNcUIhM04VpFsgqCQJ4uXK7vmgnKtcbjEQ9rLtpB5hTllzPHvC-LgsF8gXvm-fWSfQ",
            serviceWorkerRegistration: registration,
          });
          if (currentToken) {
            const userDoc = await getDoc(doc(db, "users", user.uid));
            if (userDoc.data()?.fcmToken !== currentToken) {
              console.log("🔄 새 주소 발견! 자동으로 업데이트합니다.");
              await updateDoc(doc(db, "users", user.uid), {
                fcmToken: currentToken,
                lastAutoUpdate: serverTimestamp()
              });
            }
          }
        }
      } catch (err) { }
    };
    autoUpdateToken();
  }, [user?.uid]);

  // 상대방 및 상품 정보 가져오기
  useEffect(() => {
    if (!itemId || !user) return;
    const getChatData = async () => {
      const itemSnap = await getDoc(doc(db, "items", itemId));
      if (itemSnap.exists()) {
        const data = itemSnap.data();
        setItem(data);

        // 👥 상대방 정보 판별
        const isSeller = user.uid === data.sellerUid;
        setOpponentName(isSeller ? (data.lastBidderNickname || "낙찰자") : (data.sellerNickname || "판매자"));

        // 📸 [추가] 상대방 사진 주소 저장
        setOpponentPhoto(isSeller ? (data.lastBidderPhoto || null) : (data.sellerPhoto || null));
      }
    };
    getChatData();
  }, [itemId, user]);

  // 실시간 메시지 감시
  useEffect(() => {
    if (!itemId || !user?.uid) return;
    console.log("실시간 리스너 시작 - 방 ID:", itemId);
    const q = query(
      collection(db, "items", itemId, "messages"),
      orderBy("createdAt", "asc")
    );
    const unsubscribe = onSnapshot(q,
      { includeMetadataChanges: true },
      (snapshot) => {
        const msgs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setMessages(msgs);
      },
      (error) => {
        console.error("리스너 에러 발생:", error);
      }
    );
    return () => unsubscribe();
  }, [itemId, user?.uid]);

  // 읽음 처리
  useEffect(() => {
    if (!itemId || !user || messages.length === 0) return;
    const markAsRead = async () => {
      const q = query(
        collection(db, "items", itemId, "messages"),
        where("uid", "!=", user.uid),
        where("isRead", "==", false)
      );
      const snapshot = await getDocs(q);
      if (snapshot.empty) return;
      const batch = writeBatch(db);
      snapshot.docs.forEach((doc) => {
        batch.update(doc.ref, { isRead: true });
      });
      await batch.commit();
    };
    markAsRead();
  }, [messages.length, user?.uid, itemId]);

  // 스크롤 하단 고정
  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  // 포그라운드 메시지 수신
  useEffect(() => {
    if (!messaging) return;
    const unsubscribe = onMessage(messaging, (payload) => {
      console.log("📱 앱 사용 중 알림 수신:", payload);

      // 🔔 소리 재생 추가
      try {
        const audio = new Audio('/sounds/oi.mp3');
        audio.play().catch(err => console.log('소리 재생 실패:', err));
      } catch (err) {
        console.log('오디오 로드 실패:', err);
      }
    });
    return () => unsubscribe();
  }, [itemId]);

  // 메시지 전송 (title 필드 포함 - 첫 번째 버전 기준)
  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !user) return;
    try {
      // ⭐ title 필드 보존!
      await addDoc(collection(db, "items", itemId, "messages"), {
        title: "🥒 새 메시지가 도착했습니다.",
        text: newMessage,
        createdAt: serverTimestamp(),
        uid: user.uid,
        displayName: user.displayName || "익명",
        isRead: false,
      });

      await updateDoc(doc(db, "items", itemId), {
        lastMessageAt: serverTimestamp(),
      });

      const currentMsg = newMessage;
      setNewMessage("");
      inputRef.current?.focus();

      if (item) {
        const opponentUid = user.uid === item.sellerUid ? item.lastBidderUid : item.sellerUid;
        if (opponentUid) {
          await setDoc(doc(db, "users", opponentUid, "chatSettings", itemId), {
            isDeleted: false
          }, { merge: true });

          const saveLogTask = addDoc(collection(db, "users", opponentUid, "notifications"), {
            type: "chat",
            fromName: user.displayName || "익명",
            text: currentMsg,
            itemId,
            createdAt: serverTimestamp(),
            isRead: false
          });

          const sendFcmTask = (async () => {
            try {
              const opponentDoc = await getDoc(doc(db, "users", opponentUid));
              const opponentToken = opponentDoc.data()?.fcmToken;
              if (opponentToken) {
                await fetch("/api/send-notification", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    tokens: [opponentToken],
                    title: "🥒 오이마켓",
                    body: currentMsg,
                    data: { itemId: itemId, url: `/chat/${itemId}` }
                  }),
                });
              }
            } catch (fcmErr) { console.error("알림 발송 실패:", fcmErr); }
          })();

          await saveLogTask;
        }
      }
    } catch (err) {
      console.error("전송 에러:", err);
    }
  };

  if (!user) return <div style={{ padding: 20 }}>로그인이 필요합니다...</div>;

  return (
    <div style={{ display: "flex", flexDirection: "column", height: viewHeight, backgroundColor: "#f1f1f1", overflow: "hidden" }}>
      {/* 🏠 수정된 상단 바: 홈 버튼 추가 */}
      <div style={{
        display: "flex",
        alignItems: "center",
        padding: "15px",
        backgroundColor: "white",
        borderBottom: "1px solid #eee"
      }}>
        <Link href="/" style={{ textDecoration: "none", fontSize: "1.2rem", marginRight: "10px" }}>🏠</Link>
        <div style={{ flex: 1, textAlign: "center", fontWeight: "bold", marginRight: "30px" }}>
          💬 {opponentName}님과의 채팅
        </div>
      </div>

      {item && (
        <div style={{ display: "flex", alignItems: "center", padding: "10px 15px", backgroundColor: "#fff", borderBottom: "1px solid #ddd", gap: "12px" }}>
          <img src={item.images?.[0] || "/images/cucumber-bid.png"} alt="상품" style={{ width: "50px", height: "50px", borderRadius: "8px", objectFit: "cover" }} />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: "14px", fontWeight: "600", color: "#333" }}>{item.title}</div>
            <div style={{ fontSize: "13px", fontWeight: "bold", color: "#3182ce" }}>
              {item.isMinusAuction ? "현재가 " : "낙찰가 "} {Number(item.currentPrice || item.price).toLocaleString()}원
            </div>
          </div>
          <div style={{ fontSize: "11px", padding: "4px 8px", borderRadius: "4px", backgroundColor: item.isExpired ? "#edf2f7" : "#ebf8ff", color: item.isExpired ? "#718096" : "#3182ce", fontWeight: "bold" }}>
            {item.isExpired ? "경매종료" : "진행중"}
          </div>
        </div>
      )}


      {/* 🥒 여기부터 파일 끝까지 덮어쓰시면 됩니다. */}
      <div ref={scrollRef} style={{ flex: 1, overflowY: "auto", padding: "15px", display: "flex", flexDirection: "column", gap: "10px" }}>
        {messages.map((msg, index) => {
          const isMyMsg = msg.uid === user.uid;
          // 📸 연속 메시지인지 판별 (첫 글이거나, 바로 전 사람과 다를 때만 사진 표시)
          const isFirstOfBlock = index === 0 || messages[index - 1].uid !== msg.uid;
          const showProfile = !isMyMsg && isFirstOfBlock;

          return (
            <div key={msg.id} style={{
              alignSelf: isMyMsg ? "flex-end" : "flex-start",
              display: "flex",
              flexDirection: "row",
              gap: "8px"
            }}>

              {/* 📸 상대방 프로필 사진 영역 */}
              {!isMyMsg && (
                <div style={{ width: "35px" }}>
                  {showProfile && (
                    <img
                      src={opponentPhoto || "https://cdn-icons-png.flaticon.com/512/149/149071.png"}
                      alt="profile"
                      style={{ width: "35px", height: "35px", borderRadius: "50%", objectFit: "cover" }}
                    />
                  )}
                </div>
              )}

              {/* 말풍선과 시간 묶음 */}
              <div style={{ display: "flex", flexDirection: "column", alignItems: isMyMsg ? "flex-end" : "flex-start" }}>
                <div style={{ display: "flex", alignItems: "flex-end", flexDirection: isMyMsg ? "row" : "row-reverse" }}>
                  {isMyMsg && msg.isRead === false && (
                    <span style={{ fontSize: "11px", color: "#FFD700", marginRight: "5px", fontWeight: "bold" }}>1</span>
                  )}
                  <div style={{
                    backgroundColor: isMyMsg ? "#3182ce" : "white",
                    color: isMyMsg ? "white" : "black",
                    padding: "8px 12px", borderRadius: "15px", maxWidth: "250px", fontSize: "14px", boxShadow: "0 1px 2px rgba(0,0,0,0.1)"
                  }}>
                    {msg.text}
                  </div>
                </div>
                <div style={{ fontSize: "9px", marginTop: "4px", color: "#999" }}>
                  {msg.createdAt ? new Date(msg.createdAt.toDate()).toLocaleString('ko-KR', { hour: '2-digit', minute: '2-digit', hour12: false }) : ""}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <form onSubmit={sendMessage} style={{ padding: "15px", backgroundColor: "white", display: "flex", gap: "10px" }}>
        <input
          ref={inputRef}
          type="text"
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          placeholder="메시지를 입력하세요..."
          style={{ flex: 1, padding: "12px", borderRadius: "25px", border: "1px solid #ddd", outline: "none" }}
        />
        <button
          type="submit"
          onPointerDown={(e) => e.preventDefault()}
          style={{ padding: "10px 20px", background: "#3182ce", color: "white", borderRadius: "25px", border: "none", fontWeight: "bold", cursor: "pointer" }}
        >
          전송
        </button>
      </form>
    </div>
  );
}