import '../../../core/network/api_client.dart';
import '../../booking/domain/earning.dart';
import '../../booking/domain/ride.dart';

/// One pending dispatch offer: the ride plus its expiry (epoch millis).
class DriverOffer {
  final String rideId;
  final int expiresAt;

  const DriverOffer({required this.rideId, required this.expiresAt});

  factory DriverOffer.fromJson(Map<String, dynamic> json) => DriverOffer(
        rideId: json['rideId'] as String,
        expiresAt: (json['expiresAt'] as num).toInt(),
      );

  /// Whole seconds left, floored at zero once lapsed.
  int secondsLeft({DateTime? now}) {
    final ms = expiresAt -
        (now ?? DateTime.now()).millisecondsSinceEpoch;
    return ms <= 0 ? 0 : ms ~/ 1000;
  }
}

/// Driver operations against the real API (mobile spec §39–44).
class DriverRepository {
  final ApiClient api;

  DriverRepository({required this.api});

  Future<bool> setOnline(bool online) async {
    final body = await api.post('/api/drivers/me/online', {'online': online})
        as Map<String, dynamic>;
    return body['isOnline'] as bool? ?? online;
  }

  Future<void> ping(double lat, double lng) async {
    await api.post('/api/drivers/me/location', {'lat': lat, 'lng': lng});
  }

  Future<List<Ride>> myRides() async {
    final body = await api.get('/api/rides/mine') as Map<String, dynamic>;
    final rides = body['asDriver'] as List;
    return rides.map((r) => Ride.fromJson(r as Map<String, dynamic>)).toList();
  }

  /// Pending dispatch offers awaiting this driver (30s TTL each).
  Future<List<DriverOffer>> offers() async {
    final body = await api.get('/api/drivers/me/offers') as List;
    return body
        .map((o) => DriverOffer.fromJson(o as Map<String, dynamic>))
        .toList();
  }

  /// Full ride for an offered ride id (enriches the inbox cards).
  Future<Ride> rideDetail(String rideId) async {
    final body = await api.get('/api/rides/$rideId') as Map<String, dynamic>;
    return Ride.fromJson(body);
  }

  Future<Ride> acceptOffer(String rideId) async {
    final body = await api.post('/api/drivers/me/offers/$rideId/accept', {})
        as Map<String, dynamic>;
    return Ride.fromJson(body);
  }

  Future<void> declineOffer(String rideId) async {
    await api.post('/api/drivers/me/offers/$rideId/decline', {});
  }

  Future<Ride> acceptAssigned(String rideId) async {
    final body = await api.post('/api/rides/$rideId/accept', {})
        as Map<String, dynamic>;
    return Ride.fromJson(body);
  }

  /// Accept whichever path holds: pending offer first, assigned fallback.
  Future<Ride> acceptRide(String rideId) async {
    try {
      return await acceptOffer(rideId);
    } catch (_) {
      return acceptAssigned(rideId);
    }
  }

  Future<Ride> transition(String rideId, String to) async {
    final body = await api.post('/api/rides/$rideId/transition', {'to': to})
        as Map<String, dynamic>;
    return Ride.fromJson(body);
  }

  Future<EarningSummary> earnings() async {
    final body = await api.get('/api/drivers/me/earnings') as Map<String, dynamic>;
    return EarningSummary.fromJson(body);
  }
}
