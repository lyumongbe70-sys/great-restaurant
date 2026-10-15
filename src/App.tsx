import { useState, useMemo, useEffect, useCallback } from 'react';
import type { Category, SortOption, Restaurant } from './types/restaurant';
import { MOCK_RESTAURANTS } from './data/mockRestaurants';
import { Header } from './components/Header';
import { CategoryFilter } from './components/CategoryFilter';
import { RestaurantCard } from './components/RestaurantCard';
import { RestaurantDetailModal } from './components/RestaurantDetailModal';
import { KakaoMap } from './components/KakaoMap';
import { BottomNav, type NavTab } from './components/BottomNav';
import {
  fetchSemasRestaurants,
  SEOUL_HOTSPOTS,
  type FoodHotspot,
} from './services/restaurantApi';
import {
  fetchRestaurantsFromDb,
  fetchNearbyRestaurantsFromDb,
  triggerServerSync,
} from './services/dbRestaurantService';
import { syncBookmarkToSupabase } from './lib/supabase';
import {
  getCurrentUser,
  onAuthStateChange,
  signOutUser,
  type AuthUserProfile,
} from './services/authService';
import {
  toggleUserBookmark,
  syncLocalBookmarksToUser,
} from './services/bookmarkService';
import { AuthModal } from './components/AuthModal';
import {
  Utensils,
  RotateCcw,
  Sparkles,
  Download,
  CheckCircle,
  Database,
  RefreshCw,
  CheckCircle2,
  CloudCheck,
  MapPin,
  LocateFixed,
  AlertTriangle,
  X,
  Compass,
  ArrowRight,
  Server,
  FileCode,
  Copy,
  ExternalLink,
  LogOut,
  LogIn,
  ShieldCheck,
} from 'lucide-react';

export function App() {
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [selectedHotspot, setSelectedHotspot] = useState<FoodHotspot>(SEOUL_HOTSPOTS[0]);
  const [isLoading, setIsLoading] = useState(true);
  const [dataSource, setDataSource] = useState<'db' | 'live_api' | 'fallback'>('db');

  // Supabase Database Connection State
  const [isDbTableReady, setIsDbTableReady] = useState(false);
  const [dbTotalCount, setDbTotalCount] = useState(0);
  const [isSyncingServer, setIsSyncingServer] = useState(false);
  const [syncFeedback, setSyncFeedback] = useState<string | null>(null);
  const [showSqlMigrationModal, setShowSqlMigrationModal] = useState(false);

  // '내 주변 찾기' Geolocation State (브라우저 메모리 전용, DB 저장 안 함)
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [isLocating, setIsLocating] = useState(false);
  const [isNearMeMode, setIsNearMeMode] = useState(false);
  const [selectedRadius, setSelectedRadius] = useState<number>(1000); // 500, 1000, 3000 meters
  const [locationError, setLocationError] = useState<{
    title: string;
    message: string;
    type: 'denied' | 'unavailable' | 'timeout' | 'unsupported';
  } | null>(null);
  const [showRegionModal, setShowRegionModal] = useState(false);

  const [selectedCategory, setSelectedCategory] = useState<Category>('전체');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSort, setSelectedSort] = useState<SortOption>('distance');
  const [selectedRestaurant, setSelectedRestaurant] = useState<Restaurant | null>(null);
  const [selectedMapRestaurant, setSelectedMapRestaurant] = useState<Restaurant | null>(null);
  const [viewMode, setViewMode] = useState<'list' | 'map'>('list');
  const [bookmarks, setBookmarks] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('great_restaurant_bookmarks');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [currentTab, setCurrentTab] = useState<NavTab>('home');
  const [isMobileFrame, setIsMobileFrame] = useState(false);
  const [showInstallModal, setShowInstallModal] = useState(false);
  const [copiedSql, setCopiedSql] = useState(false);

  // PWA Install Prompt State
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isAppInstalled, setIsAppInstalled] = useState(false);

  // Supabase Auth State
  const [currentUser, setCurrentUser] = useState<AuthUserProfile | null>(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authModalMode, setAuthModalMode] = useState<'login' | 'signup'>('login');

  // Load restaurants: Prioritize Supabase DB with PostGIS, fallback to live API / mock
  const loadData = useCallback(
    async (
      hotspot: FoodHotspot | null,
      userCoords: { lat: number; lng: number } | null,
      radius: number,
      preferDb = true
    ) => {
      setIsLoading(true);
      setSyncFeedback(null);

      const targetCoords = userCoords || (hotspot ? { lat: hotspot.lat, lng: hotspot.lng } : null);

      // 1. PostGIS based nearby DB query if preferDb is true and coordinates are available
      if (preferDb && targetCoords) {
        try {
          const dbRes = await fetchNearbyRestaurantsFromDb({
            userLat: targetCoords.lat,
            userLng: targetCoords.lng,
            radiusMeters: radius,
            category: selectedCategory !== '전체' ? selectedCategory : undefined,
            search: searchQuery,
            limit: 100,
          });

          if (dbRes.exists) {
            setIsDbTableReady(true);
            setDbTotalCount((prev) => (dbRes.count > 0 ? Math.max(prev, dbRes.count) : prev));
            if (dbRes.restaurants.length > 0) {
              setDataSource('db');
              setRestaurants(dbRes.restaurants);
              setIsLoading(false);
              return;
            } else if (searchQuery && searchQuery.trim()) {
              // 1-1. 반경 내 결과가 없으면 Supabase 전체 지역 DB에서 검색어로 확장 조회
              const allDbRes = await fetchRestaurantsFromDb({
                search: searchQuery,
                category: selectedCategory !== '전체' ? selectedCategory : undefined,
                userCoords: targetCoords,
                limit: 100,
              });
              if (allDbRes.exists && allDbRes.restaurants.length > 0) {
                setDataSource('db');
                setRestaurants(allDbRes.restaurants);
                setIsLoading(false);
                return;
              }

              // 1-2. DB에 검색 결과가 없으면 MOCK 데이터에서 검색어 매칭 fallback
              const q = searchQuery.toLowerCase().trim();
              const mockMatches = MOCK_RESTAURANTS.filter((m) => {
                const matchName = m.name.toLowerCase().includes(q);
                const matchCategory = m.category.toLowerCase().includes(q);
                const matchAddress = m.address.toLowerCase().includes(q);
                const matchMenu = m.menus.some((menu) => menu.name.toLowerCase().includes(q) || (menu.description && menu.description.toLowerCase().includes(q)));
                const matchDesc = m.description ? m.description.toLowerCase().includes(q) : false;
                return matchName || matchCategory || matchAddress || matchMenu || matchDesc;
              });

              if (mockMatches.length > 0) {
                setDataSource('fallback');
                setRestaurants(mockMatches);
                setIsLoading(false);
                return;
              }

              setDataSource('db');
              setRestaurants([]);
              setIsLoading(false);
              return;
            } else if (dbTotalCount > 0) {
              // DB is populated, but 0 stores strictly within this radius/category
              setDataSource('db');
              setRestaurants([]);
              setIsLoading(false);
              return;
            }
          } else {
            setIsDbTableReady(false);
          }
        } catch {
          // DB check failed
        }
      } else if (preferDb) {
        // Fallback to general table query if no coordinates
        try {
          const dbRes = await fetchRestaurantsFromDb({
            category: selectedCategory !== '전체' ? selectedCategory : undefined,
            search: searchQuery,
            limit: 100,
          });
          if (dbRes.exists && dbRes.restaurants.length > 0) {
            setIsDbTableReady(true);
            setDbTotalCount(dbRes.count);
            setDataSource('db');
            setRestaurants(dbRes.restaurants);
            setIsLoading(false);
            return;
          }
        } catch {
          // DB check failed
        }
      }

      // 2. Fetch live data from public API if DB is empty or during near-me search
      try {
        const result = await fetchSemasRestaurants({
          hotspot: hotspot || undefined,
          userCoords: userCoords || undefined,
          radius,
          page: 1,
          numOfRows: 50,
        });

        if (result.isLive && result.restaurants.length > 0) {
          setDataSource('live_api');
          setRestaurants(result.restaurants);
        } else {
          setDataSource('fallback');
          setRestaurants(MOCK_RESTAURANTS);
        }
      } catch {
        setDataSource('fallback');
        setRestaurants(MOCK_RESTAURANTS);
      } finally {
        setIsLoading(false);
      }
    },
    [selectedCategory, searchQuery, dbTotalCount]
  );

  // Initial load
  useEffect(() => {
    loadData(selectedHotspot, null, selectedHotspot.radius, true);
  }, [loadData, selectedHotspot]);

  // Re-query from PostGIS DB when category or search changes
  useEffect(() => {
    const timer = setTimeout(() => {
      loadData(userLocation ? null : selectedHotspot, userLocation, selectedRadius, true);
    }, 250);
    return () => clearTimeout(timer);
  }, [selectedCategory, searchQuery, selectedRadius]);

  // Sync bookmarks to localStorage & Supabase
  useEffect(() => {
    try {
      localStorage.setItem('great_restaurant_bookmarks', JSON.stringify(bookmarks));
    } catch {
      // ignore
    }
  }, [bookmarks]);

  // Check Supabase Auth session & auto sync user bookmarks
  useEffect(() => {
    let isSubscribed = true;

    getCurrentUser().then(async (user) => {
      if (!isSubscribed) return;
      if (user) {
        setCurrentUser(user);
        // Automatically sync local bookmarks with Supabase
        const merged = await syncLocalBookmarksToUser(user.id, bookmarks);
        setBookmarks(merged);
      }
    });

    const unsubscribe = onAuthStateChange(async (user) => {
      if (!isSubscribed) return;
      setCurrentUser(user);
      if (user) {
        const merged = await syncLocalBookmarksToUser(user.id, bookmarks);
        setBookmarks(merged);
      }
    });

    return () => {
      isSubscribed = false;
      unsubscribe();
    };
  }, []);

  // Listen for PWA beforeinstallprompt event for one-click installation
  useEffect(() => {
    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    const handleAppInstalled = () => {
      setIsAppInstalled(true);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    if (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) {
      setIsAppInstalled(true);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  // Trigger server-side public data collection & Supabase DB upsert
  const handleServerSync = async () => {
    setIsSyncingServer(true);
    setSyncFeedback('서버에서 공공데이터 수집 및 Supabase DB 저장/갱신 진행 중...');
    try {
      const res = await triggerServerSync();
      if (res.success) {
        setSyncFeedback(
          `✅ 총 ${res.totalUpserted || res.totalCollected || 0}개의 실제 음식점이 Supabase DB에 저장/갱신되었습니다! (새로고침해도 유지됨)`
        );
        // Reload directly from Supabase DB
        await loadData(selectedHotspot, null, selectedHotspot.radius, true);
      } else {
        if (res.error === '테이블 미생성' || res.error?.includes('schema cache')) {
          setIsDbTableReady(false);
          setShowSqlMigrationModal(true);
          setSyncFeedback('⚠️ Supabase에 restaurants 테이블이 없습니다. SQL 마이그레이션을 먼저 실행해 주세요.');
        } else {
          setSyncFeedback(`⚠️ 동기화 실패: ${res.error}`);
        }
      }
    } catch (err: any) {
      setSyncFeedback(`⚠️ 서버 통신 오류: ${err?.message}`);
    } finally {
      setIsSyncingServer(false);
    }
  };

  // Request browser geolocation on button click
  const handleRequestLocation = () => {
    if (!navigator.geolocation) {
      setLocationError({
        type: 'unsupported',
        title: '위치 서비스를 지원하지 않는 브라우저입니다',
        message:
          '현재 브라우저 환경에서는 위치 정보(GPS) 확인을 지원하지 않습니다. 아래 지역 목록에서 원하시는 지역을 직접 선택해 주세요.',
      });
      return;
    }

    setIsLocating(true);
    setLocationError(null);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const coords = {
          lat: Number(position.coords.latitude.toFixed(6)),
          lng: Number(position.coords.longitude.toFixed(6)),
        };

        // User location is kept strictly in component state (NOT saved to DB)
        setUserLocation(coords);
        setIsNearMeMode(true);
        setSelectedSort('distance');
        setIsLocating(false);
        setSelectedMapRestaurant(null);

        // Fetch stores within selectedRadius around user coordinates
        loadData(null, coords, selectedRadius, true);
      },
      (error) => {
        setIsLocating(false);
        let title = '위치 정보를 확인할 수 없습니다';
        let message = '위치 확인 중 오류가 발생했습니다. 아래 지역 목록에서 원하시는 지역을 직접 선택해 주세요.';
        let type: 'denied' | 'unavailable' | 'timeout' = 'unavailable';

        if (error.code === error.PERMISSION_DENIED) {
          type = 'denied';
          title = '위치 권한이 차단되었습니다';
          message =
            '브라우저에서 위치 접근 권한이 거부되었습니다.\n' +
            '주소창 좌측의 자물쇠/설정 아이콘을 눌러 [위치]를 [허용]으로 변경해 주시거나, 아래 지역 목록에서 원하시는 지역을 직접 선택해 주세요.';
        } else if (error.code === error.POSITION_UNAVAILABLE) {
          type = 'unavailable';
          title = '현재 위치 정보를 찾을 수 없습니다';
          message = 'GPS 신호를 수신할 수 없거나 위치 서비스를 일시적으로 사용할 수 없습니다. 지역을 직접 선택해 주세요.';
        } else if (error.code === error.TIMEOUT) {
          type = 'timeout';
          title = '위치 확인 요청 시간 초과';
          message = '위치 정보를 가져오는 데 시간이 초과되었습니다. 다시 시도하시거나 지역을 직접 선택해 주세요.';
        }

        setLocationError({ type, title, message });
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  };

  // Change search radius (500m / 1km / 3km)
  const handleRadiusChange = (radius: number) => {
    setSelectedRadius(radius);
    if (userLocation && isNearMeMode) {
      loadData(null, userLocation, radius, true);
    }
  };

  // Switch back to a predefined hotspot region
  const handleSelectHotspot = (hotspot: FoodHotspot) => {
    setSelectedHotspot(hotspot);
    setIsNearMeMode(false);
    setUserLocation(null);
    setSelectedMapRestaurant(null);
    setShowRegionModal(false);
    setLocationError(null);
    loadData(hotspot, null, hotspot.radius, true);
  };

  // Switch navigation tabs
  const handleTabChange = (tab: NavTab) => {
    setCurrentTab(tab);
    if (tab === 'explore') {
      setViewMode('map');
    } else if (tab === 'home') {
      setViewMode('list');
    }
  };

  // Bookmark toggle (persists to Supabase user account if logged in + localStorage)
  const handleToggleBookmark = async (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const isAdding = !bookmarks.includes(id);
    setBookmarks((prev) =>
      isAdding ? [...prev, id] : prev.filter((item) => item !== id)
    );

    if (currentUser) {
      await toggleUserBookmark(currentUser.id, id, isAdding);
    }
    syncBookmarkToSupabase(id, isAdding);
  };

  const handleSignOut = async () => {
    await signOutUser();
    setCurrentUser(null);
  };

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      try {
        deferredPrompt.prompt();
        const choice = await deferredPrompt.userChoice;
        if (choice && choice.outcome === 'accepted') {
          setIsAppInstalled(true);
          setDeferredPrompt(null);
        }
      } catch {
        setShowInstallModal(true);
      }
    } else {
      setShowInstallModal(true);
    }
  };

  // Filter & Sort Logic
  const filteredRestaurants = useMemo(() => {
    return restaurants
      .filter((r) => {
        if (currentTab === 'bookmarks' && !bookmarks.includes(r.id)) {
          return false;
        }

        // Category filter: if search query explicitly specifies a category, don't let selectedCategory block it
        const isCategoryQuery = ['한식', '일식', '중식', '양식', '아시안', '카페·디저트', '카페', '디저트', '주점·바', '주점'].includes(searchQuery.trim());
        if (selectedCategory !== '전체' && r.category !== selectedCategory && !isCategoryQuery) {
          return false;
        }

        if (searchQuery.trim()) {
          const query = searchQuery.toLowerCase().trim();
          const matchName = r.name.toLowerCase().includes(query);
          const matchCategory = r.category.toLowerCase().includes(query);
          const matchSubCategory = (r as any).sub_category ? (r as any).sub_category.toLowerCase().includes(query) : false;
          const matchAddress = r.address.toLowerCase().includes(query);
          const matchMenu = r.menus.some((m) => m.name.toLowerCase().includes(query) || (m.description && m.description.toLowerCase().includes(query)));
          const matchDesc = r.description ? r.description.toLowerCase().includes(query) : false;
          const matchFeatures = r.features ? r.features.some((f) => f.toLowerCase().includes(query)) : false;
          if (!matchName && !matchCategory && !matchSubCategory && !matchAddress && !matchMenu && !matchDesc && !matchFeatures) {
            return false;
          }
        }

        return true;
      })
      .sort((a, b) => {
        if (selectedSort === 'distance') {
          const distA = a.distanceMeters ?? 9999999;
          const distB = b.distanceMeters ?? 9999999;
          return distA - distB;
        }
        if (selectedSort === 'rating') return b.rating - a.rating;
        if (selectedSort === 'reviews') return b.reviewCount - a.reviewCount;
        if (selectedSort === 'priceAsc') return a.priceRange.length - b.priceRange.length;
        if (selectedSort === 'name') return a.name.localeCompare(b.name, 'ko');
        return 0;
      });
  }, [restaurants, selectedCategory, searchQuery, selectedSort, currentTab, bookmarks]);

  // Handle locating restaurant on map from list
  const handleViewOnMap = (restaurant: Restaurant, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedMapRestaurant(restaurant);
    setViewMode('map');
  };

  const resetFilters = () => {
    setSelectedCategory('전체');
    setSearchQuery('');
    setSelectedSort('distance');
  };

  const SQL_MIGRATION_CODE = `-- 1. PostGIS 확장 기능 활성화 (좌표 저장 및 공간 연산)
CREATE EXTENSION IF NOT EXISTS postgis;

-- 2. restaurants 테이블 생성 (중복 방지: source, source_id 유니크)
CREATE TABLE IF NOT EXISTS public.restaurants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source TEXT NOT NULL,
    source_id TEXT NOT NULL,
    name TEXT NOT NULL,
    category TEXT NOT NULL,
    sub_category TEXT,
    address TEXT NOT NULL,
    road_address TEXT,
    phone TEXT,
    lat DOUBLE PRECISION NOT NULL,
    lng DOUBLE PRECISION NOT NULL,
    location GEOGRAPHY(POINT, 4326),
    status TEXT,
    rating NUMERIC(2, 1) DEFAULT 4.5,
    review_count INTEGER DEFAULT 0,
    price_range TEXT DEFAULT '₩₩',
    description TEXT,
    menus JSONB DEFAULT '[]'::jsonb,
    features JSONB DEFAULT '[]'::jsonb,
    images JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    CONSTRAINT uq_restaurants_source_id UNIQUE (source, source_id)
);

-- 기존 테이블이 있다면 location 컬럼 추가
ALTER TABLE public.restaurants ADD COLUMN IF NOT EXISTS location GEOGRAPHY(POINT, 4326);

-- 3. 인덱스 생성 (일반 인덱스 + PostGIS 공간 인덱스 GIST)
CREATE INDEX IF NOT EXISTS idx_restaurants_source ON public.restaurants(source, source_id);
CREATE INDEX IF NOT EXISTS idx_restaurants_category ON public.restaurants(category);
CREATE INDEX IF NOT EXISTS idx_restaurants_coords ON public.restaurants(lat, lng);
CREATE INDEX IF NOT EXISTS idx_restaurants_location ON public.restaurants USING GIST (location);

-- 4. lat, lng 변경 시 PostGIS location 컬럼 자동 동기화 트리거
CREATE OR REPLACE FUNCTION public.tr_sync_restaurant_location()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.lat IS NOT NULL AND NEW.lng IS NOT NULL THEN
        -- PostGIS ST_MakePoint(X, Y)는 경도(lng)가 X, 위도(lat)가 Y 순서
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

UPDATE public.restaurants
SET location = ST_SetSRID(ST_MakePoint(lng, lat), 4326)::geography
WHERE location IS NULL AND lat IS NOT NULL AND lng IS NOT NULL;

-- 5. PostGIS 기반 500m/1km/3km 주변 음식점 검색 RPC 함수
CREATE OR REPLACE FUNCTION public.get_nearby_restaurants(
    user_lat DOUBLE PRECISION,
    user_lng DOUBLE PRECISION,
    radius_meters DOUBLE PRECISION DEFAULT 3000,
    search_category TEXT DEFAULT NULL,
    search_query TEXT DEFAULT NULL,
    limit_count INTEGER DEFAULT 100
)
RETURNS TABLE (
    id UUID, source TEXT, source_id TEXT, name TEXT, category TEXT, sub_category TEXT,
    address TEXT, road_address TEXT, phone TEXT, lat DOUBLE PRECISION, lng DOUBLE PRECISION,
    status TEXT, rating NUMERIC, review_count INTEGER, price_range TEXT, description TEXT,
    menus JSONB, features JSONB, images JSONB, created_at TIMESTAMPTZ, updated_at TIMESTAMPTZ,
    distance_meters DOUBLE PRECISION
) AS $$
DECLARE
    user_point GEOGRAPHY;
BEGIN
    user_point := ST_SetSRID(ST_MakePoint(user_lng, user_lat), 4326)::geography;

    RETURN QUERY
    SELECT
        r.id, r.source, r.source_id, r.name, r.category, r.sub_category,
        r.address, r.road_address, r.phone, r.lat, r.lng, r.status,
        r.rating, r.review_count, r.price_range, r.description,
        r.menus, r.features, r.images, r.created_at, r.updated_at,
        ROUND(ST_Distance(r.location, user_point)::NUMERIC, 1)::DOUBLE PRECISION AS distance_meters
    FROM public.restaurants r
    WHERE
        ST_DWithin(r.location, user_point, radius_meters)
        AND (search_category IS NULL OR search_category = '전체' OR r.category = search_category)
        AND (
            search_query IS NULL OR search_query = ''
            OR r.name ILIKE '%' || search_query || '%'
            OR r.address ILIKE '%' || search_query || '%'
            OR COALESCE(r.road_address, '') ILIKE '%' || search_query || '%'
        )
    ORDER BY distance_meters ASC
    LIMIT limit_count;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.get_nearby_restaurants TO anon, authenticated, service_role;

-- 6. RLS (Row Level Security) 설정
ALTER TABLE public.restaurants ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public read access on restaurants" ON public.restaurants;
DROP POLICY IF EXISTS "Allow server write access on restaurants" ON public.restaurants;

CREATE POLICY "Allow public read access on restaurants"
ON public.restaurants FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "Allow server write access on restaurants"
ON public.restaurants FOR ALL TO service_role USING (true) WITH CHECK (true);

-- 7. 회원별 즐겨찾기 (bookmarks) 테이블 및 RLS
CREATE TABLE IF NOT EXISTS public.bookmarks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    restaurant_id TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    CONSTRAINT uq_bookmarks_user_restaurant UNIQUE (user_id, restaurant_id)
);
CREATE INDEX IF NOT EXISTS idx_bookmarks_user_id ON public.bookmarks(user_id);
ALTER TABLE public.bookmarks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own bookmarks" ON public.bookmarks FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own bookmarks" ON public.bookmarks FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own bookmarks" ON public.bookmarks FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- 8. 리뷰 및 사진 등록 (reviews) 테이블 및 RLS
CREATE TABLE IF NOT EXISTS public.reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    restaurant_id TEXT NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    author_name TEXT NOT NULL,
    rating NUMERIC(2, 1) NOT NULL CHECK (rating >= 1 AND rating <= 5),
    comment TEXT NOT NULL,
    photos JSONB DEFAULT '[]'::jsonb,
    report_count INTEGER DEFAULT 0 NOT NULL,
    status TEXT DEFAULT 'active' NOT NULL CHECK (status IN ('active', 'hidden', 'deleted')),
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_reviews_restaurant ON public.reviews(restaurant_id, created_at DESC);
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view active reviews" ON public.reviews FOR SELECT TO anon, authenticated USING (status = 'active' OR auth.uid() = user_id);
CREATE POLICY "Anyone can insert reviews" ON public.reviews FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "Authors can update own reviews" ON public.reviews FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Authors can delete own reviews" ON public.reviews FOR DELETE TO anon, authenticated USING (auth.uid() = user_id OR auth.uid() IS NULL);

-- 9. 리뷰 신고 및 자동 블라인드 (review_reports & report_review RPC)
CREATE TABLE IF NOT EXISTS public.review_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    review_id UUID NOT NULL REFERENCES public.reviews(id) ON DELETE CASCADE,
    reporter_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    reason TEXT NOT NULL,
    details TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);
ALTER TABLE public.review_reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can submit reports" ON public.review_reports FOR INSERT TO anon, authenticated WITH CHECK (true);

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
    INSERT INTO public.review_reports (review_id, reporter_id, reason, details)
    VALUES (p_review_id, auth.uid(), p_reason, p_details);

    UPDATE public.reviews
    SET report_count = report_count + 1,
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
GRANT EXECUTE ON FUNCTION public.report_review TO anon, authenticated, service_role;`;

  const copySqlCode = () => {
    navigator.clipboard.writeText(SQL_MIGRATION_CODE);
    setCopiedSql(true);
    setTimeout(() => setCopiedSql(false), 2500);
  };

  return (
    <div className={`app-root ${isMobileFrame ? 'frame-mode-wrapper' : 'fluid-mode-wrapper'}`}>
      <div className={`app-container ${isMobileFrame ? 'mobile-device-frame' : ''}`}>
        {/* Device Status Bar in Frame Mode */}
        {isMobileFrame && (
          <div className="phone-notch-bar">
            <span className="notch-time">9:41</span>
            <div className="notch-camera"></div>
            <div className="notch-status-icons">
              <span>5G</span>
              <span>100%</span>
            </div>
          </div>
        )}

        {/* Top Header */}
        <Header
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          isMobileFrame={isMobileFrame}
          onToggleFrame={() => setIsMobileFrame((prev) => !prev)}
          onInstallClick={handleInstallClick}
          currentUser={currentUser}
          onOpenAuth={() => {
            setAuthModalMode('login');
            setShowAuthModal(true);
          }}
          onOpenMyPage={() => setCurrentTab('my')}
        />

        {/* Supabase DB Integration & Live Sync Banner */}
        <div className="integration-status-banner">
          <div className="integration-status-left">
            <span
              className={`live-pulse-indicator ${dataSource === 'db' ? 'online' : 'offline'}`}
            ></span>
            <span className="integration-text">
              {dataSource === 'db' ? (
                <>
                  <CloudCheck size={14} className="icon-cloud-success" />
                  <strong>Supabase DB 실시간 조회 중</strong>
                  <span className="source-tag">DB 저장됨 ({restaurants.length}곳)</span>
                </>
              ) : isNearMeMode ? (
                <>
                  <LocateFixed size={13} />
                  <span>내 주변 반경 {selectedRadius >= 1000 ? selectedRadius / 1000 + 'km' : selectedRadius + 'm'} 탐색 중</span>
                </>
              ) : (
                <>
                  <Database size={13} />
                  <span>{selectedHotspot.name} 공공데이터 수신 중</span>
                </>
              )}
            </span>
          </div>

          <div className="integration-btn-group">
            <button
              type="button"
              className="server-sync-btn"
              onClick={handleServerSync}
              disabled={isSyncingServer}
              title="서버에서 공공데이터를 수집하여 Supabase DB에 갱신/저장합니다."
            >
              <Server size={12} className={isSyncingServer ? 'spin-icon' : ''} />
              <span>{isSyncingServer ? 'DB 수집 갱신 중...' : '공공데이터 DB 동기화'}</span>
            </button>

            <button
              type="button"
              className="refresh-api-btn"
              onClick={() => loadData(selectedHotspot, userLocation, selectedRadius, true)}
              disabled={isLoading}
              title="새로고침"
            >
              <RefreshCw size={13} className={isLoading ? 'spin-icon' : ''} />
            </button>
          </div>
        </div>

        {/* Sync Feedback Toast Message */}
        {syncFeedback && (
          <div className="sync-feedback-toast">
            <div className="feedback-content">
              <span>{syncFeedback}</span>
            </div>
            <button
              type="button"
              className="toast-close-x"
              onClick={() => setSyncFeedback(null)}
              aria-label="닫기"
            >
              <X size={14} />
            </button>
          </div>
        )}

        {/* Notice banner if Supabase table is not yet migrated */}
        {!isDbTableReady && currentTab === 'home' && (
          <div className="db-migration-notice-banner">
            <div className="notice-icon-box">
              <Database size={16} />
            </div>
            <div className="notice-body">
              <strong>Supabase DB 테이블 연결 대기 중</strong>
              <p>restaurants 테이블을 생성하면 공공데이터 수집 내용이 DB에 영구 보존됩니다.</p>
            </div>
            <button
              type="button"
              className="open-sql-modal-pill"
              onClick={() => setShowSqlMigrationModal(true)}
            >
              <FileCode size={13} />
              <span>SQL 보기</span>
            </button>
          </div>
        )}

        {/* '내 주변 찾기' & 지역 선택 컨트롤 바 */}
        {currentTab !== 'my' && (
          <div className="location-control-section">
            <div className="location-action-row">
              {/* 내 주변 찾기 버튼 */}
              <button
                type="button"
                className={`near-me-trigger-btn ${isNearMeMode ? 'active' : ''}`}
                onClick={handleRequestLocation}
                disabled={isLocating}
                title="현재 브라우저 위치 권한을 요청하여 주변 음식점 탐색"
              >
                <LocateFixed size={16} className={isLocating ? 'spin-icon' : ''} />
                <span>{isLocating ? '위치 수신 중...' : isNearMeMode ? '내 주변 찾는 중' : '내 주변 찾기'}</span>
              </button>

              {/* 반경 선택기 (500m / 1km / 3km) */}
              {isNearMeMode ? (
                <div className="radius-pill-group">
                  <span className="radius-title">반경:</span>
                  <button
                    type="button"
                    className={`radius-pill-btn ${selectedRadius === 500 ? 'active' : ''}`}
                    onClick={() => handleRadiusChange(500)}
                  >
                    500m
                  </button>
                  <button
                    type="button"
                    className={`radius-pill-btn ${selectedRadius === 1000 ? 'active' : ''}`}
                    onClick={() => handleRadiusChange(1000)}
                  >
                    1km
                  </button>
                  <button
                    type="button"
                    className={`radius-pill-btn ${selectedRadius === 3000 ? 'active' : ''}`}
                    onClick={() => handleRadiusChange(3000)}
                  >
                    3km
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  className="open-region-modal-btn"
                  onClick={() => setShowRegionModal(true)}
                  title="서울 주요 상권 직접 선택"
                >
                  <Compass size={14} />
                  <span>지역 직접 선택</span>
                </button>
              )}
            </div>

            {/* 핫플레이스 가로 스크롤 칩 (내 주변 모드가 아닐 때 노출) */}
            {!isNearMeMode && (
              <div className="hotspot-strip">
                <div className="hotspot-label">
                  <MapPin size={13} />
                  <span>추천 지역:</span>
                </div>
                <div className="hotspot-scroll">
                  {SEOUL_HOTSPOTS.map((spot) => (
                    <button
                      key={spot.id}
                      type="button"
                      className={`hotspot-chip ${selectedHotspot.id === spot.id && dataSource !== 'db' ? 'active' : ''}`}
                      onClick={() => handleSelectHotspot(spot)}
                    >
                      {spot.name}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Hero banner / Tagline (Shown on Home list mode) */}
        {currentTab === 'home' && viewMode === 'list' && (
          <section className="hero-banner">
            <div className="hero-badge">
              <Sparkles size={14} />
              <span>
                {dataSource === 'db'
                  ? isNearMeMode
                    ? `Supabase PostGIS DB 내 주변 반경 ${selectedRadius >= 1000 ? selectedRadius / 1000 + 'km' : selectedRadius + 'm'}`
                    : 'Supabase PostGIS 데이터베이스 연동 모드'
                  : isNearMeMode
                  ? `내 현재 위치 기준 반경 ${selectedRadius >= 1000 ? selectedRadius / 1000 + 'km' : selectedRadius + 'm'}`
                  : '소상공인시장진흥공단 전국 상가정보 Open API'}
              </span>
            </div>
            <h2 className="hero-title">
              {dataSource === 'db'
                ? isNearMeMode
                  ? '내 주변 맛집 (PostGIS 공간 검색)'
                  : `${selectedHotspot.name} 맛집 (DB 보존)`
                : isNearMeMode
                ? '내 주변 실시간 맛집 탐색'
                : `${selectedHotspot.name} 인기 맛집`}
            </h2>
            <p className="hero-desc">
              {dataSource === 'db'
                ? isNearMeMode
                  ? 'Supabase PostGIS 공간 인덱스를 통해 DB에서 직접 반경 내 직선거리를 계산하고 가까운 순서로 정렬합니다.'
                  : 'PostGIS 공간 데이터베이스에 영구 보존된 음식점 목록이며, 지도와 목록에 동일한 검색 결과가 표시됩니다.'
                : isNearMeMode
                ? '브라우저 GPS 좌표를 기준으로 직선거리 가까운 순으로 실제 음식점을 정렬합니다.'
                : '공공데이터포털 상가정보 API와 카카오 지도를 연동하여 실제 운영 중인 식당 정보를 제공합니다.'}
            </p>
          </section>
        )}

        {/* Tab Header for Bookmarks / Explore */}
        {currentTab === 'bookmarks' && (
          <div className="tab-banner">
            <h3>❤️ 내가 찜한 맛집 목록</h3>
            <p>Supabase 클라우드 & 기기에 안전하게 저장된 맛집 목록입니다.</p>
          </div>
        )}

        {currentTab === 'explore' && (
          <div className="tab-banner explore-banner">
            <h3>
              🧭{' '}
              {isNearMeMode
                ? `내 위치 주변 ${selectedRadius >= 1000 ? selectedRadius / 1000 + 'km' : selectedRadius + 'm'} 지도 탐색`
                : `${selectedHotspot.name} 카카오 지도 탐색`}
            </h3>
            <p>카카오 지도 위에 {dataSource === 'db' ? 'Supabase DB' : '소상공인 공공데이터'} 음식점 마커가 표시됩니다.</p>
          </div>
        )}

        {/* My Page */}
        {currentTab === 'my' && (
          <div className="my-page-card">
            {currentUser ? (
              <div className="user-profile-header logged-in">
                <div className="avatar-circle user-avatar">
                  {currentUser.nickname ? currentUser.nickname[0] : 'U'}
                </div>
                <div className="profile-info-column">
                  <div className="profile-name-row">
                    <h4>{currentUser.nickname}</h4>
                    <span className="auth-member-pill">
                      <ShieldCheck size={13} />
                      인증 회원
                    </span>
                  </div>
                  <p className="profile-email">{currentUser.email}</p>
                </div>
                <button
                  type="button"
                  className="profile-logout-btn"
                  onClick={handleSignOut}
                  title="로그아웃"
                >
                  <LogOut size={14} />
                  <span>로그아웃</span>
                </button>
              </div>
            ) : (
              <>
                <div className="user-profile-header">
                  <div className="avatar-circle">🍽️</div>
                  <div className="profile-info-column">
                    <h4>미식가 게스트</h4>
                    <p className="profile-email">비회원 (기기 로컬 저장 모드)</p>
                  </div>
                </div>

                <div className="guest-login-cta-card">
                  <div className="cta-text-box">
                    <strong>🔑 회원가입 & 로그인 안내</strong>
                    <p>로그인하시면 찜한 맛집과 작성한 리뷰가 Supabase 클라우드에 안전하게 영구 저장 및 동기화됩니다.</p>
                  </div>
                  <div className="cta-btn-row">
                    <button
                      type="button"
                      className="cta-login-btn"
                      onClick={() => {
                        setAuthModalMode('login');
                        setShowAuthModal(true);
                      }}
                    >
                      <LogIn size={15} />
                      <span>로그인 / 회원가입</span>
                    </button>
                    <button
                      type="button"
                      className="cta-demo-fast-btn"
                      onClick={() => {
                        setAuthModalMode('login');
                        setShowAuthModal(true);
                      }}
                    >
                      <Sparkles size={14} />
                      <span>1초 체험 계정 로그인</span>
                    </button>
                  </div>
                </div>
              </>
            )}

            <div className="my-stats">
              <div className="stat-box">
                <span className="stat-number">{bookmarks.length}</span>
                <span className="stat-label">찜한 식당</span>
              </div>
              <div className="stat-box">
                <span className="stat-number">{dbTotalCount || restaurants.length}</span>
                <span className="stat-label">DB 저장 식당</span>
              </div>
              <div className="stat-box">
                <span className="stat-number">{isDbTableReady ? '연결됨' : '대기중'}</span>
                <span className="stat-label">Supabase 상태</span>
              </div>
            </div>

            {/* Privacy note */}
            <div className="privacy-badge-box">
              <CheckCircle size={16} />
              <span>사용자의 현재 GPS 위치는 개인정보 보호를 위해 서버나 DB에 저장되지 않습니다.</span>
            </div>

            {/* Database Action Box */}
            <div className="db-management-card">
              <h4>Supabase 데이터베이스 관리</h4>
              <p>서버에서 공공데이터를 호출하여 Supabase DB에 일괄 저장 및 갱신합니다. (중복 방지 & RLS 보안)</p>
              <div className="db-btn-actions">
                <button
                  type="button"
                  className="db-action-primary-btn"
                  onClick={handleServerSync}
                  disabled={isSyncingServer}
                >
                  <Server size={15} />
                  <span>{isSyncingServer ? 'DB 수집/갱신 진행 중...' : '공공데이터 DB 동기화/갱신 실행'}</span>
                </button>
                <button
                  type="button"
                  className="db-action-secondary-btn"
                  onClick={() => setShowSqlMigrationModal(true)}
                >
                  <FileCode size={15} />
                  <span>SQL 마이그레이션 확인</span>
                </button>
              </div>
            </div>

            {/* Integration Details Panel */}
            <div className="cloud-service-card">
              <h4>연동된 외부 서비스 현황</h4>
              <div className="cloud-service-item">
                <div className="service-icon success">
                  <CheckCircle2 size={16} />
                </div>
                <div className="service-info">
                  <strong>Supabase 클라우드 데이터베이스 (RLS 적용)</strong>
                  <span>
                    <code>restaurants</code> 테이블 조회(SELECT)는 누구나 가능, 쓰기는 서버 비밀키(service_role)만 허용
                  </span>
                </div>
              </div>

              <div className="cloud-service-item">
                <div className="service-icon success">
                  <CheckCircle2 size={16} />
                </div>
                <div className="service-info">
                  <strong>소상공인시장진흥공단_상가(상권)정보 Open API</strong>
                  <span>반경 검색(storeListInRadius) 및 WGS84 GPS 좌표 연동 완료</span>
                </div>
              </div>

              <div className="cloud-service-item">
                <div className="service-icon success">
                  <CheckCircle2 size={16} />
                </div>
                <div className="service-info">
                  <strong>카카오 지도 (Kakao Maps JS API)</strong>
                  <span>JavaScript 키 등록 완료 (내 위치 펄스 마커 및 반경 원 실시간 렌더링)</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Filters and List/Map */}
        {currentTab !== 'my' && (
          <>
            <CategoryFilter
              selectedCategory={selectedCategory}
              onSelectCategory={setSelectedCategory}
              selectedSort={selectedSort}
              onSelectSort={setSelectedSort}
              totalCount={filteredRestaurants.length}
              viewMode={viewMode}
              onViewModeChange={setViewMode}
            />

            {/* Map View Mode */}
            {viewMode === 'map' ? (
              <main className="map-view-container">
                <KakaoMap
                  restaurants={filteredRestaurants}
                  selectedRestaurant={selectedMapRestaurant}
                  userLocation={userLocation}
                  radius={selectedRadius}
                  onSelectRestaurant={(r) => setSelectedMapRestaurant(r)}
                  onOpenDetail={(r) => setSelectedRestaurant(r)}
                />
              </main>
            ) : (
              /* List View Mode */
              <main className="restaurant-list-container">
                {isLoading && restaurants.length === 0 ? (
                  <div className="api-loading-state">
                    <div className="spinner"></div>
                    <p>
                      {dataSource === 'db'
                        ? 'Supabase 데이터베이스에서 음식점 목록을 조회하고 있습니다...'
                        : '음식점 정보를 불러오는 중입니다...'}
                    </p>
                  </div>
                ) : filteredRestaurants.length > 0 ? (
                  <>
                    <div className="restaurant-grid">
                      {filteredRestaurants.map((restaurant) => (
                        <RestaurantCard
                          key={restaurant.id}
                          restaurant={restaurant}
                          isBookmarked={bookmarks.includes(restaurant.id)}
                          onToggleBookmark={handleToggleBookmark}
                          onClick={setSelectedRestaurant}
                          onViewOnMap={handleViewOnMap}
                        />
                      ))}
                    </div>

                    {/* Footer Info */}
                    <div className="db-persistence-footer-note">
                      <Database size={13} />
                      <span>
                        {dataSource === 'db'
                          ? `Supabase DB에서 총 ${filteredRestaurants.length}곳을 조회했습니다. (새로고침 시에도 유지됨)`
                          : '현재 실시간 공공데이터가 표시되고 있습니다. [공공데이터 DB 동기화]를 누르면 DB에 영구 저장됩니다.'}
                      </span>
                    </div>
                  </>
                ) : (
                  <div className="empty-state-card">
                    <div className="empty-icon-circle">
                      <Utensils size={32} />
                    </div>
                    <h3>선택한 조건에 맞는 음식점이 없습니다</h3>
                    <p>
                      '{searchQuery}' 또는 '{selectedCategory}' 조건의 결과를 찾을 수 없습니다.
                      <br />
                      필터를 초기화하거나 상단의 [공공데이터 DB 동기화]를 눌러 음식점을 수집해 보세요.
                    </p>
                    <div className="empty-action-buttons">
                      <button
                        type="button"
                        className="widen-radius-btn"
                        onClick={handleServerSync}
                        disabled={isSyncingServer}
                      >
                        <Server size={14} />
                        <span>공공데이터 DB 동기화 실행</span>
                      </button>
                      <button type="button" className="reset-filter-btn" onClick={resetFilters}>
                        <RotateCcw size={15} />
                        <span>필터 초기화하기</span>
                      </button>
                    </div>
                  </div>
                )}
              </main>
            )}
          </>
        )}

        {/* Bottom Navigation */}
        <BottomNav
          currentTab={currentTab}
          onTabChange={handleTabChange}
          bookmarkCount={bookmarks.length}
        />

        {/* Modal Detail Screen */}
        {selectedRestaurant && (
          <RestaurantDetailModal
            restaurant={selectedRestaurant}
            onClose={() => setSelectedRestaurant(null)}
            isBookmarked={bookmarks.includes(selectedRestaurant.id)}
            onToggleBookmark={(id) => handleToggleBookmark(id)}
            onOpenParking={(r) => {
              setSelectedRestaurant(null);
              setSelectedMapRestaurant(r);
              setViewMode('map');
            }}
            currentUser={currentUser}
            onOpenAuth={() => {
              setAuthModalMode('login');
              setShowAuthModal(true);
            }}
          />
        )}

        {/* SQL Migration Modal */}
        {showSqlMigrationModal && (
          <div className="modal-backdrop" onClick={() => setShowSqlMigrationModal(false)}>
            <div className="sql-modal-card" onClick={(e) => e.stopPropagation()}>
              <div className="sql-modal-header">
                <div className="sql-header-title">
                  <FileCode size={20} className="icon-code-primary" />
                  <h4>Supabase SQL 마이그레이션</h4>
                </div>
                <button
                  type="button"
                  className="modal-corner-close"
                  onClick={() => setShowSqlMigrationModal(false)}
                  aria-label="닫기"
                >
                  <X size={18} />
                </button>
              </div>

              <p className="sql-modal-desc">
                Supabase 대시보드의 <strong>[SQL Editor]</strong>에 아래 SQL을 복사하여 실행하시면
                <code>restaurants</code> 테이블과 RLS(Row Level Security) 정책이 생성됩니다.
              </p>

              <div className="sql-code-container">
                <div className="sql-code-top-bar">
                  <span>schema.sql (테이블 + RLS + 인덱스)</span>
                  <button type="button" className="copy-sql-pill-btn" onClick={copySqlCode}>
                    <Copy size={13} />
                    <span>{copiedSql ? '복사 완료!' : 'SQL 복사'}</span>
                  </button>
                </div>
                <pre className="sql-code-pre">
                  <code>{SQL_MIGRATION_CODE}</code>
                </pre>
              </div>

              <div className="sql-modal-footer">
                <a
                  href="https://supabase.com/dashboard/project/fbeejhlkoduwfjzmcktc/sql"
                  target="_blank"
                  rel="noreferrer"
                  className="open-supabase-sql-btn"
                >
                  <span>Supabase SQL Editor 열기</span>
                  <ExternalLink size={14} />
                </a>
                <button
                  type="button"
                  className="sql-close-done-btn"
                  onClick={() => {
                    setShowSqlMigrationModal(false);
                    loadData(selectedHotspot, null, selectedHotspot.radius, true);
                  }}
                >
                  실행 완료 후 확인
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Location Error / Fallback Modal */}
        {locationError && (
          <div className="modal-backdrop" onClick={() => setLocationError(null)}>
            <div className="location-error-modal-card" onClick={(e) => e.stopPropagation()}>
              <button
                type="button"
                className="modal-corner-close"
                onClick={() => setLocationError(null)}
                aria-label="닫기"
              >
                <X size={18} />
              </button>
              <div className="location-error-icon-box">
                <AlertTriangle size={28} />
              </div>
              <h3 className="location-error-title">{locationError.title}</h3>
              <p className="location-error-desc">{locationError.message}</p>

              <div className="location-fallback-actions">
                <button
                  type="button"
                  className="fallback-choose-region-btn"
                  onClick={() => {
                    setLocationError(null);
                    setShowRegionModal(true);
                  }}
                >
                  <MapPin size={16} />
                  <span>추천 지역 직접 선택하기</span>
                  <ArrowRight size={14} />
                </button>
                <button
                  type="button"
                  className="fallback-close-btn"
                  onClick={() => setLocationError(null)}
                >
                  확인
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Region Direct Picker Modal */}
        {showRegionModal && (
          <div className="modal-backdrop" onClick={() => setShowRegionModal(false)}>
            <div className="region-picker-modal-card" onClick={(e) => e.stopPropagation()}>
              <div className="region-modal-header">
                <div className="region-header-title">
                  <MapPin size={18} className="map-icon-primary" />
                  <h4>탐색할 지역 선택</h4>
                </div>
                <button
                  type="button"
                  className="modal-corner-close"
                  onClick={() => setShowRegionModal(false)}
                  aria-label="닫기"
                >
                  <X size={18} />
                </button>
              </div>
              <p className="region-modal-desc">
                원하시는 주요 맛집 골목 및 상권을 선택하시면 실시간 음식점 목록으로 즉시 전환됩니다.
              </p>
              <div className="region-picker-grid">
                {SEOUL_HOTSPOTS.map((spot) => (
                  <button
                    key={spot.id}
                    type="button"
                    className={`region-picker-tile ${selectedHotspot.id === spot.id && !isNearMeMode ? 'active' : ''}`}
                    onClick={() => handleSelectHotspot(spot)}
                  >
                    <div className="region-tile-top">
                      <span className="region-tile-name">{spot.name}</span>
                      <span className="region-tile-badge">{spot.radius / 1000}km 반경</span>
                    </div>
                    <span className="region-tile-sub">실시간 음식점 데이터 탐색</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* PWA Install Guide Modal */}
        {showInstallModal && (
          <div className="modal-backdrop" onClick={() => setShowInstallModal(false)}>
            <div className="install-modal-content" onClick={(e) => e.stopPropagation()}>
              <div className="install-icon-header">
                <Download size={32} />
              </div>
              <h3>PWA 앱으로 설치하기</h3>
              <p>
                웹 브라우저 주소창 없이 스마트폰 홈 화면이나 PC 바탕화면에서 네이티브 앱처럼
                원클릭으로 바로 실행할 수 있습니다.
              </p>
              <div className="install-steps">
                {deferredPrompt ? (
                  <button
                    type="button"
                    className="pwa-native-install-cta-btn"
                    onClick={handleInstallClick}
                  >
                    <Download size={18} />
                    <span>지금 바로 기기에 설치하기 (원클릭)</span>
                  </button>
                ) : isAppInstalled ? (
                  <div className="pwa-installed-badge-box">
                    <CheckCircle2 size={18} color="#16a34a" />
                    <span>이미 기기에 앱이 설치되어 있습니다!</span>
                  </div>
                ) : null}

                <div className="step-item">
                  <CheckCircle size={16} />
                  <span><strong>모바일 Safari:</strong> 하단 공유 버튼 → [홈 화면에 추가]</span>
                </div>
                <div className="step-item">
                  <CheckCircle size={16} />
                  <span><strong>모바일 Chrome:</strong> 상단 메뉴(⋮) → [앱 설치] 또는 [홈 화면에 추가]</span>
                </div>
                <div className="step-item">
                  <CheckCircle size={16} />
                  <span><strong>PC Chrome/Edge:</strong> 주소창 우측 상단 [설치] 아이콘 클릭</span>
                </div>
              </div>
              <button
                type="button"
                className="close-install-modal-btn"
                onClick={() => setShowInstallModal(false)}
              >
                확인 완료
              </button>
            </div>
          </div>
        )}

        {/* Supabase Auth Modal (Login & Sign Up) */}
        <AuthModal
          isOpen={showAuthModal}
          onClose={() => setShowAuthModal(false)}
          initialMode={authModalMode}
          onAuthSuccess={async (user) => {
            setCurrentUser(user);
            // Merge local bookmarks with Supabase
            const merged = await syncLocalBookmarksToUser(user.id, bookmarks);
            setBookmarks(merged);
          }}
        />
      </div>
    </div>
  );
}

export default App;
