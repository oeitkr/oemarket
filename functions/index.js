const { onDocumentCreated } = require("firebase-functions/v2/firestore");
const { setGlobalOptions } = require("firebase-functions");
const admin = require("firebase-admin");

// 1. 파이어베이스 관리자 권한 시작
admin.initializeApp();

// 인스턴스 제한 (비용 절감용)
setGlobalOptions({ maxInstances: 10 });

// 2. 채팅 메시지 감시자 함수
// 'items/{itemId}/messages/{messageId}' 경로에 새 글이 써지면 실행됩니다.
exports.sendChatNotification = onDocumentCreated("items/{itemId}/messages/{messageId}", async (event) => {
  const snapshot = event.data;
  if (!snapshot) return;

  const msgData = snapshot.data(); // 새로 써진 메시지 내용
  const itemId = event.params.itemId; // 어떤 상품의 채팅방인지 ID

  try {
    // 3. 상품 정보를 가져와서 상대방(수신자)이 누구인지 찾습니다.
    const itemDoc = await admin.firestore().collection("items").doc(itemId).get();
    if (!itemDoc.exists) return;

    const itemData = itemDoc.data();
    // 내가 보낸 게 아니어야 하므로, 판매자와 구매자 중 내가 아닌 사람을 찾습니다.
    const recipientUid = msgData.uid === itemData.sellerUid ? itemData.lastBidderUid : itemData.sellerUid;

    if (!recipientUid) return;

    // 4. 상대방의 FCM 토큰(주소록)을 가져옵니다.
    const userDoc = await admin.firestore().collection("users").doc(recipientUid).get();
    const fcmToken = userDoc.data()?.fcmToken;

    if (!fcmToken) {
      console.log("알림 보낼 토큰이 없습니다.");
      return;
    }

    // 5. 진짜 알림 발송! (사장님이 짜신 주소 방식 그대로 적용)
    // 5. 진짜 알림 발송!
    // 🥒 [수정] 닉네임 알림이 중복으로 가지 않도록 여기만 잠시 잠가둡니다.
/*
const message = {
  // ⚠️ 중요: 'notification' 항목을 아예 삭제합니다. (브라우저 가로채기 방지)
  data: {
    fcmTitle: `💬 ${msgData.displayName}님의 메시지`,
    fcmBody: msgData.text,
    url: `/chat/${itemId}`, // Vercel 주소에 맞게 상대 경로로 설정
  },
  token: fcmToken,
};

await admin.messaging().send(message);
    console.log("서버에서 알림 발송 성공!");
*/

  } catch (error) {
    console.error("알림 발송 중 에러 발생:", error);
  }
});