import 'package:flutter/material.dart';
import '../constants/app_constants.dart';

/// Spec §3 Driver card: avatar 48 + name/rating/plate/ETA + Message/Cancel pills.
///
/// Own tinted surface so it reads as a distinct card on white sheets
/// (previously white-on-white and invisible as a unit).
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
      key: const Key('driverCard'),
      width: double.infinity,
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: BrandColors.primary.withValues(alpha: 0.07),
        borderRadius: BorderRadius.circular(AppRadius.card),
        border: Border.all(
            color: BrandColors.primary.withValues(alpha: 0.25)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Row(
            children: [
              Container(
                width: 52,
                height: 52,
                decoration: const BoxDecoration(
                  color: BrandColors.primary,
                  shape: BoxShape.circle,
                ),
                child: const Icon(Icons.person,
                    color: Colors.white, size: 30),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(name,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: const TextStyle(
                            fontSize: 16, fontWeight: FontWeight.w700)),
                    const SizedBox(height: 2),
                    Row(
                      children: [
                        const Icon(Icons.star,
                            size: 14, color: BrandColors.accent),
                        const SizedBox(width: 4),
                        Expanded(
                          child: Text('$rating ($rides rides)',
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                              style: const TextStyle(
                                  fontSize: 12,
                                  color: BrandColors.secondary)),
                        ),
                      ],
                    ),
                    const SizedBox(height: 2),
                    Row(
                      children: [
                        const Icon(Icons.two_wheeler,
                            size: 14,
                            color: BrandColors.secondary),
                        const SizedBox(width: 4),
                        Expanded(
                          child: Text('$vehicle | $plate',
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                              style: const TextStyle(
                                  fontSize: 12,
                                  color: BrandColors.secondary)),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 10),
          Container(
            padding:
                const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
            decoration: BoxDecoration(
              color: BrandColors.success.withValues(alpha: 0.12),
              borderRadius:
                  const BorderRadius.all(Radius.circular(10)),
            ),
            child: Text(eta,
                textAlign: TextAlign.center,
                style: const TextStyle(
                    fontSize: 13,
                    fontWeight: FontWeight.w700,
                    color: BrandColors.success)),
          ),
          const SizedBox(height: 10),
          Row(
            children: [
              Expanded(
                child: ElevatedButton.icon(
                  onPressed: onMessage,
                  icon: const Icon(Icons.message_outlined, size: 18),
                  label: const Text('Message'),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: BrandColors.primary,
                    foregroundColor: Colors.white,
                    minimumSize: const Size.fromHeight(44),
                    shape: const RoundedRectangleBorder(
                      borderRadius:
                          BorderRadius.all(Radius.circular(12)),
                    ),
                  ),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: OutlinedButton(
                  key: const Key('tripCancel'),
                  onPressed: onCancel,
                  style: OutlinedButton.styleFrom(
                    foregroundColor: BrandColors.danger,
                    side: const BorderSide(color: Color(0xFFF97066)),
                    minimumSize: const Size.fromHeight(44),
                    shape: const RoundedRectangleBorder(
                      borderRadius:
                          BorderRadius.all(Radius.circular(12)),
                    ),
                  ),
                  child: const Text('Cancel'),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}
