import 'package:flutter_test/flutter_test.dart';
import 'package:hailing_mobile/features/maps/domain/map_models.dart';

void main() {
  group('MapModels (routing spec §53-54)', () {
    test('centerBetween returns midpoint', () {
      const a = HatodMapPoint(6.1169, 125.1716); // Gensan
      const b = HatodMapPoint(6.1269, 125.1816);
      final c = MapMath.centerBetween(a, b);
      expect(c.lat, closeTo(6.1219, 0.0001));
      expect(c.lng, closeTo(125.1766, 0.0001));
    });

    test('zoomForDistance shrinks with distance', () {
      expect(MapMath.zoomForDistanceKm(0.5), greaterThan(MapMath.zoomForDistanceKm(20)));
      expect(MapMath.zoomForDistanceKm(1), 15.0);
    });

    test('decodePolyline decodes OSRM precision-5 geometry', () {
      final pts = MapMath.decodePolyline(r'_p~iF~ps|U_ulLnnqC_mqNvxq`@');
      expect(pts.length, 3);
      expect(pts[0].lat, closeTo(38.5, 0.0001));
      expect(pts[0].lng, closeTo(-120.2, 0.0001));
      expect(pts[2].lat, closeTo(43.252, 0.0001));
      expect(pts[2].lng, closeTo(-126.453, 0.0001));
    });

    test('decodePolyline returns empty for empty input', () {
      expect(MapMath.decodePolyline(''), isEmpty);
    });

    test('distanceKm measures sane straight-line km', () {
      const kcc = HatodMapPoint(6.1117, 125.1749);
      const sm = HatodMapPoint(6.1103, 125.1710);
      final km = MapMath.distanceKm(kcc, sm);
      expect(km, greaterThan(0.2));
      expect(km, lessThan(1.0));
      expect(MapMath.distanceKm(kcc, kcc), 0.0);
    });

    test('straightLine builds N points from origin to destination', () {
      const o = HatodMapPoint(6.11, 125.17);
      const d = HatodMapPoint(6.12, 125.18);
      final pts = MapMath.straightLine(o, d, steps: 5);
      expect(pts.length, 5);
      expect(pts.first.lat, 6.11);
      expect(pts.last.lat, 6.12);
    });
  });
}
