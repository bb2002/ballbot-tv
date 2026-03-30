# 구현 계획: ballbot-tv

## 개요

요구사항 문서와 기술 설계 문서를 기반으로 ballbot-tv 서비스를 단계적으로 구현합니다.
각 태스크는 이전 태스크 위에 점진적으로 쌓이며, 마지막에 모든 컴포넌트를 연결합니다.
기술 스택: Next.js (App Router) + Cloudflare Workers, D1 + Drizzle ORM, R2, KV, Resend, Agora RTC, shadcn/ui

## 태스크

- [ ] 1. 프로젝트 기반 설정
  - Next.js App Router + `@opennextjs/cloudflare` 프로젝트 초기화
  - Cloudflare D1, R2, KV 바인딩 설정 (`wrangler.toml`)
  - Drizzle ORM 설치 및 `src/db/schema.ts` 작성 (users, streams, subscriptions 테이블)
  - Drizzle 마이그레이션 파일 생성
  - shadcn/ui 초기화 및 필요한 컴포넌트 설치 (Button, Input, Label, Form, Dialog, AlertDialog, DropdownMenu, Select, Avatar, Badge, Skeleton, Sheet, Tabs, Sonner)
  - `ThemeProvider` 설정 (다크/라이트 모드)
  - 공통 API 응답 타입 `ApiResponse<T>` 정의 (`src/types/api.ts`)
  - _요구사항: 전체_

- [ ] 2. 인증 시스템 구현
  - [ ] 2.1 유효성 검증 함수 구현
    - `src/lib/validation.ts`에 `validateUsername`, `validatePassword`, `validatePasswordMatch`, `validateStreamTitle` 함수 작성
    - zod 스키마로 회원가입 입력 검증 정의
    - _요구사항: 1.2, 1.3, 1.4, 4.7_

  - [ ]* 2.2 유효성 검증 속성 기반 테스트 작성
    - **속성 1: 아이디 유효성 검증** — `validateUsername`이 영문·숫자 4-20자만 통과시키는지 검증
    - **속성 2: 비밀번호 유효성 검증** — `validatePassword`가 8자 이상·영문·숫자·특수문자 조건을 모두 검증하는지 확인
    - **속성 3: 비밀번호 일치 검증** — `validatePasswordMatch`가 두 값이 다를 때 반드시 오류를 반환하는지 확인
    - **속성 12: 방송 제목 미입력 시 방송 시작 차단** — `validateStreamTitle`이 공백 문자열을 모두 거부하는지 확인
    - **검증 대상: 요구사항 1.2, 1.3, 1.4, 4.7**

  - [ ] 2.3 이메일 서비스 구현
    - `src/lib/email.ts`에 `sendVerificationCode(email, code)` 함수 작성 (Resend API 연동)
    - _요구사항: 1.6_

  - [ ] 2.4 Auth_Service 핵심 로직 구현
    - `src/lib/auth.ts`에 `signUp`, `verifyEmail`, `signIn`, `signOut`, `getSession` 함수 작성
    - `jose` 라이브러리로 JWT 서명 및 `HttpOnly` 쿠키 세션 관리
    - KV에 인증번호 저장 (TTL 600초, 키: `email_verification:{userId}`)
    - bcrypt 계열 라이브러리로 비밀번호 해싱 (Cloudflare Workers 호환)
    - _요구사항: 1.6, 1.7, 1.8, 1.9, 1.10, 1.11, 2.1, 2.2, 2.3_

  - [ ] 2.5 인증 API Route 구현
    - `POST /api/auth/signup` — 회원가입 (중복 아이디 검사 포함)
    - `POST /api/auth/verify` — 이메일 인증번호 확인
    - `POST /api/auth/signin` — 로그인
    - `POST /api/auth/signout` — 로그아웃
    - _요구사항: 1.1~1.11, 2.1~2.3_

  - [ ]* 2.6 인증번호 재발송 무효화 속성 테스트 작성
    - **속성 4: 인증번호 재발송 시 이전 코드 무효화** — 재발송 후 이전 코드로 인증 시도 시 반드시 실패하는지 확인
    - **검증 대상: 요구사항 1.11**

- [ ] 3. 회원가입 및 로그인 UI 구현
  - [ ] 3.1 회원가입 페이지 구현
    - `src/app/(auth)/signup/page.tsx` 작성
    - react-hook-form + zod로 폼 유효성 검증 (아이디, 비밀번호, 비밀번호 확인, 채널이름, 이메일)
    - 인증번호 입력 단계 UI (재발송 버튼 포함)
    - 각 오류 메시지 표시 (1.4, 1.5, 1.9, 1.10 오류 문구)
    - _요구사항: 1.1~1.11_

  - [ ] 3.2 로그인 페이지 구현
    - `src/app/(auth)/signin/page.tsx` 작성
    - 아이디/비밀번호 폼, 오류 메시지 표시
    - _요구사항: 2.1, 2.2_

- [ ] 4. 레이아웃 및 네비게이션 구현
  - [ ] 4.1 루트 레이아웃 및 사이드바 구현
    - `src/app/layout.tsx`에 `ThemeProvider`, `Toaster` 설정
    - `src/components/layout/Sidebar.tsx` 작성 — 홈 링크, 구독 목록 (로그인 상태에 따라 조건부 렌더링)
    - 데스크톱: 240px 고정 사이드바 / 태블릿: 아이콘만 / 모바일: Sheet 드로어
    - _요구사항: 8.1, 8.2, 8.3, 8.4_

  - [ ] 4.2 상단 네비게이션 바 구현
    - `src/components/layout/Navbar.tsx` 작성
    - 로그인 상태: 로그아웃 버튼 + 마이페이지 링크 표시
    - 비로그인 상태: 로그인 + 회원가입 버튼 표시
    - 모바일: 검색 아이콘 + 햄버거 메뉴
    - _요구사항: 2.4, 2.5_

  - [ ]* 4.3 네비게이션 상태 속성 테스트 작성
    - **속성 11: 로그인 상태에 따른 네비게이션 표시** — 로그인/비로그인 상태가 상호 배타적으로 UI 요소를 표시하는지 확인
    - **검증 대상: 요구사항 2.4, 2.5**

- [ ] 5. 체크포인트 — 모든 테스트 통과 확인
  - 모든 테스트가 통과하는지 확인하고, 문제가 있으면 사용자에게 질문합니다.

- [ ] 6. 스토리지 서비스 및 프로필 사진 관리 구현
  - [ ] 6.1 Storage_Service 구현
    - `src/lib/storage.ts`에 `uploadProfileImage`, `uploadThumbnail`, `getPublicUrl` 함수 작성
    - 파일 형식(JPEG, PNG, WebP) 및 크기(5MB 이하) 검증 로직 포함
    - R2 키 구조: `profiles/{userId}/{timestamp}.{ext}`, `thumbnails/{streamId}/{timestamp}.webp`
    - _요구사항: 3.1, 3.2, 3.3, 3.4, 3.5_

  - [ ]* 6.2 파일 검증 속성 테스트 작성
    - **속성 5: 프로필 사진 파일 형식 및 크기 검증** — JPEG·PNG·WebP이고 5MB 이하인 경우만 허용하는지 확인
    - **검증 대상: 요구사항 3.2, 3.3, 3.4**

  - [ ] 6.3 프로필 사진 업로드 API 및 UI 구현
    - `POST /api/upload/profile` API Route 작성
    - `POST /api/upload/thumbnail` API Route 작성
    - 마이페이지(`src/app/mypage/page.tsx`)에 프로필 사진 업로드 UI 구현
    - `Avatar` 컴포넌트로 프로필 사진 표시 (기본 이미지 fallback 포함)
    - _요구사항: 3.1~3.6_

- [ ] 7. 스트리밍 서비스 핵심 로직 구현
  - [ ] 7.1 Streaming_Service 서버 로직 구현
    - `src/lib/streaming.ts`에 `generateAgoraToken`, `createStream`, `endStream`, `getActiveStreams` 함수 작성
    - `agora-token` 패키지로 RTC 토큰 생성 (PUBLISHER/SUBSCRIBER 역할 분리)
    - D1에 Stream 레코드 CRUD
    - _요구사항: 4.1, 4.14, 4.15_

  - [ ] 7.2 스트리밍 API Route 구현
    - `POST /api/agora/token` — Agora RTC 토큰 발급
    - `POST /api/streams` — 방송 생성
    - `PATCH /api/streams/[id]` — 방송 상태 업데이트 (종료)
    - `GET /api/streams/[id]/viewer-count` — 시청자 수 조회
    - _요구사항: 4.1, 4.9, 4.10_

  - [ ] 7.3 스트림 필터링 및 정렬 유틸 구현
    - `src/lib/stream-utils.ts`에 `filterActivePublicStreams`, `sortByViewerCount`, `searchStreams` 함수 작성
    - _요구사항: 4.14, 4.15, 6.3, 6.4, 7.1, 7.4_

  - [ ]* 7.4 스트림 목록 속성 테스트 작성
    - **속성 6: 방송 목록에는 진행 중인 공개 스트림만 포함** — `filterActivePublicStreams`가 live·public 스트림만 반환하는지 확인
    - **속성 7: 방송 목록 정렬 순서** — `sortByViewerCount`가 시청자 수 내림차순을 항상 보장하는지 확인
    - **속성 10: 방송 제목 검색 포함 여부** — `searchStreams`가 검색어 포함 스트림만 반환하는지 확인
    - **검증 대상: 요구사항 4.14, 4.15, 6.3, 6.4, 7.1, 7.4**

- [ ] 8. 송출 스튜디오 클라이언트 컴포넌트 구현
  - [ ] 8.1 AgoraProvider 구현
    - `src/components/streaming/AgoraProvider.tsx` 작성
    - `dynamic import + ssr: false`로 `AgoraRTCProvider` 래핑
    - _요구사항: 4.1_

  - [ ] 8.2 방송 시작 폼 구현
    - `src/app/studio/page.tsx`에 방송 시작 전 설정 폼 작성 (방송 제목 필수, 설명 선택, 공개/비공개)
    - 방송 제목 미입력 시 오류 메시지 표시 및 방송 시작 차단
    - _요구사항: 4.6, 4.7_

  - [ ] 8.3 StreamerStudio 컴포넌트 구현
    - `src/components/streaming/StreamerStudio.tsx` 작성 (`dynamic import + ssr: false`)
    - 카메라/마이크 트랙 생성 및 publish
    - 화면 공유 (별도 클라이언트 인스턴스)
    - 마이크/카메라 토글 버튼 (요구사항 4.3, 4.4)
    - 카메라 소스 선택 드롭다운 (연결된 카메라 목록 + 화면 공유, 요구사항 4.5)
    - 송출 화면 미리보기 (요구사항 4.2)
    - 화면 좌하단: 현재 시간 + 방송 제목 오버레이 (요구사항 4.8)
    - 화면 우상단: 시청자 수 표시 (5초 폴링, 요구사항 4.9, 4.10)
    - 방송 종료 버튼 + AlertDialog 확인 (요구사항 4.11, 4.12)
    - 방송 시작 시 썸네일 캡처 후 `/api/upload/thumbnail`로 업로드 (요구사항 4.13)
    - Agora 토큰 갱신 처리 (`token-privilege-will-expire`, `token-privilege-did-expire`)
    - _요구사항: 4.2~4.13_

- [ ] 9. 방송 시청 클라이언트 컴포넌트 구현
  - [ ] 9.1 StreamViewer 컴포넌트 구현
    - `src/components/streaming/StreamViewer.tsx` 작성 (`dynamic import + ssr: false`)
    - `SUBSCRIBER` 역할로 Agora 채널 참여
    - `user-published` 이벤트로 영상/음성 구독
    - 방송 종료 감지 후 "방송이 종료되었습니다" 메시지 표시 및 홈으로 이동
    - _요구사항: 5.1, 5.9_

  - [ ] 9.2 방송 시청 페이지 구현
    - `src/app/watch/[id]/page.tsx` 작성
    - 비공개 스트림 접근 차단 (비인가 사용자 → 홈으로 리다이렉트)
    - 영상 플레이어 (메인) + 우측 다른 방송 목록 레이아웃
    - 영상 하단: 스트리머 프로필 사진, 채널이름, 시청자 수
    - 구독 버튼 (Guest: 비활성화, Member: 활성화)
    - _요구사항: 5.1~5.9_

- [ ] 10. 구독 기능 구현
  - [ ] 10.1 구독 API Route 구현
    - `POST /api/subscriptions` — 채널 구독
    - `DELETE /api/subscriptions` — 구독 취소
    - _요구사항: 5.6, 5.7_

  - [ ]* 10.2 구독 토글 라운드트립 속성 테스트 작성
    - **속성 8: 구독 토글 라운드트립** — 구독 후 구독취소 시 원래 상태로 돌아오는지 확인
    - **검증 대상: 요구사항 5.6, 5.7**

  - [ ] 10.3 구독 UI 연동
    - 방송 시청 페이지의 구독/구독취소 버튼 동작 구현
    - 사이드바 구독 목록 갱신
    - _요구사항: 5.4, 5.5, 5.6, 5.7, 8.2_

- [ ] 11. 홈 화면 및 검색 구현
  - [ ] 11.1 홈 화면 구현
    - `src/app/page.tsx` 작성
    - 진행 중인 공개 스트림 목록 조회 (시청자 수 내림차순)
    - 방송 카드 그리드 (Thumbnail, 방송 제목, 채널이름, 시청자 수)
    - `Skeleton` 컴포넌트로 로딩 상태 표시
    - 반응형 그리드: 모바일 1-2열 / 태블릿 2열 / 데스크톱 4열
    - _요구사항: 6.1~6.4_

  - [ ] 11.2 Search_Service 및 검색 UI 구현
    - `src/lib/search.ts`에 `searchStreams` 함수 작성 (LIKE 쿼리)
    - 검색 결과 페이지 또는 홈 화면 내 검색 결과 표시
    - 검색 결과 없을 때 "검색 결과가 없습니다" 메시지 표시
    - 진행 중인 공개 스트림만 검색 결과에 포함
    - _요구사항: 7.1~7.4_

- [ ] 12. 채널 페이지 구현
  - `src/app/channel/[username]/page.tsx` 작성
  - 스트리머 프로필 사진, 채널이름, 구독자 수 표시
  - 방송 중: 현재 진행 중인 Stream 카드 표시 / 방송 중 아님: "현재 방송 중이지 않습니다" 메시지
  - Member 상태일 때 구독/구독취소 버튼 표시
  - _요구사항: 9.1~9.4_

- [ ] 13. 비공개 스트림 접근 제어 구현
  - [ ] 13.1 접근 제어 미들웨어/서버 로직 구현
    - 방송 시청 페이지 서버 컴포넌트에서 비공개 스트림 접근 검사
    - 비인가 사용자 접근 시 홈으로 리다이렉트
    - _요구사항: 5.8_

  - [ ]* 13.2 비공개 스트림 접근 차단 속성 테스트 작성
    - **속성 9: 비공개 스트림 접근 차단** — 스트리머 본인이 아닌 사용자가 비공개 스트림에 접근 시 반드시 차단되는지 확인
    - **검증 대상: 요구사항 5.8**

- [ ] 14. 체크포인트 — 모든 테스트 통과 확인
  - 모든 테스트가 통과하는지 확인하고, 문제가 있으면 사용자에게 질문합니다.

- [ ] 15. 오류 처리 및 엣지 케이스 보강
  - [ ] 15.1 Agora 연결 오류 처리
    - `connection-state-change` 이벤트 감지 및 재연결 로직 구현
    - 재연결 실패 시 사용자 안내 메시지 표시 (Sonner 토스트)
    - _요구사항: 4.1, 5.1_

  - [ ] 15.2 R2 업로드 실패 처리
    - 프로필 사진/썸네일 업로드 실패 시 오류 토스트 표시
    - 썸네일 업로드 실패가 방송 진행에 영향을 주지 않도록 non-blocking 처리
    - _요구사항: 3.4, 4.13_

  - [ ] 15.3 D1 쿼리 오류 처리
    - API Route에서 Drizzle ORM 쿼리 실패 시 HTTP 500 반환 및 일반 오류 메시지 표시
    - _요구사항: 전체_

- [ ] 16. 최종 체크포인트 — 모든 테스트 통과 확인
  - 모든 테스트가 통과하는지 확인하고, 문제가 있으면 사용자에게 질문합니다.

## 참고

- `*` 표시된 태스크는 선택 사항으로, MVP 빠른 구현 시 건너뛸 수 있습니다.
- 각 태스크는 특정 요구사항을 참조하여 추적 가능성을 보장합니다.
- 속성 기반 테스트는 `fast-check` 라이브러리를 사용하며, 각 테스트는 최소 100회 반복 실행합니다.
- Agora RTC 관련 컴포넌트는 모두 `dynamic import + ssr: false`로 로드합니다.
