"use client";

import { useEffect, useState } from "react";
import { auth, db } from "../app/firebase";
import { collection, query, where, onSnapshot, limit, orderBy } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";

export default function ChatNotification() {
  const [user, setUser] = useState<any>(null);

  // 1. 내 로그인 상태 체크
  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, (currentUser) => setUser(currentUser));
    return () => unsubAuth();
  }, []);

  // 2. 내 'notifications' 폴더에 새 알림이 오는지 실시간 감시
  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, "users", user.uid, "notifications"),
      where("isRead", "==", false), // 아직 안 읽은 알림만
      orderBy("createdAt", "desc"),
      limit(1)
    );

    const unsubNoti = onSnapshot(q, (snapshot) => {
      // 🥒 [수정] 이번에 들어온 알림들 중에 '새로 추가된 것(added)'이 하나라도 있는지 먼저 확인합니다.
      const hasNewNoti = snapshot.docChanges().some(change => change.type === "added");

      // 🥒 새 알림이 있다면, 겹치지 않게 여기서 딱 한 번만 "오이~" 소리를 냅니다.
      if (hasNewNoti) {
        const audio = new Audio('/sounds/oi.mp3');
        audio.play().catch(e => console.log("소리 재생 실패:", e));
      }

      snapshot.docChanges().forEach((change) => {
        if (change.type === "added") {
          const noti = change.doc.data();
          
          // 🔔 화면에 알림창 띄우기
          //const confirmOpen = window.confirm(
            //`💌 ${noti.fromName}님으로부터 새 메시지가 왔습니다!\n"${noti.text}"\n\n채팅창을 지금 열까요?`
          //);

        //  if (confirmOpen) {
         //   const url = `/chat/${noti.itemId}`;
         //   const name = `Chat_${noti.itemId}`;
         //   const specs = "width=450,height=700,resizable=yes";
          //  window.open(url, name, specs);
        //  }
        }
      });
    });

    return () => unsubNoti();
  }, [user]);

  return null; // 화면에는 아무것도 안 보이고 기능만 작동함
}