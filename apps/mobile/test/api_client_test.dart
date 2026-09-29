import 'dart:convert';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:hailing_mobile/core/network/api_client.dart';
import 'package:hailing_mobile/core/network/api_exception.dart';

void main() {
  group('ApiClient', () {
    test('sends the bearer token and decodes JSON', () async {
      String? auth;
      final client = ApiClient(
        baseUrl: 'http://x',
        httpClient: MockClient((req) async {
          auth = req.headers['authorization'];
          return http.Response(jsonEncode({'ok': true}), 200);
        }),
      );
      client.setToken('tok');
      expect(await client.get('/a'), {'ok': true});
      expect(auth, 'Bearer tok');
    });

    test('maps 401/403/404/network to session-safe errors', () async {
      Future<ApiException> code(int status) async {
        final client = ApiClient(
          baseUrl: 'http://x',
          httpClient: MockClient((_) async => http.Response('{}', status)),
        );
        try {
          await client.get('/a');
        } on ApiException catch (e) {
          return e;
        }
        throw StateError('no throw');
      }

      expect((await code(401)).userMessage, contains('Session expired'));
      expect((await code(403)).userMessage, contains('do not have access'));
      expect((await code(404)).statusCode, 404);

      final offline = ApiClient(
        baseUrl: 'http://x',
        httpClient: MockClient((_) async => throw const SocketExceptionClosed()),
      );
      try {
        await offline.get('/a');
        fail('expected throw');
      } on ApiException catch (e) {
        expect(e.userMessage, contains('No connection'));
      }
    });
  });
}

class SocketExceptionClosed implements Exception {
  const SocketExceptionClosed();
  @override
  String toString() => 'closed';
}
