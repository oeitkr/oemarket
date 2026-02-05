// v5.2 - 2025.01.28 - Vercel 배포 수정
importScripts("https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging-compat.js");

const firebaseConfig = {
  apiKey: "AIzaSyBmwwCjvY0ulDZJiSyqxC387wKTF-PRaiI",
  authDomain: "auction-web-31c93.firebaseapp.com",
  projectId: "auction-web-31c93",
  storageBucket: "auction-web-31c93.firebasestorage.app",
  messagingSenderId: "83711706336",
  appId: "1:83711706336:web:60da939db11462dbf1bc85"
};

firebase.initializeApp(firebaseConfig);
const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  console.log('[SW v5.2] 🔥 백그라운드 메시지 수신:', payload);

  const title = payload.data?.title || "🥒 오이마켓";
  const body = payload.data?.body || "새 메시지";
  const link = payload.data?.url || payload.data?.link || "/";
  const type = payload.data?.type || "chat";

  console.log('[SW v5.2] 📋 알림 타입:', type, '제목:', title, '내용:', body);

  const notificationTag = type === "bid" ? "bid-notification" : "chat-notification";

  self.registration.showNotification(title, {
    body,
    icon: "/images/cucumber-bid.png",
    badge: "/images/cucumber-bid.png",
    tag: notificationTag,
    renotify: type === "bid",
    data: { url: link, type: type }
  });
});

self.addEventListener('notificationclick', (event) => {
  console.log('[SW v5.2] 🖱️ 알림 클릭!');
  event.notification.close();

  const url = event.notification.data?.url || 'https://auction-town-1.vercel.app/';
  const type = event.notification.data?.type || 'chat';

  console.log('[SW v5.2] 🔗 타입:', type, '/ 이동 URL:', url);

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (let client of clientList) {
        if (client.url.includes('auction-town-1.vercel.app')) {
          return client.focus().then(() => client.navigate(url));
        }
      }
      return clients.openWindow(url);
    })
  );
});

console.log('[SW v5.2] ✅ 서비스 워커 v5.2 로드 완료');