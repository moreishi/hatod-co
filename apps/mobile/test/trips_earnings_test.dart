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
import 'package:hailing_mobile/features/booking/domain/ride.dart';
import 'package:hailing_mobile/features/rider/presentation/trips_screen.dart';

Map<String, dynamic> rideJson(String id, String status) => {
      'id': id,
      'status': status,
      'pickupLabel': 'A',
      'dropoffLabel': 'B',
      'fareCentavos': 10000,
      'requestedAt': '2026-09-30T06:30:00.000Z',
      'completedAt': '2026-09-30T06:52:00.000Z',
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
      // Completed-only: the CANCELLED trip is hidden.
      expect(find.text('A'), findsOneWidget);
      expect(find.text('B'), findsOneWidget);
      expect(find.text('PICKUP'), findsOneWidget);
      expect(find.text('DESTINATION'), findsOneWidget);
      expect(find.byKey(const Key('statusBadge-COMPLETED')), findsOneWidget);
      expect(find.byKey(const Key('statusBadge-CANCELLED')), findsNothing);
    });

    testWidgets('shows date then requested-to-completed time', (tester) async {
      final booking = BookingRepository(
        api: ApiClient(
          baseUrl: 'http://x',
          httpClient: MockClient((req) async {
            if (req.url.path.endsWith('/mine')) {
              return http.Response(
                  jsonEncode({
                    'asRider': [rideJson('r-1', 'COMPLETED')],
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
      expect(find.textContaining('Sep 30, 2026'), findsOneWidget);
      expect(find.textContaining('→'), findsWidgets);
    });

    testWidgets('active trip section opens the live screen', (tester) async {
      final booking = BookingRepository(
        api: ApiClient(
          baseUrl: 'http://x',
          httpClient: MockClient((req) async {
            if (req.url.path.endsWith('/mine')) {
              return http.Response(
                  jsonEncode({
                    'asRider': [
                      {
                        'id': 'r-live',
                        'status': 'IN_PROGRESS',
                        'pickupLabel': 'A',
                        'dropoffLabel': 'B',
                        'fareCentavos': 10000,
                        'requestedAt': '2026-09-30T06:30:00.000Z',
                      },
                      rideJson('r-1', 'COMPLETED'),
                    ],
                    'asDriver': []
                  }),
                  200);
            }
            if (req.url.path.endsWith('/r-live')) {
              return http.Response(
                  jsonEncode({
                    'id': 'r-live',
                    'status': 'IN_PROGRESS',
                    'pickupLabel': 'A',
                    'dropoffLabel': 'B',
                    'fareCentavos': 10000,
                    'requestedAt': '2026-09-30T06:30:00.000Z',
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
      expect(find.text('Active trip'), findsOneWidget);
      expect(find.byKey(const Key('statusBadge-IN_PROGRESS')), findsOneWidget);
      expect(find.byKey(const Key('statusBadge-COMPLETED')), findsOneWidget);
      await tester.tap(find.byKey(const Key('statusBadge-IN_PROGRESS')));
      await tester.pump();
      await tester.pump(const Duration(milliseconds: 400));
      expect(find.text('On trip'), findsOneWidget);
    });

    testWidgets('pull-to-refresh picks up new trips', (tester) async {
      final rides = <Map<String, dynamic>>[];
      final booking = BookingRepository(
        api: ApiClient(
          baseUrl: 'http://x',
          httpClient: MockClient((req) async {
            if (req.url.path.endsWith('/mine')) {
              return http.Response(
                  jsonEncode({'asRider': rides}), 200);
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
      expect(find.text('No completed trips yet.'), findsOneWidget);

      rides.add(rideJson('r-9', 'COMPLETED'));
      await tester.fling(
          find.byType(ListView), const Offset(0, 300), 1000);
      await tester.pumpAndSettle();
      expect(find.text('A'), findsOneWidget);
    });

    test('trip date/time helpers format and dash on missing', () {
      expect(formatTripDate(DateTime(2026, 9, 30, 14, 30)), 'Sep 30, 2026');
      expect(formatTripTime(DateTime(2026, 9, 30, 14, 30)), '2:30 PM');
      expect(formatTripTime(DateTime(2026, 9, 30, 9, 5)), '9:05 AM');
      expect(formatTripDate(null), '—');
      expect(formatTripTime(null), '—');
    });

    testWidgets('order cards show status badge and fare', (tester) async {
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
      expect(find.byKey(const Key('statusBadge-COMPLETED')), findsOneWidget);
      expect(find.byKey(const Key('statusBadge-CANCELLED')), findsNothing);
      expect(find.text('₱100.00'), findsOneWidget);
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
      // Orders-card style, like the rider list.
      expect(find.text('A'), findsOneWidget);
      expect(find.text('B'), findsOneWidget);
      expect(find.text('PICKUP'), findsOneWidget);
      expect(find.text('DESTINATION'), findsOneWidget);
      expect(find.byKey(const Key('statusBadge-IN_PROGRESS')), findsOneWidget);
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
      // Recent entries render as orders-style cards, not bare tiles.
      expect(find.byKey(const Key('earningCard-t-1')), findsOneWidget);
      expect(find.textContaining('RIDE_EARNING'), findsOneWidget);
      expect(find.textContaining('Ride r-1'), findsOneWidget);
    });
  });
}
