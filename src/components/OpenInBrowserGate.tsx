"use client";

import { useEffect, useState } from "react";
import { isInAppBrowser } from "../app/utils/inapp";
import { openInChromeOrCopy } from "../app/utils/openInBrowser";


export default function OpenInBrowserGate() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (isInAppBrowser()) setShow(true);
  }, []);

  if (!show) return null;

  const url = typeof window !== "undefined" ? window.location.href : "";

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.55)",
        zIndex: 99999,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
      }}
    >
      <div
        style={{
          maxWidth: 420,
          width: "100%",
          background: "white",
          borderRadius: 16,
          padding: 16,
          lineHeight: 1.35,
        }}
      >
        <div style={{ fontWeight: 800, fontSize: 18, marginBottom: 8 }}>
          인앱브라우저에서는 구글 로그인이 막힐 수 있어요
        </div>

        <div style={{ fontSize: 14, opacity: 0.85, marginBottom: 12 }}>
          카카오톡/인스타 등 앱 안에서 열면
          <br />
          <b>403 disallowed_useragent</b>가 뜰 수 있습니다.
          <br />
          아래 버튼으로 바깥 브라우저에서 열어주세요.
        </div>

        <button
          onClick={() => openInChromeOrCopy(url)}
          style={{
            width: "100%",
            height: 44,
            borderRadius: 10,
            border: "none",
            fontWeight: 700,
            cursor: "pointer",
          }}
        >
          Chrome(또는 기본 브라우저)로 열기
        </button>

        <button
          onClick={async () => {
            await navigator.clipboard?.writeText(url);
            alert("링크를 복사했어요. 크롬/사파리에 붙여넣기!");
          }}
          style={{
            width: "100%",
            height: 44,
            borderRadius: 10,
            border: "1px solid #ddd",
            background: "white",
            marginTop: 8,
            cursor: "pointer",
          }}
        >
          링크 복사
        </button>

        <button
          onClick={() => setShow(false)}
          style={{
            width: "100%",
            height: 44,
            borderRadius: 10,
            border: "none",
            background: "#f3f3f3",
            marginTop: 8,
            cursor: "pointer",
          }}
        >
          그냥 계속하기
        </button>
      </div>
    </div>
  );
}
