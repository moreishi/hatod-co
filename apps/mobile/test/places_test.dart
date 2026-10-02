import 'package:flutter_test/flutter_test.dart';
import 'package:hailing_mobile/features/maps/domain/places.dart';

void main() {
  group('Bundled Gensan places', () {
    test('dataset is non-empty with coordinates', () {
      expect(gensanPlaces.length, greaterThan(5));
      for (final p in gensanPlaces) {
        expect(p.name.isNotEmpty, isTrue);
        expect(p.point.lat, inInclusiveRange(5.9, 6.4));
        expect(p.point.lng, inInclusiveRange(124.9, 125.4));
      }
    });

    test('searchPlaces matches name case-insensitively', () {
      final res = searchPlaces('kcc');
      expect(res, isNotEmpty);
      expect(res.first.name, contains('KCC'));
    });

    test('Cebu dataset is non-empty with coordinates', () {
      expect(cebuPlaces.length, greaterThan(5));
      for (final p in cebuPlaces) {
        expect(p.name.isNotEmpty, isTrue);
        expect(p.point.lat, inInclusiveRange(10.0, 10.6));
        expect(p.point.lng, inInclusiveRange(123.5, 124.1));
      }
    });

    test('searchPlaces finds Cebu places too', () {
      final res = searchPlaces('seaside');
      expect(res, isNotEmpty);
      expect(res.first.name, contains('Seaside'));
    });

    test('empty query returns all places', () {
      expect(searchPlaces('').length, gensanPlaces.length + cebuPlaces.length);
    });

    test('no match returns empty', () {
      expect(searchPlaces('zzz-no-such-place'), isEmpty);
    });
  });
}
