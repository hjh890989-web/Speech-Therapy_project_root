// SEC-COMP-PII — lib/ai/pii-mask.ts 의 maskPii() 단위 테스트.
// 한국 PIPA / 일반 PII 패턴 7종 + 위양성 회피 (한국어 일반 발화) 검증.

import { describe, it, expect } from "vitest";
import { maskPii } from "@/lib/ai/pii-mask";

describe("maskPii", () => {
  // ----- 마스킹 대상 -----

  it("주민등록번호 (RRN, 13자리) — 하이픈 유무 양쪽", () => {
    expect(maskPii("주민등록번호는 900101-1234567 입니다")).toBe(
      "주민등록번호는 [주민등록번호] 입니다",
    );
    expect(maskPii("9001011234567 도 동일")).toBe("[주민등록번호] 도 동일");
  });

  it("신용카드 16자리 (4-4-4-4)", () => {
    expect(maskPii("카드 1234-5678-9012-3456 결제")).toBe(
      "카드 [카드번호] 결제",
    );
  });

  it("이메일", () => {
    expect(maskPii("문의는 hello@example.com 으로")).toBe(
      "문의는 [이메일] 으로",
    );
    expect(maskPii("foo.bar+spam@sub.example.co.kr 도 인식")).toBe(
      "[이메일] 도 인식",
    );
  });

  it("휴대폰 + 일반 전화 + 국제", () => {
    expect(maskPii("연락처 010-1234-5678")).toBe("연락처 [전화번호]");
    expect(maskPii("01012345678 hyphen 없음")).toBe("[전화번호] hyphen 없음");
    expect(maskPii("02-123-4567 일반 전화")).toBe("[전화번호] 일반 전화");
    expect(maskPii("+82-10-1234-5678 국제표기")).toBe("[전화번호] 국제표기");
  });

  it("URL (http/https)", () => {
    expect(maskPii("자세히는 https://example.com/path?q=1 참조")).toBe(
      "자세히는 [URL] 참조",
    );
  });

  it("IPv4 주소", () => {
    expect(maskPii("서버 192.168.0.1 에서 응답")).toBe("서버 [IP주소] 에서 응답");
  });

  it("한국식 상세 주소 (시/도/구/동 + 번지)", () => {
    expect(maskPii("주소: 서울특별시 강남구 역삼동 123-45 입니다")).toBe(
      "주소: [주소] 입니다",
    );
    expect(maskPii("경기도 성남시 분당구 정자동 95번지")).toBe("[주소]");
  });

  // ----- 위양성 회피 (마스킹되면 안 됨) -----

  it("한국어 일반 발화 — 마스킹 0건", () => {
    const utterance = "엄마 사과 먹고 싶어요. 빨간색이 예뻐요.";
    expect(maskPii(utterance)).toBe(utterance);
  });

  it("음소 / 점수 문자열 — 마스킹 0건", () => {
    const meta = "타겟 음소: ㅅ, 월령: 48개월, articulation 75";
    expect(maskPii(meta)).toBe(meta);
  });

  it("일반 한국 인명 패턴 (위양성 차단) — 마스킹 0건", () => {
    // 한국 성+이름 패턴은 정규식으로 잡지 않음 (일반 명사와 충돌).
    const text = "김민수 가 발음 잘했어요";
    expect(maskPii(text)).toBe(text);
  });

  // ----- 복합 케이스 -----

  it("여러 PII 동시 마스킹", () => {
    const input = "전화 010-9999-8888, 이메일 a@b.co, 주소 서울특별시 강남구 역삼동 100번지";
    const out = maskPii(input);
    expect(out).toContain("[전화번호]");
    expect(out).toContain("[이메일]");
    expect(out).toContain("[주소]");
    expect(out).not.toContain("010-9999-8888");
    expect(out).not.toContain("a@b.co");
  });

  it("빈 문자열 + 마스킹 없는 문자열 idempotent", () => {
    expect(maskPii("")).toBe("");
    const clean = "안녕하세요";
    expect(maskPii(maskPii(clean))).toBe(clean);
  });
});
