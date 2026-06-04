// 루트 / — 완전히 새롭게 디자인된 Speech-Therapy 랜딩 페이지.
// PWA start_url = "/" 이므로 홈화면 설치 후 첫 진입 화면이 본 페이지.

import Link from "next/link";
import { LandingBeacon } from "./LandingBeacon";
import { LANDING_FAQ } from "@/components/landing/LandingFaq";

// 기관 문의 수신 주소 — env 미설정 시 placeholder
const contactEmail = process.env.NEXT_PUBLIC_CONTACT_EMAIL ?? "partners@speech-therapy.kr";

export default function Home() {
  return (
    <main className="min-h-screen">
      <LandingBeacon />

      {/* Split Hero with Asymmetrical Layout */}
      <section className="relative overflow-hidden bg-gradient-to-br from-emerald-50 via-white to-amber-50 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950">
        <div className="absolute inset-0 opacity-30">
          <div className="absolute -top-24 -right-24 h-72 w-72 rounded-full bg-emerald-200 blur-3xl dark:bg-emerald-900/30"></div>
          <div className="absolute bottom-12 -left-24 h-64 w-64 rounded-full bg-amber-200 blur-3xl dark:bg-amber-900/30"></div>
        </div>
        
        <div className="relative mx-auto max-w-7xl px-4 py-20 sm:py-28 lg:py-32">
          <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
            <div className="space-y-8">
              <div className="inline-flex items-center gap-2 rounded-full bg-emerald-100 px-4 py-2 text-sm font-medium text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-200">
                <span>🎙️</span>
                <span>무가입 · 5분 · 음성 미저장</span>
              </div>
              
              <h1 className="text-4xl font-extrabold tracking-tight text-gray-900 sm:text-5xl lg:text-6xl dark:text-white">
                우리 아이 발음,
                <br />
                <span className="text-emerald-600 dark:text-emerald-400">또래와 비교해 확인</span>하세요
              </h1>
              
              <p className="text-lg text-gray-600 sm:text-xl dark:text-gray-300">
                월령과 음소를 고르고 한 단어만 들려주면, AI 분석으로 발음 발달 단계를 바로 확인할 수 있어요.
              </p>
              
              <div className="flex flex-col gap-4 sm:flex-row">
                <Link
                  href="/diagnose"
                  className="group inline-flex items-center justify-center rounded-2xl bg-emerald-500 px-8 py-5 text-base font-bold text-white shadow-lg shadow-emerald-500/30 transition hover:bg-emerald-600 hover:shadow-xl hover:shadow-emerald-500/40 focus:outline-none focus:ring-4 focus:ring-emerald-500/30"
                >
                  <span>5분 발음 확인 시작하기</span>
                  <svg className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                  </svg>
                </Link>
                <Link
                  href="#features"
                  className="inline-flex items-center justify-center rounded-2xl border-2 border-gray-200 bg-white px-8 py-5 text-base font-semibold text-gray-700 transition hover:border-emerald-300 hover:bg-emerald-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200 dark:hover:border-emerald-700 dark:hover:bg-gray-800"
                >
                  기능 살펴보기
                </Link>
              </div>
              
              <div className="flex items-center gap-6 pt-4">
                <div className="flex -space-x-3">
                  {[1,2,3,4].map(i => (
                    <div key={i} className="flex h-10 w-10 items-center justify-center rounded-full border-3 border-white bg-gradient-to-br from-emerald-400 to-emerald-600 text-white text-sm font-bold dark:border-gray-900">
                      {String.fromCharCode(64 + i)}
                    </div>
                  ))}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  <span className="font-bold text-gray-900 dark:text-white">10,000+</span> 부모님과 함께
                </div>
              </div>
            </div>
            
            <div className="relative">
              <div className="relative mx-auto max-w-md">
                {/* Floating Card 1 */}
                <div className="absolute -left-8 top-8 animate-bounce">
                  <div className="rounded-2xl bg-white p-4 shadow-xl dark:bg-gray-800">
                    <div className="flex items-center gap-3">
                      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-100 text-2xl dark:bg-emerald-900/50">
                        🎯
                      </div>
                      <div>
                        <p className="text-sm font-bold text-gray-900 dark:text-white">발음 미션</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">하루 1~3분</p>
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Floating Card 2 */}
                <div className="absolute -right-4 bottom-16 animate-pulse">
                  <div className="rounded-2xl bg-white p-4 shadow-xl dark:bg-gray-800">
                    <div className="flex items-center gap-3">
                      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-100 text-2xl dark:bg-amber-900/50">
                        📊
                      </div>
                      <div>
                        <p className="text-sm font-bold text-gray-900 dark:text-white">또래 비교</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">객관적 확인</p>
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Main Visual Card */}
                <div className="relative rounded-3xl bg-gradient-to-br from-emerald-500 to-emerald-600 p-8 shadow-2xl">
                  <div className="text-center">
                    <div className="mx-auto mb-6 flex h-24 w-24 items-center justify-center rounded-2xl bg-white/20 text-5xl backdrop-blur-sm">
                      🎙️👨‍👩‍👧
                    </div>
                    <div className="space-y-3 text-white">
                      <p className="text-lg font-bold">지금 바로 확인하세요</p>
                      <div className="inline-flex items-center gap-2 rounded-full bg-white/20 px-4 py-2 text-sm">
                        <span>⏱️</span>
                        <span>약 5분 소요</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Disclaimer Banner */}
      <section className="bg-amber-50 px-4 py-4 dark:bg-amber-950/30">
        <div className="mx-auto max-w-4xl text-center">
          <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
            💡 본 서비스는 의료적 평가가 아닌, 부모님께 발달 확인 정보를 안내하는 보조 도구입니다.
          </p>
        </div>
      </section>

      {/* Features Grid with Cards */}
      <section id="features" className="px-4 py-20 sm:py-28">
        <div className="mx-auto max-w-6xl">
          <div className="text-center">
            <p className="text-sm font-semibold uppercase tracking-wide text-emerald-600 dark:text-emerald-400">
              왜 Speech-Therapy 인가요?
            </p>
            <h2 className="mt-3 text-3xl font-bold text-gray-900 sm:text-4xl dark:text-white">
              아이와 함께 성장하는 경험
            </h2>
          </div>

          <div className="mt-16 grid gap-8 md:grid-cols-2 lg:grid-cols-3">
            {/* Feature 1 */}
            <div className="group rounded-3xl border border-gray-100 bg-white p-8 transition hover:border-emerald-200 hover:shadow-xl dark:border-gray-800 dark:bg-gray-900 dark:hover:border-emerald-800">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-400 to-emerald-600 text-3xl shadow-lg shadow-emerald-500/30">
                ⏱️
              </div>
              <h3 className="mt-6 text-xl font-bold text-gray-900 dark:text-white">
                5분 만에 확인
              </h3>
              <p className="mt-3 text-gray-600 dark:text-gray-300">
                복잡한 절차 없이 월령과 음소만 선택하면 바로 발음 확인을 시작할 수 있어요.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="group rounded-3xl border border-gray-100 bg-white p-8 transition hover:border-emerald-200 hover:shadow-xl dark:border-gray-800 dark:bg-gray-900 dark:hover:border-emerald-800">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-400 to-violet-600 text-3xl shadow-lg shadow-violet-500/30">
                🔒
              </div>
              <h3 className="mt-6 text-xl font-bold text-gray-900 dark:text-white">
                음성 원본 미저장
              </h3>
              <p className="mt-3 text-gray-600 dark:text-gray-300">
                음성은 텍스트로만 처리되고 원본은 절대 저장되지 않아요. 안심하고 사용하세요.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="group rounded-3xl border border-gray-100 bg-white p-8 transition hover:border-emerald-200 hover:shadow-xl dark:border-gray-800 dark:bg-gray-900 dark:hover:border-emerald-800">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 text-3xl shadow-lg shadow-amber-500/30">
                📊
              </div>
              <h3 className="mt-6 text-xl font-bold text-gray-900 dark:text-white">
                또래 비교 분석
              </h3>
              <p className="mt-3 text-gray-600 dark:text-gray-300">
                같은 월령 아이들과의 비교 데이터로 객관적인 발달 단계를 확인하세요.
              </p>
            </div>

            {/* Feature 4 */}
            <Link href="/missions" className="group rounded-3xl border border-gray-100 bg-white p-8 transition hover:border-emerald-200 hover:shadow-xl dark:border-gray-800 dark:bg-gray-900 dark:hover:border-emerald-800">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-400 to-sky-600 text-3xl shadow-lg shadow-sky-500/30">
                🎯
              </div>
              <h3 className="mt-6 text-xl font-bold text-gray-900 dark:text-white">
                매일 미션
              </h3>
              <p className="mt-3 text-gray-600 dark:text-gray-300">
                하루 1~3분, 아이 발달에 맞춘 재미있는 미션으로 꾸준히 연습하세요.
              </p>
              <div className="mt-4 inline-flex items-center text-emerald-600 font-semibold dark:text-emerald-400">
                미션 보기 →
              </div>
            </Link>

            {/* Feature 5 */}
            <Link href="/rewards" className="group rounded-3xl border border-gray-100 bg-white p-8 transition hover:border-emerald-200 hover:shadow-xl dark:border-gray-800 dark:bg-gray-900 dark:hover:border-emerald-800">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-pink-400 to-pink-600 text-3xl shadow-lg shadow-pink-500/30">
                🌟
              </div>
              <h3 className="mt-6 text-xl font-bold text-gray-900 dark:text-white">
                보상 시스템
              </h3>
              <p className="mt-3 text-gray-600 dark:text-gray-300">
                미션을 완료할 때마다 별을 모으고 나무를 키워요. 아이의 동기를 자연스럽게 이어가요.
              </p>
              <div className="mt-4 inline-flex items-center text-emerald-600 font-semibold dark:text-emerald-400">
                보상 도감 보기 →
              </div>
            </Link>

            {/* Feature 6 */}
            <div className="group rounded-3xl border border-gray-100 bg-white p-8 transition hover:border-emerald-200 hover:shadow-xl dark:border-gray-800 dark:bg-gray-900 dark:hover:border-emerald-800">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-400 to-emerald-600 text-3xl shadow-lg shadow-emerald-500/30">
                🤝
              </div>
              <h3 className="mt-6 text-xl font-bold text-gray-900 dark:text-white">
                전문가 검수
              </h3>
              <p className="mt-3 text-gray-600 dark:text-gray-300">
                AI 분석에 전문가 검수를 더했어요. 부모님께 더 신뢰할 수 있는 안내를 드리기 위해서예요.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works - Timeline Style */}
      <section className="bg-gray-50 px-4 py-20 sm:py-28 dark:bg-gray-900/60">
        <div className="mx-auto max-w-5xl">
          <div className="text-center">
            <h2 className="text-3xl font-bold text-gray-900 sm:text-4xl dark:text-white">
              간단한 3단계로 확인하세요
            </h2>
          </div>

          <div className="mt-16 relative">
            {/* Timeline Line */}
            <div className="absolute left-8 top-0 bottom-0 w-0.5 bg-gradient-to-b from-emerald-300 via-emerald-500 to-emerald-700 dark:from-emerald-700 dark:via-emerald-500 dark:to-emerald-300 hidden sm:block"></div>

            <div className="space-y-12">
              {/* Step 1 */}
              <div className="relative flex gap-8">
                <div className="hidden sm:flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-full bg-emerald-500 text-2xl text-white shadow-lg shadow-emerald-500/30 ring-4 ring-emerald-100 dark:ring-emerald-900/50">
                  1️⃣
                </div>
                <div className="flex-1 rounded-3xl bg-white p-8 shadow-lg dark:bg-gray-800">
                  <div className="sm:hidden mb-4 inline-flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500 text-xl text-white">
                    1️⃣
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                    월령과 음소 선택하기
                  </h3>
                  <p className="mt-2 text-gray-600 dark:text-gray-300">
                    아이 개월 수와 확인하고 싶은 소리(ㄱ·ㄴ·ㅅ·ㅈ·ㄹ)를 한 번만 골라요.
                  </p>
                </div>
              </div>

              {/* Step 2 */}
              <div className="relative flex gap-8">
                <div className="hidden sm:flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-full bg-emerald-500 text-2xl text-white shadow-lg shadow-emerald-500/30 ring-4 ring-emerald-100 dark:ring-emerald-900/50">
                  2️⃣
                </div>
                <div className="flex-1 rounded-3xl bg-white p-8 shadow-lg dark:bg-gray-800">
                  <div className="sm:hidden mb-4 inline-flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500 text-xl text-white">
                    2️⃣
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                    한 단어만 들려주기
                  </h3>
                  <p className="mt-2 text-gray-600 dark:text-gray-300">
                    아이가 제시된 단어를 말하면 AI가 자동으로 분석을 시작해요. 음성 원본은 저장하지 않아요.
                  </p>
                </div>
              </div>

              {/* Step 3 */}
              <div className="relative flex gap-8">
                <div className="hidden sm:flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-full bg-emerald-500 text-2xl text-white shadow-lg shadow-emerald-500/30 ring-4 ring-emerald-100 dark:ring-emerald-900/50">
                  3️⃣
                </div>
                <div className="flex-1 rounded-3xl bg-white p-8 shadow-lg dark:bg-gray-800">
                  <div className="sm:hidden mb-4 inline-flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500 text-xl text-white">
                    3️⃣
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                    결과 확인하고 미션 시작하기
                  </h3>
                  <p className="mt-2 text-gray-600 dark:text-gray-300">
                    “또래와 비슷한 수준이에요” 같은 안내와 함께, 이어서 할 수 있는 짧은 미션을 추천해 드려요.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Trust Section with Stats */}
      <section className="px-4 py-20 sm:py-28">
        <div className="mx-auto max-w-6xl">
          <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
            <div>
              <h2 className="text-3xl font-bold text-gray-900 sm:text-4xl dark:text-white">
                안심하고 사용할 수 있도록
              </h2>
              <p className="mt-4 text-lg text-gray-600 dark:text-gray-300">
                부모님의 마음을 가장 먼저 생각합니다.
              </p>

              <div className="mt-8 space-y-6">
                <div className="flex gap-4">
                  <div className="mt-1 flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-xl dark:bg-emerald-900/50">
                    🔒
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900 dark:text-white">
                      아이 목소리 원본은 저장하지 않아요
                    </h3>
                    <p className="mt-1 text-gray-600 dark:text-gray-300">
                      음성은 텍스트로 바뀐 뒤 그 텍스트와 점수만 안전하게 다뤄요. 개인정보 처리방침도 확인해보세요.
                    </p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="mt-1 flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-amber-100 text-xl dark:bg-amber-900/50">
                    🌱
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900 dark:text-white">
                      의료적 평가가 아닌 보조 도구예요
                    </h3>
                    <p className="mt-1 text-gray-600 dark:text-gray-300">
                      본 서비스는 의료적 평가를 제공하지 않으며, 발달이 우려되는 경우 전문가 상담을 권장해 드려요.
                    </p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="mt-1 flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-violet-100 text-xl dark:bg-violet-900/50">
                    💡
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900 dark:text-white">
                      무가입으로도 시작 가능해요
                    </h3>
                    <p className="mt-1 text-gray-600 dark:text-gray-300">
                      회원가입 없이 5분 발음 확인을 체험해보고, 마음에 들면 그때 가입해도 돼요.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-6">
              <div className="rounded-3xl bg-gradient-to-br from-emerald-500 to-emerald-600 p-8 text-center text-white shadow-xl">
                <div className="text-5xl font-extrabold">2-7</div>
                <p className="mt-2 text-emerald-100">대상 연령 (세)</p>
              </div>
              <div className="rounded-3xl bg-gradient-to-br from-sky-500 to-sky-600 p-8 text-center text-white shadow-xl">
                <div className="text-5xl font-extrabold">5</div>
                <p className="mt-2 text-sky-100">분만에 확인</p>
              </div>
              <div className="rounded-3xl bg-gradient-to-br from-violet-500 to-violet-600 p-8 text-center text-white shadow-xl">
                <div className="text-5xl font-extrabold">1-3</div>
                <p className="mt-2 text-violet-100">분 매일 미션</p>
              </div>
              <div className="rounded-3xl bg-gradient-to-br from-amber-500 to-amber-600 p-8 text-center text-white shadow-xl">
                <div className="text-5xl font-extrabold">0</div>
                <p className="mt-2 text-amber-100">원 음성 저장</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative overflow-hidden bg-gradient-to-r from-emerald-600 via-emerald-500 to-emerald-600 px-4 py-20 sm:py-28">
        <div className="absolute inset-0 opacity-20">
          <div className="absolute -top-40 left-0 h-80 w-80 rounded-full bg-white/30 blur-3xl"></div>
          <div className="absolute -bottom-40 right-0 h-80 w-80 rounded-full bg-white/20 blur-3xl"></div>
        </div>

        <div className="relative mx-auto max-w-4xl text-center">
          <h2 className="text-3xl font-extrabold text-white sm:text-4xl md:text-5xl">
            오늘, 아이의 발음을 확인하세요
          </h2>
          <p className="mt-4 text-lg text-emerald-100">
            회원가입 없이 무료로 5분 만에 시작할 수 있어요.
          </p>
          
          <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link
              href="/diagnose"
              className="group inline-flex items-center justify-center rounded-2xl bg-white px-10 py-5 text-lg font-bold text-emerald-600 shadow-xl shadow-emerald-900/20 transition hover:bg-gray-100 hover:shadow-2xl"
            >
              무료로 5분 발음 확인 시작하기
              <svg className="ml-3 h-6 w-6 transition-transform group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
              </svg>
            </Link>
            <Link
              href="/login"
              className="inline-flex items-center justify-center rounded-2xl border-2 border-white/70 bg-white/10 px-10 py-5 text-lg font-semibold text-white backdrop-blur-sm transition hover:bg-white/20"
            >
              이메일로 가입하고 기록 이어가기
            </Link>
          </div>

          <p className="mt-8 text-sm text-emerald-100">
            💡 가입하면 무가입으로 모은 별과 결과가 새 계정에 그대로 옮겨져요.
          </p>
        </div>
      </section>

      {/* FAQ */}
      <section className="px-4 py-20 sm:py-28">
        <div className="mx-auto max-w-3xl">
          <div className="text-center">
            <h2 className="text-3xl font-bold text-gray-900 sm:text-4xl dark:text-white">
              자주 묻는 질문
            </h2>
          </div>

          <div className="mt-12 space-y-4">
            {LANDING_FAQ.map((faq, idx) => (
              <details key={idx} className="group rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-bold text-gray-900 dark:text-white">
                  <span>{faq.q}</span>
                  <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-gray-100 text-lg transition-transform group-open:rotate-45 dark:bg-gray-800">
                    +
                  </span>
                </summary>
                <p className="mt-4 text-gray-600 dark:text-gray-300">
                  {faq.a}
                </p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* Institution Inquiry */}
      <section className="bg-gray-50 px-4 py-12 dark:bg-gray-900/60">
        <div className="mx-auto max-w-4xl text-center">
          <p className="text-gray-600 dark:text-gray-400">
            어린이집·유치원 등 기관에서 단체 도입이 궁금하신가요?{" "}
            <a
              href={`mailto:${contactEmail}`}
              className="font-semibold text-emerald-600 underline underline-offset-4 hover:text-emerald-700 dark:text-emerald-400 dark:hover:text-emerald-300"
            >
              기관 문의하기 →
            </a>
          </p>
        </div>
      </section>
    </main>
  );
}
