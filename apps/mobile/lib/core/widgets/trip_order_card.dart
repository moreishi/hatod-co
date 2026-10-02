import 'package:flutter/material.dart';
import '../constants/app_constants.dart';

/// Badge color per ride status: green done, red cancelled, blue active.
Color statusBadgeColor(String status) {
  switch (status) {
    case 'COMPLETED':
      return BrandColors.success;
    case 'CANCELLED':
      return BrandColors.danger;
    case 'REQUESTED':
    case 'ASSIGNED':
    case 'DRIVER_EN_ROUTE':
    case 'DRIVER_ARRIVED':
    case 'IN_PROGRESS':
      return BrandColors.route;
    default:
      return BrandColors.secondary;
  }
}

class StatusBadge extends StatelessWidget {
  final String status;
  final Color? color;
  const StatusBadge({super.key, required this.status, this.color});

  @override
  Widget build(BuildContext context) {
    final color = this.color ?? statusBadgeColor(status);
    return Container(
      key: Key('statusBadge-$status'),
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.12),
        borderRadius: const BorderRadius.all(Radius.circular(20)),
      ),
      child: Text(
        status,
        style: TextStyle(
            fontSize: 12, fontWeight: FontWeight.w700, color: color),
      ),
    );
  }
}

/// Shared orders-style trip card (rider orders, driver trips): pickup /
/// destination rows with icons, fare, date line, and status badge.
class TripOrderCard extends StatelessWidget {
  final String pickupLabel;
  final String dropoffLabel;
  final int fareCentavos;
  final String dateLine;
  final String status;
  final VoidCallback onTap;

  const TripOrderCard({
    super.key,
    required this.pickupLabel,
    required this.dropoffLabel,
    required this.fareCentavos,
    required this.dateLine,
    required this.status,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      child: InkWell(
        borderRadius: const BorderRadius.all(Radius.circular(12)),
        onTap: onTap,
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Icon(Icons.my_location,
                      size: 18, color: BrandColors.success),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text('PICKUP',
                            style: TextStyle(
                                fontSize: 11,
                                fontWeight: FontWeight.w700,
                                color: BrandColors.secondary)),
                        Text(pickupLabel,
                            style: const TextStyle(
                                fontSize: 15,
                                fontWeight: FontWeight.w600)),
                      ],
                    ),
                  ),
                  Text(
                    '₱${(fareCentavos / 100).toStringAsFixed(2)}',
                    style: const TextStyle(
                        fontSize: 16, fontWeight: FontWeight.w800),
                  ),
                ],
              ),
              const SizedBox(height: 8),
              Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Icon(Icons.location_on,
                      size: 18, color: BrandColors.danger),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text('DESTINATION',
                            style: TextStyle(
                                fontSize: 11,
                                fontWeight: FontWeight.w700,
                                color: BrandColors.secondary)),
                        Text(dropoffLabel,
                            style: const TextStyle(
                                fontSize: 15,
                                fontWeight: FontWeight.w600)),
                      ],
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 8),
              Row(
                children: [
                  Expanded(
                    child: Text(
                      dateLine,
                      style: const TextStyle(
                          fontSize: 12, color: BrandColors.secondary),
                    ),
                  ),
                  StatusBadge(status: status),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}
