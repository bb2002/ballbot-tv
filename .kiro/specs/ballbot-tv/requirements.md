# 요구사항 문서

## 소개

ballbot-tv는 브라우저만으로 실시간 동영상 스트리밍 송출 및 시청이 가능한 서비스입니다.
OBS 같은 전용 프로그램 없이 브라우저에서 바로 방송을 시작할 수 있으며, 비회원도 방송을 시청할 수 있습니다.

기술 스택: Next.js (Cloudflare Workers), Cloudflare D1 + Drizzle ORM, Cloudflare R2, Cloudflare KV, Resend, Agora RTC

---

## 용어 정의

- **System**: ballbot-tv 서비스 전체
- **Auth_Service**: 회원가입 및 인증을 담당하는 모듈
- **Email_Service**: Resend를 통해 이메일을 발송하는 모듈
- **Streaming_Service**: Agora RTC를 통해 실시간 스트리밍을 처리하는 모듈
- **Storage_Service**: Cloudflare R2를 통해 파일을 저장하는 모듈
- **Search_Service**: 방송 제목 및 설명을 기준으로 검색을 처리하는 모듈
- **Streamer**: 방송을 송출하는 회원 사용자
- **Viewer**: 방송을 시청하는 사용자 (비회원 또는 회원)
- **Guest**: 로그인하지 않은 비회원 사용자
- **Member**: 회원가입 및 로그인을 완료한 사용자
- **Channel**: 스트리머의 방송 공간 (채널명, 프로필 사진 포함)
- **Stream**: 진행 중인 실시간 방송 세션
- **Thumbnail**: 방송 시작 시 자동 생성되는 스크린샷 이미지
- **Verification_Code**: 이메일로 발송되는 6자리 인증번호

---

## 요구사항

### 요구사항 1: 회원가입

**사용자 스토리:** 사용자로서, 아이디·비밀번호·채널이름을 입력하고 이메일 인증을 완료하여 회원가입을 하고 싶다. 그래야 방송 시청 및 채널 구독 등의 회원 기능을 이용할 수 있다.

#### 인수 기준

1. THE Auth_Service SHALL 회원가입 폼에서 아이디, 비밀번호, 비밀번호 확인, 채널이름, 이메일 필드를 제공한다.
2. WHEN 사용자가 회원가입 폼을 제출하면, THE Auth_Service SHALL 아이디가 영문·숫자 조합 4자 이상 20자 이하인지 검증한다.
3. WHEN 사용자가 회원가입 폼을 제출하면, THE Auth_Service SHALL 비밀번호가 8자 이상이며 영문·숫자·특수문자를 각각 1자 이상 포함하는지 검증한다.
4. WHEN 비밀번호와 비밀번호 확인 값이 일치하지 않으면, THE Auth_Service SHALL "비밀번호가 일치하지 않습니다" 오류 메시지를 표시한다.
5. WHEN 이미 사용 중인 아이디로 가입을 시도하면, THE Auth_Service SHALL "이미 사용 중인 아이디입니다" 오류 메시지를 표시한다.
6. WHEN 유효한 회원가입 폼이 제출되면, THE Email_Service SHALL 입력된 이메일 주소로 6자리 Verification_Code를 발송한다.
7. WHEN Verification_Code가 발송되면, THE Auth_Service SHALL Verification_Code의 유효 시간을 10분으로 설정한다.
8. WHEN 사용자가 올바른 Verification_Code를 입력하면, THE Auth_Service SHALL 회원가입을 완료하고 로그인 상태로 전환한다.
9. IF 사용자가 만료된 Verification_Code를 입력하면, THEN THE Auth_Service SHALL "인증번호가 만료되었습니다. 다시 요청해주세요" 오류 메시지를 표시한다.
10. IF 사용자가 잘못된 Verification_Code를 입력하면, THEN THE Auth_Service SHALL "인증번호가 올바르지 않습니다" 오류 메시지를 표시한다.
11. WHEN 사용자가 인증번호 재발송을 요청하면, THE Email_Service SHALL 새로운 Verification_Code를 발송하고 이전 코드를 무효화한다.

---

### 요구사항 2: 로그인 및 인증 세션

**사용자 스토리:** Member로서, 아이디와 비밀번호로 로그인하여 회원 전용 기능을 이용하고 싶다.

#### 인수 기준

1. WHEN 사용자가 올바른 아이디와 비밀번호를 입력하면, THE Auth_Service SHALL 인증 세션을 생성하고 홈 화면으로 이동시킨다.
2. IF 사용자가 잘못된 아이디 또는 비밀번호를 입력하면, THEN THE Auth_Service SHALL "아이디 또는 비밀번호가 올바르지 않습니다" 오류 메시지를 표시한다.
3. WHEN Member가 로그아웃을 요청하면, THE Auth_Service SHALL 인증 세션을 종료하고 홈 화면으로 이동시킨다.
4. WHILE Member가 로그인 상태이면, THE System SHALL 네비게이션에 로그아웃 버튼과 마이페이지 링크를 표시한다.
5. WHILE 사용자가 로그인하지 않은 상태이면, THE System SHALL 네비게이션에 로그인 및 회원가입 버튼을 표시한다.

---

### 요구사항 3: 프로필 사진 관리

**사용자 스토리:** Member로서, 프로필 사진을 업로드하여 내 채널을 꾸미고 싶다.

#### 인수 기준

1. THE Storage_Service SHALL 프로필 사진을 Cloudflare R2에 저장한다.
2. WHEN Member가 프로필 사진을 업로드하면, THE Storage_Service SHALL 이미지 파일 형식(JPEG, PNG, WebP)인지 검증한다.
3. WHEN Member가 프로필 사진을 업로드하면, THE Storage_Service SHALL 파일 크기가 5MB 이하인지 검증한다.
4. IF 업로드된 파일이 허용되지 않는 형식이거나 5MB를 초과하면, THEN THE Storage_Service SHALL "지원하지 않는 파일 형식이거나 파일 크기가 초과되었습니다" 오류 메시지를 표시한다.
5. WHEN 프로필 사진 업로드가 완료되면, THE System SHALL 기존 프로필 사진을 새 사진으로 교체하여 표시한다.
6. WHILE Member가 프로필 사진을 등록하지 않은 상태이면, THE System SHALL 기본 프로필 이미지를 표시한다.

---

### 요구사항 4: 방송 송출 (스트리밍)

**사용자 스토리:** Streamer로서, 브라우저에서 바로 방송을 시작하고 시청자에게 실시간으로 영상을 전달하고 싶다.

#### 인수 기준

1. WHEN Member가 방송 시작을 요청하면, THE Streaming_Service SHALL Agora RTC를 통해 실시간 스트리밍 채널을 생성한다.
2. WHEN 방송이 시작되면, THE Streaming_Service SHALL 송출 중인 화면을 Streamer에게 미리보기로 표시한다.
3. THE Streaming_Service SHALL 마이크 켜기/끄기 토글 버튼을 제공한다.
4. THE Streaming_Service SHALL 카메라 켜기/끄기 토글 버튼을 제공한다.
5. THE Streaming_Service SHALL 연결된 카메라 목록과 화면 공유 옵션을 포함한 카메라 소스 선택 기능을 제공한다.
6. WHEN Streamer가 방송을 시작하기 전에, THE Streaming_Service SHALL 방송 제목(필수), 방송 설명(선택), 공개/비공개 여부 설정 폼을 제공한다.
7. IF 방송 제목이 입력되지 않으면, THEN THE Streaming_Service SHALL "방송 제목을 입력해주세요" 오류 메시지를 표시하고 방송 시작을 차단한다.
8. WHEN 방송이 시작되면, THE Streaming_Service SHALL 화면 좌측 하단에 현재 시간과 방송 제목을 표시한다.
9. WHEN 방송이 시작되면, THE Streaming_Service SHALL 화면 우측 상단에 현재 시청자 수를 표시한다.
10. WHEN 시청자 수가 변경되면, THE Streaming_Service SHALL 시청자 수 표시를 5초 이내에 갱신한다.
11. THE Streaming_Service SHALL 화면 중앙 하단에 방송 종료 버튼을 제공한다.
12. WHEN Streamer가 방송 종료 버튼을 클릭하면, THE Streaming_Service SHALL 확인 다이얼로그를 표시한 후 방송을 종료한다.
13. WHEN 방송이 시작되면, THE Streaming_Service SHALL 방송 화면의 스크린샷을 Thumbnail로 생성하여 Storage_Service를 통해 R2에 저장한다.
14. WHILE 방송이 진행 중이면, THE System SHALL 해당 Stream을 홈 화면의 방송 목록에 표시한다.
15. WHEN 방송이 종료되면, THE System SHALL 해당 Stream을 홈 화면의 방송 목록에서 제거한다.

---

### 요구사항 5: 방송 시청

**사용자 스토리:** Viewer로서, 진행 중인 방송을 선택하여 실시간으로 시청하고 싶다.

#### 인수 기준

1. WHEN Viewer가 방송을 선택하면, THE Streaming_Service SHALL Agora RTC를 통해 해당 Stream에 접속하여 영상을 재생한다.
2. THE System SHALL 시청 화면에서 큰 영상 플레이어와 우측에 다른 진행 중인 방송 목록을 함께 표시한다.
3. THE System SHALL 영상 하단에 Streamer의 프로필 사진, 채널이름, 현재 시청자 수를 표시한다.
4. WHILE Viewer가 Guest 상태이면, THE System SHALL 채널 구독 버튼을 비활성화 상태로 표시한다.
5. WHILE Viewer가 Member 상태이면, THE System SHALL 채널 구독 버튼을 활성화 상태로 표시한다.
6. WHEN Member가 채널 구독 버튼을 클릭하면, THE System SHALL 해당 Channel을 Member의 구독 목록에 추가한다.
7. WHEN Member가 이미 구독한 채널의 구독 버튼을 클릭하면, THE System SHALL 구독을 취소하고 구독 목록에서 제거한다.
8. IF 비공개 Stream에 비인가 Viewer가 접근하면, THEN THE System SHALL 접근을 차단하고 홈 화면으로 이동시킨다.
9. WHEN Viewer가 시청 중인 방송이 종료되면, THE System SHALL "방송이 종료되었습니다" 메시지를 표시하고 홈 화면으로 이동시킨다.

---

### 요구사항 6: 홈 화면

**사용자 스토리:** Viewer로서, 현재 진행 중인 방송 목록을 한눈에 보고 원하는 방송을 선택하고 싶다.

#### 인수 기준

1. THE System SHALL 홈 화면에 좌측 네비게이션, 상단 검색바, 방송 Thumbnail 그리드를 표시한다.
2. THE System SHALL 각 방송 카드에 Thumbnail 이미지, 방송 제목, Streamer 채널이름, 현재 시청자 수를 표시한다.
3. THE System SHALL 진행 중인 공개 Stream만 홈 화면 그리드에 표시한다.
4. WHEN 홈 화면이 로드되면, THE System SHALL 시청자 수 기준 내림차순으로 방송 목록을 정렬하여 표시한다.

---

### 요구사항 7: 방송 검색

**사용자 스토리:** Viewer로서, 방송 제목이나 설명으로 원하는 방송을 검색하고 싶다.

#### 인수 기준

1. WHEN 사용자가 검색어를 입력하고 검색을 실행하면, THE Search_Service SHALL 방송 제목과 방송 설명을 대상으로 LIKE 쿼리를 실행한다.
2. THE Search_Service SHALL 검색 결과를 홈 화면과 동일한 방송 카드 형식으로 표시한다.
3. WHEN 검색 결과가 없으면, THE Search_Service SHALL "검색 결과가 없습니다" 메시지를 표시한다.
4. THE Search_Service SHALL 진행 중인 공개 Stream만 검색 결과에 포함한다.

---

### 요구사항 8: 네비게이션

**사용자 스토리:** 사용자로서, 홈과 구독 목록 등 주요 화면으로 빠르게 이동하고 싶다.

#### 인수 기준

1. THE System SHALL 좌측 네비게이션에 홈 링크를 항상 표시한다.
2. WHILE Member가 로그인 상태이면, THE System SHALL 좌측 네비게이션에 구독 중인 Channel 목록을 표시한다.
3. WHILE 사용자가 로그인하지 않은 상태이면, THE System SHALL 구독 목록 영역에 "로그인하면 구독 목록을 볼 수 있습니다" 안내 문구를 표시한다.
4. WHEN Member가 구독 목록에서 Channel을 선택하면, THE System SHALL 해당 Streamer의 채널 페이지로 이동한다.

---

### 요구사항 9: 채널 페이지

**사용자 스토리:** Viewer로서, 특정 Streamer의 채널 페이지에서 스트리머 정보를 확인하고 싶다.

#### 인수 기준

1. THE System SHALL 채널 페이지에 Streamer의 프로필 사진, 채널이름, 구독자 수를 표시한다.
2. WHILE Streamer가 방송 중이면, THE System SHALL 채널 페이지에 현재 진행 중인 Stream 카드를 표시한다.
3. WHILE Streamer가 방송 중이지 않으면, THE System SHALL 채널 페이지에 "현재 방송 중이지 않습니다" 메시지를 표시한다.
4. WHILE Viewer가 Member 상태이면, THE System SHALL 채널 페이지에 구독/구독취소 버튼을 표시한다.
