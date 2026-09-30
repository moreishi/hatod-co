import 'package:flutter/material.dart';
import 'hatod_button.dart';

/// Spec §4 missing: no-driver-found, offline, GPS-off, payment-failed, empty.
class StateView extends StatelessWidget {
  final IconData icon;
  final String title;
  final String subtitle;
  final String? actionLabel;
  final VoidCallback? onAction;

  const StateView({
    super.key,
    required this.icon,
    required this.title,
    required this.subtitle,
    this.actionLabel,
    this.onAction,
  });

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(icon, size: 48, color: Colors.grey),
            const SizedBox(height: 12),
            Text(title,
                style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w700)),
            const SizedBox(height: 4),
            Text(subtitle,
                textAlign: TextAlign.center,
                style: const TextStyle(fontSize: 14, color: Colors.grey)),
            if (actionLabel != null) ...[
              const SizedBox(height: 16),
              HatodButton(label: actionLabel!, onPressed: onAction),
            ],
          ],
        ),
      ),
    );
  }
}

class NoDriverView extends StatelessWidget {
  final VoidCallback? onRetry;
  const NoDriverView({super.key, this.onRetry});
  @override
  Widget build(BuildContext context) => StateView(
      icon: Icons.search_off,
      title: 'No driver found',
      subtitle: 'Try again in a moment.',
      actionLabel: 'Retry',
      onAction: onRetry);
}

class OfflineView extends StatelessWidget {
  final VoidCallback? onRetry;
  const OfflineView({super.key, this.onRetry});
  @override
  Widget build(BuildContext context) => StateView(
      icon: Icons.wifi_off,
      title: 'No connection',
      subtitle: 'Check your internet and try again.',
      actionLabel: 'Retry',
      onAction: onRetry);
}

class GpsOffView extends StatelessWidget {
  final VoidCallback? onEnable;
  const GpsOffView({super.key, this.onEnable});
  @override
  Widget build(BuildContext context) => StateView(
      icon: Icons.location_off,
      title: 'Location is off',
      subtitle: 'Turn on GPS to find nearby drivers.',
      actionLabel: 'Enable',
      onAction: onEnable);
}
