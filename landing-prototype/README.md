# 랜딩 페이지 프로토타입 모음 (landing-prototype)

Speech-Therapy 랜딩 페이지 **디자인 시안 모음(미적용 스냅샷)** 입니다.
라이브 홈(`/`)에는 아직 아무것도 반영되지 않았어요. 비교 후 하나를 골라 적용합니다.

> 공통 원칙(모든 시안): 부모용 보조 도구 톤, 의료 금칙어(**치료/진단/장애**) 회피,
> 무가입 5분 발음 확인이 주 CTA(`/diagnose`). 후기·수치 등 미검증 증빙은 미표기.

---

## 📂 더블클릭으로 바로 비교 (정적 HTML 7개)

브라우저에서 파일을 직접 열면 됩니다(서버 불필요). 나란히 비교하세요.

| 파일 | 시안 | 디자인 방향 | 출처 |
|------|------|------------|------|
| [`index.html`](index.html) | HTML-1 | "말" 브랜드, 자체 CSS(emerald/amber/sky/violet), 다크모드 | 사용자 제작 |
| [`new-landing-page.html`](new-landing-page.html) | HTML-2 | 비대칭 split hero + 그래디언트 blob + 애니메이션, 넓은 레이아웃 (Tailwind CDN — 인터넷 필요) | 사용자 제작 |
| [`a-warm.html`](a-warm.html) | **A · Warm & Friendly** | emerald·이모지·둥근 카드, 현재 앱과 가장 일관 | React 시안 정적 스냅샷 |
| [`b-editorial.html`](b-editorial.html) | **B · Editorial / Minimal** | 무채색+emerald 1색, 큰 타이포·여백·얇은 선, 이모지 최소 | React 시안 정적 스냅샷 |
| [`c-bold.html`](c-bold.html) | **C · Bold / App-style** | 그래디언트 hero·디바이스 목업·모바일 하단 고정 CTA | React 시안 정적 스냅샷 |
| [`d-modern-bold.html`](d-modern-bold.html) | **D · Modern+Bold (하이브리드)** | new-landing 모던 베이스 **+** 디바이스 목업·"기다리는 동안" 긴급 섹션·모바일 고정 CTA. 허위수치 제거 | 하이브리드(Tailwind CDN) |
| [`e-bold-modern.html`](e-bold-modern.html) | **E · Bold+Modern (하이브리드)** | c-bold 볼드 풀블리드 베이스 **+** split 히어로·플로팅 카드·6기능 그리드·타임라인·스탯 카드 | 하이브리드(Tailwind CDN) |

> **D·E 하이브리드**: D=모던(new-landing)에 볼드(c-bold) 강점을, E=볼드(c-bold)에 모던(new-landing) 강점을 결합. 둘 다 컴플라이언스 준수(금칙어·허위수치 0), CTA 실연결(/diagnose 등), 8섹션 완비. 단독 실행 HTML(Tailwind CDN — 인터넷 필요), CTA는 file://에선 미동작(시각 비교용).

**정적 스냅샷(a/b/c-*.html) 주의:**
- 실제 렌더 페이지를 그대로 떠서 **CSS를 인라인**한 자립형 파일이에요(전역 헤더·면책 푸터 포함).
- **CTA 링크는 동작하지 않습니다**(정적 — 상단 배너로 표시). 시각 비교용이에요.
- 폰트(Geist) 파일은 file://에서 안 불러와져 시스템 폰트로 대체될 수 있어요(미세 차이).
- 다크모드는 OS 설정(prefers-color-scheme)을 따릅니다.

---

## ⚛️ React 시안(A/B/C) — 실행 & 원본

`a/b/c-*.html`은 렌더 스냅샷이고, **실행 가능한 원본**은 앱 안에 있어요.

```powershell
cd "C:\VS code_Workspace\Speech-Therapy_project_root\Speech-Therapy_App"
npm run dev
```
- 비교 허브: http://localhost:4000/landing-prototype
- A: `/landing-prototype/a` · B: `/landing-prototype/b` · C: `/landing-prototype/c`

원본(source of truth) 위치:
- 페이지: `Speech-Therapy_App/app/landing-prototype/{page,a,b,c}.tsx`
- 컴포넌트: `Speech-Therapy_App/components/landing/`

이 폴더의 참고 사본:
- [`pages/`](pages/) — `index.tsx`(허브), `a-warm.tsx`, `b-editorial.tsx`, `c-bold.tsx` (`.tsx` 원본, 단독 실행 X)
- [`components/`](components/) — `content.ts`(공유 카피), `cta-styles.ts`, `LandingCtaLink.tsx`, `AuthAwareHeroCta.tsx`, 시안 A 섹션 컴포넌트 7종

---

## 상태 / 다음 단계

- **미적용**: 라이브 `/`는 현재 앱 메뉴 허브 그대로. 어떤 시안도 반영되지 않음.
- **검증**: React 시안 A/B/C는 자동 테스트로 금칙어 0건 + 타입/빌드 통과. HTML 시안(1·2)은
  출시 전 금칙어(치료/진단/장애)·면책 문구·접근성 별도 점검 권장.
- **선택 후 적용**(요약): 고른 시안을 `Speech-Therapy_App/app/page.tsx`로 이관 + `LandingBeacon`(funnel)
  복원 + `layout.tsx` metadataBase/OG + `opengraph-image` 추가 + 미리보기 라우트 정리.

_최종 수정: 2026-06-04 — React 시안 A/B/C를 정적 HTML 스냅샷으로 추가._
