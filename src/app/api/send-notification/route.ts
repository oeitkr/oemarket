export const runtime = "nodejs";

import { NextResponse } from "next/server";
import admin from "firebase-admin";

function initAdmin() {
  if (admin.apps.length) return;

  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  let privateKey = process.env.FIREBASE_PRIVATE_KEY;

  if (!projectId || !clientEmail || !privateKey) {
    const missing = [];
    if (!projectId) missing.push("FIREBASE_PROJECT_ID");
    if (!clientEmail) missing.push("FIREBASE_CLIENT_EMAIL");
    if (!privateKey) missing.push("FIREBASE_PRIVATE_KEY");
    throw new Error(`환경 변수가 누락되었습니다: ${missing.join(", ")}`);
  }

  privateKey = privateKey
    .replace(/\\n/g, "\n")
    .replace(/^"/, "")
    .replace(/"$/, "");

  admin.initializeApp({
    credential: admin.credential.cert({ projectId, clientEmail, privateKey }),
  });
}

export async function POST(req: Request) {
  try {
    initAdmin();

    // 🥒 [수정] 1. 들어온 데이터를 일단 rawTokens라는 임시 이름으로 받습니다.
    const { tokens: rawTokens, title, body, data } = await req.json();

    // 🥒 [수정] 2. 임시 명단(rawTokens)이 비어있는지 먼저 확인합니다.
    if (!Array.isArray(rawTokens) || rawTokens.length === 0) {
      return NextResponse.json({ ok: false, error: "tokens missing" }, { status: 400 });
    }

    // 🥒 [추가] 3. 중복된 토큰들을 하나로 합쳐서(Set) 진짜 'tokens' 명단을 새로 만듭니다.
    const tokens = Array.from(new Set(rawTokens));


    // ✅ 기존 채팅(fcmTitle)도 살리고, 새로운 입찰(title)도 인식하게 만듭니다.
    const payloadData: Record<string, string> = {
      // 1. 서비스 워커(v5.0)가 읽는 이름
      // 🥒 [수정] 외부에서 어떤 제목이 들어오든 무조건 '🥒 오이마켓'으로 고정합니다.
      title: "🥒 오이마켓",
      body: String(body ?? "새 메시지가 도착했습니다."),

      // 2. 기존 채팅 로직이 쓰고 있던 이름 (보험용)
      // 🥒 [수정] 여기도 마찬가지로 닉네임이 섞이지 않게 고정합니다.
      fcmTitle: "🥒 오이마켓",
      fcmBody: String(body ?? "새 메시지가 도착했습니다."),

      // 3. 상품 주소 등 추가 데이터
      ...(data ?? {}),
    };

    const results = await Promise.allSettled(
      tokens.map((token: string) =>
        admin.messaging().send({
          token,
          data: payloadData,
        })
      )
    );

    // 🔍 [추가] FCM 전송 결과 상세 로그
    console.log("📊 FCM 전송 결과:", JSON.stringify(results, null, 2));

    // 🔍 [추가] 실패한 것만 따로 출력
    const failures = results.filter(r => r.status === 'rejected');
    if (failures.length > 0) {
      console.error("❌ FCM 전송 실패:", failures);
    }

    const successes = results.filter(r => r.status === 'fulfilled');
    console.log(`✅ 성공: ${successes.length}개 / ❌ 실패: ${failures.length}개`);

    return NextResponse.json({ ok: true, results });;
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message ?? String(e) },
      { status: 500 }
    );
  }
}
