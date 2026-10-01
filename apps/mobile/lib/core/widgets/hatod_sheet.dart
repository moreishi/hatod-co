import 'package:flutter/material.dart';
import '../constants/app_constants.dart';

/// Spec §3 Bottom sheet w-full white rounded-t-20 p-4 + handle 40x4.
class HatodSheet extends StatelessWidget {
  final Widget child;

  const HatodSheet({super.key, required this.child});

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(16),
      decoration: const BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.only(
          topLeft: Radius.circular(AppRadius.sheetTop),
          topRight: Radius.circular(AppRadius.sheetTop),
        ),
        boxShadow: [
          BoxShadow(color: Color(0x14000000), blurRadius: 12, offset: Offset(0, -2)),
        ],
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Container(
            width: 40,
            height: 4,
            decoration: BoxDecoration(
              color: BrandColors.borderAlt,
              borderRadius: BorderRadius.circular(2),
            ),
          ),
          const SizedBox(height: 12),
          child,
        ],
      ),
    );
  }
}

/// Fare / location row: icon-pin + label grey + address + Change link.
class FareLocationRow extends StatelessWidget {
  final IconData icon;
  final String label;
  final String address;
  final VoidCallback? onChange;

  const FareLocationRow({
    super.key,
    required this.icon,
    required this.label,
    required this.address,
    this.onChange,
  });

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Icon(icon, size: 20, color: BrandColors.primary),
        const SizedBox(width: 8),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(label,
                  style: const TextStyle(fontSize: 12, color: BrandColors.secondary)),
              Text(address,
                  style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w500),
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis),
            ],
          ),
        ),
        if (onChange != null)
          TextButton(
            onPressed: onChange,
            child: const Text('Change',
                style: TextStyle(color: BrandColors.success)),
          ),
      ],
    );
  }
}
