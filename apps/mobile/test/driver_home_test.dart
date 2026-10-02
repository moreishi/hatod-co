import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:hailing_mobile/core/constants/map_constants.dart';
import 'package:hailing_mobile/core/network/api_client.dart';
import 'package:hailing_mobile/core/storage/session_store.dart';
import 'package:hailing_mobile/features/auth/data/auth_repository.dart';
import 'package:hailing_mobile/features/auth/presentation/session_scope.dart';
import 'package:hailing_mobile/features/driver/data/driver_repository.dart';
import 'package:hailing_mobile/features/driver/presentation/driver_home_screen.dart';
import 'package:hailing_mobile/features/maps/domain/map_models.dart';
import 'package:hailing_mobile/features/maps/presentation/hatod_map.dart';

Map<String, dynamic> rideJson(String status) => {
      'id': 'ride-1',
      'status': status,
      'pickupLabel': 'A',
      'dropoffLabel': 'B',
      'fareCentavos': 10000,
    };

DriverRepository repo(MockClient handler) => DriverRepository(
      api: ApiClient(baseUrl: 'http://x', httpClient: handler),
    );

void main() {
  group('DriverRepository', () {
    test('online toggle, offers, and transitions', () async {
      final calls = <String>[];
      final api = repo(MockClient((req) async {
        calls.add('${req.method} ${req.url.path}');
        final path = req.url.path;
        if (path.endsWith('/online')) {
          return http.Response(jsonEncode({'isOnline': true}), 200);
        }
        if (path.endsWith('/accept')) {
          return http.Response(jsonEncode(rideJson('ASSIGNED')), 200);
        }
        if (path.contains('/transition')) {
          return http.Response(jsonEncode(rideJson('DRIVER_EN_ROUTE')), 200);
        }
        return http.Response('{}', 404);
      }));

      expect(await api.setOnline(true), isTrue);
      final accepted = await api.acceptAssigned('ride-1');
      expect(accepted.status, 'ASSIGNED');
      final moved = await api.transition('ride-1', 'DRIVER_EN_ROUTE');
      expect(moved.status, 'DRIVER_EN_ROUTE');
      expect(
        calls.where((c) => c.contains('/transition')),
        hasLength(1),
      );
    });

    test('offers list and offer detail parse', () async {
      final api = repo(MockClient((req) async {
        final path = req.url.path;
        if (path.endsWith('/me/offers')) {
          return http.Response(
              jsonEncode([
                {'rideId': 'r-1', 'expiresAt': 9999999999999}
              ]),
              200);
        }
        if (path.endsWith('/rides/r-1')) {
          return http.Response(jsonEncode(rideJson('REQUESTED')), 200);
        }
        return http.Response('{}', 404);
      }));

      final offers = await api.offers();
      expect(offers, hasLength(1));
      expect(offers.single.rideId, 'r-1');
      final ride = await api.rideDetail('r-1');
      expect(ride.status, 'REQUESTED');
      expect(ride.pickupLabel, 'A');
    });
  });

  group('DriverHomeScreen', () {
    testWidgets('polls rides and offers while online, not offline',
        (tester) async {
      var mine = 0;
      var offers = 0;
      final api = repo(MockClient((req) async {
        final path = req.url.path;
        if (path.endsWith('/mine')) {
          mine++;
          return http.Response(
              jsonEncode({'asRider': [], 'asDriver': []}), 200);
        }
        if (path.endsWith('/online')) {
          return http.Response(jsonEncode({'isOnline': true}), 200);
        }
        if (path.endsWith('/me/offers')) {
          offers++;
          return http.Response('[]', 200);
        }
        return http.Response('{}', 404);
      }));
      await tester.pumpWidget(
        MaterialApp(
            home: DriverHomeScreen(
                userId: 'u-1',
                repository: api,
                pollInterval: const Duration(seconds: 2))),
      );
      await tester.pumpAndSettle();
      await tester.pump(const Duration(seconds: 5));
      expect(mine, 1);
      expect(offers, 0);
      await tester.tap(find.byType(Switch));
      await tester.pumpAndSettle();
      await tester.pump(const Duration(seconds: 5));
      expect(mine, greaterThanOrEqualTo(3));
      expect(offers, greaterThanOrEqualTo(2));
    });

    testWidgets('pings GPS while online only', (tester) async {
      final pinged = <Map<String, dynamic>>[];
      final api = repo(MockClient((req) async {
        final path = req.url.path;
        if (path.endsWith('/mine')) {
          return http.Response(
              jsonEncode({'asRider': [], 'asDriver': []}), 200);
        }
        if (path.endsWith('/online')) {
          return http.Response(jsonEncode({'isOnline': true}), 200);
        }
        if (path.endsWith('/me/offers')) {
          return http.Response('[]', 200);
        }
        if (path.endsWith('/location')) {
          pinged.add(
              jsonDecode(req.body) as Map<String, dynamic>);
          return http.Response('{}', 200);
        }
        return http.Response('{}', 404);
      }));
      await tester.pumpWidget(
        MaterialApp(
            home: DriverHomeScreen(
                userId: 'u-1',
                repository: api,
                pollInterval: const Duration(seconds: 2),
                pingInterval: const Duration(seconds: 2),
                locate: () async => const HatodMapPoint(6.12, 125.18))),
      );
      await tester.pumpAndSettle();
      await tester.pump(const Duration(seconds: 3));
      expect(pinged, isEmpty);
      await tester.tap(find.byType(Switch));
      await tester.pumpAndSettle();
      await tester.pump(const Duration(seconds: 5));
      expect(pinged, isNotEmpty);
      expect(pinged.last['lat'], 6.12);
      expect(pinged.last['lng'], 125.18);
    });

    testWidgets('map centers on the driver GPS zoomed in close',
        (tester) async {
      final api = repo(MockClient((req) async {
        if (req.url.path.endsWith('/mine')) {
          return http.Response(
              jsonEncode({'asRider': [], 'asDriver': []}), 200);
        }
        return http.Response('{}', 404);
      }));
      await tester.pumpWidget(
        MaterialApp(
            home: DriverHomeScreen(
                userId: 'u-1',
                repository: api,
                locate: () async => const HatodMapPoint(6.12, 125.18))),
      );
      await tester.pumpAndSettle();
      final map =
          tester.widget<HatodMap>(find.byKey(const Key('map')));
      expect(map.zoom, MapConstants.homeZoom);
      expect(map.current?.lat, 6.12);
      expect(map.current?.lng, 125.18);
    });

    testWidgets('incoming offer shows countdown with accept and decline',
        (tester) async {
      var offered = true;
      final offerRide = {
        'id': 'r-1',
        'status': 'REQUESTED',
        'pickupLabel': 'Hotel',
        'dropoffLabel': 'Airport',
        'fareCentavos': 10000,
        'requestedAt': '2026-09-30T06:30:00.000Z',
        'completedAt': '2026-09-30T06:52:00.000Z',
      };
      final api = repo(MockClient((req) async {
        final path = req.url.path;
        if (path.endsWith('/mine')) {
          return http.Response(
              jsonEncode({'asRider': [], 'asDriver': []}), 200);
        }
        if (path.endsWith('/online')) {
          return http.Response(jsonEncode({'isOnline': true}), 200);
        }
        if (path.endsWith('/me/offers')) {
          return http.Response(
              jsonEncode(offered
                  ? [
                      {
                        'rideId': 'r-1',
                        'expiresAt': DateTime.now()
                                .millisecondsSinceEpoch +
                            30000
                      }
                    ]
                  : []),
              200);
        }
        if (path.endsWith('/rides/r-1')) {
          return http.Response(jsonEncode(offerRide), 200);
        }
        if (path.endsWith('/decline')) {
          offered = false;
          return http.Response('{}', 200);
        }
        return http.Response('{}', 404);
      }));
      await tester.pumpWidget(
        MaterialApp(
            home: DriverHomeScreen(
                userId: 'u-1',
                repository: api,
                pollInterval: const Duration(seconds: 2))),
      );
      await tester.pumpAndSettle();
      await tester.tap(find.byType(Switch));
      await tester.pumpAndSettle();
      expect(find.text('Incoming request'), findsOneWidget);
      expect(find.text('Hotel'), findsOneWidget);
      expect(find.byKey(const Key('offerCountdown-r-1')), findsOneWidget);
      expect(find.text('Accept'), findsOneWidget);
      expect(find.text('Decline'), findsOneWidget);
      // Decline pins its own ink-on-white style so it stays readable
      // no matter the ambient button theme.
      final decline = tester.widget<OutlinedButton>(
          find.widgetWithText(OutlinedButton, 'Decline'));
      final fg = decline.style?.foregroundColor?.resolve({});
      expect(fg, isNotNull, reason: 'Decline has no foreground');
      expect(fg!.a, 1.0, reason: 'Decline foreground is transparent');
      await tester.tap(find.text('Decline'));
      await tester.pumpAndSettle();
      expect(find.text('Incoming request'), findsNothing);
    });

    testWidgets('offer with note or change goes review-first', (tester) async {
      final offerRide = {
        'id': 'r-1',
        'status': 'REQUESTED',
        'pickupLabel': 'Hotel',
        'dropoffLabel': 'Airport',
        'fareCentavos': 10000,
        'tipCentavos': 2000,
        'changeFor': 100000,
        'riderNote': 'Gate 2',
        'requestedAt': '2026-09-30T06:30:00.000Z',
        'completedAt': '2026-09-30T06:52:00.000Z',
      };
      final api = repo(MockClient((req) async {
        final path = req.url.path;
        if (path.endsWith('/mine')) {
          return http.Response(
              jsonEncode({'asRider': [], 'asDriver': []}), 200);
        }
        if (path.endsWith('/online')) {
          return http.Response(jsonEncode({'isOnline': true}), 200);
        }
        if (path.endsWith('/me/offers')) {
          return http.Response(
              jsonEncode([
                {
                  'rideId': 'r-1',
                  'expiresAt':
                      DateTime.now().millisecondsSinceEpoch + 30000
                }
              ]),
              200);
        }
        if (path.endsWith('/rides/r-1')) {
          return http.Response(jsonEncode(offerRide), 200);
        }
        return http.Response('{}', 404);
      }));
      final auth = AuthRepository(
          api: api.api, store: MemorySessionStore());
      await tester.pumpWidget(
        MaterialApp(
            home: SessionScope(
                auth: auth,
                child: DriverHomeScreen(
                    userId: 'u-1',
                    repository: api,
                    pollInterval: const Duration(seconds: 2)))),
      );
      await tester.pumpAndSettle();
      await tester.tap(find.byType(Switch));
      await tester.pumpAndSettle();
      // Amber highlight, no instant accept: review opens the detail.
      expect(find.text('Special request'), findsOneWidget);
      expect(find.text('Review request'), findsOneWidget);
      expect(find.text('Accept'), findsNothing);
      await tester.tap(find.text('Review request'));
      await tester.pumpAndSettle();
      expect(find.text('Hotel → Airport'), findsOneWidget);
      expect(find.text('Accept'), findsOneWidget);
    });

    testWidgets('accepting an offer shows the assignment', (tester) async {
      var accepted = false;
      final offerRide = {
        'id': 'r-1',
        'status': 'REQUESTED',
        'pickupLabel': 'Hotel',
        'dropoffLabel': 'Airport',
        'fareCentavos': 10000,
        'requestedAt': '2026-09-30T06:30:00.000Z',
        'completedAt': '2026-09-30T06:52:00.000Z',
      };
      final api = repo(MockClient((req) async {
        final path = req.url.path;
        if (path.endsWith('/mine')) {
          return http.Response(
              jsonEncode({
                'asRider': [],
                'asDriver': accepted ? [rideJson('ASSIGNED')] : []
              }),
              200);
        }
        if (path.endsWith('/online')) {
          return http.Response(jsonEncode({'isOnline': true}), 200);
        }
        if (path.endsWith('/me/offers')) {
          return http.Response(
              jsonEncode(accepted
                  ? []
                  : [
                      {
                        'rideId': 'r-1',
                        'expiresAt': DateTime.now()
                                .millisecondsSinceEpoch +
                            30000
                      }
                    ]),
              200);
        }
        if (path.endsWith('/rides/r-1')) {
          return http.Response(jsonEncode(offerRide), 200);
        }
        if (path.endsWith('/accept')) {
          accepted = true;
          return http.Response(jsonEncode(rideJson('ASSIGNED')), 200);
        }
        return http.Response('{}', 404);
      }));
      await tester.pumpWidget(
        MaterialApp(
            home: DriverHomeScreen(
                userId: 'u-1',
                repository: api,
                pollInterval: const Duration(seconds: 2))),
      );
      await tester.pumpAndSettle();
      await tester.tap(find.byType(Switch));
      await tester.pumpAndSettle();
      await tester.tap(find.text('Accept'));
      await tester.pumpAndSettle();
      expect(find.byKey(const Key('assignment')), findsOneWidget);
      expect(find.text('ASSIGNED'), findsWidgets);
    });

    testWidgets('profile action shows the login phone', (tester) async {
      final api = repo(MockClient((req) async {
        if (req.url.path.endsWith('/mine')) {
          return http.Response(
              jsonEncode({'asRider': [], 'asDriver': []}), 200);
        }
        return http.Response('{}', 404);
      }));
      await tester.pumpWidget(
        MaterialApp(
            home: DriverHomeScreen(
                userId: 'u-1', phone: '0917100011', repository: api)),
      );
      await tester.pumpAndSettle();
      await tester.tap(find.byKey(const Key('driverProfile')));
      await tester.pumpAndSettle();
      expect(find.text('0917100011'), findsOneWidget);
      expect(find.text('u-1'), findsNothing);
    });

    testWidgets('switch to rider goes offline first', (tester) async {
      final calls = <String>[];
      final api = repo(MockClient((req) async {
        final path = req.url.path;
        calls.add(path);
        if (path.endsWith('/mine')) {
          return http.Response(
              jsonEncode({'asRider': [], 'asDriver': []}), 200);
        }
        if (path.endsWith('/online')) {
          return http.Response(jsonEncode({'isOnline': true}), 200);
        }
        return http.Response('{}', 404);
      }));
      var switched = 0;
      await tester.pumpWidget(
        MaterialApp(
            home: DriverHomeScreen(
                userId: 'u-1',
                repository: api,
                onSwitchToRider: () => switched++)),
      );
      await tester.pumpAndSettle();
      await tester.tap(find.byType(Switch));
      await tester.pumpAndSettle();
      await tester.tap(find.byKey(const Key('driverProfile')));
      await tester.pumpAndSettle();
      await tester.tap(find.text('Switch to rider mode'));
      await tester.pumpAndSettle();
      expect(
          calls.where((c) => c.endsWith('/online')), isNotEmpty,
          reason: 'going offline first');
      expect(switched, 1);
    });

    testWidgets('switch to rider is blocked by an active trip',
        (tester) async {
      final api = repo(MockClient((req) async {
        final path = req.url.path;
        if (path.endsWith('/mine')) {
          return http.Response(
              jsonEncode({
                'asRider': [],
                'asDriver': [rideJson('ASSIGNED')]
              }),
              200);
        }
        return http.Response('{}', 404);
      }));
      var switched = 0;
      await tester.pumpWidget(
        MaterialApp(
            home: DriverHomeScreen(
                userId: 'u-1',
                repository: api,
                onSwitchToRider: () => switched++)),
      );
      await tester.pumpAndSettle();
      await tester.tap(find.byKey(const Key('driverProfile')));
      await tester.pumpAndSettle();
      await tester.tap(find.text('Switch to rider mode'));
      await tester.pumpAndSettle();
      expect(switched, 0);
      expect(find.text('Finish the active trip before switching modes.'),
          findsOneWidget);
    });

    testWidgets('trips and earnings buttons are opaque over the map',
        (tester) async {
      final api = repo(MockClient((req) async {
        if (req.url.path.endsWith('/mine')) {
          return http.Response(
              jsonEncode({'asRider': [], 'asDriver': []}), 200);
        }
        return http.Response('{}', 404);
      }));
      await tester.pumpWidget(
        MaterialApp(home: DriverHomeScreen(userId: 'u-1', repository: api)),
      );
      await tester.pumpAndSettle();
      for (final label in ['My trips', 'Earnings']) {
        final btn = tester.widget<OutlinedButton>(
            find.widgetWithText(OutlinedButton, label));
        final bg = btn.style?.backgroundColor?.resolve({});
        expect(bg, isNotNull, reason: '$label has no background');
        expect(bg!.a, 1.0, reason: '$label background is transparent');
      }
    });

    testWidgets('toggles online and advances the assignment', (tester) async {
      final api = repo(MockClient((req) async {
        final path = req.url.path;
        if (path.endsWith('/mine')) {
          return http.Response(
              jsonEncode({
                'asRider': [],
                'asDriver': [rideJson('ASSIGNED')]
              }),
              200);
        }
        if (path.endsWith('/online')) {
          return http.Response(jsonEncode({'isOnline': true}), 200);
        }
        if (path.contains('/transition')) {
          return http.Response(jsonEncode(rideJson('DRIVER_EN_ROUTE')), 200);
        }
        return http.Response('{}', 404);
      }));
      await tester.pumpWidget(
        MaterialApp(home: DriverHomeScreen(userId: 'u-1', repository: api)),
      );
      await tester.pumpAndSettle();

      await tester.tap(find.byType(Switch));
      await tester.pumpAndSettle();
      expect(find.text('ONLINE'), findsOneWidget);

      await tester.tap(find.text('Head to pickup'));
      await tester.pumpAndSettle();
      expect(find.text('DRIVER_EN_ROUTE'), findsWidgets);
    });
  });
}
