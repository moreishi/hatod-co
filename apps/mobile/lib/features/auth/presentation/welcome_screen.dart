import 'package:flutter/material.dart';
import '../../../core/constants/app_constants.dart';
import '../../../core/widgets/hatod_button.dart';

/// Entry point for unauthenticated users.
/// Spec §9: photo cover top 70% + HATOD green, Fast.Safe.Reliable 20/700,
/// Get Started accent + Log In outline.
class WelcomeScreen extends StatelessWidget {
  final VoidCallback onLogin;
  final VoidCallback onCreateAccount;

  const WelcomeScreen({super.key, required this.onLogin, required this.onCreateAccount});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Column(
        children: [
          Expanded(
            flex: 7,
            child: Container(
              width: double.infinity,
              color: BrandColors.mapBase,
              child: const SafeArea(
                child: Column(
                  children: [
                    SizedBox(height: 12),
                    Text('HATOD',
                        key: Key('brandName'),
                        style: TextStyle(
                            fontSize: 22,
                            fontWeight: FontWeight.w800,
                            color: BrandColors.primary,
                            letterSpacing: 1.5)),
                    Spacer(),
                    Icon(Icons.two_wheeler, size: 96, color: BrandColors.primary),
                    SizedBox(height: 12),
                    Text('Fast. Safe. Reliable.',
                        style: TextStyle(
                            fontSize: 20,
                            fontWeight: FontWeight.w700,
                            color: BrandColors.ink)),
                    Text('Motorcycle hailing across General Santos City.',
                        style: TextStyle(fontSize: 14, color: BrandColors.secondary)),
                    SizedBox(height: 24),
                  ],
                ),
              ),
            ),
          ),
          Expanded(
            flex: 3,
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  HatodButton(
                      label: 'Get Started',
                      variant: HatodButtonVariant.accent,
                      onPressed: onCreateAccount),
                  const SizedBox(height: 12),
                  HatodButton(
                      label: 'Log In',
                      variant: HatodButtonVariant.secondary,
                      onPressed: onLogin),
                  const SizedBox(height: 8),
                  const Text('Already have an account? Log in above.',
                      textAlign: TextAlign.center,
                      style: TextStyle(fontSize: 12, color: BrandColors.secondary)),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}
