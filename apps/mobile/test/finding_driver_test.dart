import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:hailing_mobile/core/network/api_client.dart';
import 'package:hailing_mobile/features/booking/data/booking_repository.dart';
import 'package:hailing_mobile/features/booking/domain/ride.dart';
import 'package:hailing_mobile/features/messaging/data/messaging_repository.dart';
import 'package:hailing_mobile/features/rider/presentation/finding_driver_screen.dart';

Map<String, dynamic> rideJson(String status, {String? driver}) => {
      'id': 'ride-1',
      'status': status,
      'pickupLabel': 'KCC Mall of Gensan',
      'dropoffLabel': 'SM City General Santos',
      'fareCentavos': 6000,
      if (driver != null) 'driver': {'user': {'displayName': driver}},
    };

class Harness {
  final List<Map<String, dynamic>> postedTransitions = [];
  int detailCalls = 0;
  late final BookingRepository booking;
  late final MessagingRepository messaging;
  final List<String> detailScript;

  Harness({this.detailScript = const ['REQUESTED']}) {
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
          if (path.endsWith('/ride-1')) {
            final status = detailScript[
                detailCalls.clamp(0, detailScript.length - 1)];
            detailCalls++;
            return http.Response(
                jsonEncode(rideJson(status,
                    driver: status == 'REQUESTED' ? null : 'Carlos Reyes')),
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

  FindingDriverScreen bareScreen({
    Future<Ride> Function()? rebook,
    Duration poll = const Duration(seconds: 1),
    Duration timeout = const Duration(seconds: 60),
  }) {
    return FindingDriverScreen(
      ride: Ride.fromJson(rideJson('REQUESTED')),
      booking: booking,
      messaging: messaging,
      myId: 'u-1',
      rebook:
          rebook ?? (() async => Ride.fromJson(rideJson('REQUESTED'))),
      pollInterval: poll,
      searchTimeout: timeout,
    );
  }

  Widget screen({
    Future<Ride> Function()? rebook,
    Duration poll = const Duration(seconds: 1),
    Duration timeout = const Duration(seconds: 60),
  }) {
    return MaterialApp(
      home: bareScreen(rebook: rebook, poll: poll, timeout: timeout),
    );
  }
}

void main() {
  group('FindingDriverScreen', () {
    testWidgets('shows map, radar card, and cancel', (tester) async {
      final h = Harness();
      await tester.pumpWidget(h.screen());
      await tester.pump(const Duration(seconds: 1));
      expect(find.byKey(const Key('map')), findsOneWidget);
      expect(find.text('Finding a driver…'), findsOneWidget);
      expect(find.byKey(const Key('findingCancel')), findsOneWidget);
      expect(find.byKey(const Key('findingElapsed')), findsOneWidget);
      // Reassurance: cancel is free and the wait is bounded.
      expect(
          find.text(
              'Free to cancel · most drivers accept within a minute.'),
          findsOneWidget);
    });

    testWidgets('cancel transitions CANCELLED then pops', (tester) async {
      final h = Harness();
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
      await tester.tap(find.byKey(const Key('findingCancel')));
      await tester.pump();
      await tester.pump(const Duration(milliseconds: 400));
      expect(
          h.postedTransitions
              .where((t) => t['to'] == 'CANCELLED')
              .length,
          1);
      expect(find.text('open'), findsOneWidget);
    });

    testWidgets('driver assigned hands off to the trip screen', (tester) async {
      final h = Harness(detailScript: const ['REQUESTED', 'ASSIGNED']);
      await tester.pumpWidget(h.screen());
      await tester.pump(const Duration(seconds: 1));
      expect(find.text('Finding a driver…'), findsOneWidget);
      await tester.pump(const Duration(seconds: 2));
      await tester.pump();
      await tester.pump(const Duration(milliseconds: 400));
      expect(find.text('Driver arriving'), findsOneWidget);
      expect(find.text('Carlos Reyes'), findsOneWidget);
      // Handoff replaces the finding route: safe to settle now.
      await tester.pumpAndSettle();
      expect(find.text('Finding a driver…'), findsNothing);
    });

    testWidgets('backend NO_DRIVERS is rescued by a late assign', (tester) async {
      final h = Harness(
          detailScript: const ['NO_DRIVERS', 'NO_DRIVERS', 'ASSIGNED']);
      await tester.pumpWidget(h.screen());
      await tester.pump(const Duration(seconds: 1));
      // Still searching (rescuable), not failed.
      expect(find.text('Finding a driver…'), findsOneWidget);
      expect(find.text('No drivers found'), findsNothing);
      await tester.pump(const Duration(seconds: 4));
      await tester.pump();
      await tester.pump(const Duration(milliseconds: 400));
      expect(find.text('Driver arriving'), findsOneWidget);
      expect(find.text('Carlos Reyes'), findsOneWidget);
      await tester.pumpAndSettle();
      expect(find.text('Finding a driver…'), findsNothing);
    });

    testWidgets('timeout shows no-drivers with working retry', (tester) async {
      var rebooks = 0;
      final h = Harness();
      await tester.pumpWidget(h.screen(
        rebook: () async {
          rebooks++;
          return Ride.fromJson(rideJson('REQUESTED'));
        },
        poll: const Duration(seconds: 1),
        timeout: const Duration(seconds: 3),
      ));
      await tester.pump(const Duration(seconds: 1));
      expect(find.text('Finding a driver…'), findsOneWidget);
      await tester.pump(const Duration(seconds: 3));
      await tester.pump();
      expect(find.text('No drivers found'), findsOneWidget);
      await tester.tap(find.text('Retry'));
      await tester.pump(const Duration(seconds: 1));
      expect(rebooks, 1);
      expect(find.text('Finding a driver…'), findsOneWidget);
    });
  });
}
