import React, { useState } from 'react';
import { X, Star, Camera, Trash2, AlertCircle, CheckCircle2 } from 'lucide-react';
import type { ReviewItem } from '../types/restaurant';
import { submitReview } from '../services/reviewService';

interface ReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  restaurantId: string;
  restaurantName: string;
  currentUserId?: string;
  defaultAuthorName?: string;
  onReviewSubmitted: (newReview: ReviewItem) => void;
}

export const ReviewModal: React.FC<ReviewModalProps> = ({
  isOpen,
  onClose,
  restaurantId,
  restaurantName,
  currentUserId,
  defaultAuthorName = '',
  onReviewSubmitted,
}) => {
  const [rating, setRating] = useState<number>(5);
  const [hoverRating, setHoverRating] = useState<number | null>(null);
  const [authorName, setAuthorName] = useState<string>(defaultAuthorName || '');
  const [comment, setComment] = useState<string>('');
  const [photos, setPhotos] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  // Handle Photo File selection (Max 3, convert to Base64 data URL)
  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    if (photos.length + files.length > 3) {
      setErrorMsg('사진은 최대 3장까지 등록 가능합니다.');
      return;
    }

    Array.from(files).forEach((file) => {
      // 5MB max check
      if (file.size > 5 * 1024 * 1024) {
        setErrorMsg('이미지 파일은 5MB 이하여야 합니다.');
        return;
      }

      const reader = new FileReader();
      reader.onload = (event) => {
        const base64 = event.target?.result as string;
        if (base64) {
          setPhotos((prev) => (prev.length < 3 ? [...prev, base64] : prev));
        }
      };
      reader.readAsDataURL(file);
    });

    e.target.value = '';
  };

  const removePhoto = (indexToRemove: number) => {
    setPhotos((prev) => prev.filter((_, idx) => idx !== indexToRemove));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    const trimmedAuthor = authorName.trim() || defaultAuthorName.trim() || '익명 미식가';
    const trimmedComment = comment.trim();

    if (!trimmedComment) {
      setErrorMsg('리뷰 내용을 입력해 주세요.');
      return;
    }

    if (trimmedComment.length < 5) {
      setErrorMsg('리뷰는 5글자 이상 솔직하게 작성해 주세요.');
      return;
    }

    setIsSubmitting(true);
    try {
      const createdReview = await submitReview({
        restaurantId,
        author: trimmedAuthor,
        rating,
        comment: trimmedComment,
        photos,
        userId: currentUserId,
      });

      setIsSubmitting(false);

      if (createdReview) {
        setSuccessMsg('소중한 리뷰가 등록되었습니다!');
        setTimeout(() => {
          onReviewSubmitted(createdReview);
          onClose();
        }, 800);
      } else {
        setErrorMsg('리뷰 저장에 실패했습니다. 다시 시도해 주세요.');
      }
    } catch (err: any) {
      setIsSubmitting(false);
      setErrorMsg(err.message || '리뷰 등록 중 오류가 발생했습니다.');
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose} role="dialog" aria-modal="true">
      <div className="review-modal-card" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="review-modal-header">
          <div>
            <span className="review-modal-tag">방문자 리뷰 쓰기</span>
            <h3 className="review-modal-title">{restaurantName}</h3>
          </div>
          <button
            type="button"
            className="modal-corner-close"
            onClick={onClose}
            aria-label="닫기"
          >
            <X size={18} />
          </button>
        </div>

        {errorMsg && (
          <div className="auth-alert-box error">
            <AlertCircle size={16} />
            <span>{errorMsg}</span>
          </div>
        )}
        {successMsg && (
          <div className="auth-alert-box success">
            <CheckCircle2 size={16} />
            <span>{successMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="review-form">
          {/* Star Rating Select */}
          <div className="star-rating-select-box">
            <span className="rating-guide-label">별점을 선택해 주세요</span>
            <div className="interactive-stars-row">
              {[1, 2, 3, 4, 5].map((starVal) => {
                const isFilled = (hoverRating !== null ? hoverRating : rating) >= starVal;
                return (
                  <button
                    key={starVal}
                    type="button"
                    className="star-click-btn"
                    onMouseEnter={() => setHoverRating(starVal)}
                    onMouseLeave={() => setHoverRating(null)}
                    onClick={() => setRating(starVal)}
                    title={`${starVal}점`}
                  >
                    <Star
                      size={32}
                      fill={isFilled ? '#f59e0b' : 'none'}
                      color={isFilled ? '#f59e0b' : '#cbd5e1'}
                    />
                  </button>
                );
              })}
            </div>
            <span className="rating-score-text">
              {(hoverRating !== null ? hoverRating : rating)}.0 / 5.0
            </span>
          </div>

          {/* Author Name */}
          <div className="auth-input-group">
            <label htmlFor="review-author">작성자 닉네임</label>
            <input
              id="review-author"
              type="text"
              className="review-author-input"
              placeholder="닉네임 입력 (미입력 시 미식가)"
              value={authorName}
              onChange={(e) => setAuthorName(e.target.value)}
              maxLength={15}
            />
          </div>

          {/* Comment */}
          <div className="auth-input-group">
            <div className="comment-label-row">
              <label htmlFor="review-comment">리뷰 내용</label>
              <span className="char-count">{comment.length} / 500자</span>
            </div>
            <textarea
              id="review-comment"
              className="review-textarea"
              placeholder="음식의 맛, 매장 분위기, 추천 메뉴 등 다른 방문자에게 도움이 되는 솔직한 후기를 남겨주세요."
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              maxLength={500}
              rows={4}
              required
            />
          </div>

          {/* Photos Upload */}
          <div className="photo-upload-group">
            <div className="photo-upload-header">
              <label>사진 첨부 (최대 3장)</label>
              <span className="photo-count-indicator">{photos.length}/3장</span>
            </div>

            <div className="photo-preview-grid">
              {photos.map((photoData, idx) => (
                <div key={idx} className="photo-thumbnail-card">
                  <img src={photoData} alt={`첨부 사진 ${idx + 1}`} />
                  <button
                    type="button"
                    className="photo-delete-btn"
                    onClick={() => removePhoto(idx)}
                    title="사진 삭제"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              ))}

              {photos.length < 3 && (
                <label className="photo-add-button">
                  <Camera size={22} />
                  <span>사진 추가</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoUpload}
                    multiple={photos.length === 0}
                    style={{ display: 'none' }}
                  />
                </label>
              )}
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            className="review-submit-btn"
            disabled={isSubmitting}
          >
            {isSubmitting ? '등록 중...' : '리뷰 등록 완료'}
          </button>
        </form>
      </div>
    </div>
  );
};
