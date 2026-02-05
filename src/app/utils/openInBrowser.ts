// src/app/utils/openInBrowser.ts
export function openInChromeOrCopy(url: string) {
  const ua = typeof navigator !== "undefined" ? navigator.userAgent : "";
  const isAndroid = /Android/i.test(ua);
  const isIOS = /iPhone|iPad|iPod/i.test(ua);

  // ✅ 안드로이드: 크롬으로 열기(가능하면)
  if (isAndroid) {
    const safeUrl = url.replace(/^https?:\/\//, "");
    const intentUrl = `intent://${safeUrl}#Intent;scheme=https;package=com.android.chrome;end`;

    window.location.href = intentUrl;

    // 크롬 없거나 실패하면 그냥 원래 주소로 이동
    setTimeout(() => {
      window.location.href = url;
    }, 700);
    return;
  }

  // ✅ iOS: 직접 열기 제한이 많아서 링크 복사 유도
  if (isIOS) {
    navigator.clipboard?.writeText(url);
    alert("링크를 복사했어요. Safari(또는 Chrome)에서 붙여넣어 열어주세요.");
    return;
  }

  // ✅ 기타 브라우저
  window.open(url, "_blank", "noopener,noreferrer");
}
