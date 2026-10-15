export type Category = '전체' | '한식' | '일식' | '중식' | '양식' | '아시안' | '카페·디저트' | '주점·바';

export type SortOption = 'distance' | 'rating' | 'reviews' | 'priceAsc' | 'name';

export interface MenuItem {
  name: string;
  price: number;
  description: string;
  isPopular?: boolean;
}

export interface ReviewItem {
  id: string;
  restaurantId?: string;
  userId?: string;
  author: string;
  rating: number;
  date: string;
  comment: string;
  photos?: string[];
  reportCount?: number;
  status?: 'active' | 'hidden' | 'deleted';
}

export interface Restaurant {
  id: string;
  name: string;
  category: Category;
  rating: number;
  reviewCount: number;
  address: string;
  phone: string;
  openingHours: string;
  priceRange: '₩' | '₩₩' | '₩₩₩' | '₩₩₩₩';
  images: string[];
  thumbnail: string;
  description: string;
  features: string[]; // e.g. '주차 가능', '예약 가능', '반려동물 동반', '콜키지 프리'
  menus: MenuItem[];
  reviews: ReviewItem[];
  isOpen: boolean;
  distance?: string;
  distanceMeters?: number;
  lat: number;
  lng: number;
}
