import 'dart:convert';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:hailing_mobile/core/network/api_client.dart';
import 'package:hailing_mobile/features/maps/data/place_repository.dart';
import 'package:hailing_mobile/features/maps/domain/map_models.dart';

void main() {
  group('PlaceRepository (backend place cache)', () {
    test('search maps backend rows to HatodPlace', () async {
      String? seenUrl;
      final api = ApiClient(
        baseUrl: 'http://x',
        httpClient: MockClient((req) async {
          seenUrl = req.url.toString();
          return http.Response(
              jsonEncode([
                {
                  'id': 'pl-1',
                  'name': 'Baluan Gym',
                  'address': 'Baluan Gym, Lagao, General Santos City',
                  'lat': 6.1249864,
                  'lng': 125.2171128,
                  'source': 'nominatim'
                }
              ]),
              200);
        }),
      );
      final res = await PlaceRepository(api: api).search('lagao gym');
      expect(seenUrl, contains('/api/places/search'));
      expect(seenUrl, contains('lagao'));
      expect(res, hasLength(1));
      expect(res.first.name, 'Baluan Gym');
      expect(res.first.point.lat, closeTo(6.1249864, 0.0001));
    });

    test('reverse maps GPS to city + area key', () async {
      String? seenUrl;
      final api = ApiClient(
        baseUrl: 'http://x',
        httpClient: MockClient((req) async {
          seenUrl = req.url.toString();
          return http.Response(
              jsonEncode({
                'city': 'General Santos',
                'areaKey': 'ph-12',
                'areaLabel': 'Soccsksargen',
                'label': 'General Santos, Soccsksargen'
              }),
              200);
        }),
      );
      final area = await PlaceRepository(api: api)
          .reverse(const HatodMapPoint(6.1169, 125.1716));
      expect(seenUrl, contains('/api/places/reverse'));
      expect(area.city, 'General Santos');
      expect(area.areaKey, 'ph-12');
      expect(area.label, 'General Santos, Soccsksargen');
    });

    test('search returns empty when backend has nothing', () async {
      final api = ApiClient(
        baseUrl: 'http://x',
        httpClient: MockClient((_) async => http.Response('[]', 200)),
      );
      expect(await PlaceRepository(api: api).search('zzz'), isEmpty);
    });
  });
}
