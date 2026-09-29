/// Session token storage behind an interface (mobile spec §6 local storage).
/// Memory store for tests; secure storage lands with device integration.
abstract class SessionStore {
  Future<void> saveToken(String token);
  Future<String?> readToken();
  Future<void> clear();
}

class MemorySessionStore implements SessionStore {
  String? _token;

  @override
  Future<void> saveToken(String token) async => _token = token;

  @override
  Future<String?> readToken() async => _token;

  @override
  Future<void> clear() async => _token = null;
}
