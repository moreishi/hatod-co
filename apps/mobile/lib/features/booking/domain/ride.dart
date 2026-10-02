/// Booking domain models (mobile spec §16, §71 adapted to backend states).
class LatLng {
  final double lat;
  final double lng;

  const LatLng(this.lat, this.lng);

  Map<String, double> toJson() => {'lat': lat, 'lng': lng};
}

const _months = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec'
];

/// Whole-peso formatting for chips and totals: 2000 → ₱20, 6450 → ₱64.50.
String formatPesos(int centavos) {
  if (centavos % 100 == 0) return '₱${centavos ~/ 100}';
  return '₱${(centavos / 100).toStringAsFixed(2)}';
}

/// "Sep 30, 2026" in device-local time; '—' when unknown.
String formatTripDate(DateTime? dt) {
  if (dt == null) return '—';
  final l = dt.toLocal();
  return '${_months[l.month - 1]} ${l.day}, ${l.year}';
}

/// "2:30 PM" in device-local time; '—' when unknown.
String formatTripTime(DateTime? dt) {
  if (dt == null) return '—';
  final l = dt.toLocal();
  final hour12 = l.hour % 12 == 0 ? 12 : l.hour % 12;
  final mm = l.minute.toString().padLeft(2, '0');
  return '$hour12:$mm ${l.hour < 12 ? 'AM' : 'PM'}';
}

/// Latest driver GPS for a trip (rider-visible, polled during the trip).
class DriverPing {
  final double lat;
  final double lng;
  final int ageSec;

  const DriverPing({required this.lat, required this.lng, required this.ageSec});

  factory DriverPing.fromJson(Map<String, dynamic> json) => DriverPing(
        lat: (json['lat'] as num).toDouble(),
        lng: (json['lng'] as num).toDouble(),
        ageSec: json['ageSec'] as int? ?? 0,
      );
}

class FareQuote {
  final int fareCentavos;
  final double distanceKm;
  final int durationSec;
  final String provider;

  /// Encoded fastest-route geometry (polyline precision 5); "" when none.
  final String geometry;

  /// Every fleet fare off the same route, keyed by vehicle type; {} when
  /// the backend predates per-type fares.
  final Map<String, int> fares;

  const FareQuote({
    required this.fareCentavos,
    required this.distanceKm,
    required this.durationSec,
    required this.provider,
    this.geometry = '',
    this.fares = const {},
  });

  String get farePhp => '₱${(fareCentavos / 100).toStringAsFixed(2)}';

  String get etaMin => '${(durationSec / 60).round()} min';

  factory FareQuote.fromJson(Map<String, dynamic> json) => FareQuote(
        fareCentavos: json['fareCentavos'] as int,
        distanceKm: (json['distanceKm'] as num).toDouble(),
        durationSec: json['durationSec'] as int? ?? 0,
        provider: json['provider'] as String? ?? 'unknown',
        geometry: json['geometry'] as String? ?? '',
        fares: (json['fares'] as Map?)?.map(
              (k, v) => MapEntry(k as String, (v as num).toInt()),
            ) ??
            const {},
      );
}

class Ride {
  final String id;
  final String status;
  final String pickupLabel;
  final String dropoffLabel;
  final int fareCentavos;
  final String? driverName;
  final DateTime? requestedAt;
  final DateTime? completedAt;
  final double? pickupLat;
  final double? pickupLng;
  final double? dropoffLat;
  final double? dropoffLng;
  final String? vehicleType;
  final String? driverPlate;
  final double? driverRating;
  final double? distanceKm;
  final int tipCentavos;
  final String paymentMethod;
  final int? changeFor;
  final String riderNote;

  const Ride({
    required this.id,
    required this.status,
    required this.pickupLabel,
    required this.dropoffLabel,
    required this.fareCentavos,
    this.driverName,
    this.requestedAt,
    this.completedAt,
    this.pickupLat,
    this.pickupLng,
    this.dropoffLat,
    this.dropoffLng,
    this.vehicleType,
    this.driverPlate,
    this.driverRating,
    this.distanceKm,
    this.tipCentavos = 0,
    this.paymentMethod = 'CASH',
    this.changeFor,
    this.riderNote = '',
  });

  bool get isActive => const {
        'REQUESTED',
        'ASSIGNED',
        'DRIVER_EN_ROUTE',
        'DRIVER_ARRIVED',
        'IN_PROGRESS',
      }.contains(status);

  bool get isTerminal => const {'COMPLETED', 'CANCELLED', 'NO_DRIVERS'}.contains(status);

  factory Ride.fromJson(Map<String, dynamic> json) {
    final driver = json['driver'] as Map<String, dynamic>?;
    final user = driver?['user'] as Map<String, dynamic>?;
    final assignments = driver?['assignments'] as List?;
    final vehicle = (assignments != null && assignments.isNotEmpty
        ? assignments.first as Map<String, dynamic>?
        : null)?['vehicle'] as Map<String, dynamic>?;
    DateTime? parse(String key) {
      final raw = json[key] as String?;
      if (raw == null || raw.isEmpty) return null;
      try {
        return DateTime.parse(raw);
      } catch (_) {
        return null;
      }
    }

    double? numOrNull(String key) {
      final v = json[key];
      if (v is num) return v.toDouble();
      return null;
    }

    double? ratingOf(Map<String, dynamic>? m) {
      final v = m?['rating'];
      return v is num ? v.toDouble() : null;
    }

    return Ride(
      id: json['id'] as String,
      status: json['status'] as String,
      pickupLabel: json['pickupLabel'] as String? ?? '',
      dropoffLabel: json['dropoffLabel'] as String? ?? '',
      fareCentavos: json['fareCentavos'] as int? ?? 0,
      driverName: user?['displayName'] as String?,
      requestedAt: parse('requestedAt'),
      completedAt: parse('completedAt'),
      pickupLat: numOrNull('pickupLat'),
      pickupLng: numOrNull('pickupLng'),
      dropoffLat: numOrNull('dropoffLat'),
      dropoffLng: numOrNull('dropoffLng'),
      vehicleType:
          (json['vehicleType'] as String?) ?? (vehicle?['type'] as String?),
      driverPlate: vehicle?['plateNo'] as String?,
      driverRating: ratingOf(vehicle) ?? ratingOf(driver),
      distanceKm: numOrNull('distanceKm'),
      tipCentavos: json['tipCentavos'] as int? ?? 0,
      paymentMethod: json['paymentMethod'] as String? ?? 'CASH',
      changeFor: json['changeFor'] as int?,
      riderNote: json['riderNote'] as String? ?? '',
    );
  }
}
