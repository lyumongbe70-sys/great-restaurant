import React from 'react';
import { Search, X, Smartphone, Monitor, UtensilsCrossed, Download, User as UserIcon } from 'lucide-react';
import type { AuthUserProfile } from '../services/authService';

interface HeaderProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  isMobileFrame: boolean;
  onToggleFrame: () => void;
  onInstallClick: () => void;
  currentUser: AuthUserProfile | null;
  onOpenAuth: () => void;
  onOpenMyPage: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  searchQuery,
  onSearchChange,
  isMobileFrame,
  onToggleFrame,
  onInstallClick,
  currentUser,
  onOpenAuth,
  onOpenMyPage,
}) => {
  return (
    <header className="site-header">
      <div className="header-top">
        <div className="brand-logo">
          <div className="logo-icon-wrapper">
            <UtensilsCrossed size={22} className="logo-icon" />
          </div>
          <div className="brand-text">
            <h1 className="brand-title">Great Restaurant</h1>
            <span className="brand-subtitle">위대한 맛집 탐색기</span>
          </div>
        </div>

        <div className="header-actions">
          {currentUser ? (
            <button
              type="button"
              className="user-profile-badge-btn"
              onClick={onOpenMyPage}
              title={`${currentUser.nickname}님의 마이페이지`}
            >
              <div className="user-header-avatar">{currentUser.nickname[0] || 'U'}</div>
              <span className="user-header-name">{currentUser.nickname}</span>
            </button>
          ) : (
            <button
              type="button"
              className="auth-login-trigger-btn"
              onClick={onOpenAuth}
              title="로그인 / 회원가입"
            >
              <UserIcon size={15} />
              <span className="btn-text">로그인</span>
            </button>
          )}

          <button
            type="button"
            className="pwa-install-btn"
            onClick={onInstallClick}
            title="PWA 앱 설치 안내"
          >
            <Download size={15} />
            <span className="btn-text">앱 설치</span>
          </button>

          <button
            type="button"
            className={`frame-toggle-btn ${isMobileFrame ? 'active' : ''}`}
            onClick={onToggleFrame}
            title={isMobileFrame ? '데스크톱 전체화면 보기' : '모바일 프레임 모드 보기'}
          >
            {isMobileFrame ? <Monitor size={16} /> : <Smartphone size={16} />}
            <span className="btn-text">{isMobileFrame ? 'PC 뷰' : '모바일 뷰'}</span>
          </button>
        </div>
      </div>

      <div className="search-bar-wrapper">
        <div className="search-input-box">
          <Search size={18} className="search-icon" />
          <input
            type="text"
            className="search-input"
            placeholder="식당 이름이나 대표 메뉴를 검색해보세요 (예: 갈비, 스시, 루나...)"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
          />
          {searchQuery && (
            <button
              type="button"
              className="clear-search-btn"
              onClick={() => onSearchChange('')}
              aria-label="검색어 지우기"
            >
              <X size={16} />
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
