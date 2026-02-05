// src/app/utils/inapp.ts
export function isInAppBrowser(): boolean {
  if (typeof navigator === "undefined") return false;

  const ua = navigator.userAgent || "";

  const inappSignatures = [
    "KAKAOTALK",
    "NAVER",
    "FBAN",
    "FBAV",
    "Instagram",
    "DaumApps",
    "Line",
  ];

  return inappSignatures.some((s) => ua.includes(s));
}
