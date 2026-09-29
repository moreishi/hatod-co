import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:hailing_mobile/core/network/api_client.dart';
import 'package:hailing_mobile/features/driver/data/driver_repository.dart';
import 'package:hailing_mobile/features/driver/presentation/driver_home_screen.dart';

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
  });

  group('DriverHomeScreen', () {
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

      await tester.tap(find.text('→ DRIVER_EN_ROUTE'));
      await tester.pumpAndSettle();
      expect(find.text('DRIVER_EN_ROUTE'), findsWidgets);
    });
  });
}
