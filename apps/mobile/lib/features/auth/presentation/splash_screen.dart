import 'package:flutter/material.dart';
import '../../../core/constants/app_constants.dart';
import '../data/auth_repository.dart';
import '../domain/session.dart';

/// App launch: initialize, load + validate the session, then navigate
/// Spec §8: fullscreen #0E4D2E, bike white + HATOD 32/800 white + tagline.
class SplashScreen extends StatefulWidget {
  final AuthRepository auth;
  final void Function(Session?) onResolved;

  const SplashScreen({super.key, required this.auth, required this.onResolved});

  @override
  State<SplashScreen> createState() => _SplashScreenState();
}

class _SplashScreenState extends State<SplashScreen> {
  @override
  void initState() {
    super.initState();
    widget.auth.restore().then((session) {
      if (mounted) widget.onResolved(session);
    });
  }

  @override
  Widget build(BuildContext context) {
    return const Scaffold(
      backgroundColor: BrandColors.primary,
      body: SafeArea(
        child: Center(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(Icons.two_wheeler, size: 72, color: Colors.white),
              SizedBox(height: 12),
              Text('HATOD',
                  key: Key('brandName'),
                  style: TextStyle(
                      fontSize: 32,
                      fontWeight: FontWeight.w800,
                      color: Colors.white,
                      letterSpacing: 2)),
              SizedBox(height: 4),
              Text('Ride Safe. Go Further.',
                  style: TextStyle(fontSize: 14, color: Colors.white70)),
              SizedBox(height: 24),
              CircularProgressIndicator(
                  key: Key('loading'),
                  color: Colors.white),
            ],
          ),
        ),
      ),
    );
  }
}
