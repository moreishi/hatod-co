import 'package:flutter_test/flutter_test.dart';
import 'package:hailing_mobile/core/storage/session_store.dart';
import 'package:shared_preferences/shared_preferences.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  test('PrefsSessionStore persists the token across instances', () async {
    SharedPreferences.setMockInitialValues({});
    await PrefsSessionStore().saveToken('tok-123');
    // A new instance (e.g. after app restart) still sees the token.
    expect(await PrefsSessionStore().readToken(), 'tok-123');
    await PrefsSessionStore().clear();
    expect(await PrefsSessionStore().readToken(), isNull);
  });
}
