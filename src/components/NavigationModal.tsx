import React from 'react';
import type { Restaurant } from '../types/restaurant';
import {
  X,
  Navigation,
  Camera,
  ExternalLink,
  MapPin,
  Compass
} from 'lucide-react';

interface NavigationModalProps {
  restaurant: Restaurant;
  onClose: () => void;
}

export const NavigationModal: React.FC<NavigationModalProps> = ({
  restaurant,
  onClose,
}) => {
  // Navigation App Deep Links
  const kakaoNaviUrl = `kakaonavi://navigate?name=${encodeURIComponent(
    restaurant.name
  )}&x=${restaurant.lng}&y=${restaurant.lat}&coord_type=wgs84`;

  const kakaoMapWebUrl = `https://map.kakao.com/link/to/${encodeURIComponent(
    restaurant.name
  )},${restaurant.lat},${restaurant.lng}`;

  const tmapUrl = `tmap://route?goalname=${encodeURIComponent(
    restaurant.name
  )}&goalx=${restaurant.lng}&goaly=${restaurant.lat}`;

  const naverMapUrl = `nmap://action/route?destination=${restaurant.lat},${restaurant.lng}&dname=${encodeURIComponent(
    restaurant.name
  )}`;

  const handleLaunchApp = (appUrl: string, fallbackUrl: string) => {
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    if (isMobile) {
      window.location.href = appUrl;
      setTimeout(() => {
        window.open(fallbackUrl, '_blank');
      }, 1500);
    } else {
      window.open(fallbackUrl, '_blank');
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="navigation-modal-card" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="navi-modal-header">
          <div className="navi-title-group">
            <div className="navi-icon-box">
              <Navigation size={20} className="navi-primary-icon" />
            </div>
            <div>
              <h4>실시간 길안내 & 단속 카메라</h4>
              <p>내비게이션 앱으로 실시간 감속 및 카메라 음성 안내를 받으세요.</p>
            </div>
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

        {/* Destination Card */}
        <div className="navi-destination-card">
          <div className="dest-badge-row">
            <span className="dest-category">{restaurant.category}</span>
            {restaurant.distance && (
              <span className="dest-distance">{restaurant.distance}</span>
            )}
          </div>
          <h3 className="dest-name">{restaurant.name}</h3>
          <p className="dest-address">
            <MapPin size={13} />
            <span>{restaurant.address}</span>
          </p>
        </div>

        {/* Safety & Enforcement Camera Alert Banner */}
        <div className="safety-alert-banner">
          <div className="safety-alert-header">
            <div className="safety-camera-icon">
              <Camera size={16} />
            </div>
            <strong>안전 운전 & 감속 경고 지원</strong>
          </div>
          <p className="safety-desc">
            과속 / 신호위반 단속 카메라 및 스쿨존(30km) 서행 구간 진입 시 실시간 경고음과 빠른길 회피 안내가 자동으로 시작됩니다.
          </p>
        </div>

        {/* Navigation App Selector */}
        <div className="navi-app-list">
          {/* Kakao Navi */}
          <button
            type="button"
            className="navi-app-item kakao"
            onClick={() => handleLaunchApp(kakaoNaviUrl, kakaoMapWebUrl)}
          >
            <div className="app-logo kakao-logo">
              <span>카카오</span>
            </div>
            <div className="app-info">
              <div className="app-name-row">
                <strong>카카오내비</strong>
                <span className="app-badge recommend">추천</span>
              </div>
              <span className="app-desc">단속 카메라 음성 경고 & 실시간 빠른길</span>
            </div>
            <div className="app-action-icon">
              <ExternalLink size={16} />
            </div>
          </button>

          {/* T-Map */}
          <button
            type="button"
            className="navi-app-item tmap"
            onClick={() => handleLaunchApp(tmapUrl, kakaoMapWebUrl)}
          >
            <div className="app-logo tmap-logo">
              <span>TMAP</span>
            </div>
            <div className="app-info">
              <div className="app-name-row">
                <strong>티맵 (TMAP)</strong>
              </div>
              <span className="app-desc">티맵 실시간 정체 회피 및 카메라 안내</span>
            </div>
            <div className="app-action-icon">
              <ExternalLink size={16} />
            </div>
          </button>

          {/* Naver Map */}
          <button
            type="button"
            className="navi-app-item naver"
            onClick={() => handleLaunchApp(naverMapUrl, kakaoMapWebUrl)}
          >
            <div className="app-logo naver-logo">
              <span>NAVER</span>
            </div>
            <div className="app-info">
              <div className="app-name-row">
                <strong>네이버 지도</strong>
              </div>
              <span className="app-desc">네이버 내비 실시간 길찾기</span>
            </div>
            <div className="app-action-icon">
              <ExternalLink size={16} />
            </div>
          </button>

          {/* Kakao Map Web / Direction View */}
          <a
            href={kakaoMapWebUrl}
            target="_blank"
            rel="noreferrer"
            className="navi-app-item web"
          >
            <div className="app-logo web-logo">
              <Compass size={18} />
            </div>
            <div className="app-info">
              <div className="app-name-row">
                <strong>카카오맵 실시간 경로 보기</strong>
                <span className="app-badge web">브라우저</span>
              </div>
              <span className="app-desc">예상 소요시간, 실시간 정체구간, 통행료 확인</span>
            </div>
            <div className="app-action-icon">
              <ExternalLink size={16} />
            </div>
          </a>
        </div>

        {/* Footer Guidance */}
        <div className="navi-modal-footer">
          <span>
            💡 스마트폰에서 실행 시 설치된 내비게이션 앱이 열려 음성 안내와 함께 바로 주행을 시작할 수 있습니다.
          </span>
        </div>
      </div>
    </div>
  );
};
