import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:hailing_mobile/core/network/api_client.dart';
import 'package:hailing_mobile/features/booking/data/booking_repository.dart';
import 'package:hailing_mobile/features/maps/domain/places.dart';
import 'package:hailing_mobile/features/messaging/data/messaging_repository.dart';
import 'package:hailing_mobile/features/rider/presentation/ride_detail_screen.dart';

Map<String, dynamic> detailJson() => {
      'id': 'ride-1',
      'status': 'COMPLETED',
      'pickupLabel': 'Ayala Center Cebu',
      'pickupLat': 10.3181,
      'pickupLng': 123.9054,
      'dropoffLabel': 'SM City Cebu',
      'dropoffLat': 10.3111,
      'dropoffLng': 123.9185,
      'fareCentavos': 8000,
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

Widget detailScreen({
  Map<String, dynamic>? detail,
  void Function(HatodPlace, HatodPlace)? onRepeat,
  void Function(HatodPlace, HatodPlace)? onReturn,
}) {
  final booking = BookingRepository(
    api: ApiClient(
      baseUrl: 'http://x',
      httpClient: MockClient((req) async {
        if (req.url.pathSegments.last == 'ride-1') {
          return http.Response(jsonEncode(detail ?? detailJson()), 200);
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
  return RideDetailScreen(
    booking: booking,
    messaging: messaging,
    rideId: 'ride-1',
    myId: 'u-1',
    onRepeat: onRepeat,
    onReturn: onReturn,
  );
}

Widget harness({
  Map<String, dynamic>? detail,
  void Function(HatodPlace, HatodPlace)? onRepeat,
  void Function(HatodPlace, HatodPlace)? onReturn,
}) {
  return MaterialApp(
    home: detailScreen(
        detail: detail, onRepeat: onRepeat, onReturn: onReturn),
  );
}

void main() {
  group('RideDetailScreen', () {
    testWidgets('shows map with pins and back caret pops', (tester) async {
      await tester.pumpWidget(MaterialApp(
        home: Scaffold(
          body: Center(
            child: Builder(
              builder: (ctx) => ElevatedButton(
                onPressed: () => Navigator.of(ctx).push(
                    MaterialPageRoute(builder: (_) => detailScreen())),
                child: const Text('open'),
              ),
            ),
          ),
        ),
      ));
      await tester.tap(find.text('open'));
      await tester.pumpAndSettle();
      expect(find.byKey(const Key('map')), findsOneWidget);
      expect(find.byKey(const Key('detailBack')), findsOneWidget);
      await tester.tap(find.byKey(const Key('detailBack')));
      await tester.pumpAndSettle();
      expect(find.byKey(const Key('detailBack')), findsNothing);
      expect(find.text('open'), findsOneWidget);
    });

    testWidgets('driver card, rating, fare, and route info', (tester) async {
      await tester.pumpWidget(harness());
      await tester.pumpAndSettle();
      expect(find.text('Carlos Reyes'), findsOneWidget);
      expect(find.textContaining('MOTORCYCLE'), findsWidgets);
      expect(find.textContaining('GAK 1234'), findsOneWidget);
      expect(find.text('Ayala Center Cebu'), findsOneWidget);
      expect(find.text('SM City Cebu'), findsOneWidget);
      expect(find.textContaining('₱80.00'), findsNWidgets(2));
      // Thumbs start unselected.
      expect(find.byKey(const Key('thumbUp')), findsOneWidget);
      expect(find.byKey(const Key('thumbDown')), findsOneWidget);
    });

    testWidgets('thumbs up/down toggle', (tester) async {
      await tester.pumpWidget(harness());
      await tester.pumpAndSettle();
      await tester.tap(find.byKey(const Key('thumbUp')));
      await tester.pumpAndSettle();
      Icon up = tester.widget(find.byKey(const Key('thumbUpIcon')));
      Icon down = tester.widget(find.byKey(const Key('thumbDownIcon')));
      expect(up.color, isNot(equals(down.color)));
      await tester.tap(find.byKey(const Key('thumbDown')));
      await tester.pumpAndSettle();
      up = tester.widget(find.byKey(const Key('thumbUpIcon')));
      down = tester.widget(find.byKey(const Key('thumbDownIcon')));
      expect(down.color, isNot(equals(up.color)));
    });

    testWidgets('repeat books the same endpoints again', (tester) async {
      HatodPlace? pickup;
      HatodPlace? dropoff;
      await tester.pumpWidget(harness(
        onRepeat: (p, d) {
          pickup = p;
          dropoff = d;
        },
      ));
      await tester.pumpAndSettle();
      await tester.tap(find.text('Book again'));
      expect(pickup?.name, 'Ayala Center Cebu');
      expect(dropoff?.name, 'SM City Cebu');
    });

    testWidgets('repeat hidden without coordinates', (tester) async {
      final noCoords = detailJson()
        ..remove('pickupLat')
        ..remove('pickupLng')
        ..remove('dropoffLat')
        ..remove('dropoffLng');
      await tester.pumpWidget(harness(detail: noCoords));
      await tester.pumpAndSettle();
      expect(find.text('Book again'), findsNothing);
    });

    testWidgets('return books the swapped endpoints', (tester) async {
      HatodPlace? pickup;
      HatodPlace? dropoff;
      await tester.pumpWidget(harness(
        onReturn: (p, d) {
          pickup = p;
          dropoff = d;
        },
      ));
      await tester.pumpAndSettle();
      await tester.tap(find.text('Return trip'));
      expect(pickup?.name, 'SM City Cebu');
      expect(dropoff?.name, 'Ayala Center Cebu');
    });

    testWidgets('receipt breaks down fare, tip, total, and method',
        (tester) async {
      final tipped = detailJson()
        ..['tipCentavos'] = 2000
        ..['paymentMethod'] = 'CASH';
      await tester.pumpWidget(harness(detail: tipped));
      await tester.pumpAndSettle();
      expect(find.text('Fare'), findsOneWidget);
      expect(find.text('₱80.00'), findsOneWidget);
      expect(find.text('Tip'), findsOneWidget);
      expect(find.text('₱20.00'), findsOneWidget);
      expect(find.text('₱100.00'), findsOneWidget);
      expect(find.text('Paid with Cash'), findsOneWidget);
    });

    testWidgets('receipt hides the tip row without a tip', (tester) async {
      await tester.pumpWidget(harness());
      await tester.pumpAndSettle();
      expect(find.text('Tip'), findsNothing);
      // Fare and total lines agree when there is no tip.
      expect(find.text('₱80.00'), findsNWidgets(2));
    });

    testWidgets('return hidden without coordinates', (tester) async {
      final noCoords = detailJson()
        ..remove('pickupLat')
        ..remove('pickupLng')
        ..remove('dropoffLat')
        ..remove('dropoffLng');
      await tester.pumpWidget(harness(detail: noCoords));
      await tester.pumpAndSettle();
      expect(find.text('Return trip'), findsNothing);
    });
  });
}
