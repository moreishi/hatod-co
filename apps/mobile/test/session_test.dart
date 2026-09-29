import 'dart:convert';
import 'package:flutter_test/flutter_test.dart';
import 'package:hailing_mobile/features/auth/domain/role_routing.dart';
import 'package:hailing_mobile/features/auth/domain/session.dart';

String sign(Map<String, dynamic> payload) {
  final body = base64Url.encode(utf8.encode(jsonEncode(payload)));
  return '$body.sig';
}

Map<String, dynamic> payload(List<String> roles, {int ttlSec = 3600}) {
  final now = DateTime.now().millisecondsSinceEpoch ~/ 1000;
  return {'sub': 'u-1', 'roles': roles, 'iat': now, 'exp': now + ttlSec};
}

void main() {
  group('Session.decode', () {
    test('decodes sub, roles, and flags', () {
      final session = Session.decode(sign(payload(['RIDER', 'DRIVER:d-1'])))!;
      expect(session.sub, 'u-1');
      expect(session.isDriver, isTrue);
      expect(session.isAdmin, isFalse);
      expect(session.isAgencyStaff, isFalse);
    });

    test('rejects expired and malformed tokens', () {
      expect(Session.decode(sign(payload(['RIDER'], ttlSec: -10))), isNull);
      expect(Session.decode('garbage'), isNull);
      expect(Session.decode('a.b.c'), isNull);
    });
  });

  group('homeFor (role routing)', () {
    test('drivers go to driver home, others to rider home', () {
      expect(homeFor(Session.decode(sign(payload(['DRIVER:d-1'])))!),
          HomeDestination.driverHome);
      expect(homeFor(Session.decode(sign(payload(['RIDER'])))!),
          HomeDestination.riderHome);
      expect(homeFor(Session.decode(sign(payload(['AGENCY:a:OWNER'])))!),
          HomeDestination.riderHome);
    });
  });
}
