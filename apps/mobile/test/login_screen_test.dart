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

Widget harness({required AuthRepository auth, void Function(Session)? onAuth}) {
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
      await tester.pumpWidget(harness(
        auth: repo(MockClient((req) async {
          if (req.url.path.endsWith('/request')) {
            return http.Response(
                jsonEncode({'challengeId': 'ch-1', 'devCode': '123456'}), 200);
          }
          return http.Response(
              jsonEncode({'token': tokenFor(['RIDER'])}), 200);
        })),
        onAuth: (s) => authed = s,
      ));

      await tester.enterText(find.byType(TextField).first, '09170000001');
      await tester.tap(find.text('Send code'));
      await tester.pumpAndSettle();
      expect(find.textContaining('LocalStage code:'), findsOneWidget);

      await tester.enterText(find.byType(TextField).last, '123456');
      await tester.tap(find.text('Verify'));
      await tester.pumpAndSettle();
      expect(authed?.sub, 'u-9');
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
    testWidgets('shows login with no stored session', (tester) async {
      await tester.pumpWidget(const HailingApp());
      await tester.pumpAndSettle();
      expect(find.text('Send code'), findsOneWidget);
    });
  });
}
