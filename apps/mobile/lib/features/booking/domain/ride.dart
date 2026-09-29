/// Booking domain models (mobile spec §16, §71 adapted to backend states).
class LatLng {
  final double lat;
  final double lng;

  const LatLng(this.lat, this.lng);

  Map<String, double> toJson() => {'lat': lat, 'lng': lng};
}

class FareQuote {
  final int fareCentavos;
  final double distanceKm;
  final int durationSec;
  final String provider;

  const FareQuote({
    required this.fareCentavos,
    required this.distanceKm,
    required this.durationSec,
    required this.provider,
  });

  String get farePhp => '₱${(fareCentavos / 100).toStringAsFixed(2)}';

  factory FareQuote.fromJson(Map<String, dynamic> json) => FareQuote(
        fareCentavos: json['fareCentavos'] as int,
        distanceKm: (json['distanceKm'] as num).toDouble(),
        durationSec: json['durationSec'] as int? ?? 0,
        provider: json['provider'] as String? ?? 'unknown',
      );
}

class Ride {
  final String id;
  final String status;
  final String pickupLabel;
  final String dropoffLabel;
  final int fareCentavos;
  final String? driverName;

  const Ride({
    required this.id,
    required this.status,
    required this.pickupLabel,
    required this.dropoffLabel,
    required this.fareCentavos,
    this.driverName,
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
    return Ride(
      id: json['id'] as String,
      status: json['status'] as String,
      pickupLabel: json['pickupLabel'] as String? ?? '',
      dropoffLabel: json['dropoffLabel'] as String? ?? '',
      fareCentavos: json['fareCentavos'] as int? ?? 0,
      driverName: user?['displayName'] as String?,
    );
  }
}
