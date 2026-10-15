# 위대한 맛집 (Great Restaurant) 🍽️

위치 기반 스마트 맛집 탐색, 주변 주차장 검색, 실시간 내비게이션, 회원별 즐겨찾기, 리뷰 및 커뮤니티 관리 플랫폼입니다.

---

## 🌟 주요 기능

1. **위치 기반 실시간 맛집 탐색:**
   - 브라우저 WGS84 GPS 좌표 기반 내 주변 500m / 1km / 3km 반경 검색
   - Supabase PostGIS 공간 인덱스(GIST)와 `ST_DWithin` 구면 직선거리 계산
   - 한식, 일식, 중식, 양식, 아시안, 카페·디저트, 주점·바 카테고리 필터링

2. **카카오 지도 & 모빌리티 연동:**
   - 카카오 지도 SDK 기반 마커 및 커스텀 오버레이
   - 실시간 도로 교통 상황 레이어 (원활 / 서행 / 정체)
   - 주변 공영/무료 주차장(PK6) 검색 및 거리/주소 안내
   - 카카오내비, 티맵, 네이버지도 실시간 길안내 연동

3. **회원가입 · 로그인 (Supabase Auth):**
   - 이메일/비밀번호/닉네임 기반 계정 관리
   - 간편 테스트를 위한 1초 체험 계정 로그인 지원

4. **회원별 즐겨찾기 (Bookmarks):**
   - 비회원 로컬 스토리지 보관 및 로그인 시 Supabase DB 자동 병합(Auto-Merge)
   - 기기 간 영구 동기화

5. **리뷰 · 사진 등록 및 커뮤니티 보호 (Moderation):**
   - 1~5점 별점 및 방문 후기 작성
   - 최대 3장 사진 첨부 및 고해상도 라이트박스 확대 뷰어
   - 본인 작성 리뷰 삭제 기능
   - 부적절한 리뷰 신고하기 및 3회 이상 누적 시 자동 블라인드(숨김) 처리

---

## 🛠️ 기술 스택

- **Frontend:** React 19, TypeScript, Vite, Lucide React
- **Backend & Database:** Supabase (PostgreSQL + PostGIS 공간 데이터베이스, Supabase Auth, RLS)
- **Maps & Location:** Kakao Maps API, Kakao Places Category Search (PK6)
- **Deployment:** Vercel (SPA Rewrite)
