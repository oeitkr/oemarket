import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  // 1. 현재 사용자가 로그인했는지 확인하는 로직 (쿠키 등 확인)
  const session = request.cookies.get('session'); // 예시: 세션 쿠키 확인
  const { pathname } = request.nextUrl;

  // 2. 로그인이 안 됐는데 '마이페이지'나 '입찰' 페이지로 가려고 할 때
  if (!session && pathname.startsWith('/mypage')) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // 3. 로그인이 이미 됐는데 '로그인'이나 '회원가입' 페이지로 가려고 할 때
  if (session && (pathname === '/login' || pathname === '/signup')) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  return NextResponse.next();
}

// 이 미들웨어가 작동할 페이지 경로들을 설정합니다.
export const config = {
  matcher: ['/login', '/signup', '/mypage/:path*', '/auction/:path*'],
};