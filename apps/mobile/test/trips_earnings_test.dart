import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:hailing_mobile/core/network/api_client.dart';
import 'package:hailing_mobile/features/booking/data/booking_repository.dart';
import 'package:hailing_mobile/features/driver/data/driver_repository.dart';
import 'package:hailing_mobile/features/driver/presentation/earnings_screen.dart';
import 'package:hailing_mobile/features/driver/presentation/trips_screen.dart';
import 'package:hailing_mobile/features/messaging/data/messaging_repository.dart';
import 'package:hailing_mobile/features/rider/presentation/trips_screen.dart';

Map<String, dynamic> rideJson(String id, String status) => {
      'id': id,
      'status': status,
      'pickupLabel': 'A',
      'dropoffLabel': 'B',
      'fareCentavos': 10000,
    };

void main() {
  group('RiderTripsScreen', () {
    testWidgets('lists trips from the repository', (tester) async {
      final booking = BookingRepository(
        api: ApiClient(
          baseUrl: 'http://x',
          httpClient: MockClient((req) async {
            if (req.url.path.endsWith('/mine')) {
              return http.Response(
                  jsonEncode({
                    'asRider': [rideJson('r-1', 'COMPLETED'), rideJson('r-2', 'CANCELLED')],
                    'asDriver': []
                  }),
                  200);
            }
            return http.Response('{}', 404);
          }),
        ),
      );
      final messaging = MessagingRepository(
        api: ApiClient(
          baseUrl: 'http://x',
          httpClient: MockClient((_) async => http.Response('{}', 404)),
        ),
      );
      await tester.pumpWidget(MaterialApp(
        home: RiderTripsScreen(myId: 'u-1', booking: booking, messaging: messaging),
      ));
      await tester.pumpAndSettle();
      expect(find.text('A → B'), findsNWidgets(2));
      expect(find.textContaining('COMPLETED'), findsOneWidget);
    });
  });

  group('DriverTripsScreen', () {
    testWidgets('lists driver trips', (tester) async {
      final repo = DriverRepository(
        api: ApiClient(
          baseUrl: 'http://x',
          httpClient: MockClient((req) async {
            if (req.url.path.endsWith('/mine')) {
              return http.Response(
                  jsonEncode({
                    'asRider': [],
                    'asDriver': [rideJson('r-9', 'IN_PROGRESS')]
                  }),
                  200);
            }
            return http.Response('{}', 404);
          }),
        ),
      );
      final messaging = MessagingRepository(
        api: ApiClient(
          baseUrl: 'http://x',
          httpClient: MockClient((_) async => http.Response('{}', 404)),
        ),
      );
      await tester.pumpWidget(MaterialApp(
        home: DriverTripsScreen(myId: 'u-1', repository: repo, messaging: messaging),
      ));
      await tester.pumpAndSettle();
      expect(find.text('A → B'), findsOneWidget);
    });
  });

  group('EarningsScreen', () {
    testWidgets('shows balance, totals, and recent entries', (tester) async {
      final repo = DriverRepository(
        api: ApiClient(
          baseUrl: 'http://x',
          httpClient: MockClient((req) async {
            if (req.url.path.endsWith('/earnings')) {
              return http.Response(
                  jsonEncode({
                    'balanceCentavos': 12500,
                    'totalCentavos': 12500,
                    'tripCount': 2,
                    'recent': [
                      {'id': 't-1', 'type': 'RIDE_EARNING', 'amountCentavos': 8000, 'rideId': 'r-1'},
                    ]
                  }),
                  200);
            }
            return http.Response('{}', 404);
          }),
        ),
      );
      await tester.pumpWidget(MaterialApp(home: EarningsScreen(repository: repo)));
      await tester.pumpAndSettle();
      expect(find.byKey(const Key('balance')), findsOneWidget);
      expect(find.textContaining('2 trips'), findsOneWidget);
      expect(find.textContaining('RIDE_EARNING'), findsOneWidget);
    });
  });
}
