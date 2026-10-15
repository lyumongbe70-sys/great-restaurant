import { supabase } from '../lib/supabase';
import type { ReviewItem } from '../types/restaurant';

export interface DbReviewRow {
  id: string;
  restaurant_id: string;
  user_id?: string;
  author_name: string;
  rating: number;
  comment: string;
  photos: string[];
  report_count: number;
  status: 'active' | 'hidden' | 'deleted';
  created_at: string;
  updated_at: string;
}

/**
 * 특정 식당의 활성 리뷰 목록 조회
 */
export async function fetchReviewsForRestaurant(restaurantId: string): Promise<ReviewItem[]> {
  try {
    const { data, error } = await supabase
      .from('reviews')
      .select('*')
      .eq('restaurant_id', restaurantId)
      .eq('status', 'active')
      .order('created_at', { ascending: false });

    if (error) {
      // Table may not exist yet or connection error
      console.warn('Reviews fetch fallback:', error.message);
      return [];
    }

    return (data || []).map((row: DbReviewRow) => ({
      id: row.id,
      restaurantId: row.restaurant_id,
      userId: row.user_id,
      author: row.author_name,
      rating: Number(row.rating),
      comment: row.comment,
      photos: Array.isArray(row.photos) ? row.photos : [],
      reportCount: row.report_count,
      status: row.status,
      date: formatDate(row.created_at),
    }));
  } catch (err) {
    console.warn('Reviews fetch error:', err);
    return [];
  }
}

/**
 * 새 리뷰 및 사진 등록
 */
export async function submitReview(params: {
  restaurantId: string;
  author: string;
  rating: number;
  comment: string;
  photos: string[];
  userId?: string;
}): Promise<ReviewItem | null> {
  try {
    const payload = {
      restaurant_id: params.restaurantId,
      author_name: params.author.trim() || '익명 미식가',
      rating: params.rating,
      comment: params.comment.trim(),
      photos: params.photos || [],
      user_id: params.userId || null,
      status: 'active',
    };

    const { data, error } = await supabase
      .from('reviews')
      .insert([payload])
      .select()
      .single();

    if (error) {
      console.error('Failed to insert review:', error);
      throw error;
    }

    const row = data as DbReviewRow;
    return {
      id: row.id,
      restaurantId: row.restaurant_id,
      userId: row.user_id,
      author: row.author_name,
      rating: Number(row.rating),
      comment: row.comment,
      photos: Array.isArray(row.photos) ? row.photos : [],
      reportCount: row.report_count || 0,
      status: row.status,
      date: formatDate(row.created_at),
    };
  } catch (err: any) {
    console.error('Review submit error:', err);
    throw err;
  }
}

/**
 * 리뷰 삭제 (작성자 본인 또는 로컬 상태)
 */
export async function deleteReview(reviewId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('reviews')
      .delete()
      .eq('id', reviewId);

    if (error) throw error;
    return true;
  } catch (err) {
    console.error('Delete review error:', err);
    return false;
  }
}

/**
 * 리뷰 신고하기 (3회 누적 시 자동 숨김)
 */
export async function reportReview(
  reviewId: string,
  reason: string,
  details?: string
): Promise<{ success: boolean; isHidden: boolean; reportCount?: number }> {
  try {
    const { data, error } = await supabase.rpc('report_review', {
      p_review_id: reviewId,
      p_reason: reason,
      p_details: details || null,
    });

    if (error) {
      console.error('RPC report_review error:', error);
      // Fallback: direct update if RPC is missing
      const { data: rev } = await supabase
        .from('reviews')
        .select('report_count')
        .eq('id', reviewId)
        .single();

      const newCount = (rev?.report_count || 0) + 1;
      const isHidden = newCount >= 3;

      await supabase
        .from('reviews')
        .update({
          report_count: newCount,
          status: isHidden ? 'hidden' : 'active',
        })
        .eq('id', reviewId);

      return { success: true, isHidden, reportCount: newCount };
    }

    return {
      success: true,
      isHidden: data?.is_hidden ?? false,
      reportCount: data?.report_count,
    };
  } catch (err) {
    console.error('Failed to report review:', err);
    return { success: false, isHidden: false };
  }
}

function formatDate(isoString: string): string {
  try {
    const date = new Date(isoString);
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}.${m}.${d}`;
  } catch {
    return '최근';
  }
}
