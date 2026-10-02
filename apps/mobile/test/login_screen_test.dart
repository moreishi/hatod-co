import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:hailing_mobile/core/network/api_client.dart';
import 'package:hailing_mobile/core/storage/session_store.dart';
import 'package:hailing_mobile/features/auth/data/auth_repository.dart';
import 'package:hailing_mobile/features/auth/domain/session.dart';
import 'package:hailing_mobile/features/auth/presentation/login_screen.dart';
import 'package:hailing_mobile/features/auth/presentation/session_scope.dart';
import 'package:hailing_mobile/main.dart';

String tokenFor(List<String> roles) {
  final now = DateTime.now().millisecondsSinceEpoch ~/ 1000;
  final body = base64Url.encode(utf8.encode(
      jsonEncode({'sub': 'u-9', 'roles': roles, 'iat': now, 'exp': now + 3600})));
  return '$body.sig';
}

Widget harness(
    {required AuthRepository auth,
    void Function(Session, String)? onAuth}) {
  return MaterialApp(
    home: SessionScope(
      auth: auth,
      child: LoginScreen(onAuthenticated: onAuth),
    ),
  );
}

AuthRepository repo(MockClient handler) => AuthRepository(
      api: ApiClient(baseUrl: 'http://x', httpClient: handler),
      store: MemorySessionStore(),
    );

void main() {
  group('LoginScreen', () {
    testWidgets('full OTP flow authenticates', (tester) async {
      Session? authed;
      String? authedPhone;
      await tester.pumpWidget(harness(
        auth: repo(MockClient((req) async {
          if (req.url.path.endsWith('/request')) {
            return http.Response(
                jsonEncode({'challengeId': 'ch-1', 'devCode': '123456'}), 200);
          }
          return http.Response(
              jsonEncode({'token': tokenFor(['RIDER'])}), 200);
        })),
        onAuth: (s, phone) {
          authed = s;
          authedPhone = phone;
        },
      ));

      await tester.enterText(find.byType(TextField).first, '09170000001');
      await tester.tap(find.text('Send code'));
      await tester.pumpAndSettle();
      expect(find.textContaining('LocalStage code:'), findsOneWidget);

      await tester.enterText(find.byType(TextField).last, '123456');
      await tester.tap(find.text('Verify'));
      await tester.pumpAndSettle();
      expect(authed?.sub, 'u-9');
      expect(authedPhone, '09170000001');
    });

    testWidgets('unknown number points to signup on request', (tester) async {
      await tester.pumpWidget(harness(
        auth: repo(MockClient((req) async {
          if (req.url.path.endsWith('/request')) {
            return http.Response(
                jsonEncode({'message': 'account not found'}), 404);
          }
          return http.Response('{}', 200);
        })),
      ));

      await tester.enterText(find.byType(TextField).first, '09000000000');
      await tester.tap(find.text('Send code'));
      await tester.pumpAndSettle();
      expect(find.text('No account for this number. Please sign up first.'),
          findsOneWidget);
    });

    testWidgets('offline request shows the connection error', (tester) async {
      await tester.pumpWidget(harness(
        auth: repo(MockClient((_) async =>
            throw http.ClientException('unreachable'))),
      ));

      await tester.enterText(find.byType(TextField).first, '09170000001');
      await tester.tap(find.text('Send code'));
      await tester.pumpAndSettle();
      expect(find.text('No connection. Please try again.'), findsOneWidget);
    });

    testWidgets('expired code asks for a new one', (tester) async {
      await tester.pumpWidget(harness(
        auth: repo(MockClient((req) async {
          if (req.url.path.endsWith('/request')) {
            return http.Response(jsonEncode({'challengeId': 'ch-1'}), 200);
          }
          return http.Response(jsonEncode({'message': 'code expired'}), 400);
        })),
      ));

      await tester.enterText(find.byType(TextField).first, '09170000001');
      await tester.tap(find.text('Send code'));
      await tester.pumpAndSettle();
      await tester.enterText(find.byType(TextField).last, '000000');
      await tester.tap(find.text('Verify'));
      await tester.pumpAndSettle();
      expect(find.text('Invalid or expired code. Please request a new one.'),
          findsOneWidget);
    });

    testWidgets('explains each step in plain language', (tester) async {
      await tester.pumpWidget(harness(
        auth: repo(MockClient((req) async {
          if (req.url.path.endsWith('/request')) {
            return http.Response(
                jsonEncode({'challengeId': 'ch-1', 'devCode': '123456'}), 200);
          }
          return http.Response(
              jsonEncode({'token': tokenFor(['RIDER'])}), 200);
        })),
      ));
      // Step 1 tells the user exactly what will happen.
      expect(find.textContaining('Step 1 of 2'), findsOneWidget);
      expect(find.textContaining('6-digit code'), findsOneWidget);
      await tester.enterText(find.byType(TextField).first, '09170000001');
      await tester.tap(find.text('Send code'));
      await tester.pumpAndSettle();
      // Step 2 names the number and the expiry.
      expect(find.textContaining('Step 2 of 2'), findsOneWidget);
      expect(find.textContaining('09170000001'), findsWidgets);
      expect(find.textContaining('5 minutes'), findsOneWidget);
    });

    testWidgets('wrong number starts over', (tester) async {
      await tester.pumpWidget(harness(
        auth: repo(MockClient((req) async {
          if (req.url.path.endsWith('/request')) {
            return http.Response(jsonEncode({'challengeId': 'ch-1'}), 200);
          }
          return http.Response(
              jsonEncode({'token': tokenFor(['RIDER'])}), 200);
        })),
      ));
      await tester.enterText(find.byType(TextField).first, '09000000000');
      await tester.tap(find.text('Send code'));
      await tester.pumpAndSettle();
      await tester.tap(find.text('Use a different number'));
      await tester.pumpAndSettle();
      expect(find.text('Send code'), findsOneWidget);
      expect(find.text('Verify'), findsNothing);
    });

    testWidgets('shows an error on bad code', (tester) async {
      await tester.pumpWidget(harness(
        auth: repo(MockClient((req) async {
          if (req.url.path.endsWith('/request')) {
            return http.Response(jsonEncode({'challengeId': 'ch-1'}), 200);
          }
          return http.Response(jsonEncode({'message': 'invalid code'}), 401);
        })),
      ));

      await tester.enterText(find.byType(TextField).first, '09170000001');
      await tester.tap(find.text('Send code'));
      await tester.pumpAndSettle();
      await tester.enterText(find.byType(TextField).last, '000000');
      await tester.tap(find.text('Verify'));
      await tester.pumpAndSettle();
      expect(find.text('Invalid code. Please try again.'), findsOneWidget);
    });
  });

  group('HailingApp bootstrap', () {
    testWidgets('shows welcome with no stored session', (tester) async {
      await tester.pumpWidget(const HailingApp());
      await tester.pumpAndSettle();
      expect(find.text('Fast. Safe. Reliable.'), findsOneWidget);
    });
  });
}
