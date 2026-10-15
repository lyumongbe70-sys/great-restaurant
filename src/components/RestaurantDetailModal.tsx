import React, { useState, useEffect } from 'react';
import type { Restaurant, ReviewItem } from '../types/restaurant';
import type { AuthUserProfile } from '../services/authService';
import { fetchReviewsForRestaurant, deleteReview } from '../services/reviewService';
import { ReviewModal } from './ReviewModal';
import { ReportReviewModal } from './ReportReviewModal';
import {
  X,
  Star,
  MapPin,
  Phone,
  Clock,
  Heart,
  Share2,
  Navigation,
  CheckCircle2,
  CalendarCheck,
  ChevronLeft,
  ChevronRight,
  Car,
  Edit3,
  Camera,
  ShieldAlert,
  Trash2,
  Maximize2
} from 'lucide-react';
import { NavigationModal } from './NavigationModal';

interface RestaurantDetailModalProps {
  restaurant: Restaurant;
  onClose: () => void;
  isBookmarked: boolean;
  onToggleBookmark: (id: string) => void;
  onOpenParking?: (restaurant: Restaurant) => void;
  currentUser?: AuthUserProfile | null;
  onOpenAuth?: () => void;
}

export const RestaurantDetailModal: React.FC<RestaurantDetailModalProps> = ({
  restaurant,
  onClose,
  isBookmarked,
  onToggleBookmark,
  onOpenParking,
  currentUser,
  onOpenAuth,
}) => {
  const [activeImageIdx, setActiveImageIdx] = useState(0);
  const [reservationNotice, setReservationNotice] = useState<string | null>(null);
  const [showNaviModal, setShowNaviModal] = useState(false);
  const [reviews, setReviews] = useState<ReviewItem[]>(restaurant.reviews || []);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [reportingReview, setReportingReview] = useState<ReviewItem | null>(null);
  const [previewPhoto, setPreviewPhoto] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Fetch reviews from Supabase DB for this restaurant
  useEffect(() => {
    let isSubscribed = true;
    fetchReviewsForRestaurant(restaurant.id).then((dbReviews) => {
      if (!isSubscribed) return;
      if (dbReviews && dbReviews.length > 0) {
        // Merge Supabase reviews with any mock reviews not duplicated
        const dbIds = new Set(dbReviews.map((r) => r.id));
        const nonDuplicateMock = (restaurant.reviews || []).filter((r) => !dbIds.has(r.id));
        setReviews([...dbReviews, ...nonDuplicateMock]);
      } else {
        setReviews(restaurant.reviews || []);
      }
    });

    return () => {
      isSubscribed = false;
    };
  }, [restaurant.id, restaurant.reviews]);

  const handleReviewSubmitted = (newReview: ReviewItem) => {
    setReviews((prev) => [newReview, ...prev]);
    setReservationNotice('리뷰가 성공적으로 등록되었습니다!');
    setTimeout(() => setReservationNotice(null), 3000);
  };

  const handleDeleteReview = async (reviewId: string) => {
    if (!window.confirm('작성하신 리뷰를 삭제하시겠습니까?')) return;
    setDeletingId(reviewId);
    await deleteReview(reviewId);
    setReviews((prev) => prev.filter((r) => r.id !== reviewId));
    setDeletingId(null);
    setReservationNotice('리뷰가 삭제되었습니다.');
    setTimeout(() => setReservationNotice(null), 2500);
  };

  const handleReportSuccess = (reviewId: string, isHidden: boolean) => {
    if (isHidden) {
      setReviews((prev) => prev.filter((r) => r.id !== reviewId));
      setReservationNotice('신고 누적으로 해당 리뷰가 블라인드 처리되었습니다.');
    } else {
      setReservationNotice('신고가 접수되었습니다.');
    }
    setTimeout(() => setReservationNotice(null), 3000);
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: restaurant.name,
        text: `${restaurant.name} - ${restaurant.description}`,
        url: window.location.href,
      }).catch(() => {});
    } else {
      navigator.clipboard.writeText(window.location.href);
      setReservationNotice('식당 링크가 클립보드에 복사되었습니다!');
      setTimeout(() => setReservationNotice(null), 3000);
    }
  };

  const handleReservation = () => {
    setReservationNotice(`'${restaurant.name}' 예약 문의가 전달되었습니다. (데모 모드)`);
    setTimeout(() => setReservationNotice(null), 3500);
  };

  const nextImage = () => {
    setActiveImageIdx((prev) => (prev + 1) % restaurant.images.length);
  };

  const prevImage = () => {
    setActiveImageIdx((prev) => (prev - 1 + restaurant.images.length) % restaurant.images.length);
  };

  return (
    <div className="modal-backdrop" onClick={onClose} role="dialog" aria-modal="true">
      <div className="modal-container" onClick={(e) => e.stopPropagation()}>
        {/* Modal Top Bar */}
        <div className="modal-top-bar">
          <button type="button" className="icon-btn-circle" onClick={onClose} aria-label="닫기">
            <X size={20} />
          </button>
          <span className="modal-top-title">{restaurant.name}</span>
          <div className="modal-top-actions">
            <button
              type="button"
              className={`icon-btn-circle ${isBookmarked ? 'active' : ''}`}
              onClick={() => onToggleBookmark(restaurant.id)}
              aria-label="찜하기"
            >
              <Heart
                size={18}
                fill={isBookmarked ? '#ef4444' : 'none'}
                color={isBookmarked ? '#ef4444' : 'currentColor'}
              />
            </button>
            <button
              type="button"
              className="icon-btn-circle"
              onClick={handleShare}
              aria-label="공유하기"
            >
              <Share2 size={18} />
            </button>
          </div>
        </div>

        {/* Image Gallery */}
        <div className="modal-gallery">
          <img
            src={restaurant.images[activeImageIdx] || restaurant.thumbnail}
            alt={`${restaurant.name} 사진 ${activeImageIdx + 1}`}
            className="gallery-main-image"
            onError={(e) => {
              (e.target as HTMLImageElement).src =
                "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='600' height='400' viewBox='0 0 600 400'%3E%3Crect fill='%23fed7aa' width='600' height='400'/%3E%3Ctext fill='%23ea580c' font-family='sans-serif' font-size='28' font-weight='bold' x='50%25' y='50%25' text-anchor='middle' dominant-baseline='middle'%3E🍴 " +
                encodeURIComponent(restaurant.name) +
                "%3C/text%3E%3C/svg%3E";
            }}
          />
          {restaurant.images.length > 1 && (
            <>
              <button
                type="button"
                className="gallery-nav-btn prev"
                onClick={prevImage}
                aria-label="이전 사진"
              >
                <ChevronLeft size={20} />
              </button>
              <button
                type="button"
                className="gallery-nav-btn next"
                onClick={nextImage}
                aria-label="다음 사진"
              >
                <ChevronRight size={20} />
              </button>
              <div className="gallery-indicator">
                {activeImageIdx + 1} / {restaurant.images.length}
              </div>
            </>
          )}
        </div>

        {/* Scrollable Content */}
        <div className="modal-body-scroll">
          {/* Main Title & Rating */}
          <section className="detail-section header-section">
            <div className="detail-header-row">
              <span className="detail-category-badge">{restaurant.category}</span>
              <span className={`status-pill ${restaurant.isOpen ? 'open' : 'closed'}`}>
                {restaurant.isOpen ? '● 영업중' : '○ 준비중'}
              </span>
            </div>
            <h2 className="detail-name">{restaurant.name}</h2>
            <div className="detail-rating-row">
              <div className="stars-wrapper">
                <Star size={16} fill="#f59e0b" color="#f59e0b" />
                <span className="detail-rating-num">{restaurant.rating.toFixed(1)}</span>
              </div>
              <span className="detail-reviews-num">방문자 리뷰 {restaurant.reviewCount}개</span>
              <span className="detail-price-num">{restaurant.priceRange}</span>
              {restaurant.distance && (
                <span className="detail-distance-num">{restaurant.distance}</span>
              )}
            </div>
            <p className="detail-description">{restaurant.description}</p>
          </section>

          {/* Toast Notice */}
          {reservationNotice && (
            <div className="toast-notification">
              <CheckCircle2 size={16} />
              <span>{reservationNotice}</span>
            </div>
          )}

          {/* Quick Contact Buttons */}
          <div className="quick-action-buttons">
            <a href={`tel:${restaurant.phone}`} className="quick-action-btn">
              <Phone size={16} />
              <span>전화</span>
            </a>
            <button
              type="button"
              className="quick-action-btn"
              onClick={() => setShowNaviModal(true)}
              title="실시간 단속 카메라 및 내비게이션 길안내"
            >
              <Navigation size={16} />
              <span>실시간 길안내</span>
            </button>
            <button
              type="button"
              className="quick-action-btn primary"
              onClick={handleReservation}
            >
              <CalendarCheck size={16} />
              <span>예약 문의</span>
            </button>
          </div>

          {/* Info Details */}
          <section className="detail-section info-block">
            <h3 className="section-title">매장 기본 정보</h3>
            <div className="info-list">
              <div className="info-item">
                <MapPin size={18} className="info-icon" />
                <div className="info-text">
                  <div className="info-label">주소</div>
                  <div className="info-value">{restaurant.address}</div>
                </div>
              </div>
              <div className="info-item">
                <Clock size={18} className="info-icon" />
                <div className="info-text">
                  <div className="info-label">영업시간</div>
                  <div className="info-value">{restaurant.openingHours}</div>
                </div>
              </div>
              <div className="info-item">
                <Phone size={18} className="info-icon" />
                <div className="info-text">
                  <div className="info-label">전화번호</div>
                  <div className="info-value">{restaurant.phone}</div>
                </div>
              </div>
              <div className="info-item">
                <Car size={18} className="info-icon" />
                <div className="info-text">
                  <div className="info-label">주차 안내</div>
                  <div className="info-value">
                    {restaurant.features.some((f) => f.includes('주차'))
                      ? '매장 주차 가능 (만차 시 주변 공영/무료 주차장 이용)'
                      : '주변 공영 및 무료 주차장 이용'}
                  </div>
                </div>
                {onOpenParking && (
                  <button
                    type="button"
                    className="info-parking-jump-btn"
                    onClick={() => {
                      onClose();
                      onOpenParking(restaurant);
                    }}
                    title="지도에서 주변 주차장 검색"
                  >
                    <Car size={13} />
                    <span>주변 주차장</span>
                  </button>
                )}
              </div>
            </div>

            {/* Features */}
            <div className="features-tags">
              {restaurant.features.map((feat, idx) => (
                <span key={idx} className="feature-item-pill">
                  ✓ {feat}
                </span>
              ))}
            </div>
          </section>

          {/* Menu Section */}
          <section className="detail-section menu-block">
            <h3 className="section-title">
              대표 메뉴 <span className="count-badge">{restaurant.menus.length}</span>
            </h3>
            <div className="menu-items-list">
              {restaurant.menus.map((menu, idx) => (
                <div key={idx} className="menu-item-row">
                  <div className="menu-info">
                    <div className="menu-name-row">
                      <span className="menu-name">{menu.name}</span>
                      {menu.isPopular && <span className="menu-popular-badge">인기</span>}
                    </div>
                    <p className="menu-desc">{menu.description}</p>
                  </div>
                  <div className="menu-price-text">{menu.price.toLocaleString()}원</div>
                </div>
              ))}
            </div>
          </section>

          {/* Reviews Section */}
          <section className="detail-section reviews-block">
            <div className="reviews-header">
              <div>
                <h3 className="section-title">
                  방문자 리뷰 <span className="count-badge">{reviews.length}</span>
                </h3>
                <span className="reviews-sub-caption">실제 방문객들이 남긴 생생한 사진과 별점 후기</span>
              </div>
              <button
                type="button"
                className="write-review-pill-btn"
                onClick={() => {
                  if (!currentUser && onOpenAuth) {
                    // Guests can also write, but let's encourage or open modal directly
                    setShowReviewModal(true);
                  } else {
                    setShowReviewModal(true);
                  }
                }}
              >
                <Edit3 size={14} />
                <span>리뷰 쓰기</span>
              </button>
            </div>

            <div className="reviews-list">
              {reviews.length === 0 ? (
                <div className="empty-reviews-box">
                  <Camera size={28} className="empty-reviews-icon" />
                  <p>아직 등록된 방문자 리뷰가 없습니다.</p>
                  <button
                    type="button"
                    className="empty-write-btn"
                    onClick={() => setShowReviewModal(true)}
                  >
                    첫 번째 리뷰의 주인공이 되어보세요!
                  </button>
                </div>
              ) : (
                reviews.map((rev) => {
                  const isAuthor = currentUser && rev.userId === currentUser.id;

                  return (
                    <div key={rev.id} className="review-card">
                      <div className="review-header">
                        <div className="review-author-box">
                          <div className="author-avatar">{rev.author ? rev.author[0] : 'U'}</div>
                          <div>
                            <div className="author-name-row">
                              <span className="author-name">{rev.author}</span>
                              {isAuthor && <span className="my-review-tag">내 리뷰</span>}
                            </div>
                            <div className="review-date">{rev.date}</div>
                          </div>
                        </div>
                        <div className="review-rating">
                          <Star size={14} fill="#f59e0b" color="#f59e0b" />
                          <span>{rev.rating}</span>
                        </div>
                      </div>

                      <p className="review-comment">{rev.comment}</p>

                      {/* Attached Photos */}
                      {rev.photos && rev.photos.length > 0 && (
                        <div className="review-photos-grid">
                          {rev.photos.map((photoUrl, pIdx) => (
                            <div
                              key={pIdx}
                              className="review-photo-thumb-wrapper"
                              onClick={() => setPreviewPhoto(photoUrl)}
                              title="사진 크게 보기"
                            >
                              <img src={photoUrl} alt={`후기 사진 ${pIdx + 1}`} />
                              <div className="photo-zoom-hint">
                                <Maximize2 size={13} />
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Review Actions Footer: Report & Delete */}
                      <div className="review-card-footer">
                        {isAuthor ? (
                          <button
                            type="button"
                            className="review-action-btn delete"
                            onClick={() => handleDeleteReview(rev.id)}
                            disabled={deletingId === rev.id}
                            title="리뷰 삭제"
                          >
                            <Trash2 size={13} />
                            <span>{deletingId === rev.id ? '삭제 중...' : '삭제'}</span>
                          </button>
                        ) : (
                          <div />
                        )}

                        <button
                          type="button"
                          className="review-action-btn report"
                          onClick={() => setReportingReview(rev)}
                          title="부적절한 리뷰 신고 (3회 누적 시 자동 블라인드)"
                        >
                          <ShieldAlert size={13} />
                          <span>신고하기</span>
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </section>
        </div>

        {/* Modal Bottom CTA */}
        <div className="modal-bottom-bar">
          <button
            type="button"
            className="bottom-cta-btn"
            onClick={handleReservation}
          >
            <CalendarCheck size={18} />
            <span>지금 방문 / 테이블 예약하기</span>
          </button>
        </div>
      </div>

      {/* Real-time Camera & Navigation Modal */}
      {showNaviModal && (
        <NavigationModal
          restaurant={restaurant}
          onClose={() => setShowNaviModal(false)}
        />
      )}

      {/* Write Review Modal */}
      {showReviewModal && (
        <ReviewModal
          isOpen={showReviewModal}
          onClose={() => setShowReviewModal(false)}
          restaurantId={restaurant.id}
          restaurantName={restaurant.name}
          currentUserId={currentUser?.id}
          defaultAuthorName={currentUser?.nickname || ''}
          onReviewSubmitted={handleReviewSubmitted}
        />
      )}

      {/* Report Review Modal */}
      {reportingReview && (
        <ReportReviewModal
          isOpen={!!reportingReview}
          onClose={() => setReportingReview(null)}
          review={reportingReview}
          onReportSuccess={handleReportSuccess}
        />
      )}

      {/* Photo Full-size Lightbox */}
      {previewPhoto && (
        <div
          className="modal-backdrop photo-lightbox-backdrop"
          onClick={() => setPreviewPhoto(null)}
          role="dialog"
          aria-modal="true"
        >
          <div className="lightbox-content" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              className="lightbox-close-btn"
              onClick={() => setPreviewPhoto(null)}
              aria-label="닫기"
            >
              <X size={24} />
            </button>
            <img src={previewPhoto} alt="리뷰 사진 원본" className="lightbox-img" />
          </div>
        </div>
      )}
    </div>
  );
};
