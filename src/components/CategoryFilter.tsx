import React from 'react';
import type { Category, SortOption } from '../types/restaurant';
import { CATEGORIES } from '../data/mockRestaurants';
import { SlidersHorizontal, List, Map as MapIcon } from 'lucide-react';

interface CategoryFilterProps {
  selectedCategory: Category;
  onSelectCategory: (category: Category) => void;
  selectedSort: SortOption;
  onSelectSort: (sort: SortOption) => void;
  totalCount: number;
  viewMode: 'list' | 'map';
  onViewModeChange: (mode: 'list' | 'map') => void;
}

export const CategoryFilter: React.FC<CategoryFilterProps> = ({
  selectedCategory,
  onSelectCategory,
  selectedSort,
  onSelectSort,
  totalCount,
  viewMode,
  onViewModeChange,
}) => {
  return (
    <section className="filter-section">
      <div className="category-scroll-container">
        {CATEGORIES.map((cat) => {
          const isActive = selectedCategory === cat;
          return (
            <button
              key={cat}
              type="button"
              className={`category-chip ${isActive ? 'active' : ''}`}
              onClick={() => onSelectCategory(cat)}
            >
              {cat}
            </button>
          );
        })}
      </div>

      <div className="filter-status-bar">
        <span className="results-count">
          총 <strong>{totalCount}</strong>개의 맛집
        </span>

        <div className="filter-actions-right">
          <div className="view-mode-pill-toggle">
            <button
              type="button"
              className={`view-mode-pill ${viewMode === 'list' ? 'active' : ''}`}
              onClick={() => onViewModeChange('list')}
              title="목록 보기"
            >
              <List size={14} />
              <span>목록</span>
            </button>
            <button
              type="button"
              className={`view-mode-pill ${viewMode === 'map' ? 'active' : ''}`}
              onClick={() => onViewModeChange('map')}
              title="지도 보기"
            >
              <MapIcon size={14} />
              <span>지도</span>
            </button>
          </div>

          <div className="sort-select-wrapper">
            <SlidersHorizontal size={14} className="sort-icon" />
            <select
              className="sort-select"
              value={selectedSort}
              onChange={(e) => onSelectSort(e.target.value as SortOption)}
            >
              <option value="distance">📍 가까운 거리순</option>
              <option value="rating">⭐ 평점순</option>
              <option value="reviews">💬 리뷰순</option>
              <option value="priceAsc">💰 가격순</option>
              <option value="name">🔤 이름순</option>
            </select>
          </div>
        </div>
      </div>
    </section>
  );
};
