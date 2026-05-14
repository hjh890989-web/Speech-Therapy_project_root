// API-010 §1 — 공개 라우트 그룹 layout. AuthHeader 모든 (public) 페이지 상단 표시.

import { AuthHeader } from "./AuthHeader";

export default function PublicLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <>
      <AuthHeader />
      {children}
    </>
  );
}
