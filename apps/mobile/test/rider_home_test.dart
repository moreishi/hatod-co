import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:hailing_mobile/core/network/api_client.dart';
import 'package:hailing_mobile/core/storage/session_store.dart';
import 'package:hailing_mobile/features/auth/data/auth_repository.dart';
import 'package:hailing_mobile/features/auth/presentation/session_scope.dart';
import 'package:hailing_mobile/features/rider/presentation/rider_home_screen.dart';

Widget harness(AuthRepository auth) {
  return MaterialApp(
    home: SessionScope(auth: auth, child: const RiderHomeScreen(userId: 'u-1')),
  );
}

void main() {
  testWidgets('quote then book shows the active ride', (tester) async {
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
              'pickupLabel': 'Ayala Center Cebu',
              'dropoffLabel': 'SM City Cebu',
              'fareCentavos': 8000
            }),
            200);
      }),
    );
    final auth = AuthRepository(api: api, store: MemorySessionStore());
    await tester.pumpWidget(harness(auth));

    await tester.tap(find.text('Get fare'));
    await tester.pumpAndSettle();
    expect(find.byKey(const Key('fare')), findsOneWidget);

    await tester.tap(find.text('Book ride'));
    await tester.pumpAndSettle();
    expect(find.byKey(const Key('activeRide')), findsOneWidget);
  });
}
