import '../../../core/network/api_client.dart';
import '../domain/ride.dart';

/// Rider booking against the real API (mobile spec §18, §35 separated fare).
class BookingRepository {
  final ApiClient api;

  BookingRepository({required this.api});

  Future<FareQuote> quote({
    required LatLng origin,
    required LatLng destination,
    required String vehicleType,
  }) async {
    final body = await api.post('/api/rides/quote', {
      'origin': origin.toJson(),
      'destination': destination.toJson(),
      'vehicleType': vehicleType,
    }) as Map<String, dynamic>;
    return FareQuote.fromJson(body);
  }

  Future<Ride> requestRide({
    required String pickupLabel,
    required String pickupBrgyCode,
    LatLng? pickup,
    required String dropoffLabel,
    required String dropoffBrgyCode,
    required double distanceKm,
    required String vehicleType,
  }) async {
    final body = await api.post('/api/rides', {
      'pickupLabel': pickupLabel,
      'pickupBrgyCode': pickupBrgyCode,
      if (pickup != null) 'pickupLat': pickup.lat,
      if (pickup != null) 'pickupLng': pickup.lng,
      'dropoffLabel': dropoffLabel,
      'dropoffBrgyCode': dropoffBrgyCode,
      'distanceKm': distanceKm,
      'vehicleType': vehicleType,
      'paymentMethod': 'CASH',
    }) as Map<String, dynamic>;
    return Ride.fromJson(body);
  }

  Future<List<Ride>> myRides() async {
    final body = await api.get('/api/rides/mine') as Map<String, dynamic>;
    final rides = body['asRider'] as List;
    return rides.map((r) => Ride.fromJson(r as Map<String, dynamic>)).toList();
  }

  Future<Ride> rideDetail(String id) async {
    final body = await api.get('/api/rides/$id') as Map<String, dynamic>;
    return Ride.fromJson(body);
  }
}
