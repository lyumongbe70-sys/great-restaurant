import { supabase } from '../lib/supabase';
import type { User, Session } from '@supabase/supabase-js';

export interface AuthUserProfile {
  id: string;
  email: string;
  nickname: string;
}

/**
 * 회원가입 (이메일 & 비밀번호 & 닉네임)
 */
export async function signUpWithEmail(email: string, password: string, nickname: string): Promise<{ user: User | null; error: string | null }> {
  try {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          nickname: nickname || email.split('@')[0],
        },
      },
    });

    if (error) {
      if (error.message.includes('already registered')) {
        return { user: null, error: '이미 등록된 이메일 주소입니다.' };
      }
      return { user: null, error: error.message };
    }

    return { user: data.user, error: null };
  } catch (err: any) {
    return { user: null, error: err.message || '회원가입 중 오류가 발생했습니다.' };
  }
}

/**
 * 로그인 (이메일 & 비밀번호)
 */
export async function signInWithEmail(email: string, password: string): Promise<{ user: User | null; session: Session | null; error: string | null }> {
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      if (error.message.includes('Invalid login credentials')) {
        return { user: null, session: null, error: '이메일 또는 비밀번호가 일치하지 않습니다.' };
      }
      return { user: null, session: null, error: error.message };
    }

    return { user: data.user, session: data.session, error: null };
  } catch (err: any) {
    return { user: null, session: null, error: err.message || '로그인 중 오류가 발생했습니다.' };
  }
}

/**
 * 로그아웃
 */
export async function signOutUser(): Promise<{ error: string | null }> {
  try {
    const { error } = await supabase.auth.signOut();
    return { error: error ? error.message : null };
  } catch (err: any) {
    return { error: err.message || '로그아웃 중 오류가 발생했습니다.' };
  }
}

/**
 * 현재 로그인 세션 사용자 조회
 */
export async function getCurrentUser(): Promise<AuthUserProfile | null> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;
    return {
      id: user.id,
      email: user.email || '',
      nickname: user.user_metadata?.nickname || user.email?.split('@')[0] || '미식가',
    };
  } catch {
    return null;
  }
}

/**
 * 인증 상태 변경 리스너
 */
export function onAuthStateChange(callback: (userProfile: AuthUserProfile | null) => void) {
  const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
    if (session?.user) {
      callback({
        id: session.user.id,
        email: session.user.email || '',
        nickname: session.user.user_metadata?.nickname || session.user.email?.split('@')[0] || '미식가',
      });
    } else {
      callback(null);
    }
  });

  return () => {
    subscription.unsubscribe();
  };
}
