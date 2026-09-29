import 'package:flutter/material.dart';
import 'core/config/app_config.dart';
import 'core/network/api_client.dart';
import 'core/storage/session_store.dart';
import 'core/theme/app_theme.dart';
import 'features/auth/data/auth_repository.dart';
import 'features/auth/domain/role_routing.dart';
import 'features/auth/domain/session.dart';
import 'features/auth/presentation/login_screen.dart';
import 'features/auth/presentation/session_scope.dart';
import 'features/driver/presentation/driver_home_screen.dart';
import 'features/rider/presentation/rider_home_screen.dart';

void main() {
  runApp(const HailingApp());
}

class HailingApp extends StatefulWidget {
  const HailingApp({super.key});

  @override
  State<HailingApp> createState() => _HailingAppState();
}

class _HailingAppState extends State<HailingApp> {
  late final AuthRepository _auth;
  Future<Session?>? _bootstrap;

  @override
  void initState() {
    super.initState();
    final config = AppConfig.fromEnvironment();
    _auth = AuthRepository(
      api: ApiClient(baseUrl: config.apiUrl),
      store: MemorySessionStore(),
    );
    _bootstrap = _auth.restore();
  }

  void _onAuthenticated(Session session) => setState(() {
        _bootstrap = Future.value(session);
      });

  @override
  Widget build(BuildContext context) {
    return SessionScope(
      auth: _auth,
      child: MaterialApp(
        title: 'Hailing',
        theme: AppTheme.light(),
        home: FutureBuilder<Session?>(
          future: _bootstrap,
          builder: (context, snapshot) {
            if (!snapshot.hasData) {
              if (snapshot.connectionState != ConnectionState.done) {
                return const Scaffold(
                    body: Center(child: CircularProgressIndicator()));
              }
              return LoginScreen(onAuthenticated: _onAuthenticated);
            }
            final session = snapshot.data!;
            return homeFor(session) == HomeDestination.driverHome
                ? DriverHomeScreen(userId: session.sub)
                : RiderHomeScreen(userId: session.sub);
          },
        ),
      ),
    );
  }
}
