import 'package:shared_preferences/shared_preferences.dart';

/// Session token storage behind an interface (mobile spec §6 local storage).
/// Memory store for tests; PrefsSessionStore persists across restarts.
abstract class SessionStore {
  Future<void> saveToken(String token);
  Future<String?> readToken();
  Future<void> clear();
}

class MemorySessionStore implements SessionStore {
  String? _token;

  MemorySessionStore();

  @override
  Future<void> saveToken(String token) async => _token = token;

  @override
  Future<String?> readToken() async => _token;

  @override
  Future<void> clear() async => _token = null;
}

/// Persists the session token in SharedPreferences so login survives restarts.
class PrefsSessionStore implements SessionStore {
  static const storageKey = 'hatod.session_token';

  @override
  Future<void> saveToken(String token) async {
    await (await SharedPreferences.getInstance()).setString(storageKey, token);
  }

  @override
  Future<String?> readToken() async =>
      (await SharedPreferences.getInstance()).getString(storageKey);

  @override
  Future<void> clear() async {
    await (await SharedPreferences.getInstance()).remove(storageKey);
  }
}
