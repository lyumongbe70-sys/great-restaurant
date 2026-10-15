import React, { useState } from 'react';
import { X, Mail, Lock, User, AlertCircle, CheckCircle2, Sparkles, LogIn, UserPlus } from 'lucide-react';
import { signInWithEmail, signUpWithEmail, type AuthUserProfile } from '../services/authService';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAuthSuccess: (user: AuthUserProfile) => void;
  initialMode?: 'login' | 'signup';
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  onAuthSuccess,
  initialMode = 'login',
}) => {
  const [mode, setMode] = useState<'login' | 'signup'>(initialMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [nickname, setNickname] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const resetForm = () => {
    setEmail('');
    setPassword('');
    setPasswordConfirm('');
    setNickname('');
    setErrorMessage(null);
    setSuccessMessage(null);
  };

  const switchMode = (newMode: 'login' | 'signup') => {
    setMode(newMode);
    resetForm();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    // Validation
    if (!email || !email.includes('@')) {
      setErrorMessage('올바른 이메일 형식을 입력해 주세요.');
      return;
    }

    if (!password || password.length < 6) {
      setErrorMessage('비밀번호는 최소 6자 이상이어야 합니다.');
      return;
    }

    if (mode === 'signup') {
      if (password !== passwordConfirm) {
        setErrorMessage('비밀번호가 일치하지 않습니다.');
        return;
      }
      if (!nickname.trim()) {
        setErrorMessage('사용하실 닉네임을 입력해 주세요.');
        return;
      }
    }

    setIsLoading(true);

    if (mode === 'signup') {
      const res = await signUpWithEmail(email.trim(), password, nickname.trim());
      setIsLoading(false);

      if (res.error) {
        setErrorMessage(res.error);
      } else if (res.user) {
        setSuccessMessage('회원가입이 완료되었습니다! 자동 로그인됩니다.');
        setTimeout(() => {
          onAuthSuccess({
            id: res.user!.id,
            email: res.user!.email || email,
            nickname: nickname.trim() || '미식가',
          });
          onClose();
        }, 1200);
      }
    } else {
      const res = await signInWithEmail(email.trim(), password);
      setIsLoading(false);

      if (res.error) {
        setErrorMessage(res.error);
      } else if (res.user) {
        setSuccessMessage('로그인에 성공했습니다!');
        setTimeout(() => {
          onAuthSuccess({
            id: res.user!.id,
            email: res.user!.email || email,
            nickname: res.user!.user_metadata?.nickname || email.split('@')[0],
          });
          onClose();
        }, 800);
      }
    }
  };

  // Quick Demo account login for testing
  const handleQuickDemoLogin = async () => {
    setEmail('gourmet@great-restaurant.com');
    setPassword('demo1234!');
    setIsLoading(true);
    setErrorMessage(null);

    // Attempt sign in with demo account, or auto create if not exists
    let res = await signInWithEmail('gourmet@great-restaurant.com', 'demo1234!');
    if (res.error && res.error.includes('일치하지')) {
      // Create if needed
      await signUpWithEmail('gourmet@great-restaurant.com', 'demo1234!', '미식탐험가');
      res = await signInWithEmail('gourmet@great-restaurant.com', 'demo1234!');
    }
    setIsLoading(false);

    if (res.user) {
      setSuccessMessage('체험 계정으로 로그인되었습니다!');
      setTimeout(() => {
        onAuthSuccess({
          id: res.user!.id,
          email: res.user!.email || 'gourmet@great-restaurant.com',
          nickname: '미식탐험가',
        });
        onClose();
      }, 800);
    } else {
      setErrorMessage(res.error || '체험 계정 로그인 중 오류가 발생했습니다.');
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose} role="dialog" aria-modal="true">
      <div className="auth-modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="auth-modal-header">
          <div className="auth-title-box">
            <span className="auth-badge">Supabase Auth</span>
            <h3>{mode === 'login' ? '로그인' : '회원가입'}</h3>
            <p className="auth-subtitle">
              {mode === 'login'
                ? '로그인하고 나만의 찜한 맛집과 작성한 리뷰를 동기화하세요.'
                : '간편한 가입으로 어디서나 맛집 북마크와 리뷰를 저장하세요.'}
            </p>
          </div>
          <button type="button" className="modal-corner-close" onClick={onClose} aria-label="닫기">
            <X size={18} />
          </button>
        </div>

        {/* Tab switch */}
        <div className="auth-tab-row">
          <button
            type="button"
            className={`auth-tab-btn ${mode === 'login' ? 'active' : ''}`}
            onClick={() => switchMode('login')}
          >
            <LogIn size={15} />
            <span>로그인</span>
          </button>
          <button
            type="button"
            className={`auth-tab-btn ${mode === 'signup' ? 'active' : ''}`}
            onClick={() => switchMode('signup')}
          >
            <UserPlus size={15} />
            <span>회원가입</span>
          </button>
        </div>

        {/* Feedback Alert */}
        {errorMessage && (
          <div className="auth-alert-box error">
            <AlertCircle size={16} />
            <span>{errorMessage}</span>
          </div>
        )}
        {successMessage && (
          <div className="auth-alert-box success">
            <CheckCircle2 size={16} />
            <span>{successMessage}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="auth-input-group">
            <label htmlFor="auth-email">이메일</label>
            <div className="auth-input-box">
              <Mail size={16} className="auth-input-icon" />
              <input
                id="auth-email"
                type="email"
                placeholder="example@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
            </div>
          </div>

          {mode === 'signup' && (
            <div className="auth-input-group">
              <label htmlFor="auth-nickname">닉네임</label>
              <div className="auth-input-box">
                <User size={16} className="auth-input-icon" />
                <input
                  id="auth-nickname"
                  type="text"
                  placeholder="예: 종로미식가"
                  value={nickname}
                  onChange={(e) => setNickname(e.target.value)}
                  maxLength={15}
                  required
                />
              </div>
            </div>
          )}

          <div className="auth-input-group">
            <label htmlFor="auth-password">비밀번호</label>
            <div className="auth-input-box">
              <Lock size={16} className="auth-input-icon" />
              <input
                id="auth-password"
                type="password"
                placeholder="6자 이상 입력"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              />
            </div>
          </div>

          {mode === 'signup' && (
            <div className="auth-input-group">
              <label htmlFor="auth-password-confirm">비밀번호 확인</label>
              <div className="auth-input-box">
                <Lock size={16} className="auth-input-icon" />
                <input
                  id="auth-password-confirm"
                  type="password"
                  placeholder="비밀번호 다시 입력"
                  value={passwordConfirm}
                  onChange={(e) => setPasswordConfirm(e.target.value)}
                  required
                  autoComplete="new-password"
                />
              </div>
            </div>
          )}

          <button
            type="submit"
            className="auth-submit-btn"
            disabled={isLoading}
          >
            {isLoading
              ? '처리 중...'
              : mode === 'login'
              ? '로그인하기'
              : '가입 완료하기'}
          </button>
        </form>

        <div className="auth-divider">
          <span>또는</span>
        </div>

        <div className="auth-quick-actions">
          <button
            type="button"
            className="auth-demo-btn"
            onClick={handleQuickDemoLogin}
            disabled={isLoading}
          >
            <Sparkles size={15} />
            <span>체험 계정으로 1초 빠른 로그인</span>
          </button>

          <button
            type="button"
            className="auth-guest-btn"
            onClick={onClose}
          >
            <span>비회원 게스트로 계속 둘러보기</span>
          </button>
        </div>
      </div>
    </div>
  );
};
