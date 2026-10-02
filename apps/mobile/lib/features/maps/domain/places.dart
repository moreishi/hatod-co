import 'map_models.dart';

/// Bundled Gensan point-of-interest dataset for offline place search.
/// Coordinates are approximate (city-level); the backend remains authoritative
/// for service-area validation and the fare uses the selected coordinates.
class HatodPlace {
  final String name;
  final String address;
  final HatodMapPoint point;

  /// Nominatim ISO area key, lowercased (ph-12 Gensan/Soccsksargen, ph-07
  /// Cebu/Central Visayas). Drives same-area-first ordering in search.
  final String areaKey;
  const HatodPlace({
    required this.name,
    required this.address,
    required this.point,
    this.areaKey = '',
  });
}

/// GPS scope: reverse-geocoded city + area key for prioritized search.
/// Detail mode also carries the road-level name for map-picked pins.
class ScopedArea {
  final String city;
  final String areaKey;
  final String areaLabel;
  final String label;
  final String name;
  const ScopedArea({
    required this.city,
    required this.areaKey,
    required this.areaLabel,
    required this.label,
    this.name = '',
  });
}

/// Same-area rows first; outside-area rows follow (prioritize, never hide).
List<HatodPlace> orderByArea(List<HatodPlace> places, String areaKey) {
  if (areaKey.isEmpty) return places;
  final key = areaKey.toLowerCase();
  return [...places]..sort((a, b) {
      final ai = a.areaKey.toLowerCase() == key ? 0 : 1;
      final bi = b.areaKey.toLowerCase() == key ? 0 : 1;
      return ai - bi;
    });
}

const gensanPlaces = [
  HatodPlace(
      name: 'KCC Mall of Gensan',
      address: 'Osmeña St, Dadiangas',
      point: HatodMapPoint(6.1117, 125.1749),
      areaKey: 'ph-12'),
  HatodPlace(
      name: 'SM City General Santos',
      address: 'Santiago Blvd, Dadiangas',
      point: HatodMapPoint(6.1103, 125.1710),
      areaKey: 'ph-12'),
  HatodPlace(
      name: 'Robinsons Place Gensan',
      address: 'J. Catolico Sr Ave, Lagao',
      point: HatodMapPoint(6.1075, 125.1750),
      areaKey: 'ph-12'),
  HatodPlace(
      name: 'Gaisano Mall of Gensan',
      address: 'J. Catolico Sr Ave, Dadiangas',
      point: HatodMapPoint(6.1128, 125.1735),
      areaKey: 'ph-12'),
  HatodPlace(
      name: 'Veranza Mall',
      address: 'Tejeros St, Dadiangas East',
      point: HatodMapPoint(6.1219, 125.1756),
      areaKey: 'ph-12'),
  HatodPlace(
      name: 'Bulaong Public Terminal',
      address: 'Bulaong Ave, Dadiangas North',
      point: HatodMapPoint(6.1175, 125.1800),
      areaKey: 'ph-12'),
  HatodPlace(
      name: 'General Santos Public Market',
      address: 'Osmeña St, Dadiangas',
      point: HatodMapPoint(6.1150, 125.1720),
      areaKey: 'ph-12'),
  HatodPlace(
      name: 'Lagao Public Market',
      address: 'Block 8, Lagao',
      point: HatodMapPoint(6.1030, 125.1650),
      areaKey: 'ph-12'),
  HatodPlace(
      name: 'Plaza Heneral Santos',
      address: 'Pioneer Ave, Dadiangas',
      point: HatodMapPoint(6.1160, 125.1718),
      areaKey: 'ph-12'),
  HatodPlace(
      name: 'Notre Dame of Dadiangas University',
      address: 'Marist Ave, Dadiangas',
      point: HatodMapPoint(6.1133, 125.1700),
      areaKey: 'ph-12'),
  HatodPlace(
      name: 'General Santos International Airport',
      address: 'Brgy. Fatima',
      point: HatodMapPoint(6.1064, 125.2350),
      areaKey: 'ph-12'),
  HatodPlace(
      name: 'General Santos Fish Port',
      address: 'Tambler',
      point: HatodMapPoint(6.1000, 125.1500),
      areaKey: 'ph-12'),
];

/// Cebu dataset (launch-expansion coverage; same approximate-coordinate caveat).
const cebuPlaces = [
  HatodPlace(
      name: 'Ayala Center Cebu',
      address: 'Archbishop Reyes Ave, Cebu City',
      point: HatodMapPoint(10.3181, 123.9054),
      areaKey: 'ph-07'),
  HatodPlace(
      name: 'SM City Cebu',
      address: 'Juan Luna Ave, Mabolo, Cebu City',
      point: HatodMapPoint(10.3111, 123.9185),
      areaKey: 'ph-07'),
  HatodPlace(
      name: 'SM Seaside City Cebu',
      address: 'South Road Properties, Cebu City',
      point: HatodMapPoint(10.2830, 123.8810),
      areaKey: 'ph-07'),
  HatodPlace(
      name: 'Cebu IT Park',
      address: 'Apas, Cebu City',
      point: HatodMapPoint(10.3297, 123.9058),
      areaKey: 'ph-07'),
  HatodPlace(
      name: 'Robinsons Galleria Cebu',
      address: 'Gen. Maxilom Ave, Cebu City',
      point: HatodMapPoint(10.3145, 123.9120),
      areaKey: 'ph-07'),
  HatodPlace(
      name: 'Mactan-Cebu International Airport',
      address: 'Lapu-Lapu City',
      point: HatodMapPoint(10.3075, 123.9795),
      areaKey: 'ph-07'),
  HatodPlace(
      name: 'Magellan\'s Cross',
      address: 'Magallanes St, Downtown Cebu City',
      point: HatodMapPoint(10.2930, 123.9019),
      areaKey: 'ph-07'),
  HatodPlace(
      name: 'Fuente Osmeña Circle',
      address: 'Fuente Osmeña, Cebu City',
      point: HatodMapPoint(10.3098, 123.8915),
      areaKey: 'ph-07'),
  HatodPlace(
      name: 'Carbon Public Market',
      address: 'M.C. Briones St, Cebu City',
      point: HatodMapPoint(10.2945, 123.8990),
      areaKey: 'ph-07'),
  HatodPlace(
      name: 'Cebu South Bus Terminal',
      address: 'N. Bacalso Ave, Cebu City',
      point: HatodMapPoint(10.3010, 123.8865),
      areaKey: 'ph-07'),
  HatodPlace(
      name: 'Cebu North Bus Terminal',
      address: 'SM City Cebu vicinity, Mabolo',
      point: HatodMapPoint(10.3130, 123.9200),
      areaKey: 'ph-07'),
  HatodPlace(
      name: 'Mactan Newtown',
      address: 'Lapu-Lapu City, Mactan',
      point: HatodMapPoint(10.3260, 123.9600),
      areaKey: 'ph-07'),
];

/// Everything searchable: Gensan first (launch area), then Cebu.
const allPlaces = [...gensanPlaces, ...cebuPlaces];

/// Case-insensitive substring match on name + address.
/// Empty query returns everything (popular-first order kept as listed).
List<HatodPlace> searchPlaces(String query) {
  final q = query.trim().toLowerCase();
  if (q.isEmpty) return List.of(allPlaces);
  return allPlaces
      .where((p) =>
          p.name.toLowerCase().contains(q) ||
          p.address.toLowerCase().contains(q))
      .toList();
}
