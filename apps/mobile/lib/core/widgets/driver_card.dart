import 'package:flutter/material.dart';
import '../constants/app_constants.dart';

/// Spec §3 Driver card: avatar 48 + name/rating/plate/ETA + Message/Cancel pills.
class DriverCard extends StatelessWidget {
  final String name;
  final double rating;
  final int rides;
  final String vehicle;
  final String plate;
  final String eta;
  final VoidCallback? onMessage;
  final VoidCallback? onCancel;

  const DriverCard({
    super.key,
    required this.name,
    required this.rating,
    required this.rides,
    required this.vehicle,
    required this.plate,
    required this.eta,
    this.onMessage,
    this.onCancel,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(AppRadius.card),
        border: Border.all(color: BrandColors.borderAlt),
        boxShadow: const [
          BoxShadow(color: Color(0x14000000), blurRadius: 12, offset: Offset(0, -2)),
        ],
      ),
      child: Row(
        children: [
          const CircleAvatar(radius: 24, child: Icon(Icons.person)),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(name,
                    style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w600)),
                Text('$rating ($rides rides)',
                    style:
                        const TextStyle(fontSize: 12, color: BrandColors.secondary)),
                Text('$vehicle | $plate',
                    style:
                        const TextStyle(fontSize: 12, color: BrandColors.secondary)),
                Text(eta,
                    style: const TextStyle(
                        fontSize: 13,
                        fontWeight: FontWeight.w600,
                        color: BrandColors.success)),
              ],
            ),
          ),
          Column(
            children: [
              OutlinedButton(onPressed: onMessage, child: const Text('Message')),
              const SizedBox(height: 8),
              OutlinedButton(
                onPressed: onCancel,
                style: OutlinedButton.styleFrom(
                    foregroundColor: BrandColors.danger,
                    side: const BorderSide(color: Color(0xFFF97066))),
                child: const Text('Cancel'),
              ),
            ],
          ),
        ],
      ),
    );
  }
}
