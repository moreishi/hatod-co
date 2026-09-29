import 'dart:convert';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:hailing_mobile/core/network/api_client.dart';
import 'package:hailing_mobile/features/booking/data/booking_repository.dart';
import 'package:hailing_mobile/features/booking/domain/ride.dart';

BookingRepository repo(MockClient handler) => BookingRepository(
      api: ApiClient(baseUrl: 'http://x', httpClient: handler),
    );

void main() {
  group('Ride model', () {
    test('parses driver name and detects active rides', () {
      final ride = Ride.fromJson({
        'id': 'r-1',
        'status': 'ASSIGNED',
        'pickupLabel': 'A',
        'dropoffLabel': 'B',
        'fareCentavos': 10000,
        'driver': {
          'user': {'displayName': 'D'}
        },
      });
      expect(ride.driverName, 'D');
      expect(ride.isActive, isTrue);
      expect(ride.isTerminal, isFalse);
    });

    test('formats centavos fares', () {
      expect(
        const FareQuote(
                fareCentavos: 6445, distanceKm: 1.6, durationSec: 300, provider: 'haversine')
            .farePhp,
        '₱64.45',
      );
    });
  });

  group('BookingRepository', () {
    test('quote, request, and history', () async {
      final api = repo(MockClient((req) async {
        final path = req.url.path;
        if (path.endsWith('/quote')) {
          return http.Response(
              jsonEncode({
                'fareCentavos': 8000,
                'distanceKm': 4.0,
                'durationSec': 600,
                'provider': 'haversine'
              }),
              200);
        }
        if (path.endsWith('/rides') && req.method == 'POST') {
          return http.Response(
              jsonEncode({
                'id': 'ride-1',
                'status': 'REQUESTED',
                'pickupLabel': 'A',
                'dropoffLabel': 'B',
                'fareCentavos': 8000
              }),
              200);
        }
        return http.Response(
            jsonEncode({
              'asRider': [
                {
                  'id': 'ride-1',
                  'status': 'COMPLETED',
                  'pickupLabel': 'A',
                  'dropoffLabel': 'B',
                  'fareCentavos': 8000
                }
              ],
              'asDriver': []
            }),
            200);
      }));

      final quote = await api.quote(
        origin: const LatLng(10.3, 123.9),
        destination: const LatLng(10.31, 123.91),
        vehicleType: 'SEDAN',
      );
      expect(quote.fareCentavos, 8000);

      final ride = await api.requestRide(
        pickupLabel: 'A',
        pickupBrgyCode: '072217001',
        dropoffLabel: 'B',
        dropoffBrgyCode: '072217002',
        distanceKm: 4.0,
        vehicleType: 'SEDAN',
      );
      expect(ride.id, 'ride-1');

      final history = await api.myRides();
      expect(history.map((r) => r.id), ['ride-1']);
    });
  });
}
