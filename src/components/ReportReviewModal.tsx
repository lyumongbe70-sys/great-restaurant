import React, { useState } from 'react';
import { X, ShieldAlert, CheckCircle2, AlertTriangle } from 'lucide-react';
import type { ReviewItem } from '../types/restaurant';
import { reportReview } from '../services/reviewService';

interface ReportReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  review: ReviewItem | null;
  onReportSuccess: (reviewId: string, isHidden: boolean) => void;
}

const REPORT_REASONS = [
  { id: 'abuse', label: '욕설, 비방, 혐오 또는 부적절한 표현' },
  { id: 'spam', label: '영리 목적 홍보, 광고 또는 스팸성 게시글' },
  { id: 'fake', label: '허위 사실 기재 또는 실제 방문하지 않은 거짓 후기' },
  { id: 'privacy', label: '개인정보 노출 또는 초상권 침해' },
  { id: 'other', label: '기타 운영 원칙 위배' },
];

export const ReportReviewModal: React.FC<ReportReviewModalProps> = ({
  isOpen,
  onClose,
  review,
  onReportSuccess,
}) => {
  const [selectedReason, setSelectedReason] = useState<string>(REPORT_REASONS[0].label);
  const [details, setDetails] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  if (!isOpen || !review) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setFeedback(null);

    const res = await reportReview(review.id, selectedReason, details.trim());
    setIsSubmitting(false);

    if (res.success) {
      const msg = res.isHidden
        ? '신고가 접수되었습니다. (누적 신고 3회 도달로 해당 리뷰가 자동 블라인드 처리되었습니다.)'
        : '신고가 정상 접수되었습니다. 검토 후 신속히 조치하겠습니다.';
      setFeedback({ message: msg, type: 'success' });
      setTimeout(() => {
        onReportSuccess(review.id, res.isHidden);
        onClose();
      }, 1500);
    } else {
      setFeedback({
        message: '신고 접수 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.',
        type: 'error',
      });
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose} role="dialog" aria-modal="true">
      <div className="report-modal-card" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="report-modal-header">
          <div className="report-header-title">
            <ShieldAlert size={20} className="icon-alert-danger" />
            <h3>리뷰 신고하기</h3>
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

        {/* Target Review summary */}
        <div className="target-review-summary">
          <div className="target-author-row">
            <span className="target-author">{review.author}님의 리뷰</span>
            <span className="target-rating">★ {review.rating}</span>
          </div>
          <p className="target-comment-snippet">
            "{review.comment.length > 80 ? review.comment.slice(0, 80) + '...' : review.comment}"
          </p>
        </div>

        {/* Auto Moderation Policy Notice */}
        <div className="report-policy-notice">
          <AlertTriangle size={15} />
          <span>
            신고가 <strong>3회 이상 누적</strong>된 리뷰는 커뮤니티 보호를 위해 자동으로
            <strong> 블라인드(숨김)</strong> 처리됩니다.
          </span>
        </div>

        {feedback && (
          <div className={`auth-alert-box ${feedback.type}`}>
            {feedback.type === 'success' ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
            <span>{feedback.message}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="report-form">
          <div className="report-reason-list">
            <label className="reason-legend">신고 사유 선택</label>
            {REPORT_REASONS.map((reason) => (
              <label key={reason.id} className="reason-radio-label">
                <input
                  type="radio"
                  name="reportReason"
                  value={reason.label}
                  checked={selectedReason === reason.label}
                  onChange={(e) => setSelectedReason(e.target.value)}
                />
                <span className="reason-text">{reason.label}</span>
              </label>
            ))}
          </div>

          <div className="auth-input-group">
            <label htmlFor="report-details">상세 내용 (선택)</label>
            <textarea
              id="report-details"
              className="report-textarea"
              placeholder="구체적인 사유나 정황을 기재해 주시면 신속한 처리에 도움이 됩니다."
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              rows={3}
              maxLength={200}
            />
          </div>

          <div className="report-modal-actions">
            <button
              type="button"
              className="report-cancel-btn"
              onClick={onClose}
              disabled={isSubmitting}
            >
              취소
            </button>
            <button
              type="submit"
              className="report-submit-danger-btn"
              disabled={isSubmitting}
            >
              {isSubmitting ? '신고 접수 중...' : '신고 접수'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
