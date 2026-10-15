import React from 'react';
import type { Restaurant } from '../types/restaurant';
import { Star, MapPin, Heart, Clock } from 'lucide-react';

interface RestaurantCardProps {
  restaurant: Restaurant;
  isBookmarked: boolean;
  onToggleBookmark: (id: string, e: React.MouseEvent) => void;
  onClick: (restaurant: Restaurant) => void;
  onViewOnMap?: (restaurant: Restaurant, e: React.MouseEvent) => void;
}

export const RestaurantCard: React.FC<RestaurantCardProps> = ({
  restaurant,
  isBookmarked,
  onToggleBookmark,
  onClick,
  onViewOnMap,
}) => {
  const popularMenu = restaurant.menus.find((m) => m.isPopular) || restaurant.menus[0];

  return (
    <article
      className="restaurant-card"
      onClick={() => onClick(restaurant)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          onClick(restaurant);
        }
      }}
    >
      <div className="card-image-box">
        <img
          src={restaurant.thumbnail}
          alt={restaurant.name}
          className="card-image"
          loading="lazy"
          onError={(e) => {
            (e.target as HTMLImageElement).src =
              "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='300' viewBox='0 0 400 300'%3E%3Crect fill='%23fed7aa' width='400' height='300'/%3E%3Ctext fill='%23ea580c' font-family='sans-serif' font-size='24' font-weight='bold' x='50%25' y='50%25' text-anchor='middle' dominant-baseline='middle'%3E🍴 " +
              encodeURIComponent(restaurant.name) +
              "%3C/text%3E%3C/svg%3E";
          }}
        />
        <div className="image-overlay-badges">
          <span className={`status-badge ${restaurant.isOpen ? 'open' : 'closed'}`}>
            <Clock size={12} />
            {restaurant.isOpen ? '영업중' : '준비중'}
          </span>
          <span className="category-tag">{restaurant.category}</span>
        </div>

        <button
          type="button"
          className={`bookmark-btn ${isBookmarked ? 'active' : ''}`}
          onClick={(e) => onToggleBookmark(restaurant.id, e)}
          aria-label={isBookmarked ? '찜 취소' : '찜하기'}
        >
          <Heart size={16} fill={isBookmarked ? '#ef4444' : 'none'} color={isBookmarked ? '#ef4444' : '#ffffff'} />
        </button>
      </div>

      <div className="card-content">
        <div className="card-header-row">
          <h3 className="card-title">{restaurant.name}</h3>
          <span className="price-tag">{restaurant.priceRange}</span>
        </div>

        <div className="rating-location-row">
          <div className="rating-box">
            <Star size={14} className="star-icon" fill="#f59e0b" color="#f59e0b" />
            <span className="rating-score">{restaurant.rating.toFixed(1)}</span>
            <span className="review-count">({restaurant.reviewCount})</span>
          </div>
          {restaurant.distance && (
            <div className="distance-box">
              <MapPin size={12} />
              <span>{restaurant.distance}</span>
            </div>
          )}
          {onViewOnMap && (
            <button
              type="button"
              className="card-map-jump-btn"
              onClick={(e) => onViewOnMap(restaurant, e)}
              title="지도에서 위치 보기"
            >
              <span>지도 위치</span>
            </button>
          )}
        </div>

        <p className="card-description">{restaurant.description}</p>

        {popularMenu && (
          <div className="popular-menu-chip">
            <span className="badge">대표</span>
            <span className="menu-name">{popularMenu.name}</span>
            <span className="menu-price">{popularMenu.price.toLocaleString()}원</span>
          </div>
        )}

        <div className="features-row">
          {restaurant.features.slice(0, 3).map((feat, idx) => (
            <span key={idx} className="feature-pill">
              {feat}
            </span>
          ))}
        </div>
      </div>
    </article>
  );
};
