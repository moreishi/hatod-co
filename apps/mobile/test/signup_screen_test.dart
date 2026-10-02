import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:hailing_mobile/core/network/api_client.dart';
import 'package:hailing_mobile/core/storage/session_store.dart';
import 'package:hailing_mobile/features/auth/data/auth_repository.dart';
import 'package:hailing_mobile/features/auth/presentation/session_scope.dart';
import 'package:hailing_mobile/features/auth/presentation/signup_screen.dart';

Widget harness({
  required AuthRepository auth,
  void Function({
    required String phone,
    required String name,
    required String challengeId,
    String? devCode,
  })? onRegistered,
}) {
  return MaterialApp(
    home: SessionScope(
      auth: auth,
      child: SignupScreen(onRegistered: onRegistered),
    ),
  );
}

AuthRepository repo(MockClient handler) => AuthRepository(
      api: ApiClient(baseUrl: 'http://x', httpClient: handler),
      store: MemorySessionStore(),
    );

void main() {
  group('SignupScreen', () {
    testWidgets('validates phone and name', (tester) async {
      await tester.pumpWidget(harness(
          auth: repo(MockClient((_) async => http.Response('{}', 200)))));
      await tester.tap(find.text('Continue'));
      await tester.pump();
      expect(find.text('Phone required'), findsOneWidget);
      expect(find.text('Name required'), findsOneWidget);
    });

    testWidgets('explains what happens next', (tester) async {
      await tester.pumpWidget(harness(
          auth: repo(MockClient((_) async => http.Response('{}', 200)))));
      await tester.pumpAndSettle();
      expect(find.textContaining('6-digit code'), findsOneWidget);
      expect(find.textContaining('5 minutes'), findsOneWidget);
    });

    testWidgets('successful register hands the challenge over',
        (tester) async {
      String? gotPhone;
      String? gotName;
      String? gotChallenge;
      String? gotCode;
      await tester.pumpWidget(harness(
        auth: repo(MockClient((req) async {
          if (req.url.path.endsWith('/register')) {
            return http.Response(
                jsonEncode(
                    {'challengeId': 'ch-9', 'devCode': '654321'}),
                200);
          }
          return http.Response('{}', 404);
        })),
        onRegistered: ({
          required String phone,
          required String name,
          required String challengeId,
          String? devCode,
        }) {
          gotPhone = phone;
          gotName = name;
          gotChallenge = challengeId;
          gotCode = devCode;
        },
      ));
      await tester.enterText(
          find.byKey(const Key('signupPhone')), '09170000999');
      await tester.enterText(
          find.byKey(const Key('signupName')), 'Maria Santos');
      await tester.tap(find.text('Continue'));
      await tester.pumpAndSettle();
      expect(gotPhone, '09170000999');
      expect(gotName, 'Maria Santos');
      expect(gotChallenge, 'ch-9');
      expect(gotCode, '654321');
    });

    testWidgets('existing number points at login', (tester) async {
      await tester.pumpWidget(harness(
        auth: repo(MockClient((_) async => http.Response(
            jsonEncode({'message': 'account exists'}), 409))),
      ));
      await tester.enterText(
          find.byKey(const Key('signupPhone')), '09170000001');
      await tester.enterText(
          find.byKey(const Key('signupName')), 'Juan Cruz');
      await tester.tap(find.text('Continue'));
      await tester.pumpAndSettle();
      expect(
          find.text(
              'An account already uses this number. Please log in instead.'),
          findsOneWidget);
    });
  });
}
