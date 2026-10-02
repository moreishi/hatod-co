import '../../../core/network/api_client.dart';
import '../domain/map_models.dart';
import '../domain/places.dart';

/// Backend place cache (routing spec §29): seeded POIs + every persisted
/// Nominatim hit. Zero per-call cost; unknown addresses are saved server-side
/// on first lookup and are local hits afterwards.
class PlaceRepository {
  final ApiClient api;

  PlaceRepository({required this.api});

  Future<List<HatodPlace>> search(String query, {String areaKey = ''}) async {
    final area = areaKey.isEmpty
        ? ''
        : '&area=${Uri.encodeQueryComponent(areaKey)}';
    final body = await api
        .get('/api/places/search?q=${Uri.encodeQueryComponent(query)}$area');
    final list = body as List;
    return list.map((e) {
      final m = e as Map<String, dynamic>;
      return HatodPlace(
        name: m['name'] as String,
        address: m['address'] as String,
        point: HatodMapPoint(
          (m['lat'] as num).toDouble(),
          (m['lng'] as num).toDouble(),
        ),
        areaKey: m['areaKey'] as String? ?? '',
      );
    }).toList();
  }

  /// GPS → city + area key for scoped search (Nominatim reverse, unpersisted).
  /// Detail mode resolves street-level names for map-picked pins.
  Future<ScopedArea> reverse(HatodMapPoint point, {bool detail = false}) async {
    final url =
        '/api/places/reverse?lat=${point.lat}&lng=${point.lng}${detail ? '&detail=1' : ''}';
    final body = await api.get(url);
    final m = body as Map<String, dynamic>;
    return ScopedArea(
      city: m['city'] as String? ?? '',
      areaKey: m['areaKey'] as String? ?? '',
      areaLabel: m['areaLabel'] as String? ?? '',
      label: m['label'] as String? ?? '',
      name: m['name'] as String? ?? '',
    );
  }
}
