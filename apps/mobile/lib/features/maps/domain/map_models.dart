import 'dart:math' as math;

/// Map presentation models (routing spec §53-54).
/// Flutter receives DriverMarker / PickupMarker / DestinationMarker /
/// RoutePolyline / MapCamera — never raw provider objects. No API keys here.
class HatodMapPoint {
  final double lat;
  final double lng;
  const HatodMapPoint(this.lat, this.lng);
}

class HatodMapCamera {
  final HatodMapPoint center;
  final double zoom;
  const HatodMapCamera({required this.center, required this.zoom});
}

class HatodMarker {
  final String id;
  final HatodMapPoint point;
  final String kind; // pickup | dropoff | driver | current
  const HatodMarker({required this.id, required this.point, required this.kind});
}

class HatodRoute {
  final List<HatodMapPoint> points;
  const HatodRoute(this.points);
}

class MapMath {
  /// Midpoint for camera centering between pickup and destination.
  static HatodMapPoint centerBetween(HatodMapPoint a, HatodMapPoint b) =>
      HatodMapPoint((a.lat + b.lat) / 2, (a.lng + b.lng) / 2);

  /// Simple zoom ladder so short trips stay close. Calibrated for Gensan.
  static double zoomForDistanceKm(double km) {
    if (km <= 1) return 15.0;
    if (km <= 3) return 14.0;
    if (km <= 7) return 13.0;
    if (km <= 15) return 12.0;
    return 11.0;
  }

  /// Straight-line km between two points (display-only: search distances,
  /// never fare — fare comes from the backend quote).
  static double distanceKm(HatodMapPoint a, HatodMapPoint b) {
    const r = 6371.0;
    const toRad = math.pi / 180;
    final dLat = (b.lat - a.lat) * toRad;
    final dLng = (b.lng - a.lng) * toRad;
    final double h = math.pow(math.sin(dLat / 2), 2).toDouble() +
        math.cos(a.lat * toRad) *
            math.cos(b.lat * toRad) *
            math.pow(math.sin(dLng / 2), 2).toDouble();
    final double clamped = math.min(1.0, math.max(0.0, h));
    return 2 * r * math.asin(math.sqrt(clamped));
  }

  /// Straight-line placeholder until backend route geometry lands
  /// (RoutingService.calculateRoute → geometry). Never used for fare.
  static List<HatodMapPoint> straightLine(HatodMapPoint o, HatodMapPoint d, {int steps = 16}) {
    final n = steps < 2 ? 2 : steps;
    return List.generate(n, (i) {
      final t = i / (n - 1);
      return HatodMapPoint(o.lat + (d.lat - o.lat) * t, o.lng + (d.lng - o.lng) * t);
    });
  }

  static HatodMapCamera cameraFor(HatodMapPoint o, HatodMapPoint? d, {double? distanceKm}) {
    final center = d == null ? o : centerBetween(o, d);
    return HatodMapCamera(center: center, zoom: zoomForDistanceKm(distanceKm ?? 2));
  }

  /// Decodes OSRM/Google encoded polylines (precision 5) into map points.
  static List<HatodMapPoint> decodePolyline(String encoded) {
    final points = <HatodMapPoint>[];
    var index = 0;
    var lat = 0;
    var lng = 0;
    while (index < encoded.length) {
      var shift = 0;
      var result = 0;
      int b;
      do {
        b = encoded.codeUnitAt(index++) - 63;
        result |= (b & 0x1f) << shift;
        shift += 5;
      } while (b >= 0x20);
      lat += (result & 1) != 0 ? ~(result >> 1) : (result >> 1);
      shift = 0;
      result = 0;
      do {
        b = encoded.codeUnitAt(index++) - 63;
        result |= (b & 0x1f) << shift;
        shift += 5;
      } while (b >= 0x20);
      lng += (result & 1) != 0 ? ~(result >> 1) : (result >> 1);
      points.add(HatodMapPoint(lat / 1e5, lng / 1e5));
    }
    return points;
  }
}
