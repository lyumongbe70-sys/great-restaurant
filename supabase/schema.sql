-- ====================================================================
-- Supabase PostGIS 공간 데이터베이스 스키마 및 마이그레이션
-- ====================================================================

-- 1. PostGIS 확장 기능 활성화 (위치 좌표 저장 및 공간 연산)
CREATE EXTENSION IF NOT EXISTS postgis;

-- 2. restaurants 테이블 생성
CREATE TABLE IF NOT EXISTS public.restaurants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source TEXT NOT NULL,                     -- 데이터 출처 ('semas': 소상공인, 'data_go_kr': 행안부 등)
    source_id TEXT NOT NULL,                  -- 공공데이터 원본 고유 ID (bizesId 등)
    name TEXT NOT NULL,                       -- 음식점 이름
    category TEXT NOT NULL,                   -- 업종 (한식, 일식, 중식, 양식, 카페·디저트, 주점·바, 아시안 등)
    sub_category TEXT,                        -- 세부 업종 (백반/한정식, 스시/초밥, 카페 등)
    address TEXT NOT NULL,                    -- 기본 주소 (지번 또는 통합 주소)
    road_address TEXT,                        -- 도로명 주소
    phone TEXT,                               -- 전화번호
    lat DOUBLE PRECISION NOT NULL,            -- 위도 (WGS84, Y축, ~37.5)
    lng DOUBLE PRECISION NOT NULL,            -- 경도 (WGS84, X축, ~126.9)
    location GEOGRAPHY(POINT, 4326),          -- PostGIS 지리정보 (경도/위도 좌표, 구면 미터 단위 계산)
    status TEXT,                              -- 영업상태 (공공데이터에서 제공되는 경우만 저장: '영업/정상' 등)
    rating NUMERIC(2, 1) DEFAULT 4.5,         -- 평점 (기본값)
    review_count INTEGER DEFAULT 0,           -- 리뷰 수
    price_range TEXT DEFAULT '₩₩',            -- 가격대 ('₩', '₩₩', '₩₩₩', '₩₩₩₩')
    description TEXT,                         -- 매장 설명
    menus JSONB DEFAULT '[]'::jsonb,          -- 메뉴 목록
    features JSONB DEFAULT '[]'::jsonb,       -- 편의시설 태그 목록
    images JSONB DEFAULT '[]'::jsonb,         -- 이미지 URL 목록
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,

    -- 출처와 원본 ID 조합으로 유니크 제약 조건 (중복 방지 & Upsert 기준)
    CONSTRAINT uq_restaurants_source_id UNIQUE (source, source_id)
);

-- 기존 테이블이 있을 경우 location 컬럼 안전하게 추가
ALTER TABLE public.restaurants ADD COLUMN IF NOT EXISTS location GEOGRAPHY(POINT, 4326);

-- ====================================================================
-- 3. 인덱스 생성 (조회 성능 최적화)
-- ====================================================================
CREATE INDEX IF NOT EXISTS idx_restaurants_source ON public.restaurants(source, source_id);
CREATE INDEX IF NOT EXISTS idx_restaurants_category ON public.restaurants(category);
CREATE INDEX IF NOT EXISTS idx_restaurants_coords ON public.restaurants(lat, lng);
CREATE INDEX IF NOT EXISTS idx_restaurants_updated_at ON public.restaurants(updated_at DESC);

-- [중요] PostGIS 공간 인덱스(GIST) 생성: 500m/1km/3km 반경 검색 속도 극대화
CREATE INDEX IF NOT EXISTS idx_restaurants_location ON public.restaurants USING GIST (location);

-- ====================================================================
-- 4. lat, lng 변경 시 PostGIS location 컬럼 자동 동기화 트리거
-- 주의: PostGIS ST_MakePoint(X, Y)는 경도(lng)가 X, 위도(lat)가 Y 순서입니다.
-- ====================================================================
CREATE OR REPLACE FUNCTION public.tr_sync_restaurant_location()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.lat IS NOT NULL AND NEW.lng IS NOT NULL THEN
        NEW.location = ST_SetSRID(ST_MakePoint(NEW.lng, NEW.lat), 4326)::geography;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_restaurants_location ON public.restaurants;
CREATE TRIGGER tr_restaurants_location
    BEFORE INSERT OR UPDATE OF lat, lng ON public.restaurants
    FOR EACH ROW
    EXECUTE FUNCTION public.tr_sync_restaurant_location();

-- 기존 데이터 중 location이 비어있는 행이 있다면 업데이트
UPDATE public.restaurants
SET location = ST_SetSRID(ST_MakePoint(lng, lat), 4326)::geography
WHERE location IS NULL AND lat IS NOT NULL AND lng IS NOT NULL;

-- ====================================================================
-- 5. PostGIS 기반 주변 음식점 검색 함수 (RPC)
-- - 현재 위치 기준 500m / 1km / 3km 반경 필터링 (ST_DWithin)
-- - 구면 타원체 기반 정확한 직선거리 계산 (ST_Distance, 단위: 미터)
-- - 업종 필터 및 이름/주소 검색 동시 적용
-- - 직선거리 기준 오름차순(가까운 순) DB 정렬
-- - 조회 결과 개수 제한 (LIMIT)
-- ====================================================================
CREATE OR REPLACE FUNCTION public.get_nearby_restaurants(
    user_lat DOUBLE PRECISION,
    user_lng DOUBLE PRECISION,
    radius_meters DOUBLE PRECISION DEFAULT 3000,
    search_category TEXT DEFAULT NULL,
    search_query TEXT DEFAULT NULL,
    limit_count INTEGER DEFAULT 100
)
RETURNS TABLE (
    id UUID,
    source TEXT,
    source_id TEXT,
    name TEXT,
    category TEXT,
    sub_category TEXT,
    address TEXT,
    road_address TEXT,
    phone TEXT,
    lat DOUBLE PRECISION,
    lng DOUBLE PRECISION,
    status TEXT,
    rating NUMERIC,
    review_count INTEGER,
    price_range TEXT,
    description TEXT,
    menus JSONB,
    features JSONB,
    images JSONB,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ,
    distance_meters DOUBLE PRECISION
) AS $$
DECLARE
    -- WGS84 좌표 순서: ST_MakePoint(경도X, 위도Y)
    user_point GEOGRAPHY;
BEGIN
    user_point := ST_SetSRID(ST_MakePoint(user_lng, user_lat), 4326)::geography;

    RETURN QUERY
    SELECT
        r.id,
        r.source,
        r.source_id,
        r.name,
        r.category,
        r.sub_category,
        r.address,
        r.road_address,
        r.phone,
        r.lat,
        r.lng,
        r.status,
        r.rating,
        r.review_count,
        r.price_range,
        r.description,
        r.menus,
        r.features,
        r.images,
        r.created_at,
        r.updated_at,
        -- 구면(WGS84) 기반 정확한 직선거리 계산 (단위: 미터)
        ROUND(ST_Distance(r.location, user_point)::NUMERIC, 1)::DOUBLE PRECISION AS distance_meters
    FROM public.restaurants r
    WHERE
        -- 1. PostGIS 공간 인덱스(GIST)를 활용한 반경 필터링 (단위: 미터)
        -- ST_DWithin은 반경 이내(distance <= radius_meters)만 엄격히 조회하여 반경 밖 음식점을 제외함
        ST_DWithin(r.location, user_point, radius_meters)
        -- 2. 업종 필터 (전체 또는 NULL이면 모든 업종)
        AND (search_category IS NULL OR search_category = '전체' OR r.category = search_category)
        -- 3. 이름 및 주소 검색어 필터 (NULL 또는 빈 문자열이면 전체)
        AND (
            search_query IS NULL 
            OR search_query = '' 
            OR r.name ILIKE '%' || search_query || '%'
            OR r.address ILIKE '%' || search_query || '%'
            OR COALESCE(r.road_address, '') ILIKE '%' || search_query || '%'
        )
    -- 4. DB 수준에서 직선거리 오름차순(가장 가까운 순) 정렬
    ORDER BY distance_meters ASC
    -- 5. 조회 결과 개수 제한
    LIMIT limit_count;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- 누구나 주변 음식점 검색 RPC 함수를 호출할 수 있도록 권한 부여
GRANT EXECUTE ON FUNCTION public.get_nearby_restaurants TO anon, authenticated, service_role;

-- ====================================================================
-- 6. RLS (Row Level Security) 설정
-- 브라우저(익명/인증 사용자)는 SELECT만 가능, 수집/수정은 service_role만 가능
-- ====================================================================
ALTER TABLE public.restaurants ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public read access on restaurants" ON public.restaurants;
DROP POLICY IF EXISTS "Allow server write access on restaurants" ON public.restaurants;

-- ① 조회 정책: 누구나(anon, authenticated) 음식점 목록 및 상세 조회 가능
CREATE POLICY "Allow public read access on restaurants"
ON public.restaurants
FOR SELECT
TO anon, authenticated
USING (true);

-- ② 쓰기 정책: 서버 비밀키(service_role)만 INSERT, UPDATE, DELETE 가능
CREATE POLICY "Allow server write access on restaurants"
ON public.restaurants
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- ====================================================================
-- 7. 업데이트 시간 자동 갱신 트리거
-- ====================================================================
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_restaurants_updated_at ON public.restaurants;
CREATE TRIGGER tr_restaurants_updated_at
BEFORE UPDATE ON public.restaurants
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

-- ====================================================================
-- 8. 회원별 즐겨찾기 (bookmarks) 테이블 및 RLS 정책
-- ====================================================================
CREATE TABLE IF NOT EXISTS public.bookmarks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    restaurant_id TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    CONSTRAINT uq_bookmarks_user_restaurant UNIQUE (user_id, restaurant_id)
);

CREATE INDEX IF NOT EXISTS idx_bookmarks_user_id ON public.bookmarks(user_id);
CREATE INDEX IF NOT EXISTS idx_bookmarks_restaurant_id ON public.bookmarks(restaurant_id);

ALTER TABLE public.bookmarks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own bookmarks" ON public.bookmarks;
DROP POLICY IF EXISTS "Users can insert own bookmarks" ON public.bookmarks;
DROP POLICY IF EXISTS "Users can delete own bookmarks" ON public.bookmarks;

CREATE POLICY "Users can view own bookmarks"
ON public.bookmarks FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own bookmarks"
ON public.bookmarks FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own bookmarks"
ON public.bookmarks FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- ====================================================================
-- 9. 리뷰 및 사진 등록 (reviews) 테이블 및 RLS 정책
-- ====================================================================
CREATE TABLE IF NOT EXISTS public.reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    restaurant_id TEXT NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    author_name TEXT NOT NULL,
    rating NUMERIC(2, 1) NOT NULL CHECK (rating >= 1 AND rating <= 5),
    comment TEXT NOT NULL,
    photos JSONB DEFAULT '[]'::jsonb, -- 사진 Data URL 또는 이미지 링크 배열
    report_count INTEGER DEFAULT 0 NOT NULL,
    status TEXT DEFAULT 'active' NOT NULL CHECK (status IN ('active', 'hidden', 'deleted')),
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_reviews_restaurant ON public.reviews(restaurant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_reviews_user ON public.reviews(user_id);

ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view active reviews" ON public.reviews;
DROP POLICY IF EXISTS "Anyone can insert reviews" ON public.reviews;
DROP POLICY IF EXISTS "Authors can update own reviews" ON public.reviews;
DROP POLICY IF EXISTS "Authors can delete own reviews" ON public.reviews;

-- 조회: 활성 상태(active)이거나 본인이 작성한 리뷰만 표시 (신고 누적으로 hidden 처리된 것은 숨김)
CREATE POLICY "Anyone can view active reviews"
ON public.reviews FOR SELECT
TO anon, authenticated
USING (status = 'active' OR auth.uid() = user_id);

-- 등록: 로그인 회원 및 비회원(게스트) 누구나 리뷰 작성 가능
CREATE POLICY "Anyone can insert reviews"
ON public.reviews FOR INSERT
TO anon, authenticated
WITH CHECK (true);

-- 수정/삭제: 작성자 본인만 수정 및 삭제 가능
CREATE POLICY "Authors can update own reviews"
ON public.reviews FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Authors can delete own reviews"
ON public.reviews FOR DELETE
TO anon, authenticated
USING (auth.uid() = user_id OR auth.uid() IS NULL);

-- ====================================================================
-- 10. 리뷰 신고 및 자동 블라인드 (review_reports & report_review RPC)
-- ====================================================================
CREATE TABLE IF NOT EXISTS public.review_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    review_id UUID NOT NULL REFERENCES public.reviews(id) ON DELETE CASCADE,
    reporter_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    reason TEXT NOT NULL,
    details TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_review_reports_review ON public.review_reports(review_id);

ALTER TABLE public.review_reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can create reports" ON public.review_reports;
CREATE POLICY "Anyone can create reports"
ON public.review_reports FOR INSERT
TO anon, authenticated
WITH CHECK (true);

-- 리뷰 신고 RPC: 신고 내역을 저장하고 신고 누적 수(report_count)가 3 이상이면 status를 'hidden'으로 자동 변경
CREATE OR REPLACE FUNCTION public.report_review(
    p_review_id UUID,
    p_reason TEXT,
    p_details TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
    v_new_report_count INT;
    v_new_status TEXT;
BEGIN
    -- 1. 신고 내역 기록
    INSERT INTO public.review_reports (review_id, reporter_id, reason, details)
    VALUES (p_review_id, auth.uid(), p_reason, p_details);

    -- 2. 신고 횟수 증가 및 3회 이상 시 'hidden'으로 자동 블라인드 처리
    UPDATE public.reviews
    SET 
        report_count = report_count + 1,
        status = CASE WHEN report_count + 1 >= 3 THEN 'hidden' ELSE status END,
        updated_at = NOW()
    WHERE id = p_review_id
    RETURNING report_count, status INTO v_new_report_count, v_new_status;

    RETURN jsonb_build_object(
        'success', true,
        'report_count', v_new_report_count,
        'is_hidden', (v_new_status = 'hidden')
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.report_review TO anon, authenticated, service_role;

