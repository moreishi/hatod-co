import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:hailing_mobile/core/network/api_client.dart';
import 'package:hailing_mobile/features/driver/data/driver_repository.dart';
import 'package:hailing_mobile/features/driver/presentation/driver_ride_screen.dart';
import 'package:hailing_mobile/features/maps/presentation/hatod_map.dart';
import 'package:hailing_mobile/features/messaging/data/messaging_repository.dart';

Map<String, dynamic> offeredJson() => {
      'id': 'r-1',
      'status': 'REQUESTED',
      'pickupLabel': 'Hotel',
      'pickupLat': 6.12,
      'pickupLng': 125.18,
      'dropoffLabel': 'Airport',
      'dropoffLat': 6.13,
      'dropoffLng': 125.19,
      'fareCentavos': 10000,
      'requestedAt': '2026-09-30T06:30:00.000Z',
      'completedAt': '2026-09-30T06:52:00.000Z',
    };

Widget screen() {
  final api = ApiClient(
    baseUrl: 'http://x',
    httpClient: MockClient((req) async {
      final path = req.url.path;
      // Offered ride: not assigned yet, so absent from myRides.
      if (path.endsWith('/mine')) {
        return http.Response(
            jsonEncode({'asRider': [], 'asDriver': []}), 200);
      }
      if (path.endsWith('/rides/r-1')) {
        return http.Response(jsonEncode(offeredJson()), 200);
      }
      return http.Response('{}', 404);
    }),
  );
  return MaterialApp(
    home: DriverRideScreen(
      driver: DriverRepository(api: api),
      messaging: MessagingRepository(api: api),
      rideId: 'r-1',
      myId: 'u-1',
    ),
  );
}

void main() {
  group('DriverRideScreen', () {
    testWidgets('offered ride loads by id, not from assigned list',
        (tester) async {
      await tester.pumpWidget(screen());
      await tester.pumpAndSettle();
      expect(find.text('Hotel → Airport'), findsOneWidget);
      expect(find.text('Accept'), findsOneWidget);
      expect(find.text('Decline'), findsOneWidget);
    });

    testWidgets('shows the passenger extras with defaults', (tester) async {
      final extras = offeredJson()
        ..['tipCentavos'] = 2000
        ..['changeFor'] = 100000
        ..['riderNote'] = 'Gate 2, blue house'
        ..['paymentMethod'] = 'CASH';
      final api = ApiClient(
        baseUrl: 'http://x',
        httpClient: MockClient((req) async {
          if (req.url.path.endsWith('/rides/r-1')) {
            return http.Response(jsonEncode(extras), 200);
          }
          return http.Response('{}', 404);
        }),
      );
      await tester.pumpWidget(MaterialApp(
        home: DriverRideScreen(
          driver: DriverRepository(api: api),
          messaging: MessagingRepository(api: api),
          rideId: 'r-1',
          myId: 'u-1',
        ),
      ));
      await tester.pumpAndSettle();
      expect(find.textContaining('₱20 tip'), findsOneWidget);
      expect(find.textContaining('Change for ₱1000'), findsOneWidget);
      expect(find.textContaining('Gate 2, blue house'), findsOneWidget);
      expect(find.textContaining('Cash'), findsOneWidget);
    });

    testWidgets('extras fall back to defaults when empty', (tester) async {
      await tester.pumpWidget(screen());
      await tester.pumpAndSettle();
      expect(find.textContaining('No tip'), findsOneWidget);
      expect(find.textContaining('Exact fare'), findsOneWidget);
    });

    testWidgets('shows pickup, dropoff, and route on a map',
        (tester) async {
      await tester.pumpWidget(screen());
      await tester.pumpAndSettle();
      final map = tester.widget<HatodMap>(find.byKey(const Key('map')));
      expect(map.pickup?.lat, 6.12);
      expect(map.dropoff?.lat, 6.13);
      expect(map.route, isNotEmpty);
    });

    testWidgets('shows an error when the ride will not load',
        (tester) async {
      final api = ApiClient(
        baseUrl: 'http://x',
        httpClient: MockClient((_) async => http.Response('{}', 404)),
      );
      await tester.pumpWidget(MaterialApp(
        home: DriverRideScreen(
          driver: DriverRepository(api: api),
          messaging: MessagingRepository(api: api),
          rideId: 'missing',
          myId: 'u-1',
        ),
      ));
      await tester.pumpAndSettle();
      expect(find.text('Could not load this ride.'), findsOneWidget);
    });
  });
}
