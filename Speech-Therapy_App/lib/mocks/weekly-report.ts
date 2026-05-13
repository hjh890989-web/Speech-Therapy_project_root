// FR-Q-005 — 주간 리포트 mock 데이터 (Sprint 1 단순화 DEMO).
// 실 데이터 연결은 API-010 (Auth) + cookie 기반 user.id 추적 후 별도 PR.

import type { ScoreTrend } from "@/lib/weekly-report";
import type { WeeklyReportPayload } from "@/lib/schemas/weekly-report";

// 7일치 추이 (월요일~일요일). 음소별 차이 + 점진적 상승.
const sampleScoreTrend: ScoreTrend = [
  { date: "2026-05-05", phoneme: "ㅅ", articulation: 62, linguistic: 65, acoustic: 60, peerPercentile: 55 },
  { date: "2026-05-06", phoneme: "ㅅ", articulation: 65, linguistic: 67, acoustic: 63, peerPercentile: 60 },
  { date: "2026-05-07", phoneme: "ㄱ", articulation: 70, linguistic: 72, acoustic: 68, peerPercentile: 65 },
  { date: "2026-05-08", phoneme: "ㄱ", articulation: 72, linguistic: 74, acoustic: 70, peerPercentile: 70 },
  { date: "2026-05-09", phoneme: "ㅈ", articulation: 75, linguistic: 76, acoustic: 73, peerPercentile: 75 },
  { date: "2026-05-10", phoneme: "ㅈ", articulation: 78, linguistic: 79, acoustic: 76, peerPercentile: 80 },
  { date: "2026-05-11", phoneme: "ㅅ", articulation: 82, linguistic: 83, acoustic: 80, peerPercentile: 85 },
];

export const mockWeeklyReportPayload: WeeklyReportPayload = {
  id: "33333333-3333-4333-8333-333333333333",
  userId: "11111111-1111-4111-8111-111111111111",
  year: 2026,
  weekNumber: 20,
  scoreTrend: sampleScoreTrend,
  articulationAvg: 72,
  linguisticAvg: 74,
  acousticAvg: 70,
  peerPercentileAvg: 70,
  sessionCount: 7,
  predictedNextScore: 76,
  predictionConfidence: 0.78,
  generatedAt: new Date("2026-05-12T00:00:00Z").toISOString(),
};
