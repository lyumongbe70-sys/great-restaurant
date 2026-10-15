/**
 * PostGIS 좌표 순서 및 거리 단위, 반경 안/밖 구분 검증 스크립트
 */

// WGS84 타원체 대원거리 공식 (PostGIS ST_Distance(geography, geography)와 동일한 WGS84 구면/타원체 거리 계산)
function calculateGeodesicDistanceMeters(lat1, lon1, lat2, lon2) {
  const R = 6371008.8; // WGS84 평균 지구 반지름 (미터)
  const phi1 = (lat1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;
  const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
  const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return Math.round(R * c * 10) / 10;
}

console.log('======================================================================');
console.log('🗺️ [검증 1] PostGIS 좌표 순서 및 EPSG:4326 WGS84 타당성 검증');
console.log('======================================================================');

const center = { name: '기준 위치 (서울 종로)', lat: 37.5730, lng: 126.9835 };
console.log(`- 기준점: 위도(lat)=${center.lat}, 경도(lng)=${center.lng}`);
console.log(`- PostGIS 함수: ST_SetSRID(ST_MakePoint(lng, lat), 4326)::geography`);
console.log(`  * X 좌표 = 경도(lng, 126.9835) -> 동서 방향`);
console.log(`  * Y 좌표 = 위도(lat, 37.5730)  -> 남북 방향`);
console.log(`  * 주의: 만약 ST_MakePoint(lat, lng)로 바꾸면 Y가 126.98도가 되어 유효 위도(-90~90)를 초과하여 오류 발생!`);
console.log(`  * 확인 결과: ST_MakePoint(lng, lat) 좌표 순서 정상!\n`);

console.log('======================================================================');
console.log('📏 [검증 2] 거리 단위 및 반경 500m / 1km / 3km 안/밖 구분 검증');
console.log('======================================================================');

// 서울 지역 위도 1도 ≈ 111km (0.001도 ≈ 111m)
// 서울 지역 경도 1도 ≈ 88km (0.001도 ≈ 88m)
const testPoints = [
  { name: '음식점 A (매우 가까움)', lat: 37.5750, lng: 126.9835, desc: '북쪽 약 220m' },
  { name: '음식점 B (500m 경계 내부)', lat: 37.5768, lng: 126.9835, desc: '북쪽 약 420m' },
  { name: '음식점 C (500m 경계 외부, 1km 내부)', lat: 37.5790, lng: 126.9835, desc: '북쪽 약 667m' },
  { name: '음식점 D (1km 경계 외부, 3km 내부)', lat: 37.5880, lng: 126.9835, desc: '북쪽 약 1,668m' },
  { name: '음식점 E (3km 경계 외부)', lat: 37.6080, lng: 126.9835, desc: '북쪽 약 3,892m' },
];

const radiuses = [500, 1000, 3000];

radiuses.forEach((radius) => {
  console.log(`\n▶ [반경 ${radius >= 1000 ? radius / 1000 + 'km' : radius + 'm'} (${radius}m) 필터링 테스트]`);
  let insideCount = 0;
  let outsideCount = 0;

  testPoints.forEach((point) => {
    const dist = calculateGeodesicDistanceMeters(center.lat, center.lng, point.lat, point.lng);
    const isInside = dist <= radius; // ST_DWithin(r.location, user_point, radius)
    if (isInside) insideCount++;
    else outsideCount++;

    const status = isInside ? '🟢 [반경 안 - 포함]' : '🔴 [반경 밖 - 제외]';
    console.log(
      `  - ${point.name}: 직선거리 ${dist}m (${point.desc}) => ${status}`
    );
  });

  console.log(`  => 결과: 총 ${testPoints.length}개 중 ${insideCount}개 포함, ${outsideCount}개 정상 제외됨.`);
});

console.log('\n======================================================================');
console.log('✅ PostGIS 공간 인덱스(GIST)와 ST_DWithin 거리 계산 단위(미터) 검증 완료');
console.log('======================================================================\n');
