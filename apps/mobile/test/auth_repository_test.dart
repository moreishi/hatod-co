import 'dart:convert';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:hailing_mobile/core/network/api_client.dart';
import 'package:hailing_mobile/core/storage/session_store.dart';
import 'package:hailing_mobile/features/auth/data/auth_repository.dart';

String tokenFor(List<String> roles) {
  final now = DateTime.now().millisecondsSinceEpoch ~/ 1000;
  final body = base64Url.encode(
      utf8.encode(jsonEncode({'sub': 'u-9', 'roles': roles, 'iat': now, 'exp': now + 3600})));
  return '$body.sig';
}

void main() {
  group('AuthRepository', () {
    test('request → verify stores the session and arms the client', () async {
      String? authed;
      final api = ApiClient(
        baseUrl: 'http://x',
        httpClient: MockClient((req) async {
          authed = req.headers['authorization'];
          if (req.url.path.endsWith('/request')) {
            return http.Response(jsonEncode({'challengeId': 'ch-1', 'devCode': '123456'}), 200);
          }
          return http.Response(jsonEncode({'token': tokenFor(['RIDER'])}), 200);
        }),
      );
      final store = MemorySessionStore();
      final repo = AuthRepository(api: api, store: store);

      final challenge = await repo.requestOtp('09170000001');
      expect(challenge.challengeId, 'ch-1');
      final session = await repo.verifyOtp(challenge.challengeId, '123456');
      expect(session.sub, 'u-9');
      expect(await store.readToken(), isNotNull);
      expect(authed, isNull); // verify call itself is unauthenticated
    });

    test('register creates the account and returns the challenge', () async {
      Map<String, dynamic>? sent;
      final api = ApiClient(
        baseUrl: 'http://x',
        httpClient: MockClient((req) async {
          sent = jsonDecode(req.body) as Map<String, dynamic>;
          return http.Response(
              jsonEncode({'challengeId': 'ch-9'}), 200);
        }),
      );
      final repo = AuthRepository(api: api, store: MemorySessionStore());
      final challenge =
          await repo.register('09170000999', displayName: 'Maria');
      expect(challenge.challengeId, 'ch-9');
      expect(sent?['phone'], '09170000999');
      expect(sent?['displayName'], 'Maria');
    });

    test('registerDeviceToken posts the FCM token', () async {
      Map<String, dynamic>? sent;
      String? path;
      final api = ApiClient(
        baseUrl: 'http://x',
        httpClient: MockClient((req) async {
          path = req.url.path;
          sent = jsonDecode(req.body) as Map<String, dynamic>;
          return http.Response(jsonEncode({}), 200);
        }),
      );
      final repo = AuthRepository(api: api, store: MemorySessionStore());
      await repo.registerDeviceToken('fcm-9');
      expect(path, endsWith('/device-token'));
      expect(sent?['token'], 'fcm-9');
    });

    test('restore drops expired tokens and signs out cleanly', () async {
      final api = ApiClient(baseUrl: 'http://x', httpClient: MockClient((_) async {
        return http.Response('{}', 200);
      }));
      final store = MemorySessionStore();
      final repo = AuthRepository(api: api, store: store);
      expect(await repo.restore(), isNull);
      await store.saveToken(tokenFor(['RIDER']));
      expect((await repo.restore())!.sub, 'u-9');
      await repo.signOut();
      expect(await store.readToken(), isNull);
    });
    test('signOut revokes the server session, then clears local state', () async {
      String? path;
      final api = ApiClient(
        baseUrl: 'http://x',
        httpClient: MockClient((req) async {
          path = req.url.path;
          return http.Response('{"revoked":true}', 200);
        }),
      );
      final store = MemorySessionStore();
      final repo = AuthRepository(api: api, store: store);
      await store.saveToken(tokenFor(['RIDER']));
      await repo.signOut();
      expect(path, endsWith('/api/auth/logout'));
      expect(await store.readToken(), isNull);
    });

    test('signOut still clears local state when the server call fails', () async {
      final api = ApiClient(
        baseUrl: 'http://x',
        httpClient: MockClient((_) async => http.Response('boom', 500)),
      );
      final store = MemorySessionStore();
      final repo = AuthRepository(api: api, store: store);
      await store.saveToken(tokenFor(['RIDER']));
      await repo.signOut();
      expect(await store.readToken(), isNull);
    });
  });
}
