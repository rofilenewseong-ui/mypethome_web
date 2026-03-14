import { NextRequest, NextResponse } from 'next/server';

/** 모바일 User-Agent 패턴 */
const MOBILE_RE = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini|Mobile|mobile/i;

/** PC 차단에서 제외할 경로 */
const BYPASS_PATHS = [
  '/mobile-only',
  '/api',
  '/_next',
  '/favicon.ico',
  '/manifest.json',
  '/icon',
  '/apple-touch-icon',
  '/sw.js',
  '/robots.txt',
];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 정적 파일, API, 이미 mobile-only 페이지면 통과
  if (BYPASS_PATHS.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  const ua = request.headers.get('user-agent') || '';
  const isMobile = MOBILE_RE.test(ua);

  // 모바일이면 통과
  if (isMobile) {
    return NextResponse.next();
  }

  // PC인 경우: 관리자면 통과, 아니면 차단
  const role = request.cookies.get('petholo_role')?.value;
  if (role === 'admin' || role === 'ADMIN') {
    return NextResponse.next();
  }

  // PC + 일반 유저(또는 미로그인) → mobile-only 페이지로 리다이렉트
  const url = request.nextUrl.clone();
  url.pathname = '/mobile-only';
  return NextResponse.redirect(url);
}

export const config = {
  matcher: [
    // 정적 파일 제외
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|json|js|css)).*)',
  ],
};
