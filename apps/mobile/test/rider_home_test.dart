import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:hailing_mobile/core/network/api_client.dart';
import 'package:hailing_mobile/core/storage/session_store.dart';
import 'package:hailing_mobile/features/auth/data/auth_repository.dart';
import 'package:hailing_mobile/features/auth/presentation/session_scope.dart';
import 'package:hailing_mobile/features/maps/domain/map_models.dart';
import 'package:hailing_mobile/features/profile/presentation/profile_screen.dart';
import 'package:hailing_mobile/features/rider/presentation/rider_home_screen.dart';

Widget harness(AuthRepository auth,
    {Future<HatodMapPoint?> Function()? locate}) {
  return MaterialApp(
    home: SessionScope(
        auth: auth,
        child: RiderHomeScreen(userId: 'u-1', locate: locate)),
  );
}

/// Swipes the vehicle carousel until the given category card is built and
/// its center is on-screen (PageView lazily builds off-screen pages and
/// centers them with padEnds, so tapping blind misses). Swipes toward the
/// card when visible, otherwise sweeps both directions (last page swipes
/// are no-ops, so one direction alone can stall).
Future<void> showCategory(WidgetTester tester, String key) async {
  final w =
      tester.view.physicalSize.width / tester.view.devicePixelRatio;
  Future<void> drag(double dx) async {
    await tester.timedDrag(find.byType(PageView), Offset(dx, 0),
        const Duration(milliseconds: 300));
    await tester.pumpAndSettle();
  }

  for (var i = 0; i < 8; i++) {
    if (find.byKey(Key(key)).evaluate().isNotEmpty) {
      final dx = tester.getCenter(find.byKey(Key(key))).dx;
      if (dx >= 0 && dx <= w) return;
      await drag(dx < 0 ? 250 : -250);
    } else {
      await drag(i.isEven ? -250 : 250);
    }
  }
  fail('category card $key never became tappable');
}

void main() {
  // FavoritesScreen reads SharedPreferences on init; unmocked, the
  // platform channel never resolves and pumpAndSettle hangs.
  setUpAll(() => SharedPreferences.setMockInitialValues({}));

  testWidgets('GPS pickup by default, empty destination, then book',
      (tester) async {
    final api = ApiClient(
      baseUrl: 'http://x',
      httpClient: MockClient((req) async {
        final path = req.url.path;
        if (path.endsWith('/quote')) {
          return http.Response(
              jsonEncode({'fareCentavos': 8000, 'distanceKm': 4.0, 'durationSec': 1, 'provider': 't'}),
              200);
        }
        return http.Response(
            jsonEncode({
              'id': 'ride-9',
              'status': 'REQUESTED',
              'pickupLabel': 'Current location',
              'dropoffLabel': 'General Santos Fish Port',
              'fareCentavos': 8000
            }),
            200);
      }),
    );
    final auth = AuthRepository(api: api, store: MemorySessionStore());
    await tester.pumpWidget(harness(auth,
        locate: () async => const HatodMapPoint(6.12, 125.18)));
    await tester.pumpAndSettle();
    expect(find.byKey(const Key('map')), findsOneWidget);

    // GPS becomes the pickup; destination starts empty.
    expect(find.text('Current location'), findsOneWidget);
    expect(find.text('Set destination'), findsOneWidget);
    expect(find.byKey(const Key('fare')), findsNothing);

    // Choose a destination, then fare + book light up.
    await tester.tap(find.byKey(const Key('dropoffCard')));
    await tester.pumpAndSettle();
    await tester.enterText(find.byKey(const Key('placeQuery')), 'fish port');
    await tester.pumpAndSettle();
    await tester.tap(find.text('General Santos Fish Port'));
    await tester.pump(const Duration(milliseconds: 700));
    await tester.pumpAndSettle();

    // Fare auto-quotes after the destination change (no button).
    expect(find.byKey(const Key('fare')), findsOneWidget);

    await tester.ensureVisible(find.text('Book ride'));
    await tester.pumpAndSettle();
    await tester.tap(find.text('Book ride'));
    // Finding screen pushes: one pump delivers the tap + booking,
    // a second renders the pushed transition (radar animates: no settle).
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 400));
    expect(find.textContaining('Finding a driver'), findsOneWidget);
    expect(find.byKey(const Key('findingCancel')), findsOneWidget);
  });

  testWidgets('top form shows, footer nav switches tabs', (tester) async {
    final api = ApiClient(
      baseUrl: 'http://x',
      httpClient: MockClient((req) async {
        if (req.url.path.endsWith('/mine')) {
          return http.Response(jsonEncode({'asRider': []}), 200);
        }
        return http.Response('{}', 200);
      }),
    );
    final auth = AuthRepository(api: api, store: MemorySessionStore());
    await tester.pumpWidget(harness(auth));

    expect(find.text('Where are you going?'), findsOneWidget);
    expect(find.byKey(const Key('map')), findsOneWidget);

    await tester.tap(find.text('Orders'));
    await tester.pumpAndSettle();
    expect(find.text('No completed trips yet.'), findsOneWidget);

    await tester.tap(find.text('Favorites'));
    await tester.pumpAndSettle();
    expect(find.text('Add favorite'), findsOneWidget);

    await tester.tap(find.text('Me'));
    await tester.pumpAndSettle();
    expect(find.text('u-1'), findsOneWidget);
  });

  testWidgets('pickup card opens search, selection updates the card', (tester) async {
    final api = ApiClient(
      baseUrl: 'http://x',
      httpClient: MockClient((_) async => http.Response('{}', 200)),
    );
    final auth = AuthRepository(api: api, store: MemorySessionStore());
    await tester.pumpWidget(harness(auth,
        locate: () async => const HatodMapPoint(6.12, 125.18)));
    await tester.pumpAndSettle();

    await tester.tap(find.byKey(const Key('pickupCard')));
    await tester.pumpAndSettle();
    // Search mode: map stays, sheet + fare controls hide.
    expect(find.byKey(const Key('placeQuery')), findsOneWidget);
    expect(find.byKey(const Key('map')), findsOneWidget);
    expect(find.text('Get fare'), findsNothing);

    await tester.enterText(find.byKey(const Key('placeQuery')), 'airport');
    await tester.pumpAndSettle();
    await tester.tap(find.text('General Santos International Airport'));
    await tester.pumpAndSettle();
    // Original screen restored with the new pickup.
    expect(find.byKey(const Key('placeQuery')), findsNothing);
    expect(find.text('General Santos International Airport'), findsOneWidget);
    expect(find.text('Book ride'), findsOneWidget);
  });

  testWidgets('changing destination auto-draws route and fare', (tester) async {
    var quoteCalls = 0;
    final api = ApiClient(
      baseUrl: 'http://x',
      httpClient: MockClient((req) async {
        if (req.url.path.endsWith('/quote')) {
          quoteCalls++;
          return http.Response(
              jsonEncode({
                'fareCentavos': 6500,
                'distanceKm': 1.2,
                'durationSec': 180,
                'provider': 'osrm',
                'geometry': '_p~iF~ps|U_ulLnnqC_mqNvxq`@'
              }),
              200);
        }
        return http.Response('{}', 200);
      }),
    );
    final auth = AuthRepository(api: api, store: MemorySessionStore());
    await tester.pumpWidget(harness(auth,
        locate: () async => const HatodMapPoint(6.12, 125.18)));
    await tester.pumpAndSettle();
    expect(quoteCalls, 0);

    await tester.tap(find.byKey(const Key('dropoffCard')));
    await tester.pumpAndSettle();
    await tester.enterText(find.byKey(const Key('placeQuery')), 'fish port');
    await tester.pumpAndSettle();
    await tester.tap(find.text('General Santos Fish Port'));
    await tester.pump(const Duration(milliseconds: 700));
    await tester.pumpAndSettle();
    expect(quoteCalls, 1);
    expect(find.byKey(const Key('fare')), findsOneWidget);
    expect(find.textContaining('3 min'), findsOneWidget);
  });

  testWidgets('pin mode confirms map center as pickup', (tester) async {
    final api = ApiClient(
      baseUrl: 'http://x',
      httpClient: MockClient((_) async => http.Response('{}', 200)),
    );
    final auth = AuthRepository(api: api, store: MemorySessionStore());
    await tester.pumpWidget(harness(auth,
        locate: () async => const HatodMapPoint(6.12, 125.18)));
    await tester.pumpAndSettle();

    await tester.tap(find.byKey(const Key('pickupCard')));
    await tester.pumpAndSettle();
    // Caret hides the list → pin mode with confirm button.
    await tester.tap(find.byKey(const Key('pinToggle')));
    await tester.pumpAndSettle();
    expect(find.byKey(const Key('placeQuery')), findsNothing);
    expect(find.text('Set pickup here'), findsOneWidget);

    await tester.tap(find.text('Set pickup here'));
    await tester.pumpAndSettle();
    // Reverse mock is empty → coords fallback label on the card.
    expect(find.text('Pinned location'), findsOneWidget);
    expect(find.text('Book ride'), findsOneWidget);
  });

  testWidgets('profile shows Sign Out when wired', (tester) async {
    var signedOut = 0;
    await tester.pumpWidget(MaterialApp(
      home: ProfileScreen(
        name: 'u-1',
        onSignOut: () async => signedOut++,
      ),
    ));
    await tester.tap(find.byKey(const Key('signOut')));
    expect(signedOut, 1);
  });

  testWidgets('Me tab shows the login phone, not the user id',
      (tester) async {
    final api = ApiClient(
      baseUrl: 'http://x',
      httpClient: MockClient((_) async => http.Response('{}', 200)),
    );
    final auth = AuthRepository(api: api, store: MemorySessionStore());
    await tester.pumpWidget(MaterialApp(
      home: SessionScope(
          auth: auth,
          child: RiderHomeScreen(
            userId: 'u-1',
            phone: '09170000031',
            locate: () async => const HatodMapPoint(6.12, 125.18),
          )),
    ));
    await tester.pumpAndSettle();
    await tester.tap(find.text('Me'));
    await tester.pumpAndSettle();
    expect(find.text('09170000031'), findsOneWidget);
    expect(find.text('u-1'), findsNothing);
  });

  testWidgets('Me tab offers the driver switch when allowed', (tester) async {
    var switched = 0;
    final api = ApiClient(
      baseUrl: 'http://x',
      httpClient: MockClient((_) async => http.Response('{}', 200)),
    );
    final auth = AuthRepository(api: api, store: MemorySessionStore());
    await tester.pumpWidget(MaterialApp(
      home: SessionScope(
          auth: auth,
          child: RiderHomeScreen(
            userId: 'u-1',
            canDrive: true,
            locate: () async => const HatodMapPoint(6.12, 125.18),
            onSwitchToDriver: () => switched++,
          )),
    ));
    await tester.pumpAndSettle();
    await tester.tap(find.text('Me'));
    await tester.pumpAndSettle();
    await tester.tap(find.text('Switch to driver mode'));
    expect(switched, 1);
  });

  testWidgets('Me tab signs out back to the app shell', (tester) async {
    var signedOut = 0;
    final api = ApiClient(
      baseUrl: 'http://x',
      httpClient: MockClient((_) async => http.Response('{}', 200)),
    );
    final auth = AuthRepository(api: api, store: MemorySessionStore());
    await tester.pumpWidget(MaterialApp(
      home: SessionScope(
          auth: auth,
          child: RiderHomeScreen(
            userId: 'u-1',
            locate: () async => const HatodMapPoint(6.12, 125.18),
            onSignOut: () async => signedOut++,
          )),
    ));
    await tester.pumpAndSettle();
    await tester.tap(find.text('Me'));
    await tester.pumpAndSettle();
    await tester.tap(find.byKey(const Key('signOut')));
    expect(signedOut, 1);
  });

  testWidgets('category expands to sub-types, taxi quotes TAXI', (tester) async {
    final api = ApiClient(
      baseUrl: 'http://x',
      httpClient: MockClient((req) async {
        if (req.url.path.endsWith('/quote')) {
          return http.Response(
              jsonEncode({
                'fareCentavos': 19000,
                'distanceKm': 10.0,
                'durationSec': 1500,
                'provider': 't'
              }),
              200);
        }
        return http.Response('{}', 200);
      }),
    );
    final auth = AuthRepository(api: api, store: MemorySessionStore());
    await tester.pumpWidget(harness(auth,
        locate: () async => const HatodMapPoint(6.12, 125.18)));
    await tester.pumpAndSettle();

    // First pages built, sub-types hidden until the picker opens.
    // (The truck page builds lazily once swiped into view, see below.)
    expect(find.byKey(const Key('vehicleCat-CAR')), findsOneWidget);
    expect(find.byKey(const Key('vehicleCard-TAXI')), findsNothing);

    await showCategory(tester, 'vehicleCat-CAR');
    await tester.tap(find.byKey(const Key('vehicleCat-CAR')));
    await tester.pumpAndSettle();
    // Sub-type picker dialog opens with the category options.
    expect(find.byKey(const Key('vehiclePickerDialog')), findsOneWidget);
    expect(find.byKey(const Key('vehicleCard-TAXI')), findsOneWidget);
    expect(find.byKey(const Key('vehicleCard-CAR_6SEATER')), findsOneWidget);

    await tester.tap(find.byKey(const Key('vehicleCard-TAXI')));
    await tester.pumpAndSettle();
    // Dialog closes and the category row shows the chosen sub-type.
    expect(find.byKey(const Key('vehiclePickerDialog')), findsNothing);
    expect(find.text('Taxi · Metered car'), findsOneWidget);

    // Trucks list their capacities.
    await showCategory(tester, 'vehicleCat-TRUCK');
    await tester.tap(find.byKey(const Key('vehicleCat-TRUCK')));
    await tester.pumpAndSettle();
    expect(find.byKey(const Key('vehiclePickerDialog')), findsOneWidget);
    expect(find.byKey(const Key('vehicleCard-TRUCK_2000KG')), findsOneWidget);
  });

  testWidgets('truck booking quotes the truck type', (tester) async {
    String? vehicleType;
    final api = ApiClient(
      baseUrl: 'http://x',
      httpClient: MockClient((req) async {
        if (req.url.path.endsWith('/quote')) {
          vehicleType =
              (jsonDecode(req.body) as Map<String, dynamic>)['vehicleType']
                  as String?;
          return http.Response(
              jsonEncode({
                'fareCentavos': 49000,
                'distanceKm': 10.0,
                'durationSec': 2000,
                'provider': 't'
              }),
              200);
        }
        return http.Response('{}', 200);
      }),
    );
    final auth = AuthRepository(api: api, store: MemorySessionStore());
    await tester.pumpWidget(harness(auth,
        locate: () async => const HatodMapPoint(6.12, 125.18)));
    await tester.pumpAndSettle();
    await tester.tap(find.byKey(const Key('dropoffCard')));
    await tester.pumpAndSettle();
    await tester.tap(find.text('KCC Mall of Gensan'));
    await tester.pump(const Duration(milliseconds: 700));
    await tester.pumpAndSettle();
    await showCategory(tester, 'vehicleCat-TRUCK');
    await tester.tap(find.byKey(const Key('vehicleCat-TRUCK')));
    await tester.pumpAndSettle();
    expect(find.byKey(const Key('vehiclePickerDialog')), findsOneWidget);
    await tester.tap(find.byKey(const Key('vehicleCard-TRUCK_1000KG')));
    await tester.pumpAndSettle();
    expect(find.byKey(const Key('vehiclePickerDialog')), findsNothing);
    await tester.pump(const Duration(milliseconds: 700));
    await tester.pumpAndSettle();
    expect(vehicleType, 'TRUCK_1000KG');
    expect(find.byKey(const Key('fare')), findsOneWidget);
  });

  testWidgets('vehicle categories ride a horizontal carousel', (tester) async {
    final api = ApiClient(
      baseUrl: 'http://x',
      httpClient: MockClient((_) async => http.Response('{}', 200)),
    );
    final auth = AuthRepository(api: api, store: MemorySessionStore());
    await tester.pumpWidget(harness(auth,
        locate: () async => const HatodMapPoint(6.12, 125.18)));
    await tester.pumpAndSettle();
    // Snap pager, not a vertical stack.
    expect(
        find.descendant(
            of: find.byKey(const Key('vehicleRow')),
            matching: find.byType(PageView)),
        findsOneWidget);
    // Cards sit side by side.
    final motoX =
        tester.getCenter(find.byKey(const Key('vehicleCard-MOTORCYCLE'))).dx;
    final carX =
        tester.getCenter(find.byKey(const Key('vehicleCat-CAR'))).dx;
    expect(carX, greaterThan(motoX));
    // Rich card content: seats line, no prices before a quote.
    expect(find.text('1 rider'), findsOneWidget);
    expect(find.textContaining('₱'), findsNothing);
  });

  testWidgets('carousel cards use tight paddings', (tester) async {
    final api = ApiClient(
      baseUrl: 'http://x',
      httpClient: MockClient((_) async => http.Response('{}', 200)),
    );
    final auth = AuthRepository(api: api, store: MemorySessionStore());
    await tester.pumpWidget(harness(auth,
        locate: () async => const HatodMapPoint(6.12, 125.18)));
    await tester.pumpAndSettle();
    // Short pager: no dead height around the cards.
    final pager = tester.getRect(find.byType(PageView).first);
    expect(pager.height, lessThanOrEqualTo(132));
    // Narrow gap between neighbouring cards.
    final moto =
        tester.getRect(find.byKey(const Key('vehicleCard-MOTORCYCLE')));
    final car = tester.getRect(find.byKey(const Key('vehicleCat-CAR')));
    expect(car.left - moto.right, lessThan(10));
  });

  testWidgets('carousel cards show from-prices after quoting',
      (tester) async {
    final api = ApiClient(
      baseUrl: 'http://x',
      httpClient: MockClient((req) async {
        if (req.url.path.endsWith('/quote')) {
          return http.Response(
              jsonEncode({
                'fareCentavos': 19000,
                'distanceKm': 10.0,
                'durationSec': 1500,
                'provider': 't',
                'fares': {
                  'MOTORCYCLE': 14000,
                  'TAXI': 19000,
                  'CAR_4SEATER': 20000,
                  'CAR_6SEATER': 24000,
                  'TRUCK_600KG': 29000,
                  'TRUCK_600KG_MOVER': 34000,
                  'TRUCK_1000KG': 39000,
                  'TRUCK_2000KG': 49000,
                },
              }),
              200);
        }
        return http.Response('{}', 200);
      }),
    );
    final auth = AuthRepository(api: api, store: MemorySessionStore());
    await tester.pumpWidget(harness(auth,
        locate: () async => const HatodMapPoint(6.12, 125.18)));
    await tester.pumpAndSettle();
    await tester.tap(find.byKey(const Key('dropoffCard')));
    await tester.pumpAndSettle();
    await tester.tap(find.text('KCC Mall of Gensan'));
    await tester.pump(const Duration(milliseconds: 700));
    await tester.pumpAndSettle();
    // Exact price for the lone type, cheapest-of-type for categories.
    expect(find.text('₱140.00'), findsOneWidget);
    expect(find.text('from ₱190.00'), findsOneWidget);
    // The truck page builds lazily: swipe over, then its price is there.
    await showCategory(tester, 'vehicleCat-TRUCK');
    expect(find.text('from ₱290.00'), findsOneWidget);
    // The picker modal prices every sub-type, not just the minimum.
    await showCategory(tester, 'vehicleCat-CAR');
    await tester.tap(find.byKey(const Key('vehicleCat-CAR')));
    await tester.pumpAndSettle();
    expect(find.byKey(const Key('vehiclePickerDialog')), findsOneWidget);
    expect(find.text('Metered car · ₱190.00'), findsOneWidget);
    expect(find.text('Up to 6 seats · ₱240.00'), findsOneWidget);
  });

  testWidgets('vehicle row shows selected motorcycle card', (tester) async {
    final api = ApiClient(
      baseUrl: 'http://x',
      httpClient: MockClient((_) async => http.Response('{}', 200)),
    );
    final auth = AuthRepository(api: api, store: MemorySessionStore());
    await tester.pumpWidget(harness(auth,
        locate: () async => const HatodMapPoint(6.12, 125.18)));
    await tester.pumpAndSettle();
    expect(find.byKey(const Key('vehicleRow')), findsOneWidget);
    expect(find.byKey(const Key('vehicleCard-MOTORCYCLE')), findsOneWidget);
    expect(find.text('Motorcycle'), findsOneWidget);
  });

  testWidgets('default quote uses MOTORCYCLE', (tester) async {
    String? vehicleType;
    final api = ApiClient(
      baseUrl: 'http://x',
      httpClient: MockClient((req) async {
        if (req.url.path.endsWith('/quote')) {
          vehicleType =
              (jsonDecode(req.body) as Map<String, dynamic>)['vehicleType']
                  as String?;
          return http.Response(
              jsonEncode({
                'fareCentavos': 6000,
                'distanceKm': 1.1,
                'durationSec': 120,
                'provider': 't'
              }),
              200);
        }
        return http.Response('{}', 200);
      }),
    );
    final auth = AuthRepository(api: api, store: MemorySessionStore());
    await tester.pumpWidget(harness(auth,
        locate: () async => const HatodMapPoint(6.12, 125.18)));
    await tester.pumpAndSettle();
    await tester.tap(find.byKey(const Key('dropoffCard')));
    await tester.pumpAndSettle();
    await tester.tap(find.text('KCC Mall of Gensan'));
    await tester.pump(const Duration(milliseconds: 700));
    await tester.pumpAndSettle();
    expect(vehicleType, 'MOTORCYCLE');
    expect(find.byKey(const Key('fare')), findsOneWidget);
  });

  testWidgets('revisiting Orders reloads new trips', (tester) async {
    final rides = <Map<String, dynamic>>[];
    final api = ApiClient(
      baseUrl: 'http://x',
      httpClient: MockClient((req) async {
        if (req.url.path.endsWith('/mine')) {
          return http.Response(
              jsonEncode({'asRider': rides}), 200);
        }
        return http.Response('{}', 200);
      }),
    );
    final auth = AuthRepository(api: api, store: MemorySessionStore());
    await tester.pumpWidget(harness(auth,
        locate: () async => const HatodMapPoint(6.12, 125.18)));
    await tester.pumpAndSettle();

    await tester.tap(find.text('Orders'));
    await tester.pumpAndSettle();
    expect(find.text('No completed trips yet.'), findsOneWidget);

    rides.add({
      'id': 'r-new',
      'status': 'COMPLETED',
      'pickupLabel': 'A',
      'dropoffLabel': 'B',
      'fareCentavos': 10000,
      'requestedAt': '2026-09-30T06:30:00.000Z',
      'completedAt': '2026-09-30T06:52:00.000Z',
    });
    await tester.tap(find.text('Home'));
    await tester.pumpAndSettle();
    await tester.tap(find.text('Orders'));
    await tester.pumpAndSettle();
    expect(find.text('A'), findsOneWidget);
    expect(find.text('No completed trips yet.'), findsNothing);
  });

  testWidgets('return trip presets the swapped endpoints', (tester) async {
    final ride = {
      'id': 'r-1',
      'status': 'COMPLETED',
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
    final api = ApiClient(
      baseUrl: 'http://x',
      httpClient: MockClient((req) async {
        final path = req.url.path;
        if (path.endsWith('/mine')) {
          return http.Response(
              jsonEncode({'asRider': [ride]}), 200);
        }
        if (path.endsWith('/r-1')) {
          return http.Response(jsonEncode(ride), 200);
        }
        if (path.endsWith('/quote')) {
          return http.Response(
              jsonEncode({
                'fareCentavos': 10000,
                'distanceKm': 1.5,
                'durationSec': 300,
                'provider': 't'
              }),
              200);
        }
        return http.Response('{}', 200);
      }),
    );
    final auth = AuthRepository(api: api, store: MemorySessionStore());
    await tester.pumpWidget(harness(auth,
        locate: () async => const HatodMapPoint(6.12, 125.18)));
    await tester.pumpAndSettle();

    await tester.tap(find.text('Orders'));
    await tester.pumpAndSettle();
    await tester.tap(find.text('Hotel'));
    await tester.pumpAndSettle();
    expect(find.text('Return trip'), findsOneWidget);
    await tester.tap(find.text('Return trip'));
    await tester.pump(const Duration(milliseconds: 700));
    await tester.pumpAndSettle();
    // Home preset with endpoints swapped: Airport pickup, Hotel destination.
    expect(find.byType(RiderHomeScreen), findsOneWidget);
    expect(find.text('Airport'), findsWidgets);
    expect(find.text('Hotel'), findsWidgets);
  });

  testWidgets('favorite tap sets the destination and returns home',
      (tester) async {
    SharedPreferences.setMockInitialValues({
      'hatod_favorites': jsonEncode([
        {
          'label': 'Gym',
          'address': 'Block 1',
          'lat': 6.2,
          'lng': 125.2
        }
      ]),
    });
    final api = ApiClient(
      baseUrl: 'http://x',
      httpClient: MockClient((req) async {
        if (req.url.path.endsWith('/quote')) {
          return http.Response(
              jsonEncode({
                'fareCentavos': 6000,
                'distanceKm': 1.1,
                'durationSec': 120,
                'provider': 't'
              }),
              200);
        }
        return http.Response('{}', 200);
      }),
    );
    final auth = AuthRepository(api: api, store: MemorySessionStore());
    await tester.pumpWidget(harness(auth,
        locate: () async => const HatodMapPoint(6.12, 125.18)));
    await tester.pumpAndSettle();
    await tester.tap(find.text('Favorites'));
    await tester.pumpAndSettle();
    await tester.tap(find.text('Gym'));
    await tester.pump(const Duration(milliseconds: 700));
    await tester.pumpAndSettle();
    // Back on home with the favorite as destination + auto-quote.
    expect(find.byKey(const Key('dropoffCard')), findsOneWidget);
    expect(find.text('Gym'), findsWidgets);
    expect(find.byKey(const Key('fare')), findsOneWidget);
  });

  testWidgets('fare card uses standard spacing and labels', (tester) async {
    final api = ApiClient(
      baseUrl: 'http://x',
      httpClient: MockClient((req) async {
        if (req.url.path.endsWith('/quote')) {
          return http.Response(
              jsonEncode({
                'fareCentavos': 6500,
                'distanceKm': 1.2,
                'durationSec': 180,
                'provider': 'osrm',
                'geometry': ''
              }),
              200);
        }
        return http.Response('{}', 200);
      }),
    );
    final auth = AuthRepository(api: api, store: MemorySessionStore());
    await tester.pumpWidget(harness(auth,
        locate: () async => const HatodMapPoint(6.12, 125.18)));
    await tester.pumpAndSettle();
    await tester.tap(find.byKey(const Key('dropoffCard')));
    await tester.pumpAndSettle();
    await tester.enterText(find.byKey(const Key('placeQuery')), 'fish port');
    await tester.pumpAndSettle();
    await tester.tap(find.text('General Santos Fish Port'));
    await tester.pump(const Duration(milliseconds: 700));
    await tester.pumpAndSettle();
    expect(find.text('ESTIMATED FARE'), findsOneWidget);
    expect(find.byKey(const Key('fare')), findsOneWidget);
    final padding = tester.widget<Padding>(
        find.ancestor(of: find.text('ESTIMATED FARE'), matching: find.byType(Padding)).first);
    expect(padding.padding, const EdgeInsets.all(16));
  });

  testWidgets('details row opens editor and feeds the booking', (tester) async {
    Map<String, dynamic>? sentBody;
    final api = ApiClient(
      baseUrl: 'http://x',
      httpClient: MockClient((req) async {
        final path = req.url.path;
        if (path.endsWith('/quote')) {
          return http.Response(
              jsonEncode({
                'fareCentavos': 6000,
                'distanceKm': 1.1,
                'durationSec': 120,
                'provider': 't'
              }),
              200);
        }
        if (path.endsWith('/rides') && req.method == 'POST') {
          sentBody = jsonDecode(req.body) as Map<String, dynamic>;
          return http.Response(
              jsonEncode({
                'id': 'ride-9',
                'status': 'REQUESTED',
                'pickupLabel': 'Current location',
                'dropoffLabel': 'KCC Mall of Gensan',
                'fareCentavos': 6000
              }),
              200);
        }
        return http.Response('{}', 200);
      }),
    );
    final auth = AuthRepository(api: api, store: MemorySessionStore());
    await tester.pumpWidget(harness(auth,
        locate: () async => const HatodMapPoint(6.12, 125.18)));
    await tester.pumpAndSettle();

    await tester.tap(find.byKey(const Key('dropoffCard')));
    await tester.pumpAndSettle();
    await tester.tap(find.text('KCC Mall of Gensan'));
    await tester.pump(const Duration(milliseconds: 700));
    await tester.pumpAndSettle();

    // Details row shows empty state, opens the editor.
    expect(find.text('Add trip details'), findsOneWidget);
    await tester.ensureVisible(find.byKey(const Key('bookingDetails')));
    await tester.pumpAndSettle();
    await tester.tap(find.byKey(const Key('bookingDetails')));
    await tester.pumpAndSettle();
    expect(find.text('Trip details'), findsOneWidget);

    // Tip + change chips + note, then save back to home.
    await tester.tap(find.byKey(const Key('tip-2000')));
    await tester.tap(find.byKey(const Key('change-100000')));
    await tester.enterText(
        find.byKey(const Key('noteField')), 'Gate 2, blue house');
    await tester.tap(find.text('Save'));
    await tester.pumpAndSettle();
    expect(find.textContaining('₱20 tip'), findsOneWidget);

    await tester.tap(find.text('Book ride'));
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 400));
    expect(sentBody?['tipCentavos'], 2000);
    expect(sentBody?['changeFor'], 100000);
    expect(sentBody?['riderNote'], 'Gate 2, blue house');
  });

  testWidgets('payment defaults Cash, E-Wallet feeds booking', (tester) async {
    Map<String, dynamic>? sentBody;
    final api = ApiClient(
      baseUrl: 'http://x',
      httpClient: MockClient((req) async {
        final path = req.url.path;
        if (path.endsWith('/quote')) {
          return http.Response(
              jsonEncode({
                'fareCentavos': 6000,
                'distanceKm': 1.1,
                'durationSec': 120,
                'provider': 't'
              }),
              200);
        }
        if (path.endsWith('/rides') && req.method == 'POST') {
          sentBody = jsonDecode(req.body) as Map<String, dynamic>;
          return http.Response(
              jsonEncode({
                'id': 'ride-9',
                'status': 'REQUESTED',
                'pickupLabel': 'Current location',
                'dropoffLabel': 'KCC Mall of Gensan',
                'fareCentavos': 6000
              }),
              200);
        }
        return http.Response('{}', 200);
      }),
    );
    final auth = AuthRepository(api: api, store: MemorySessionStore());
    await tester.pumpWidget(harness(auth,
        locate: () async => const HatodMapPoint(6.12, 125.18)));
    await tester.pumpAndSettle();

    await tester.tap(find.byKey(const Key('dropoffCard')));
    await tester.pumpAndSettle();
    await tester.tap(find.text('KCC Mall of Gensan'));
    await tester.pump(const Duration(milliseconds: 700));
    await tester.pumpAndSettle();

    await tester.ensureVisible(find.byKey(const Key('bookingDetails')));
    await tester.pumpAndSettle();
    await tester.tap(find.byKey(const Key('bookingDetails')));
    await tester.pumpAndSettle();
    // Cash preselected.
    expect(find.text('Cash'), findsOneWidget);
    await tester.tap(find.byKey(const Key('pay-WALLET')));
    await tester.tap(find.text('Save'));
    await tester.pumpAndSettle();
    expect(find.textContaining('E-Wallet'), findsOneWidget);

    await tester.tap(find.text('Book ride'));
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 400));
    expect(sentBody?['paymentMethod'], 'WALLET');
  });

  testWidgets('shows live current-location marker by default', (tester) async {
    final api = ApiClient(
      baseUrl: 'http://x',
      httpClient: MockClient((_) async => http.Response('{}', 200)),
    );
    final auth = AuthRepository(api: api, store: MemorySessionStore());
    await tester.pumpWidget(harness(auth,
        locate: () async => const HatodMapPoint(6.12, 125.18)));
    await tester.pumpAndSettle();
    expect(find.byKey(const Key('currentMarker')), findsOneWidget);
  });
}
