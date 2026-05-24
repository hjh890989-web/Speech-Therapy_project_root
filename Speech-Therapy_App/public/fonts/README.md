# public/fonts — PDF embed 폰트

FR-Q-007 후속 — 센터 제출용 PDF (`lib/pdf/center-report.ts`) 가 jsPDF 의 한글 표기를 위해
`/fonts/NotoSansKR-Regular.ttf` 를 lazy fetch 합니다.

## NotoSansKR-Regular.ttf 준비

본 PR 은 라이센스 파일 (`LICENSE-NotoSansKR.txt`) 만 동봉합니다. 실제 TTF 바이너리는
저장소 비대화 방지를 위해 별도 산정 (deploy 환경 / 정적 자산 CDN 업로드) 으로 분리합니다.

### 옵션 A: Google Fonts 정식 배포본 직접 다운로드

```bash
# 단일 weight (Regular 400) 만 사용 — 약 4.3MB
curl -L -o public/fonts/NotoSansKR-Regular.ttf \
  https://github.com/notofonts/noto-cjk/raw/main/Sans/SubsetOTF/KR/NotoSansKR-Regular.otf
```

### 옵션 B: 자체 subset 제작 (권장 — 번들 크기 ↓)

`pyftsubset` 또는 `fonttools` 로 한국어 발음 음소 + 자주 쓰는 한글 라벨만 subset:

```bash
pip install fonttools brotli
pyftsubset NotoSansKR-Regular.ttf \
  --text="발음발달요약보고서원아월령기관생성시각3축점수조음언어음향최근확인음소활동횟수미션완수ㄱㄴㄷㄹㅁㅂㅅㅈㅊㅋㅌㅍㅎ개월" \
  --output-file=public/fonts/NotoSansKR-Regular.ttf
```

### graceful fallback

폰트 파일이 환경에 없거나 fetch 가 실패하면 `center-report.ts` 는 자동으로 helvetica +
영문 alias 병기 모드 ("ㅅ (s)") 로 폴백합니다 — 런타임 throw 0건, UX 동일.

## 라이센스

`LICENSE-NotoSansKR.txt` 참조 — SIL Open Font License 1.1.
