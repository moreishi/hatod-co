import 'package:flutter/material.dart';
import 'core/config/app_config.dart';
import 'core/network/api_client.dart';
import 'core/storage/session_store.dart';
import 'core/theme/app_theme.dart';
import 'features/auth/data/auth_repository.dart';
import 'features/auth/domain/role_routing.dart';
import 'features/auth/domain/session.dart';
import 'features/auth/presentation/create_profile_screen.dart';
import 'features/auth/presentation/login_screen.dart';
import 'features/auth/presentation/otp_screen.dart';
import 'features/auth/presentation/permissions_screen.dart';
import 'features/auth/presentation/signup_screen.dart';
import 'features/auth/presentation/session_scope.dart';
import 'features/auth/presentation/splash_screen.dart';
import 'features/auth/presentation/welcome_screen.dart';
import 'features/driver/data/driver_repository.dart';
import 'features/driver/presentation/driver_home_screen.dart';
import 'features/rider/presentation/rider_home_screen.dart';

void main() {
  runApp(HailingApp(store: PrefsSessionStore()));
}

/// Top-level route after splash resolution (hatod-ui-spec §1 AuthStack).
enum AppRoute {
  splash,
  welcome,
  signup,
  otp,
  createProfile,
  permissions,
  loginOtp,
  home
}

class _HailingAppState extends State<HailingApp> {
  late final AuthRepository _auth;
  AppRoute _route = AppRoute.splash;
  Session? _session;
  String _signupPhone = '';

  @override
  void initState() {
    super.initState();
    final config = AppConfig.fromEnvironment();
    _auth = AuthRepository(
      api: ApiClient(baseUrl: config.apiUrl),
      store: widget.store ?? MemorySessionStore(),
    );
  }

  void _onSplashResolved(Session? session) {
    if (session == null) {
      setState(() => _route = AppRoute.welcome);
    } else {
      setState(() {
        _session = session;
        _route = AppRoute.home;
      });
    }
  }

  void _onAuthenticated(Session session) => setState(() {
        _session = session;
        _route = AppRoute.home;
      });

  @override
  Widget build(BuildContext context) {
    return SessionScope(
      auth: _auth,
      child: MaterialApp(
        title: 'HATOD',
        theme: AppTheme.light(),
        home: switch (_route) {
          AppRoute.splash => SplashScreen(auth: _auth, onResolved: _onSplashResolved),
          AppRoute.welcome => WelcomeScreen(
              // OTP-only auth: Log In goes straight to the OTP login.
              onLogin: () => setState(() => _route = AppRoute.loginOtp),
              onCreateAccount: () => setState(() => _route = AppRoute.signup),
            ),
          AppRoute.signup => SignupScreen(
              onContinue: (phone) => setState(() {
                _signupPhone = phone;
                _route = AppRoute.otp;
              }),
            ),
          AppRoute.otp => OtpScreen(
              phone: _signupPhone.isEmpty ? '+63' : _signupPhone,
              onVerify: (_) async {
                setState(() => _route = AppRoute.createProfile);
              },
            ),
          AppRoute.createProfile => CreateProfileScreen(
              onContinue: (_) => setState(() => _route = AppRoute.permissions),
            ),
          AppRoute.permissions => PermissionsScreen(
              onAllow: () => setState(() => _route = AppRoute.loginOtp),
              onLater: () => setState(() => _route = AppRoute.loginOtp),
            ),
          AppRoute.loginOtp => LoginScreen(onAuthenticated: _onAuthenticated),
          AppRoute.home => () {
              final session = _session!;
              return homeFor(session) == HomeDestination.driverHome
                  ? DriverHomeScreen(
                      userId: session.sub,
                      repository: DriverRepository(api: _auth.api),
                    )
                  : RiderHomeScreen(userId: session.sub);
            }(),
        },
      ),
    );
  }
}

class HailingApp extends StatefulWidget {
  final SessionStore? store;

  const HailingApp({super.key, this.store});

  @override
  State<HailingApp> createState() => _HailingAppState();
}
