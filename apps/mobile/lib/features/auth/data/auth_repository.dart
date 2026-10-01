import '../../../core/network/api_client.dart';
import '../../../core/storage/session_store.dart';
import '../domain/session.dart';

/// OTP authentication against the real backend (mobile spec §11–12).
class AuthRepository {
  final ApiClient api;
  final SessionStore store;

  AuthRepository({required this.api, required this.store});

  /// Returns the challenge id; devCode is present on LocalStage only.
  Future<({String challengeId, String? devCode})> requestOtp(String phone) async {
    final body = await api.post('/api/auth/otp/request', {'phone': phone})
        as Map<String, dynamic>;
    return (
      challengeId: body['challengeId'] as String,
      devCode: body['devCode'] as String?,
    );
  }

  Future<Session> verifyOtp(String challengeId, String code) async {
    final body = await api.post('/api/auth/otp/verify', {
      'challengeId': challengeId,
      'code': code,
    }) as Map<String, dynamic>;
    final token = body['token'] as String;
    final session = Session.decode(token);
    if (session == null) throw const _InvalidToken();
    await store.saveToken(token);
    api.setToken(token);
    return session;
  }

  Future<Session?> restore() async {
    final token = await store.readToken();
    if (token == null) return null;
    final session = Session.decode(token);
    if (session == null) {
      await store.clear();
      return null;
    }
    api.setToken(token);
    return session;
  }

  Future<void> signOut() async {
    // Best-effort server revocation: the local session clears even offline.
    try {
      await api.post('/api/auth/logout', {});
      // ignore: empty_catches
    } catch (_) {}
    await store.clear();
    api.setToken(null);
  }
}

class _InvalidToken implements Exception {
  const _InvalidToken();
  @override
  String toString() => 'Invalid session token';
}
