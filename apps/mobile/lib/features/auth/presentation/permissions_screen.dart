import 'package:flutter/material.dart';
import '../../../core/widgets/hatod_button.dart';

/// Spec §4-06 Permissions: map illustration + Allow Location + Maybe Later.
/// Android: rationale + FINE_LOCATION system dialog handled by caller.
class PermissionsScreen extends StatelessWidget {
  final VoidCallback onAllow;
  final VoidCallback onLater;

  const PermissionsScreen(
      {super.key, required this.onAllow, required this.onLater});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.white,
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              const Expanded(
                child: Center(
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Icon(Icons.location_on,
                          size: 72, color: Color(0xFF0E4D2E)),
                      SizedBox(height: 12),
                      Text('Enable location',
                          style: TextStyle(
                              fontSize: 20, fontWeight: FontWeight.w700)),
                      SizedBox(height: 8),
                      Text(
                        'We need your location to find nearby drivers and track trips.',
                        textAlign: TextAlign.center,
                        style: TextStyle(fontSize: 14, color: Colors.grey),
                      ),
                    ],
                  ),
                ),
              ),
              HatodButton(label: 'Allow Location', onPressed: onAllow),
              const SizedBox(height: 12),
              HatodButton(
                label: 'Maybe Later',
                variant: HatodButtonVariant.secondary,
                onPressed: onLater,
              ),
            ],
          ),
        ),
      ),
    );
  }
}
