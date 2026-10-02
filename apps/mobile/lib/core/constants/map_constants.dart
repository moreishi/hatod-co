import '../../features/maps/domain/map_models.dart';

/// Map presentation constants (routing spec §56). No provider secrets here —
/// tiles are free OSM, routing/fare stay backend-side (Valhalla → FareService).
class MapConstants {
  static const tileUrl = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
  // CyclOSM: detailed street map, no API key, OSM-based.
  static const streetTileUrl =
      'https://a.tile-cyclosm.openstreetmap.fr/cyclosm/{z}/{x}/{y}.png';
  static const tileAttribution = '© OpenStreetMap contributors, CyclOSM';
  static const defaultZoom = 15.0;

  /// Rider home opens zoomed in close on the GPS dot.
  static const homeZoom = 17.0;
  static const gensan = HatodMapPoint(6.1169, 125.1716);
  static const maxZoom = 18.0;
  static const minZoom = 5.0;
}
