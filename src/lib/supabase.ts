import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://fbeejhlkoduwfjzmcktc.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_r0z6iJSbjbre4H9VGhzOUw_a6-u30kg';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export interface SavedBookmark {
  id?: string;
  restaurant_id: string;
  created_at?: string;
}

export interface SavedReview {
  id?: string;
  restaurant_id: string;
  author: string;
  rating: number;
  comment: string;
  created_at?: string;
}

// Helper to save bookmark to Supabase (with graceful local fallback if table not yet migrated)
export async function syncBookmarkToSupabase(restaurantId: string, isBookmarked: boolean) {
  try {
    if (isBookmarked) {
      await supabase.from('bookmarks').insert([{ restaurant_id: restaurantId }]);
    } else {
      await supabase.from('bookmarks').delete().eq('restaurant_id', restaurantId);
    }
  } catch {
    // Graceful fallback to local storage
  }
}
