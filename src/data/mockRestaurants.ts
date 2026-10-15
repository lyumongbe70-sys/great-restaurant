import type { Restaurant } from '../types/restaurant';

export const CATEGORIES = [
  '전체',
  '한식',
  '일식',
  '중식',
  '양식',
  '아시안',
  '카페·디저트',
  '주점·바'
] as const;

export const MOCK_RESTAURANTS: Restaurant[] = [
  {
    id: 'rest-1',
    name: '기와집 숯불갈비',
    category: '한식',
    rating: 4.8,
    reviewCount: 342,
    address: '서울 종로구 삼청로 72',
    phone: '02-732-9292',
    openingHours: '11:30 - 22:00 (라스트오더 21:00)',
    priceRange: '₩₩₩',
    thumbnail: 'https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=800&q=80',
    images: [
      'https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=1000&q=80',
      'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?auto=format&fit=crop&w=1000&q=80',
      'https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=1000&q=80'
    ],
    description: '전통 참숯으로 구워내는 특제 양념 소갈비와 3대째 내려오는 비법 평양냉면을 맛볼 수 있는 한옥 전문점입니다.',
    features: ['발렛주차', '단체석 완비', '예약 필수', '룸 구비'],
    isOpen: true,
    distance: '350m',
    lat: 37.5828,
    lng: 126.9815,
    menus: [
      { name: '기와 양념 소갈비 (250g)', price: 38000, description: '전통 비법 배숙성 양념에 48시간 숙성한 부드러운 소갈비', isPopular: true },
      { name: '자가제면 평양물냉면', price: 14000, description: '순메밀 80% 자가제면과 맑고 깊은 육수', isPopular: true },
      { name: '한우 육회 (180g)', price: 28000, description: '당일 도축한 1++ 등급 한우 우둔살' },
      { name: '된장찌개 & 솥밥', price: 9000, description: '재래식 된장과 구수한 갓 지은 솥밥' }
    ],
    reviews: [
      { id: 'rev-1', author: '고기러버', rating: 5, date: '2026-10-10', comment: '갈비 양념이 과하지 않고 은은하게 달콤해서 부모님도 너무 만족하셨습니다. 평양냉면 국물도 예술입니다.' },
      { id: 'rev-2', author: '종로미식가', rating: 4, date: '2026-10-05', comment: '한옥 분위기가 고즈넉하고 대접하기 좋습니다. 주말엔 예약 안 하면 웨이팅이 길어요.' }
    ]
  },
  {
    id: 'rest-2',
    name: '스시 오마카세 렌(蓮)',
    category: '일식',
    rating: 4.9,
    reviewCount: 215,
    address: '서울 강남구 압구정로 142길 18',
    phone: '02-543-1890',
    openingHours: '12:00 - 21:30 (브레이크타임 15:00 - 18:00)',
    priceRange: '₩₩₩₩',
    thumbnail: 'https://images.unsplash.com/photo-1579871494447-9811cf80d66c?auto=format&fit=crop&w=800&q=80',
    images: [
      'https://images.unsplash.com/photo-1579871494447-9811cf80d66c?auto=format&fit=crop&w=1000&q=80',
      'https://images.unsplash.com/photo-1611143669185-af224c5e3252?auto=format&fit=crop&w=1000&q=80'
    ],
    description: '노량진과 산지 직송 신선한 자연산 해산물만을 취급하며, 장인의 섬세한 손길로 쥐어내는 정통 에도마에 스시입니다.',
    features: ['100% 예약제', '콜키지 가능', '주차 가능', '프라이빗 카운터'],
    isOpen: true,
    distance: '1.2km',
    lat: 37.5275,
    lng: 127.0289,
    menus: [
      { name: '런치 스시 코스', price: 75000, description: '전채, 스시 10관, 카이센동, 디저트 구성', isPopular: true },
      { name: '디너 스페셜 오마카세', price: 150000, description: '츠마미 5종, 특선 스시 14관, 우니 마끼, 교쿠', isPopular: true },
      { name: '프리미엄 사케 페어링 (3잔)', price: 45000, description: '엄선된 지자케 3종 페어링' }
    ],
    reviews: [
      { id: 'rev-3', author: '스시탐험가', rating: 5, date: '2026-10-08', comment: '샤리의 초간과 온도감이 완벽했습니다. 특히 훈연 삼치와 단새우 우니 조합이 감동적이었어요.' },
      { id: 'rev-4', author: '강남맛집러', rating: 5, date: '2026-09-28', comment: '셰프님의 친절한 설명과 깔끔한 서비스 덕분에 특별한 기념일을 잘 보냈습니다.' }
    ]
  },
  {
    id: 'rest-3',
    name: '파스타 비스트로 루나',
    category: '양식',
    rating: 4.7,
    reviewCount: 428,
    address: '서울 성동구 연무장길 35 2층',
    phone: '02-466-7788',
    openingHours: '11:30 - 21:00 (매주 월요일 휴무)',
    priceRange: '₩₩',
    thumbnail: 'https://images.unsplash.com/photo-1551183053-bf91a1d81141?auto=format&fit=crop&w=800&q=80',
    images: [
      'https://images.unsplash.com/photo-1551183053-bf91a1d81141?auto=format&fit=crop&w=1000&q=80',
      'https://images.unsplash.com/photo-1546549032-9571cd6b27df?auto=format&fit=crop&w=1000&q=80'
    ],
    description: '매일 아침 직접 뽑는 생면 파스타와 화덕에서 갓 구운 나폴리 피자, 자연주의 내추럴 와인을 즐길 수 있는 성수동 비스트로.',
    features: ['와인 페어링', '테라스석', '반려동물 동반', '무선 인터넷'],
    isOpen: true,
    distance: '850m',
    lat: 37.5446,
    lng: 127.0560,
    menus: [
      { name: '생 트러플 크림 딸리아뗄레', price: 23000, description: '블랙 트러플 버터와 파르미지아노 레지아노 치즈 생면 파스타', isPopular: true },
      { name: '화덕 마르게리타 콘 부팔라', price: 19000, description: '이탈리아산 버팔로 모짜렐라와 산마르자노 토마토', isPopular: true },
      { name: '수비드 부채살 스테이크 (200g)', price: 34000, description: '트러플 매쉬드 포테이토와 포트와인 리덕션' },
      { name: '하우스 내추럴 와인 (Glass)', price: 12000, description: '시즌별 오가닉 내추럴 글라스 와인' }
    ],
    reviews: [
      { id: 'rev-5', author: '성수피플', rating: 5, date: '2026-10-11', comment: '생면 식감이 쫄깃하고 트러플 풍미가 풍부합니다. 데이트 코스로 강추!' },
      { id: 'rev-6', author: '파스타매니아', rating: 4, date: '2026-10-02', comment: '분위기 좋고 피자 도우도 바삭쫄깃해요. 창가 자리는 사전 예약 필수입니다.' }
    ]
  },
  {
    id: 'rest-4',
    name: '진진 중화반점',
    category: '중식',
    rating: 4.6,
    reviewCount: 512,
    address: '서울 마포구 잔다리로 123',
    phone: '02-324-8777',
    openingHours: '11:00 - 22:00 (브레이크타임 15:00 - 17:00)',
    priceRange: '₩₩',
    thumbnail: 'https://images.unsplash.com/photo-1563245372-f21724e3856d?auto=format&fit=crop&w=800&q=80',
    images: [
      'https://images.unsplash.com/photo-1563245372-f21724e3856d?auto=format&fit=crop&w=1000&q=80',
      'https://images.unsplash.com/photo-1525755662778-989d0524087e?auto=format&fit=crop&w=1000&q=80'
    ],
    description: '호텔 중식 경력 25년 셰프가 선보이는 불향 가득한 짬뽕과 바삭한 멘보샤가 유명한 홍대 명물 중식당입니다.',
    features: ['포장 가능', '배달 가능', '유아의자 구비', '주차 가능'],
    isOpen: true,
    distance: '2.1km',
    lat: 37.5539,
    lng: 126.9182,
    menus: [
      { name: '바삭 멘보샤 (6pcs)', price: 21000, description: '탱글한 통새우 살을 식빵 사이에 듬뿍 넣어 튀겨낸 대표 시그니처', isPopular: true },
      { name: '진진 차돌 짬뽕', price: 12000, description: '불향 가득 볶아낸 진한 사골 육수와 푸짐한 차돌박이', isPopular: true },
      { name: '꿔바로우 탕수육 (소)', price: 18000, description: '찹쌀 반죽으로 겉바속촉 쫄깃한 북경식 탕수육' },
      { name: '어향가지 덮밥', price: 11000, description: '바삭하게 튀긴 가지와 매콤달콤한 사천식 소스' }
    ],
    reviews: [
      { id: 'rev-7', author: '짬뽕순례', rating: 5, date: '2026-10-12', comment: '멘보샤는 진짜 전국 탑티어입니다. 새우가 씹히는 식감이 환상적이에요.' },
      { id: 'rev-8', author: '중식덕후', rating: 4, date: '2026-09-30', comment: '짬뽕 국물이 묵직하고 고기 양도 많아서 든든합니다.' }
    ]
  },
  {
    id: 'rest-5',
    name: '포앤분짜 하노이',
    category: '아시안',
    rating: 4.5,
    reviewCount: 189,
    address: '서울 용산구 이태원로 210',
    phone: '02-790-3344',
    openingHours: '11:00 - 21:30',
    priceRange: '₩₩',
    thumbnail: 'https://images.unsplash.com/photo-1582878826629-29b7ad1cdc43?auto=format&fit=crop&w=800&q=80',
    images: [
      'https://images.unsplash.com/photo-1582878826629-29b7ad1cdc43?auto=format&fit=crop&w=1000&q=80'
    ],
    description: '베트남 하노이 현지 레시피 그대로 24시간 끓인 진한 소고기 쌀국수와 숯불향 가득한 분짜를 선보입니다.',
    features: ['혼밥 환영', '포장 가능', '테이크아웃 할인', '고수 무료 추가'],
    isOpen: false,
    distance: '3.4km',
    lat: 37.5348,
    lng: 126.9996,
    menus: [
      { name: '하노이 차돌 양지 쌀국수', price: 12000, description: '24시간 푹 고아낸 소뼈 육수와 부드러운 양지살', isPopular: true },
      { name: '직화 분짜', price: 14000, description: '숯불 돼지고기와 생채소, 새콤달콤 느억맘 소스', isPopular: true },
      { name: '수제 넴 (짜조 4pcs)', price: 7000, description: '라이스페이퍼에 고기와 채소를 가득 채운 튀김' }
    ],
    reviews: [
      { id: 'rev-9', author: '베트남러버', rating: 5, date: '2026-10-09', comment: '현지에서 먹던 그 육수 맛입니다. 국물이 정말 깊고 깔끔해요!' }
    ]
  },
  {
    id: 'rest-6',
    name: '카페 아틀리에 멜로우',
    category: '카페·디저트',
    rating: 4.8,
    reviewCount: 620,
    address: '서울 종로구 계동길 48',
    phone: '02-741-5522',
    openingHours: '10:00 - 20:00 (월요일 휴무)',
    priceRange: '₩',
    thumbnail: 'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?auto=format&fit=crop&w=800&q=80',
    images: [
      'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?auto=format&fit=crop&w=1000&q=80',
      'https://images.unsplash.com/photo-1554118811-1e0d58224f24?auto=format&fit=crop&w=1000&q=80'
    ],
    description: '북촌 한옥마을 골목길에 자리잡은 스페셜티 핸드드립 커피와 프랑스산 고메버터로 구워낸 소금빵 전문 베이커리 카페.',
    features: ['반려동물 동반', '테라스석', '와이파이', '콘센트 좌석'],
    isOpen: true,
    distance: '500m',
    lat: 37.5802,
    lng: 126.9868,
    menus: [
      { name: '스페셜티 에티오피아 핸드드립', price: 7000, description: '화사한 꽃향기와 감귤류의 산미가 돋보이는 싱글오리진', isPopular: true },
      { name: '버터 가득 시오빵 (소금빵)', price: 3800, description: '프랑스산 발효버터와 게랑드 소금으로 구운 바삭 쫄깃 빵', isPopular: true },
      { name: '바닐라 빈 아인슈페너', price: 6800, description: '수제 마다가스카르 바닐라빈 크림' },
      { name: '무화과 피칸 휘낭시에', price: 3500, description: '달콤한 반건조 무화과와 고소한 피칸' }
    ],
    reviews: [
      { id: 'rev-10', author: '카페투어', rating: 5, date: '2026-10-12', comment: '소금빵 겉바속촉 끝판왕입니다. 커피랑 같이 먹으면 순식간에 사라져요.' },
      { id: 'rev-11', author: '북촌산책러', rating: 5, date: '2026-10-04', comment: '채광 좋은 마당에서 한옥 기와를 바라보며 커피 한잔하기 딱 좋습니다.' }
    ]
  },
  {
    id: 'rest-7',
    name: '을지로 야장 힙지로 라운지',
    category: '주점·바',
    rating: 4.6,
    reviewCount: 380,
    address: '서울 중구 을지로 11길 29',
    phone: '02-2268-9011',
    openingHours: '17:00 - 02:00 (일요일 24:00 마감)',
    priceRange: '₩₩',
    thumbnail: 'https://images.unsplash.com/photo-1514933651103-005eec06c04b?auto=format&fit=crop&w=800&q=80',
    images: [
      'https://images.unsplash.com/photo-1514933651103-005eec06c04b?auto=format&fit=crop&w=1000&q=80'
    ],
    description: '레트로한 을지로 골목 감성을 현대적으로 재해석한 전통주 칵테일 바 & 퓨전 주점입니다.',
    features: ['루프탑 좌석', '예약 가능', '대관 가능', '음악 맛집'],
    isOpen: true,
    distance: '1.5km',
    lat: 37.5663,
    lng: 126.9912,
    menus: [
      { name: '차돌박이 미나리 전', price: 19000, description: '향긋한 청도 미나리와 고소한 차돌박이를 바삭하게 부친 전', isPopular: true },
      { name: '문경바람 하이볼', price: 9000, description: '사과 증류주 문경바람에 진저에일을 더한 시원한 하이볼', isPopular: true },
      { name: '을지로 골뱅이 카펠리니', price: 18000, description: '을지로 골뱅이와 얇은 카펠리니 면의 매콤새콤 퓨전 요리' }
    ],
    reviews: [
      { id: 'rev-12', author: '힙스터', rating: 5, date: '2026-10-07', comment: '루프탑 분위기 최고입니다! 미나리전이랑 문경바람 하이볼 조합 강력 추천.' }
    ]
  },
  {
    id: 'rest-8',
    name: '제주바당 흑돼지 구이',
    category: '한식',
    rating: 4.9,
    reviewCount: 780,
    address: '서울 강남구 테헤란로 87길 22',
    phone: '02-555-4321',
    openingHours: '11:30 - 23:00 (연중무휴)',
    priceRange: '₩₩₩',
    thumbnail: 'https://images.unsplash.com/photo-1529193591184-b1d58069ecdd?auto=format&fit=crop&w=800&q=80',
    images: [
      'https://images.unsplash.com/photo-1529193591184-b1d58069ecdd?auto=format&fit=crop&w=1000&q=80'
    ],
    description: '제주 산지 직송 숙성 흑돼지 근고기를 전문 그릴러가 직접 구워드리는 프리미엄 돈육 전문점.',
    features: ['직접 구워줌', '발렛파킹', '개별 룸', '콜키지 프리'],
    isOpen: true,
    distance: '4.2km',
    lat: 37.5098,
    lng: 127.0601,
    menus: [
      { name: '제주 숙성 흑돼지 근고기 (600g)', price: 66000, description: '목살과 오겹살의 환상적인 마블링과 육즙', isPopular: true },
      { name: '흑돼지 김치찌개 & 라면사리', price: 9000, description: '묵은지와 흑돼지를 듬뿍 넣어 칼칼한 찌개' },
      { name: '비빔 냉면', price: 8000, description: '새콤달콤한 비빔 양념과 시원한 육수' }
    ],
    reviews: [
      { id: 'rev-13', author: '직장인회식러', rating: 5, date: '2026-10-10', comment: '직원분이 처음부터 끝까지 정성스럽게 구워주셔서 편하게 맛있게 먹었습니다.' }
    ]
  }
];
