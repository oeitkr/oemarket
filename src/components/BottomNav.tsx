"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import { auth, db } from "@/app/firebase";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";

export function BottomNav() {
  const pathname = usePathname();
  const [unreadCount, setUnreadCount] = useState(0);
  const [user, setUser] = useState<any>(null);
  const [chatSettings, setChatSettings] = useState<any>({}); // ✅ 이 줄을 추가하세요!
  // 1. 로그인 상태 확인
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => setUser(u));
    return () => unsubscribe();
  }, []);

 // 2. 안 읽은 알림 및 채팅 설정 실시간 감시
// ✅ 1번 방: 채팅방 설정(보관/삭제)만 실시간으로 감시하는 방
  useEffect(() => {
    if (!user) {
      setChatSettings({});
      return;
    }

    const unsubSettings = onSnapshot(collection(db, "users", user.uid, "chatSettings"), (snap) => {
      const settings: any = {}; // 👈 여기만 : any 를 추가!
snap.docs.forEach(d => settings[d.id] = d.data()); // 👈 이 줄은 건드리지 마세요!
      setChatSettings(settings); // 설정을 업데이트해도 이 방은 다시 실행되지 않음
    });

    return () => unsubSettings();
  }, [user]); // user가 바뀔 때만 딱 한 번 실행됨

  // ✅ 2번 방: 안 읽은 알림 숫자를 계산하는 방
  useEffect(() => {
    if (!user) {
      setUnreadCount(0);
      return;
    }

    const q = query(
      collection(db, "users", user.uid, "notifications"),
      where("isRead", "==", false)
    );

    const unsubNotif = onSnapshot(q, (snapshot) => {
      // 1번 방에서 받아온 chatSettings를 사용해서 필터링
      const filteredCount = snapshot.docs.filter(doc => {
        const notifData = doc.data();
        const setting = chatSettings[notifData.itemId] || {};
        return !setting.isArchived && !setting.isDeleted;
      }).length;

      setUnreadCount(filteredCount);
    });

    return () => unsubNotif();
  }, [user, chatSettings]); // user나 chatSettings(설정)가 바뀔 때만 숫자 다시 계산


// ✅ 홈(/) 또는 채팅창(/chat)으로 시작하는 주소에서는 하단 바를 숨깁니다.
  if (pathname === "/" || pathname?.startsWith("/chat")) {
    return null;
  }
  

  return (
    <nav style={{
      position: "fixed", bottom: 0, left: 0, right: 0, height: "65px",
      background: "#ffffff", display: "flex", justifyContent: "space-around",
      alignItems: "center", borderTop: "1px solid #eeeeee",
      boxShadow: "0 -2px 10px rgba(0,0,0,0.05)", zIndex: 1000,
      paddingBottom: "env(safe-area-inset-bottom)",
    }}>
      <Link href="/list" style={navItemStyle(pathname === "/list")}>
        <span style={{ fontSize: "20px" }}>🏠</span>
        <span style={{ fontSize: "11px", fontWeight: "bold" }}>홈</span>
      </Link>

      <Link href="/create" style={navItemStyle(pathname === "/create")}>
        <span style={{ fontSize: "20px" }}>➕</span>
        <span style={{ fontSize: "11px", fontWeight: "bold" }}>등록</span>
      </Link>

      <Link href="/profile" style={{ ...navItemStyle(pathname === "/profile"), position: "relative" }}>
        <span style={{ fontSize: "20px" }}>👤</span>
        <span style={{ fontSize: "11px", fontWeight: "bold" }}>마이</span>
        
        {unreadCount > 0 && (
          <span style={{
            position: "absolute",
            top: "-2px",
            right: "0px",
            backgroundColor: "#e53e3e",
            color: "white",
            borderRadius: "50%",
            width: "16px",
            height: "16px",
            fontSize: "10px",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            fontWeight: "bold",
            border: "2px solid white"
          }}>
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </Link>

      <Link href="/settings" style={navItemStyle(pathname === "/settings")}>
        <span style={{ fontSize: "20px" }}>⚙️</span>
        <span style={{ fontSize: "11px", fontWeight: "bold" }}>설정</span>
      </Link>
    </nav>
  );
}

const navItemStyle = (isActive: boolean) => ({
  textDecoration: "none",
  color: isActive ? "#3182ce" : "#4a5568",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
} as const);