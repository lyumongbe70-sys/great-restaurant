import React from 'react';
import { Home, Compass, Heart, User } from 'lucide-react';

export type NavTab = 'home' | 'explore' | 'bookmarks' | 'my';

interface BottomNavProps {
  currentTab: NavTab;
  onTabChange: (tab: NavTab) => void;
  bookmarkCount: number;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  currentTab,
  onTabChange,
  bookmarkCount,
}) => {
  return (
    <nav className="bottom-nav-bar">
      <button
        type="button"
        className={`nav-tab-item ${currentTab === 'home' ? 'active' : ''}`}
        onClick={() => onTabChange('home')}
      >
        <Home size={20} />
        <span>홈</span>
      </button>

      <button
        type="button"
        className={`nav-tab-item ${currentTab === 'explore' ? 'active' : ''}`}
        onClick={() => onTabChange('explore')}
      >
        <Compass size={20} />
        <span>맛집 지도</span>
      </button>

      <button
        type="button"
        className={`nav-tab-item ${currentTab === 'bookmarks' ? 'active' : ''}`}
        onClick={() => onTabChange('bookmarks')}
      >
        <div className="tab-icon-wrapper">
          <Heart size={20} />
          {bookmarkCount > 0 && <span className="tab-badge">{bookmarkCount}</span>}
        </div>
        <span>찜한 곳</span>
      </button>

      <button
        type="button"
        className={`nav-tab-item ${currentTab === 'my' ? 'active' : ''}`}
        onClick={() => onTabChange('my')}
      >
        <User size={20} />
        <span>마이</span>
      </button>
    </nav>
  );
};
