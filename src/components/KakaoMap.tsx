import React, { useEffect, useRef, useState } from 'react';
import type { Restaurant } from '../types/restaurant';
import { calculateDistanceMeters, formatDistance } from '../services/restaurantApi';
import { NavigationModal } from './NavigationModal';
import {
  MapPin,
  ExternalLink,
  Star,
  ChevronRight,
  X,
  Compass,
  Layers,
  Navigation,
  Car,
  AlertTriangle
} from 'lucide-react';

export interface ParkingLotItem {
  id: string;
  name: string;
  address: string;
  roadAddress?: string;
  phone?: string;
  lat: number;
  lng: number;
  distance?: string;
  distanceMeters?: number;
  placeUrl: string;
}

interface KakaoMapProps {
  restaurants: Restaurant[];
  selectedRestaurant: Restaurant | null;
  userLocation?: { lat: number; lng: number } | null;
  radius?: number; // in meters (500, 1000, 3000)
  onSelectRestaurant: (restaurant: Restaurant) => void;
  onOpenDetail: (restaurant: Restaurant) => void;
  className?: string;
}

export const KakaoMap: React.FC<KakaoMapProps> = ({
  restaurants,
  selectedRestaurant,
  userLocation,
  radius = 1000,
  onSelectRestaurant,
  onOpenDetail,
  className = '',
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const parkingMarkersRef = useRef<any[]>([]);
  const userOverlayRef = useRef<any>(null);
  const radiusCircleRef = useRef<any>(null);

  const [mapStatus, setMapStatus] = useState<'loading' | 'ready' | 'no_key' | 'error'>('loading');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [activeRestaurant, setActiveRestaurant] = useState<Restaurant | null>(selectedRestaurant);

  // Feature 1: Real-time traffic overlay
  const [isTrafficOn, setIsTrafficOn] = useState(false);

  // Feature 2: Nearby parking lots
  const [showParking, setShowParking] = useState(false);
  const [isSearchingParking, setIsSearchingParking] = useState(false);
  const [parkingLots, setParkingLots] = useState<ParkingLotItem[]>([]);
  const [activeParkingLot, setActiveParkingLot] = useState<ParkingLotItem | null>(null);

  // Feature 3: Navigation with safety camera alert
  const [showNaviModal, setShowNaviModal] = useState(false);
  const [naviRestaurant, setNaviRestaurant] = useState<Restaurant | null>(null);

  const apiKey = import.meta.env.VITE_KAKAO_MAP_API_KEY;

  // Sync active restaurant with parent prop
  useEffect(() => {
    if (selectedRestaurant) {
      setActiveRestaurant(selectedRestaurant);
      setActiveParkingLot(null);
      if (mapInstanceRef.current && window.kakao?.maps) {
        const moveLatLng = new window.kakao.maps.LatLng(
          selectedRestaurant.lat,
          selectedRestaurant.lng
        );
        mapInstanceRef.current.panTo(moveLatLng);
        mapInstanceRef.current.setLevel(4);
      }
    }
  }, [selectedRestaurant]);

  // Safe Kakao Map SDK Initializer
  const tryInitKakao = () => {
    if (
      window.kakao &&
      window.kakao.maps &&
      typeof window.kakao.maps.load === 'function' &&
      window.kakao.maps.Map
    ) {
      try {
        window.kakao.maps.load(() => {
          initMap();
        });
      } catch (err: any) {
        console.warn('Kakao map load failed:', err);
        setMapStatus('error');
        setErrorMessage('카카오 지도 SDK 초기화 중 오류가 발생했습니다.');
      }
    } else {
      // Kakao API returned AccessDeniedError (domain mismatch) or did not load maps
      console.warn('⚠️ Kakao Map API: Domain mismatched for caller http://localhost:5173');
      setMapStatus('error');
      setErrorMessage(
        '카카오 개발자 콘솔의 [플랫폼 > Web]에 "http://localhost:5173" 사이트 도메인이 등록되지 않았습니다.'
      );
    }
  };

  // Load Kakao Map SDK Script
  useEffect(() => {
    if (!apiKey || apiKey.trim() === '' || apiKey === 'your_kakao_javascript_api_key_here') {
      setMapStatus('no_key');
      return;
    }

    if (window.kakao && window.kakao.maps && window.kakao.maps.Map) {
      initMap();
      return;
    }

    const scriptId = 'kakao-map-sdk';
    let script = document.getElementById(scriptId) as HTMLScriptElement;

    if (!script) {
      script = document.createElement('script');
      script.id = scriptId;
      script.src = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${apiKey}&autoload=false&libraries=services`;
      script.async = true;

      script.onload = () => {
        tryInitKakao();
      };

      script.onerror = () => {
        setMapStatus('error');
        setErrorMessage(
          '카카오 지도 스크립트 로드에 실패했습니다. 키가 올바른지 또는 도메인 허용 설정이 되어 있는지 확인해 주세요.'
        );
      };

      document.head.appendChild(script);
    } else {
      tryInitKakao();
    }
  }, [apiKey]);

  // Initialize Kakao Map
  const initMap = () => {
    if (!mapContainerRef.current) return;

    try {
      const initialLat = userLocation?.lat || restaurants[0]?.lat || 37.5665;
      const initialLng = userLocation?.lng || restaurants[0]?.lng || 126.978;

      const options = {
        center: new window.kakao.maps.LatLng(initialLat, initialLng),
        level: userLocation ? (radius <= 500 ? 4 : radius <= 1000 ? 5 : 7) : 5,
      };

      const map = new window.kakao.maps.Map(mapContainerRef.current, options);
      mapInstanceRef.current = map;

      // Add Zoom Control
      const zoomControl = new window.kakao.maps.ZoomControl();
      map.addControl(zoomControl, window.kakao.maps.ControlPosition.RIGHT);

      setMapStatus('ready');

      // Crucial: call relayout to ensure full viewport tile rendering
      setTimeout(() => {
        if (mapInstanceRef.current) {
          mapInstanceRef.current.relayout();
          mapInstanceRef.current.setCenter(new window.kakao.maps.LatLng(initialLat, initialLng));
        }
      }, 150);
    } catch (err: any) {
      console.warn('Kakao map init error:', err);
      setMapStatus('error');
      setErrorMessage(err?.message || '지도 초기화 중 오류가 발생했습니다.');
    }
  };

  // Toggle Traffic Overlay
  const handleToggleTraffic = () => {
    const nextState = !isTrafficOn;
    setIsTrafficOn(nextState);

    if (mapInstanceRef.current && window.kakao?.maps) {
      if (nextState) {
        mapInstanceRef.current.addOverlayMapTypeId(window.kakao.maps.MapTypeId.TRAFFIC);
      } else {
        mapInstanceRef.current.removeOverlayMapTypeId(window.kakao.maps.MapTypeId.TRAFFIC);
      }
    }
  };

  // Clear Parking Markers
  const clearParkingMarkers = () => {
    parkingMarkersRef.current.forEach((overlay) => overlay.setMap(null));
    parkingMarkersRef.current = [];
  };

  // Search Parking Lots using Kakao Places PK6 category
  const searchParkingAround = (targetCoords?: { lat: number; lng: number }) => {
    setIsSearchingParking(true);

    if (mapInstanceRef.current && window.kakao?.maps?.services?.Places) {
      const ps = new window.kakao.maps.services.Places();
      const centerLatLng = targetCoords
        ? new window.kakao.maps.LatLng(targetCoords.lat, targetCoords.lng)
        : mapInstanceRef.current.getCenter();

      ps.categorySearch(
        'PK6',
        (data: any[], status: any) => {
          setIsSearchingParking(false);
          if (status === window.kakao.maps.services.Status.OK && data && data.length > 0) {
            const items: ParkingLotItem[] = data.map((d: any) => {
              const pLat = parseFloat(d.y);
              const pLng = parseFloat(d.x);
              let distStr: string | undefined;

              const baseCoords = targetCoords || userLocation;
              if (baseCoords) {
                const dm = calculateDistanceMeters(baseCoords.lat, baseCoords.lng, pLat, pLng);
                distStr = formatDistance(dm);
              } else if (d.distance) {
                distStr = formatDistance(parseInt(d.distance, 10));
              }

              return {
                id: d.id,
                name: d.place_name,
                address: d.address_name,
                roadAddress: d.road_address_name,
                phone: d.phone,
                lat: pLat,
                lng: pLng,
                distance: distStr,
                placeUrl: d.place_url,
              };
            });

            setParkingLots(items);
            renderParkingMarkers(items);
            setShowParking(true);
          } else {
            setParkingLots([]);
            clearParkingMarkers();
            alert('주변 반경 내 주차장을 찾을 수 없습니다.');
          }
        },
        {
          location: centerLatLng,
          radius: 1500,
          sort: window.kakao.maps.services.SortBy.DISTANCE,
        }
      );
    } else {
      // Mock parking lots when Kakao SDK is in fallback mode
      setTimeout(() => {
        setIsSearchingParking(false);
        const centerLat = targetCoords?.lat || userLocation?.lat || restaurants[0]?.lat || 37.573;
        const centerLng = targetCoords?.lng || userLocation?.lng || restaurants[0]?.lng || 126.983;

        const mockParking: ParkingLotItem[] = [
          {
            id: 'mock-p1',
            name: '인사동 공영주차장 (무료 개방 시간대 확인)',
            address: '서울 종로구 인사동길 12',
            lat: centerLat + 0.0015,
            lng: centerLng - 0.002,
            distance: '직선거리 180m',
            phone: '02-730-1234',
            placeUrl: 'https://map.kakao.com',
          },
          {
            id: 'mock-p2',
            name: '종로타워 민영/공영 주차장',
            address: '서울 종로구 종로 51',
            lat: centerLat - 0.002,
            lng: centerLng + 0.0015,
            distance: '직선거리 290m',
            phone: '02-738-5678',
            placeUrl: 'https://map.kakao.com',
          },
          {
            id: 'mock-p3',
            name: '삼청로 노상 공영주차장 (주말 무료)',
            address: '서울 종로구 삼청로 30',
            lat: centerLat + 0.0035,
            lng: centerLng + 0.001,
            distance: '직선거리 430m',
            phone: '02-731-9988',
            placeUrl: 'https://map.kakao.com',
          },
        ];

        setParkingLots(mockParking);
        setShowParking(true);
      }, 300);
    }
  };

  // Toggle Parking Lots Search
  const handleToggleParking = () => {
    if (showParking) {
      setShowParking(false);
      clearParkingMarkers();
      setActiveParkingLot(null);
    } else {
      const center = activeRestaurant
        ? { lat: activeRestaurant.lat, lng: activeRestaurant.lng }
        : userLocation
        ? userLocation
        : undefined;
      searchParkingAround(center);
    }
  };

  // Render Parking Markers
  const renderParkingMarkers = (lots: ParkingLotItem[]) => {
    clearParkingMarkers();
    if (!mapInstanceRef.current || !window.kakao?.maps) return;

    lots.forEach((lot) => {
      const position = new window.kakao.maps.LatLng(lot.lat, lot.lng);

      const pElement = document.createElement('div');
      pElement.className = 'parking-marker-pin';
      pElement.title = `${lot.name} (${lot.distance || ''})`;
      pElement.innerHTML = `
        <div class="parking-icon-circle">
          <span>P</span>
        </div>
        <span class="parking-marker-name">${lot.name.replace(/주차장|공영|유료/g, '').trim() || '주차장'}</span>
      `;

      const overlay = new window.kakao.maps.CustomOverlay({
        position,
        content: pElement,
        yAnchor: 1.15,
        zIndex: 45,
      });

      pElement.addEventListener('click', (e) => {
        e.stopPropagation();
        setActiveRestaurant(null);
        setActiveParkingLot(lot);
        mapInstanceRef.current.panTo(position);
      });

      overlay.setMap(mapInstanceRef.current);
      parkingMarkersRef.current.push(overlay);
    });
  };

  // Update Real Kakao Map Markers & Overlays
  useEffect(() => {
    if (mapStatus !== 'ready' || !mapInstanceRef.current || !window.kakao?.maps) return;

    const map = mapInstanceRef.current;

    // Clear previous restaurant markers
    markersRef.current.forEach((marker) => marker.setMap(null));
    markersRef.current = [];

    // Clear previous user overlay and circle
    if (userOverlayRef.current) {
      userOverlayRef.current.setMap(null);
      userOverlayRef.current = null;
    }
    if (radiusCircleRef.current) {
      radiusCircleRef.current.setMap(null);
      radiusCircleRef.current = null;
    }

    // 1. Draw User Location Overlay & Radius Circle if available
    if (userLocation) {
      const userLatLng = new window.kakao.maps.LatLng(userLocation.lat, userLocation.lng);

      // Create Radius Circle
      const circle = new window.kakao.maps.Circle({
        center: userLatLng,
        radius: radius,
        strokeWeight: 2,
        strokeColor: '#2563eb',
        strokeOpacity: 0.8,
        strokeStyle: 'dashed',
        fillColor: '#3b82f6',
        fillOpacity: 0.12,
      });
      circle.setMap(map);
      radiusCircleRef.current = circle;

      // Create User Location Pulse Pin
      const userContent = document.createElement('div');
      userContent.className = 'kakao-user-location-marker';
      userContent.innerHTML = `
        <div class="user-location-pulse"></div>
        <div class="user-location-dot">
          <span>●</span>
        </div>
        <span class="user-location-label">내 위치 (${radius >= 1000 ? radius / 1000 + 'km' : radius + 'm'})</span>
      `;

      const userOverlay = new window.kakao.maps.CustomOverlay({
        position: userLatLng,
        content: userContent,
        yAnchor: 1.2,
        zIndex: 50,
      });
      userOverlay.setMap(map);
      userOverlayRef.current = userOverlay;

      if (!selectedRestaurant) {
        map.panTo(userLatLng);
        map.setLevel(radius <= 500 ? 4 : radius <= 1000 ? 5 : 7);
      }
    }

    // 2. Draw Restaurant Markers
    if (restaurants.length > 0) {
      const bounds = new window.kakao.maps.LatLngBounds();
      if (userLocation) {
        bounds.extend(new window.kakao.maps.LatLng(userLocation.lat, userLocation.lng));
      }

      restaurants.forEach((restaurant) => {
        const position = new window.kakao.maps.LatLng(restaurant.lat, restaurant.lng);
        bounds.extend(position);

        const marker = new window.kakao.maps.Marker({
          position,
          title: restaurant.name,
          map,
        });

        window.kakao.maps.event.addListener(marker, 'click', () => {
          setActiveRestaurant(restaurant);
          setActiveParkingLot(null);
          onSelectRestaurant(restaurant);
          map.panTo(position);
        });

        markersRef.current.push(marker);
      });

      if (!selectedRestaurant && !userLocation && restaurants.length > 0) {
        map.setBounds(bounds);
      }
    }
  }, [restaurants, userLocation, radius, mapStatus]);

  // Center button handler
  const handleRecenter = () => {
    if (!mapInstanceRef.current || !window.kakao?.maps) return;
    if (userLocation) {
      mapInstanceRef.current.panTo(
        new window.kakao.maps.LatLng(userLocation.lat, userLocation.lng)
      );
      mapInstanceRef.current.setLevel(radius <= 500 ? 4 : radius <= 1000 ? 5 : 7);
      return;
    }
    if (restaurants.length === 0) return;
    const bounds = new window.kakao.maps.LatLngBounds();
    restaurants.forEach((r) => {
      bounds.extend(new window.kakao.maps.LatLng(r.lat, r.lng));
    });
    mapInstanceRef.current.setBounds(bounds);
  };

  // Open Navigation Modal
  const handleOpenNavi = (restaurant: Restaurant, e: React.MouseEvent) => {
    e.stopPropagation();
    setNaviRestaurant(restaurant);
    setShowNaviModal(true);
  };

  // Relative coordinate mapping for Fallback Visual Map
  const lats = restaurants.map((r) => r.lat);
  const lngs = restaurants.map((r) => r.lng);
  if (userLocation) {
    lats.push(userLocation.lat);
    lngs.push(userLocation.lng);
  }
  const minLat = lats.length > 0 ? Math.min(...lats) : 37.56;
  const maxLat = lats.length > 0 ? Math.max(...lats) : 37.58;
  const minLng = lngs.length > 0 ? Math.min(...lngs) : 126.97;
  const maxLng = lngs.length > 0 ? Math.max(...lngs) : 127.00;
  const latSpan = maxLat - minLat || 0.01;
  const lngSpan = maxLng - minLng || 0.01;

  const getPosPercent = (lat: number, lng: number) => {
    const x = Math.max(8, Math.min(92, ((lng - minLng) / lngSpan) * 80 + 10));
    const y = Math.max(8, Math.min(92, 100 - (((lat - minLat) / latSpan) * 80 + 10)));
    return { left: `${x.toFixed(1)}%`, top: `${y.toFixed(1)}%` };
  };

  return (
    <div className={`kakao-map-wrapper ${className}`}>
      {/* 1. Real Kakao Map Canvas (Visible when SDK is ready) */}
      <div
        ref={mapContainerRef}
        className="kakao-map-canvas"
        style={{
          display: mapStatus === 'ready' ? 'block' : 'none',
          width: '100%',
          height: '100%',
          minHeight: '480px',
        }}
      />

      {/* 2. Interactive Visual Map Canvas (Fallback when Kakao domain registration is pending) */}
      {mapStatus !== 'ready' && mapStatus !== 'loading' && (
        <div className="mock-visual-map-container">
          {/* Top Domain Registration Notice Alert */}
          <div className="kakao-domain-alert-banner">
            <div className="alert-badge-row">
              <AlertTriangle size={16} />
              <strong>카카오 지도 도메인 등록 안내 (시뮬레이션 지도 뷰 가동 중)</strong>
            </div>
            <p>
              현재 접속 주소 <code>http://localhost:5173</code>이 카카오 개발자 콘솔의 <strong>[플랫폼 &gt; Web]</strong>에 등록되지 않아 시뮬레이션 지도가 표시되고 있습니다.
              주소를 등록하시면 실제 카카오 위성/도로 지도로 즉시 전환됩니다.
            </p>
            {errorMessage && <span className="domain-error-hint">{errorMessage}</span>}
            <div className="alert-action-row">
              <a
                href="https://developers.kakao.com/console/app"
                target="_blank"
                rel="noreferrer"
                className="open-kakao-console-pill"
              >
                <span>카카오 개발자 콘솔 바로가기</span>
                <ExternalLink size={13} />
              </a>
              <span className="domain-pill">등록할 주소: http://localhost:5173</span>
            </div>
          </div>

          {/* Interactive Simulated Map Canvas */}
          <div className="mock-map-canvas">
            <div className="mock-grid-bg" />

            {/* Simulated Traffic Overlay Lines if toggled */}
            {isTrafficOn && (
              <div className="mock-traffic-overlay">
                <div className="traffic-line line-green" />
                <div className="traffic-line line-yellow" />
                <div className="traffic-line line-red" />
              </div>
            )}

            {/* User Location Pulse Marker */}
            {userLocation && (
              <div
                className="mock-user-pin"
                style={getPosPercent(userLocation.lat, userLocation.lng)}
              >
                <div className="mock-user-pulse" />
                <div className="mock-user-dot" />
                <span className="mock-user-tag">내 위치 ({radius >= 1000 ? radius / 1000 + 'km' : radius + 'm'})</span>
              </div>
            )}

            {/* Restaurant Pins */}
            {restaurants.map((r) => {
              const pos = getPosPercent(r.lat, r.lng);
              const isSelected = activeRestaurant?.id === r.id;

              return (
                <button
                  key={r.id}
                  type="button"
                  className={`mock-pin-btn ${isSelected ? 'active' : ''}`}
                  style={pos}
                  onClick={() => {
                    setActiveRestaurant(r);
                    setActiveParkingLot(null);
                    onSelectRestaurant(r);
                  }}
                  title={`${r.name} (${r.category}) - ${r.distance || ''}`}
                >
                  <div className="mock-pin-dot">
                    <MapPin size={16} />
                  </div>
                  <span className="mock-pin-label">{r.name}</span>
                </button>
              );
            })}

            {/* Parking Pins if toggled */}
            {showParking &&
              parkingLots.map((p) => {
                const pos = getPosPercent(p.lat, p.lng);
                return (
                  <button
                    key={p.id}
                    type="button"
                    className="mock-parking-pin"
                    style={pos}
                    onClick={() => {
                      setActiveRestaurant(null);
                      setActiveParkingLot(p);
                    }}
                    title={`${p.name} (${p.distance || ''})`}
                  >
                    <div className="parking-icon-circle">P</div>
                    <span className="parking-marker-name">{p.name.slice(0, 8)}</span>
                  </button>
                );
              })}
          </div>
        </div>
      )}

      {/* Floating Toolbar on Top (Active in both Real and Simulated Map) */}
      {mapStatus !== 'loading' && (
        <div className="map-top-floating-bar">
          <div className="map-tools-row">
            {/* Real-time Traffic Toggle */}
            <button
              type="button"
              className={`map-tool-pill-btn ${isTrafficOn ? 'active-traffic' : ''}`}
              onClick={handleToggleTraffic}
              title="실시간 도로 교통상황 (원활/서행/정체 구간 표시)"
            >
              <Layers size={13} />
              <span>{isTrafficOn ? '교통 켜짐' : '실시간 교통'}</span>
            </button>

            {/* Parking Lots Toggle */}
            <button
              type="button"
              className={`map-tool-pill-btn ${showParking ? 'active-parking' : ''}`}
              onClick={handleToggleParking}
              disabled={isSearchingParking}
              title="주변 무료 및 공영 주차장 검색 및 마커 표시"
            >
              <Car size={13} className={isSearchingParking ? 'spin-icon' : ''} />
              <span>
                {isSearchingParking
                  ? '주차장 검색중'
                  : showParking
                  ? `주차장 (${parkingLots.length})`
                  : '주변 주차장'}
              </span>
            </button>

            {/* Re-center / Focus Button */}
            <button
              type="button"
              className="map-tool-pill-btn recenter"
              onClick={handleRecenter}
              title="내 위치 또는 전체 음식점 중심 보기"
            >
              {userLocation ? <Navigation size={13} /> : <Compass size={13} />}
              <span>{userLocation ? '내 위치' : '전체 보기'}</span>
            </button>
          </div>

          <div className="map-status-pill">
            <span className="dot-pulse-mini" />
            <span>
              {userLocation
                ? `내 주변 ${radius >= 1000 ? radius / 1000 + 'km' : radius + 'm'} (${restaurants.length}곳)`
                : `음식점 ${restaurants.length}곳 표시 중`}
            </span>
          </div>
        </div>
      )}

      {/* Selected Restaurant Summary Card (Floating on Map) */}
      {activeRestaurant && mapStatus !== 'loading' && !activeParkingLot && (
        <div className="map-restaurant-summary-card">
          <button
            type="button"
            className="summary-close-btn"
            onClick={() => setActiveRestaurant(null)}
            aria-label="요약 닫기"
          >
            <X size={15} />
          </button>
          <div className="summary-card-inner" onClick={() => onOpenDetail(activeRestaurant)}>
            <img
              src={activeRestaurant.thumbnail}
              alt={activeRestaurant.name}
              className="summary-thumb"
            />
            <div className="summary-info">
              <div className="summary-title-row">
                <span className="summary-badge">{activeRestaurant.category}</span>
                <span className="summary-price">{activeRestaurant.priceRange}</span>
              </div>
              <h4 className="summary-name">{activeRestaurant.name}</h4>
              <div className="summary-rating-row">
                <Star size={13} fill="#f59e0b" color="#f59e0b" />
                <span className="summary-score">{activeRestaurant.rating.toFixed(1)}</span>
                <span className="summary-reviews">({activeRestaurant.reviewCount})</span>
                {activeRestaurant.distance && (
                  <span className="summary-distance highlight">{activeRestaurant.distance}</span>
                )}
              </div>
              <p className="summary-address">{activeRestaurant.address}</p>

              {/* Action Buttons */}
              <div className="summary-btn-actions">
                <button
                  type="button"
                  className="summary-navi-btn"
                  onClick={(e) => handleOpenNavi(activeRestaurant, e)}
                  title="카카오내비/티맵 실시간 단속카메라 음성 길안내"
                >
                  <Navigation size={13} />
                  <span>실시간 길안내</span>
                </button>

                <button
                  type="button"
                  className="summary-parking-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    searchParkingAround({
                      lat: activeRestaurant.lat,
                      lng: activeRestaurant.lng,
                    });
                  }}
                  title="이 식당 주변 공영/무료 주차장 검색"
                >
                  <Car size={13} />
                  <span>주변 주차장</span>
                </button>

                <button
                  type="button"
                  className="summary-action-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    onOpenDetail(activeRestaurant);
                  }}
                >
                  <span>상세보기</span>
                  <ChevronRight size={14} />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Selected Parking Lot Summary Card (Floating on Map) */}
      {activeParkingLot && mapStatus !== 'loading' && (
        <div className="map-restaurant-summary-card parking-card">
          <button
            type="button"
            className="summary-close-btn"
            onClick={() => setActiveParkingLot(null)}
            aria-label="주차장 요약 닫기"
          >
            <X size={15} />
          </button>
          <div className="parking-summary-inner">
            <div className="parking-header-row">
              <div className="parking-badge-p">P</div>
              <div className="parking-header-text">
                <span className="parking-type-tag">공영/무료 주차시설</span>
                <h4 className="parking-name">{activeParkingLot.name}</h4>
              </div>
            </div>

            <div className="parking-meta-row">
              {activeParkingLot.distance && (
                <span className="parking-dist-badge">{activeParkingLot.distance}</span>
              )}
              <span className="parking-addr-text">
                <MapPin size={12} />
                {activeParkingLot.roadAddress || activeParkingLot.address}
              </span>
            </div>

            {activeParkingLot.phone && (
              <p className="parking-phone">전화: {activeParkingLot.phone}</p>
            )}

            <div className="parking-action-row">
              <a
                href={`https://map.kakao.com/link/to/${encodeURIComponent(
                  activeParkingLot.name
                )},${activeParkingLot.lat},${activeParkingLot.lng}`}
                target="_blank"
                rel="noreferrer"
                className="parking-nav-btn"
              >
                <Navigation size={13} />
                <span>주차장 길안내 (카카오맵)</span>
                <ExternalLink size={12} />
              </a>

              <a
                href={activeParkingLot.placeUrl}
                target="_blank"
                rel="noreferrer"
                className="parking-detail-link"
              >
                <span>상세 정보</span>
              </a>
            </div>
          </div>
        </div>
      )}

      {/* Real-time Camera & Navigation Modal */}
      {showNaviModal && naviRestaurant && (
        <NavigationModal
          restaurant={naviRestaurant}
          onClose={() => setShowNaviModal(false)}
        />
      )}

      {/* Loading State */}
      {mapStatus === 'loading' && (
        <div className="map-status-card loading">
          <div className="spinner" />
          <p>카카오 지도를 불러오는 중입니다...</p>
        </div>
      )}
    </div>
  );
};
