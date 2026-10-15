import { supabase } from '../lib/supabase';
import type { Restaurant, Category, SortOption } from '../types/restaurant';
import { calculateDistanceMeters, formatDistance } from './restaurantApi';

// Fallback high-quality food photography
const CATEGORY_IMAGES: Record<string, string[]> = {
  한식: [
    'https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1529193591184-b1d58069ecdd?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=800&q=80',
  ],
  일식: [
    'https://images.unsplash.com/photo-1579871494447-9811cf80d66c?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1611143669185-af224c5e3252?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?auto=format&fit=crop&w=800&q=80',
  ],
  중식: [
    'https://images.unsplash.com/photo-1563245372-f21724e3856d?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1525755662778-989d0524087e?auto=format&fit=crop&w=800&q=80',
  ],
  양식: [
    'https://images.unsplash.com/photo-1551183053-bf91a1d81141?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1546549032-9571cd6b27df?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=800&q=80',
  ],
  아시안: [
    'https://images.unsplash.com/photo-1582878826629-29b7ad1cdc43?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1552611052-33e04de081de?auto=format&fit=crop&w=800&q=80',
  ],
  '카페·디저트': [
    'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1554118811-1e0d58224f24?auto=format&fit=crop&w=800&q=80',
  ],
  '주점·바': [
    'https://images.unsplash.com/photo-1514933651103-005eec06c04b?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1572116469696-31de0f17cc34?auto=format&fit=crop&w=800&q=80',
  ],
};

export interface DbRestaurantRow {
  id: string;
  source: string;
  source_id: string;
  name: string;
  category: string;
  sub_category?: string;
  address: string;
  road_address?: string;
  phone?: string;
  lat: number;
  lng: number;
  status?: string;
  rating?: number;
  review_count?: number;
  price_range?: '₩' | '₩₩' | '₩₩₩' | '₩₩₩₩';
  description?: string;
  menus?: any[];
  features?: string[];
  images?: string[];
  created_at: string;
  updated_at: string;
  distance_meters?: number;
}

export function transformDbRowToRestaurant(
  row: DbRestaurantRow,
  idx: number,
  userCoords?: { lat: number; lng: number } | null
): Restaurant {
  const category = (row.category as Category) || '한식';
  const imgPool = CATEGORY_IMAGES[category] || CATEGORY_IMAGES['한식'];
  const thumbnail = imgPool[idx % imgPool.length];

  let distance: string | undefined;
  let distanceMeters: number | undefined;

  // DB(PostGIS)에서 직접 계산된 구면 직선거리가 있는 경우 우선 사용
  if (typeof row.distance_meters === 'number') {
    distanceMeters = Math.round(row.distance_meters);
    distance = formatDistance(distanceMeters);
  } else if (userCoords) {
    distanceMeters = calculateDistanceMeters(userCoords.lat, userCoords.lng, row.lat, row.lng);
    distance = formatDistance(distanceMeters);
  }

  return {
    id: row.id,
    name: row.name,
    category,
    rating: Number(row.rating || 4.5),
    reviewCount: row.review_count || 30,
    address: row.road_address || row.address,
    phone: row.phone || '02-730-0000',
    openingHours: '11:00 - 22:00 (연중무휴)',
    priceRange: row.price_range || '₩₩',
    thumbnail,
    images: imgPool,
    description:
      row.description ||
      `소상공인 공공데이터 연동 음식점입니다. (${row.sub_category || category}) 상태: ${row.status || '영업/정상'}`,
    features: Array.isArray(row.features) && row.features.length > 0
      ? row.features
      : ['소상공인 인증', row.sub_category || '음식점', '카드 결제', '포장 가능'],
    menus: Array.isArray(row.menus) && row.menus.length > 0
      ? row.menus
      : [
          { name: `${row.name} 대표 메뉴`, price: 15000, description: '매장 인기 추천 요리', isPopular: true },
          { name: '사이드 메뉴', price: 8000, description: '곁들여 먹기 좋은 추가 요리' },
        ],
    reviews: [
      {
        id: `rev-${row.id}-1`,
        author: '미식가',
        rating: 5,
        date: row.updated_at ? row.updated_at.slice(0, 10) : '2026-10-15',
        comment: `${row.name}은 재료가 정갈하고 매장 서비스가 훌륭했습니다.`,
      },
    ],
    isOpen: row.status ? row.status.includes('영업') : true,
    distance,
    distanceMeters,
    lat: row.lat,
    lng: row.lng,
  };
}

export interface FetchNearbyDbOptions {
  userLat: number;
  userLng: number;
  radiusMeters: number; // 500, 1000, 3000
  category?: Category;
  search?: string;
  limit?: number;
}

/**
 * PostGIS RPC(get_nearby_restaurants)를 사용하여 Supabase DB에서 반경 내 음식점 검색
 * - 구면 타원체(WGS84) 기반 정확한 직선거리 계산 (미터 단위)
 * - 반경 밖 음식점은 ST_DWithin에 의해 DB에서 제외
 * - 거리순(오름차순) 정렬 및 업종/검색어 필터링이 DB에서 일괄 수행됨
 */
export async function fetchNearbyRestaurantsFromDb(
  options: FetchNearbyDbOptions
): Promise<{
  exists: boolean;
  restaurants: Restaurant[];
  count: number;
  error?: string;
}> {
  try {
    const { data, error } = await supabase.rpc('get_nearby_restaurants', {
      user_lat: options.userLat,
      user_lng: options.userLng,
      radius_meters: options.radiusMeters,
      search_category: options.category && options.category !== '전체' ? options.category : null,
      search_query: options.search && options.search.trim() ? options.search.trim() : null,
      limit_count: options.limit || 100,
    });

    if (error) {
      if (
        error.code === '42883' ||
        error.code === 'PGRST202' ||
        error.message.includes('get_nearby_restaurants') ||
        error.message.includes('schema cache')
      ) {
        return { exists: false, restaurants: [], count: 0, error: 'PostGIS RPC 함수 미생성' };
      }
      return { exists: true, restaurants: [], count: 0, error: error.message };
    }

    const rows = (data as DbRestaurantRow[]) || [];
    const restaurants = rows.map((r, i) =>
      transformDbRowToRestaurant(r, i, { lat: options.userLat, lng: options.userLng })
    );

    return {
      exists: true,
      restaurants,
      count: rows.length,
    };
  } catch (err: any) {
    return {
      exists: false,
      restaurants: [],
      count: 0,
      error: err?.message || 'DB 연결 오류',
    };
  }
}

export interface FetchDbOptions {
  category?: Category;
  search?: string;
  sort?: SortOption;
  userCoords?: { lat: number; lng: number } | null;
  radiusMeters?: number;
  limit?: number;
}

/**
 * Supabase DB에서 음식점 목록 조회
 * 위치 좌표(userCoords)와 반경이 주어지면 PostGIS 기반 get_nearby_restaurants RPC로 검색
 */
export async function fetchRestaurantsFromDb(options: FetchDbOptions = {}): Promise<{
  exists: boolean;
  restaurants: Restaurant[];
  count: number;
  error?: string;
}> {
  // 위치 좌표가 주어졌다면 PostGIS 반경 검색 RPC 우선 호출
  if (options.userCoords) {
    const nearbyRes = await fetchNearbyRestaurantsFromDb({
      userLat: options.userCoords.lat,
      userLng: options.userCoords.lng,
      radiusMeters: options.radiusMeters || 3000,
      category: options.category,
      search: options.search,
      limit: options.limit || 100,
    });

    if (nearbyRes.exists) {
      return nearbyRes;
    }
    // RPC 함수가 없는 경우 기본 테이블 쿼리로 폴백 진행
  }

  try {
    let query = supabase.from('restaurants').select('*');

    if (options.category && options.category !== '전체') {
      query = query.eq('category', options.category);
    }

    if (options.search && options.search.trim()) {
      query = query.ilike('name', `%${options.search.trim()}%`);
    }

    // Default DB ordering by updated_at or rating
    query = query.order('updated_at', { ascending: false }).limit(options.limit || 100);

    const { data, error } = await query;

    if (error) {
      if (error.code === 'PGRST205' || error.message.includes('schema cache')) {
        return { exists: false, restaurants: [], count: 0, error: '테이블 미생성' };
      }
      return { exists: true, restaurants: [], count: 0, error: error.message };
    }

    const rows = (data as DbRestaurantRow[]) || [];
    const restaurants = rows.map((r, i) => transformDbRowToRestaurant(r, i, options.userCoords));

    return {
      exists: true,
      restaurants,
      count: rows.length,
    };
  } catch (err: any) {
    return {
      exists: false,
      restaurants: [],
      count: 0,
      error: err?.message || 'DB 연결 오류',
    };
  }
}

/**
 * Supabase DB에서 특정 음식점 상세 조회
 */
export async function fetchRestaurantDetailFromDb(
  id: string,
  userCoords?: { lat: number; lng: number } | null
): Promise<Restaurant | null> {
  try {
    const { data, error } = await supabase
      .from('restaurants')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error || !data) return null;
    return transformDbRowToRestaurant(data as DbRestaurantRow, 0, userCoords);
  } catch {
    return null;
  }
}

/**
 * 서버에 데이터 수집/갱신 요청 트리거 (서버에서만 수집 및 service_role로 DB Upsert)
 */
export async function triggerServerSync(): Promise<{
  success: boolean;
  totalCollected?: number;
  totalUpserted?: number;
  message?: string;
  error?: string;
}> {
  try {
    const res = await fetch('/api/sync-restaurants', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.error || `HTTP ${res.status}`);
    }

    const data = await res.json();
    return data;
  } catch (err: any) {
    return {
      success: false,
      error: err?.message || '서버 동기화 요청 실패',
    };
  }
}
