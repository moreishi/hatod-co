import 'dart:convert';

/// Decoded API session token (mirrors the backend HMAC payload).
class Session {
  final String sub;
  final List<String> roles;
  final DateTime exp;

  const Session({required this.sub, required this.roles, required this.exp});

  bool get isExpired => DateTime.now().isAfter(exp);

  bool get isDriver => roles.any((r) => r.startsWith('DRIVER:'));
  bool get isAdmin => roles.any((r) => r.startsWith('ADMIN:'));
  bool get isAgencyStaff => roles.any((r) => r.startsWith('AGENCY:'));

  /// Decode without verifying (verification is the backend's job).
  static Session? decode(String token) {
    try {
      final parts = token.split('.');
      if (parts.length != 2) return null;
      final normalized = parts[0].replaceAll('-', '+').replaceAll('_', '/');
      final padded = normalized + '=' * ((4 - normalized.length % 4) % 4);
      final payload = jsonDecode(utf8.decode(base64Decode(padded))) as Map<String, dynamic>;
      final session = Session(
        sub: payload['sub'] as String,
        roles: List<String>.from(payload['roles'] as List),
        exp: DateTime.fromMillisecondsSinceEpoch((payload['exp'] as int) * 1000),
      );
      return session.isExpired ? null : session;
    } catch (_) {
      return null;
    }
  }
}
