import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:hailing_mobile/core/network/api_client.dart';
import 'package:hailing_mobile/features/booking/data/booking_repository.dart';
import 'package:hailing_mobile/features/booking/domain/ride.dart';
import 'package:hailing_mobile/features/messaging/data/messaging_repository.dart';
import 'package:hailing_mobile/features/rider/presentation/active_trip_screen.dart';

Map<String, dynamic> rideJson(String status) => {
      'id': 'ride-1',
      'status': status,
      'pickupLabel': 'KCC Mall of Gensan',
      'pickupLat': 10.3181,
      'pickupLng': 123.9054,
      'dropoffLabel': 'SM City General Santos',
      'dropoffLat': 10.3111,
      'dropoffLng': 123.9185,
      'fareCentavos': 6000,
      'vehicleType': 'MOTORCYCLE',
      'requestedAt': '2026-09-30T06:30:00.000Z',
      'completedAt': '2026-09-30T06:52:00.000Z',
      'driver': {
        'user': {'displayName': 'Carlos Reyes'},
        'assignments': [
          {
            'vehicle': {'plateNo': 'GAK 1234', 'type': 'MOTORCYCLE'}
          }
        ],
      },
    };

class Harness {
  final List<String> script;
  int calls = 0;
  final List<Map<String, dynamic>> postedTransitions = [];
  late final BookingRepository booking;
  late final MessagingRepository messaging;
  void Function(LatLng origin, LatLng dest)? quoteHook;

  Harness(this.script) {
    booking = BookingRepository(
      api: ApiClient(
        baseUrl: 'http://x',
        httpClient: MockClient((req) async {
          final path = req.url.path;
          if (path.endsWith('/transition')) {
            postedTransitions.add(
                jsonDecode(req.body) as Map<String, dynamic>);
            return http.Response('{}', 200);
          }
          if (path.endsWith('/quote')) {
            final body = jsonDecode(req.body) as Map<String, dynamic>;
            final o = body['origin'] as Map<String, dynamic>;
            final d = body['destination'] as Map<String, dynamic>;
            quoteHook?.call(
              LatLng((o['lat'] as num).toDouble(),
                  (o['lng'] as num).toDouble()),
              LatLng((d['lat'] as num).toDouble(),
                  (d['lng'] as num).toDouble()),
            );
            return http.Response(
                jsonEncode({
                  'fareCentavos': 6000,
                  'distanceKm': 1.2,
                  'durationSec': 180,
                  'provider': 'osrm',
                  'geometry': '_p~iF~ps|U_ulLnnqC_mqNvxq`@'
                }),
                200);
          }
          if (path.endsWith('/ride-1')) {
            final status =
                script[calls.clamp(0, script.length - 1)];
            calls++;
            return http.Response(jsonEncode(rideJson(status)), 200);
          }
          if (path.endsWith('/driver-location')) {
            return http.Response(
                jsonEncode({
                  'lat': 10.32,
                  'lng': 123.91,
                  'recordedAt': '2026-09-30T06:30:00.000Z',
                  'ageSec': 3
                }),
                200);
          }
          return http.Response('{}', 404);
        }),
      ),
    );
    messaging = MessagingRepository(
      api: ApiClient(
        baseUrl: 'http://x',
        httpClient: MockClient((_) async => http.Response('{}', 404)),
      ),
    );
  }

  ActiveTripScreen bareScreen({Duration poll = const Duration(seconds: 1)}) {
    return ActiveTripScreen(
      ride: Ride.fromJson(rideJson(script.first)),
      booking: booking,
      messaging: messaging,
      myId: 'u-1',
      pollInterval: poll,
    );
  }

  Widget screen({Duration poll = const Duration(seconds: 1)}) {
    return MaterialApp(
      home: bareScreen(poll: poll),
    );
  }
}

void main() {
  group('ActiveTripScreen', () {
    testWidgets('en route shows arriving with cancel', (tester) async {
      final h = Harness(const ['DRIVER_EN_ROUTE']);
      await tester.pumpWidget(h.screen());
      await tester.pump(const Duration(seconds: 1));
      expect(find.byKey(const Key('map')), findsOneWidget);
      expect(find.text('Driver arriving'), findsOneWidget);
      expect(find.text('Carlos Reyes'), findsOneWidget);
      expect(find.byKey(const Key('tripCancel')), findsOneWidget);
    });

    testWidgets('on trip shows distance to destination', (tester) async {
      final h = Harness(const ['IN_PROGRESS']);
      await tester.pumpWidget(h.screen());
      await tester.pump(const Duration(seconds: 1));
      expect(find.text('On trip'), findsOneWidget);
      expect(find.textContaining('to go'), findsOneWidget);
    });

    testWidgets('message button revives when the conversation appears',
        (tester) async {
      var convoReady = false;
      final messaging = MessagingRepository(
        api: ApiClient(
          baseUrl: 'http://x',
          httpClient: MockClient((req) async {
            if (req.url.path.contains('/by-ride/')) {
              if (!convoReady) return http.Response('{}', 404);
              return http.Response(
                  jsonEncode({'id': 'c-9', 'status': 'ACTIVE'}), 200);
            }
            return http.Response('{}', 404);
          }),
        ),
      );
      final h = Harness(const ['IN_PROGRESS']);
      await tester.pumpWidget(MaterialApp(
        home: ActiveTripScreen(
          ride: Ride.fromJson(rideJson('IN_PROGRESS')),
          booking: h.booking,
          messaging: messaging,
          myId: 'u-1',
          pollInterval: const Duration(seconds: 1),
        ),
      ));
      await tester.pump(const Duration(seconds: 1));
      var btn = tester.widget<OutlinedButton>(
          find.byKey(const Key('tripMessage')));
      expect(btn.onPressed, isNull);
      convoReady = true;
      await tester.pump(const Duration(seconds: 2));
      await tester.pumpAndSettle();
      btn = tester.widget<OutlinedButton>(
          find.byKey(const Key('tripMessage')));
      expect(btn.onPressed, isNotNull);
    });

    testWidgets('driver marker moves with live ETA', (tester) async {
      final h = Harness(const ['DRIVER_EN_ROUTE']);
      await tester.pumpWidget(h.screen());
      await tester.pump(const Duration(seconds: 1));
      expect(find.byKey(const Key('driverMarker')), findsOneWidget);
      expect(find.textContaining('km away'), findsOneWidget);
    });

    testWidgets('draws the quoted road route, not a straight line', (tester) async {
      var quoted = false;
      final h = Harness(const ['DRIVER_EN_ROUTE']);
      h.quoteHook = (origin, dest) {
        quoted = true;
        expect(origin.lat, closeTo(10.3181, 0.001));
        expect(dest.lat, closeTo(10.3111, 0.001));
      };
      await tester.pumpWidget(h.screen());
      await tester.pump(const Duration(seconds: 1));
      await tester.pump(const Duration(seconds: 1));
      expect(quoted, isTrue);
      expect(find.byKey(const Key('map')), findsOneWidget);
    });

    testWidgets('arrived then on-trip states advance', (tester) async {
      final h = Harness(const ['DRIVER_ARRIVED', 'IN_PROGRESS']);
      await tester.pumpWidget(h.screen());
      await tester.pump(const Duration(seconds: 1));
      expect(find.text('Driver arrived'), findsOneWidget);
      await tester.pump(const Duration(seconds: 2));
      await tester.pump();
      expect(find.text('On trip'), findsOneWidget);
      // No cancel once the trip started.
      expect(find.byKey(const Key('tripCancel')), findsNothing);
    });

    testWidgets('completed shows summary and star rating', (tester) async {
      final h = Harness(const ['IN_PROGRESS', 'COMPLETED']);
      await tester.pumpWidget(h.screen());
      await tester.pump(const Duration(seconds: 1));
      await tester.pump(const Duration(seconds: 2));
      await tester.pump();
      expect(find.text('Trip completed'), findsOneWidget);
      expect(find.textContaining('₱60.00'), findsOneWidget);
      await tester.tap(find.byKey(const Key('star-5')));
      await tester.pump();
      await tester.tap(find.text('Done'));
      await tester.pumpAndSettle();
    });

    testWidgets('cancel posts CANCELLED and pops', (tester) async {
      final h = Harness(const ['DRIVER_EN_ROUTE']);
      await tester.pumpWidget(MaterialApp(
        home: Scaffold(
          body: Builder(
            builder: (ctx) => ElevatedButton(
              onPressed: () => Navigator.of(ctx).push(
                  MaterialPageRoute(builder: (_) => h.bareScreen())),
              child: const Text('open'),
            ),
          ),
        ),
      ));
      await tester.tap(find.text('open'));
      await tester.pump();
      await tester.pump(const Duration(milliseconds: 400));
      await tester.tap(find.byKey(const Key('tripCancel')));
      await tester.pump();
      await tester.pump(const Duration(milliseconds: 400));
      expect(
          h.postedTransitions
              .where((t) => t['to'] == 'CANCELLED')
              .length,
          1);
      expect(find.text('open'), findsOneWidget);
    });
  });
}
