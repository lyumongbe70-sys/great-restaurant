import { supabase } from '../lib/supabase';

/**
 * 회원별 즐겨찾기 목록 조회 (Supabase DB)
 */
export async function fetchUserBookmarks(userId: string): Promise<string[]> {
  try {
    const { data, error } = await supabase
      .from('bookmarks')
      .select('restaurant_id')
      .eq('user_id', userId);

    if (error) {
      console.warn('Supabase bookmarks fetch failed (fallback to local):', error.message);
      return [];
    }

    return (data || []).map((row: { restaurant_id: string }) => row.restaurant_id);
  } catch (err) {
    console.warn('Bookmarks fetch error:', err);
    return [];
  }
}

/**
 * 즐겨찾기 추가 또는 해제 (Supabase DB)
 */
export async function toggleUserBookmark(
  userId: string,
  restaurantId: string,
  isBookmarked: boolean
): Promise<boolean> {
  try {
    if (isBookmarked) {
      // Upsert/Insert
      const { error } = await supabase
        .from('bookmarks')
        .upsert([{ user_id: userId, restaurant_id: restaurantId }], {
          onConflict: 'user_id,restaurant_id',
        });
      if (error) throw error;
    } else {
      // Delete
      const { error } = await supabase
        .from('bookmarks')
        .delete()
        .eq('user_id', userId)
        .eq('restaurant_id', restaurantId);
      if (error) throw error;
    }
    return true;
  } catch (err: any) {
    console.warn('Bookmark sync failed:', err.message);
    return false;
  }
}

/**
 * 로그인 시 비회원 상태에서 저장한 로컬 즐겨찾기를 회원의 Supabase DB로 자동 동기화/병합
 */
export async function syncLocalBookmarksToUser(
  userId: string,
  localRestaurantIds: string[]
): Promise<string[]> {
  try {
    // 1. Fetch remote bookmarks
    const remote = await fetchUserBookmarks(userId);
    const remoteSet = new Set(remote);

    // 2. Identify local IDs not yet in remote
    const toInsert = localRestaurantIds
      .filter((id) => !remoteSet.has(id))
      .map((id) => ({
        user_id: userId,
        restaurant_id: id,
      }));

    if (toInsert.length > 0) {
      await supabase.from('bookmarks').upsert(toInsert, {
        onConflict: 'user_id,restaurant_id',
      });
    }

    // Return union of both
    const union = Array.from(new Set([...remote, ...localRestaurantIds]));
    return union;
  } catch (err) {
    console.warn('Failed to merge local bookmarks to Supabase:', err);
    return localRestaurantIds;
  }
}
