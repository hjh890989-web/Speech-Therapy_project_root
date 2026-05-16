---
description: 프로젝트 빌드 프로세스와 환경변수 설정을 점검·문서화
argument-hint: [선택: dev | prod]
allowed-tools: Read, Edit, Write, Grep, Glob, Bash
---

# Build & Environment Setup


대상 환경: **$ARGUMENTS** (미지정 시 `dev` 로 간주)

## 1. 현재 파일 구조 확인
다음을 실행해 현재 구조를 파악하세요:
```bash
tree -L 4 -a -I 'node_modules|.git|__pycache__|.DS_Store|.pytest_cache|.vscode'
```

## 2. 빌드 프로세스 점검
- 사용 중인 언어/프레임워크에 맞는 빌드 도구를 확인한다
  (Gradle, npm/yarn/pnpm, Maven, Cargo 등).
- 빌드 스크립트(`build.gradle`, `package.json`, …) 의 주요 태스크를 나열한다.
- 빌드 캐시·병렬 실행 옵션이 활성화되어 있는지 확인한다.

## 3. 개발 환경변수
- 루트에 `.env` 파일이 있는지 확인하고, 없다면 `.env.example` 기반으로 생성 가이드를 제공한다.
- 민감 값(API key, DB password 등) 은 절대 커밋되지 않도록 `.gitignore` 를 확인한다.
- 필요한 키 목록을 문서화한다.

## 4. 배포 환경변수
- 프로덕션용 설정 파일(`.env.production`, `application-prod.yml` 등) 의 키 목록을 확인한다.
- 비밀 값은 배포 환경의 Secret Manager(예: AWS SSM, GCP Secret Manager, K8s Secret) 에 위치시킨다.

## 5. 산출물
- 누락된 환경변수, 설정 불일치, 빌드 취약점을 보고한다.
- 필요한 경우 `.env.example` 또는 `README.md` 의 Setup 섹션을 업데이트한다.
