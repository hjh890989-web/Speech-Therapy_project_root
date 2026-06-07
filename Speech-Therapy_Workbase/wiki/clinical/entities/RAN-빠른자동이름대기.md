---
type: entity
pillar: clinical
entity_kind: assessment
aliases: [RAN, Rapid Automatized Naming, 빠른 자동 이름대기, 빠른자동이름대기, 빠른 이름대기]
tags: [RAN, 음운처리, 음운인출, 자동화, 난독증, 읽기유창성, NISE-B, 학습장애]
---

# RAN — 빠른 자동 이름대기 (Rapid Automatized Naming)

**RAN(Rapid Automatized Naming)**은 친숙한 시각 자극(사물·색깔·숫자·글자)을 **연속으로 빠르게 이름 대는 데 걸리는 시간**을 측정하는 과제로, **음운 정보의 인출 자동화(retrieval fluency)**를 평가한다. 음운인식·음운기억과 함께 **음운 처리(phonological processing)의 3대 구성요소** 중 하나이며(일반 지식), **읽기 유창성·난독증의 핵심 예측 지표**로 널리 쓰인다.

## NISE-B·ACT 내 위치

- [[clinical/concepts/NISE-B-ACT-학습장애검사]] **읽기 검사 § 음운과 음절**(개정안) / § 음운처리(원판)의 정식 소검사.
- 개정안(2025) 기준 **사물·색깔** 자극으로 구성, **1분 동안 실시**([[clinical/sources/2026-06-07-NISE-BACT-개정연구보고서-2-4년차]] <표Ⅱ-1>).
- 실물 책자(원판)의 색깔 자극판 = `IMG_2749`(여러 색 사각형 배열) ([[clinical/sources/2026-06-07-NISE-BACT-읽기-쓰기-검사방법]]).

## 임상 의의

- **이중결손 가설(double-deficit, Wolf & Bowers 1999, 일반 지식)** — 음운인식 결손 + RAN 결손이 동시에 있는 아동이 난독증 위험이 가장 높음.
- RAN은 음운인식과 부분적으로 독립된 경로로 읽기 유창성을 예측 → [[clinical/concepts/학습장애-언어재활]](난독증·음운인식↔읽기) 평가의 보완 지표.

## Product 정합

- [[product/concepts/MVP-feature-spec]] § F1-a — 자동화된 인출 속도·명명 = 말 산출 자동화(acoustic·articulation) 영역의 부분 영감(단, 학습장애 진단 용어는 [[product/concepts/architecture-decisions]] § ADR-04로 차단).

## 관련 페이지

- [[clinical/concepts/NISE-B-ACT-학습장애검사]] · [[clinical/concepts/학습장애-언어재활]]
- [[clinical/sources/2026-06-07-NISE-BACT-개정연구보고서-2-4년차]] · [[clinical/sources/2026-06-07-NISE-BACT-읽기-쓰기-검사방법]]
