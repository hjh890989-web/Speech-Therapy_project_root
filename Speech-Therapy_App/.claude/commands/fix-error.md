---
description: 에러/예외 발생 시 7단계 구조화된 진단·수정 프로세스 수행
argument-hint: [에러 메시지 또는 파일:라인]
allowed-tools: Read, Edit, Grep, Glob, Bash
---

# Error Fixing Process


대상: **$ARGUMENTS**

아래 7단계를 순서대로 수행하고, 각 단계의 결과를 짧게 요약해 보고하세요.

## Step 1: 현상 정의 (Phenomenon Definition)
- 관찰된 증상을 명확하게 기술한다.
- 재현 조건, 에러 메시지 원문, 스택트레이스를 그대로 옮긴다.

## Step 2: 맥락·범위 탐색 (Contextual Scope Exploration)
- 관련 파일, 데이터 흐름, 함수 호출 경로를 지도화한다.
- `Grep`/`Glob` 으로 연관 심볼과 사용처를 확인한다.

## Step 3: 문제 핵심 특정 (Problem Core Specification)
- 근본 원인을 증거 기반으로 좁혀 특정한다.
- 가설이 여러 개라면 각각의 근거와 반증을 나열한다.

## Step 4: 중급 개발자 눈높이 요약 (Summarize for Mid-level Developers)
- 전문용어를 최소화하고 쉬운 언어로 설명한다.
- "무엇이 왜 잘못되었는가" 를 한 문단으로 요약한다.

## Step 5: 수정 포인트 강조 (Highlight Fix Points)
- 수정이 필요한 부분과 이유를 목록화한다.
- 각 포인트에 파일:라인 위치를 명시한다.

## Step 6: 코드 수정 수행 (Perform Code Fix)
- 원저자의 의도를 보존하며 깔끔하게 수정한다.
- 불필요한 리팩터링을 같이 섞지 않는다 (한 번에 한 가지 일).

## Step 7: 후속 개선 제안 (Propose Follow-up Improvements)
- 테스트 추가, 로깅 보강, 리팩터링 등 후속 개선을 제안한다.
- 당장 반영하지는 않고 별도 작업으로 제시한다.
