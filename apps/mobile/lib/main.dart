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
  String _signupChallenge = '';
  String? _signupDevCode;
  String _loginPhone = '';

  /// Rider/driver mode override; null follows the session roles.
  HomeDestination? _mode;

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
        _mode = null;
        _route = AppRoute.home;
      });
    }
  }

  void _onAuthenticated(Session session, String phone) => setState(() {
        _session = session;
        _loginPhone = phone;
        _mode = null;
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
              onRegistered: ({
                required String phone,
                required String name,
                required String challengeId,
                String? devCode,
              }) =>
                  setState(() {
                _signupPhone = phone;
                _signupChallenge = challengeId;
                _signupDevCode = devCode;
                _loginPhone = phone;
                _route = AppRoute.otp;
              }),
            ),
          AppRoute.otp => OtpScreen(
              phone: _signupPhone.isEmpty ? '+63' : _signupPhone,
              devCode: _signupDevCode,
              onVerify: (code) async {
                final session = await _auth.verifyOtp(
                    _signupChallenge, code);
                _onAuthenticated(session, _signupPhone);
                setState(() => _route = AppRoute.permissions);
              },
            ),
          AppRoute.createProfile => CreateProfileScreen(
              onContinue: (_) => setState(() => _route = AppRoute.permissions),
            ),
          AppRoute.permissions => PermissionsScreen(
              onAllow: () => setState(() => _route = AppRoute.home),
              onLater: () => setState(() => _route = AppRoute.home),
            ),
          AppRoute.loginOtp => LoginScreen(onAuthenticated: _onAuthenticated),
          AppRoute.home => () {
              final session = _session!;
              final dest = _mode ?? homeFor(session);
              Future<void> signOut() async {
                await _auth.signOut();
                setState(() {
                  _session = null;
                  _mode = null;
                  _route = AppRoute.welcome;
                });
              }

              return dest == HomeDestination.driverHome
                  ? DriverHomeScreen(
                      userId: session.sub,
                      phone: _loginPhone,
                      repository: DriverRepository(api: _auth.api),
                      onSignOut: signOut,
                      onSwitchToRider: () => setState(
                          () => _mode = HomeDestination.riderHome),
                    )
                  : RiderHomeScreen(
                      userId: session.sub,
                      phone: _loginPhone,
                      canDrive: session.isDriver,
                      onSwitchToDriver: session.isDriver
                          ? () => setState(
                              () => _mode = HomeDestination.driverHome)
                          : null,
                      onSignOut: signOut,
                    );
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
