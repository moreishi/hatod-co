import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:hailing_mobile/core/network/api_client.dart';
import 'package:hailing_mobile/core/storage/session_store.dart';
import 'package:hailing_mobile/features/auth/data/auth_repository.dart';
import 'package:hailing_mobile/features/auth/presentation/splash_screen.dart';
import 'package:hailing_mobile/features/auth/presentation/welcome_screen.dart';
import 'package:hailing_mobile/features/auth/domain/session.dart';
import 'package:hailing_mobile/main.dart';

String tokenFor(List<String> roles, {int ttlSec = 3600}) {
  final now = DateTime.now().millisecondsSinceEpoch ~/ 1000;
  final body = base64Url.encode(utf8.encode(
      jsonEncode({'sub': 'u-9', 'roles': roles, 'iat': now, 'exp': now + ttlSec})));
  return '$body.sig';
}

void main() {
  group('SplashScreen (spec §8)', () {
    testWidgets('shows brand + loader, resolves the stored session', (tester) async {
      final resolved = <Session?>[null];
      var called = false;
      final store = MemorySessionStore();
      await store.saveToken(tokenFor(['RIDER']));
      final auth = AuthRepository(
        api: ApiClient(
            baseUrl: 'http://x', httpClient: MockClient((_) async => http.Response('{}', 200))),
        store: store,
      );
      await tester.pumpWidget(MaterialApp(
        home: SplashScreen(
          auth: auth,
          onResolved: (s) {
            called = true;
            resolved[0] = s;
          },
        ),
      ));
      expect(find.byKey(const Key('brandName')), findsOneWidget);
      expect(find.byKey(const Key('loading')), findsOneWidget);
      await tester.pump(const Duration(seconds: 1));
      await tester.pump(const Duration(seconds: 1));
      expect(called, isTrue);
      expect(resolved[0]?.sub, 'u-9');
    });

    testWidgets('resolves null with no session', (tester) async {
      var called = false;
      var resolved = false;
      var gotNull = false;
      final auth = AuthRepository(
        api: ApiClient(
            baseUrl: 'http://x', httpClient: MockClient((_) async => http.Response('{}', 200))),
        store: MemorySessionStore(),
      );
      await tester.pumpWidget(MaterialApp(
        home: SplashScreen(
          auth: auth,
          onResolved: (s) {
            called = true;
            resolved = true;
            gotNull = s == null;
          },
        ),
      ));
      await tester.pump(const Duration(seconds: 1));
      await tester.pump(const Duration(seconds: 1));
      expect(called, isTrue);
      expect(resolved, isTrue);
      expect(gotNull, isTrue);
    });
  });

  group('WelcomeScreen (spec §9)', () {
    testWidgets('routes to login and create-account', (tester) async {
      var login = 0;
      var create = 0;
      await tester.pumpWidget(MaterialApp(
        home: WelcomeScreen(
          onLogin: () => login++,
          onCreateAccount: () => create++,
        ),
      ));
      expect(find.byKey(const Key('brandName')), findsOneWidget);
      await tester.tap(find.text('Log In'));
      await tester.tap(find.text('Get Started'));
      expect(login, 1);
      expect(create, 1);
    });
  });

  group('HailingApp bootstrap', () {
    testWidgets('no session shows welcome first', (tester) async {
      await tester.pumpWidget(const HailingApp());
      await tester.pumpAndSettle();
      expect(find.text('Fast. Safe. Reliable.'), findsOneWidget);
      await tester.tap(find.text('Log In'));
      await tester.pumpAndSettle();
      // OTP-only auth: Log In goes straight to the OTP login.
      expect(find.text('Send code'), findsOneWidget);
    });
  });
}
