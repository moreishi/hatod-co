import 'package:flutter/material.dart';
import '../constants/app_constants.dart';

/// Spec §3 Wallet hero: green card, amount 24/700, Top Up white/green.
class WalletHero extends StatelessWidget {
  final String amount;
  final VoidCallback? onTopUp;

  const WalletHero({super.key, required this.amount, this.onTopUp});

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: BrandColors.primary,
        borderRadius: BorderRadius.circular(AppRadius.card),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text('Wallet Balance',
              style: TextStyle(color: Colors.white70, fontSize: 12)),
          const SizedBox(height: 4),
          Text(amount,
              style: const TextStyle(
                  color: Colors.white, fontSize: 24, fontWeight: FontWeight.w700)),
          const SizedBox(height: 12),
          SizedBox(
            height: 36,
            child: FilledButton(
              onPressed: onTopUp,
              style: FilledButton.styleFrom(
                backgroundColor: Colors.white,
                foregroundColor: BrandColors.primary,
              ),
              child: const Text('Top Up'),
            ),
          ),
        ],
      ),
    );
  }
}
