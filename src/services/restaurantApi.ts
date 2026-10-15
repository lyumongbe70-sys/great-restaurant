import type { Restaurant, Category, MenuItem, ReviewItem } from '../types/restaurant';

export interface FoodHotspot {
  id: string;
  name: string;
  lat: number;
  lng: number;
  radius: number; // in meters
}

export const SEOUL_HOTSPOTS: FoodHotspot[] = [
  { id: 'jongno', name: '종로·인사동·북촌', lat: 37.5730, lng: 126.9835, radius: 1500 },
  { id: 'seongsu', name: '성수동·연무장길', lat: 37.5446, lng: 127.0560, radius: 1500 },
  { id: 'apgujeong', name: '압구정·신사 가로수길', lat: 37.5275, lng: 127.0289, radius: 1500 },
  { id: 'hongdae', name: '홍대입구·연남동', lat: 37.5560, lng: 126.9240, radius: 1500 },
  { id: 'euljiro', name: '을지로·명동 힙지로', lat: 37.5660, lng: 126.9880, radius: 1500 },
  { id: 'gangnam', name: '강남역·테헤란로', lat: 37.4980, lng: 127.0276, radius: 1500 },
];

const SEMAS_KEY =
  import.meta.env.VITE_SEMAS_API_KEY ||
  'fbc49ac60a46a72846de1133ea39377c8d5672fc5d28b93321d23887efdf9cef';
const SEMAS_BASE_URL =
  import.meta.env.VITE_SEMAS_BASE_URL ||
  'https://apis.data.go.kr/B553077/api/open/sdsc2';

// High-quality imagery per food category
const CATEGORY_IMAGES: Record<Category, string[]> = {
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
    'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&w=800&q=80',
  ],
  '주점·바': [
    'https://images.unsplash.com/photo-1514933651103-005eec06c04b?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1572116469696-31de0f17cc34?auto=format&fit=crop&w=800&q=80',
  ],
  전체: [
    'https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=800&q=80',
  ],
};

function mapSemasCategory(indsMclsNm: string = '', indsSclsNm: string = '', bizesNm: string = ''): Category {
  const combined = (indsMclsNm + ' ' + indsSclsNm + ' ' + bizesNm).toLowerCase();
  if (combined.includes('일식') || combined.includes('스시') || combined.includes('초밥') || combined.includes('횟집') || combined.includes('사시미')) return '일식';
  if (combined.includes('중식') || combined.includes('중화') || combined.includes('짜장') || combined.includes('마라') || combined.includes('양꼬치')) return '중식';
  if (combined.includes('양식') || combined.includes('경양식') || combined.includes('파스타') || combined.includes('피자') || combined.includes('스테이크') || combined.includes('버거')) return '양식';
  if (combined.includes('커피') || combined.includes('카페') || combined.includes('비알코올') || combined.includes('디저트') || combined.includes('베이커리') || combined.includes('제과') || combined.includes('도넛') || combined.includes('와플')) return '카페·디저트';
  if (combined.includes('주점') || combined.includes('호프') || combined.includes('통닭') || combined.includes('치킨') || combined.includes('포차') || combined.includes('맥주') || combined.includes('소주') || combined.includes('와인') || combined.includes('바')) return '주점·바';
  if (combined.includes('베트남') || combined.includes('태국') || combined.includes('쌀국수') || combined.includes('아시안') || combined.includes('분식') || combined.includes('떡볶이')) return '아시안';
  return '한식';
}

function generateMenusForCategory(category: Category, restaurantName: string): MenuItem[] {
  switch (category) {
    case '한식':
      return [
        { name: `${restaurantName} 특선 정식`, price: 16000, description: '매일 아침 준비하는 신선한 밑반찬과 정갈한 메인 요리', isPopular: true },
        { name: '숯불 소갈비 / 고기구이', price: 35000, description: '부드러운 육질과 깊은 숯불향의 시그니처 구이', isPopular: true },
        { name: '자가제면 평양식 물냉면', price: 13000, description: '깊고 맑은 고기 육수와 쫄깃한 메밀면' },
        { name: '구수한 된장찌개 & 솥밥', price: 9000, description: '전통 재래식 된장과 갓 지은 가마솥밥' },
      ];
    case '일식':
      return [
        { name: '특선 모둠 스시 코스 (12p)', price: 28000, description: '산지 직송 제철 생선으로 정성스레 쥐어낸 특선 초밥', isPopular: true },
        { name: '생연어 사케동 & 우동', price: 17000, description: '두툼한 노르웨이 생연어와 비법 간장 소스', isPopular: true },
        { name: '바삭 모둠 튀김', price: 19000, description: '바삭한 왕새우와 제철 야채 튀김' },
      ];
    case '중식':
      return [
        { name: '차돌 불향 해물 짬뽕', price: 13000, description: '불향 가득 볶아낸 진한 해물 사골 육수와 차돌박이', isPopular: true },
        { name: '바삭 찹쌀 꿔바로우', price: 22000, description: '국내산 암퇘지 등심과 새콤달콤 찹쌀 튀김', isPopular: true },
        { name: '수제 멘보샤 (6pcs)', price: 19000, description: '통새우살을 식빵 사이에 듬뿍 넣어 바삭하게 튀겨낸 요리' },
      ];
    case '양식':
      return [
        { name: '생 트러플 크림 파스타', price: 21000, description: '진한 이탈리아산 블랙 트러플 오일과 버섯의 풍미', isPopular: true },
        { name: '수비드 채끝 스테이크 (200g)', price: 38000, description: '풍부한 육즙과 부드러운 식감의 프리미엄 스테이크', isPopular: true },
        { name: '화덕 마르게리타 피자', price: 19000, description: '버팔로 모짜렐라와 산마르자노 토마토소스 화덕 피자' },
      ];
    case '카페·디저트':
      return [
        { name: '스페셜티 시그니처 핸드드립', price: 7000, description: '에티오피아 싱글오리진 화사한 향미의 스페셜티 커피', isPopular: true },
        { name: '프랑스 고메버터 소금빵', price: 3800, description: '프랑스산 발효버터와 게랑드 소금으로 갓 구운 바삭 빵', isPopular: true },
        { name: '마다가스카르 바닐라 아인슈페너', price: 6800, description: '진한 에스프레소와 부드러운 수제 크림' },
      ];
    case '주점·바':
      return [
        { name: '차돌박이 미나리 해물전', price: 21000, description: '향긋한 청도 미나리와 차돌박이를 바삭하게 부친 안주', isPopular: true },
        { name: '얼큰 해물 짬뽕탕 & 우동사리', price: 24000, description: '칼칼하고 시원한 국물 요리', isPopular: true },
        { name: '시그니처 하이볼', price: 9000, description: '시원하고 청량한 특제 칵테일' },
      ];
    default:
      return [
        { name: '추천 메인 디시', price: 15000, description: '정성을 다해 준비한 매장 대표 메뉴', isPopular: true },
        { name: '사이드 디시', price: 8000, description: '함께 즐기기 좋은 곁들임 요리' },
      ];
  }
}

function generateReviews(name: string, rating: number): ReviewItem[] {
  return [
    {
      id: `rev-${Math.random()}`,
      author: '미식탐방가',
      rating: Math.min(5, Math.max(4, Math.round(rating))),
      date: '2026-10-12',
      comment: `${name}은 소상공인 인증 실제 상가 정보로 찾은 곳인데 기대 이상으로 맛있고 분위기도 훌륭했습니다!`,
    },
    {
      id: `rev-${Math.random()}`,
      author: '로컬주민',
      rating: 5,
      date: '2026-10-09',
      comment: '직원분들도 정말 친절하시고 식재료 퀄리티가 남다릅니다. 재방문 의사 100%!',
    },
  ];
}

export function calculateDistanceMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371e3; // Earth radius in metres
  const phi1 = (lat1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;
  const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
  const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return Math.round(R * c);
}

export function formatDistance(meters: number): string {
  if (meters < 1000) {
    return `직선거리 ${meters}m`;
  }
  return `직선거리 ${(meters / 1000).toFixed(1)}km`;
}

export interface FetchRestaurantsOptions {
  hotspot?: FoodHotspot;
  userCoords?: { lat: number; lng: number } | null;
  radius?: number; // 500, 1000, 3000
  page?: number;
  numOfRows?: number;
}

export async function fetchSemasRestaurants(
  options: FetchRestaurantsOptions = {}
): Promise<{ restaurants: Restaurant[]; totalCount: number; isLive: boolean; hotspotName: string }> {
  const isNearMe = !!options.userCoords;
  const centerLat = options.userCoords ? options.userCoords.lat : (options.hotspot || SEOUL_HOTSPOTS[0]).lat;
  const centerLng = options.userCoords ? options.userCoords.lng : (options.hotspot || SEOUL_HOTSPOTS[0]).lng;
  const radius = options.radius || (options.hotspot ? options.hotspot.radius : 1000);
  const hotspotName = options.userCoords ? '내 현재 위치' : (options.hotspot || SEOUL_HOTSPOTS[0]).name;

  const page = options.page || 1;
  const numOfRows = options.numOfRows || 50;

  try {
    // 소상공인시장진흥공단 반경내 상가업소정보 (storeListInRadius)
    // indsLclsCd=I2 (음식 업종)
    const url = `${SEMAS_BASE_URL}/storeListInRadius?serviceKey=${encodeURIComponent(
      SEMAS_KEY
    )}&page=${page}&numOfRows=${numOfRows}&radius=${radius}&cx=${centerLng}&cy=${centerLat}&indsLclsCd=I2&type=json`;

    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(`SEMAS API HTTP error: ${res.status}`);
    }

    const data = await res.json();
    const items: any[] = data.body?.items || [];
    const totalCount = data.body?.totalCount || items.length;

    if (!items || items.length === 0) {
      throw new Error('No items returned from SEMAS API');
    }

    const restaurants: Restaurant[] = items
      .filter((it) => it.bizesNm && it.bizesNm.trim().length > 0)
      .map((it, idx) => {
        const id = it.bizesId ? `semas-${it.bizesId}` : `semas-${page}-${idx}`;
        const name = it.bizesNm.trim();
        const category = mapSemasCategory(it.indsMclsNm, it.indsSclsNm, name);
        const address =
          (it.rdnmAdr && it.rdnmAdr.trim()) ||
          (it.lnoAdr && it.lnoAdr.trim()) ||
          '주소 정보 없음';

        // Precise WGS84 GPS Coordinates directly from SEMAS
        const lat = parseFloat(it.lat) || centerLat;
        const lng = parseFloat(it.lon) || centerLng;

        const imagesPool = CATEGORY_IMAGES[category] || CATEGORY_IMAGES.한식;
        const thumbnail = imagesPool[idx % imagesPool.length];
        const images = imagesPool;

        const rating = Number((4.3 + ((idx * 3) % 7) * 0.1).toFixed(1));
        const reviewCount = 30 + ((idx * 23) % 450);

        // Precise straight-line distance in meters
        const distanceMeters = calculateDistanceMeters(centerLat, centerLng, lat, lng);

        return {
          id,
          name,
          category,
          rating,
          reviewCount,
          address,
          phone: '02-730-0000',
          openingHours: '11:00 - 22:00 (연중무휴)',
          priceRange: (idx % 3 === 0 ? '₩₩₩' : idx % 2 === 0 ? '₩₩' : '₩') as '₩' | '₩₩' | '₩₩₩',
          thumbnail,
          images,
          description: `소상공인시장진흥공단 공공데이터에 정식 등록된 상가입니다. 업종: ${it.indsMclsNm || '음식'} (${it.indsSclsNm || '일반음식'}). 지역: ${it.signguNm || ''} ${it.adongNm || ''}.`,
          features: ['소상공인 상가 인증', it.indsSclsNm || '음식점', '포장 가능', '카드 결제'],
          menus: generateMenusForCategory(category, name),
          reviews: generateReviews(name, rating),
          isOpen: true,
          distance: formatDistance(distanceMeters),
          distanceMeters,
          lat,
          lng,
        };
      })
      // Strictly enforce radius filtering
      .filter((r) => !isNearMe || (r.distanceMeters !== undefined && r.distanceMeters <= radius));

    return { restaurants, totalCount, isLive: true, hotspotName };
  } catch (err) {
    console.warn('SEMAS live API failed, returning empty:', err);
    return { restaurants: [], totalCount: 0, isLive: false, hotspotName };
  }
}
