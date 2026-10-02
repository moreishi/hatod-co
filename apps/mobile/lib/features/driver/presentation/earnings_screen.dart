import 'package:flutter/material.dart';
import '../../../core/constants/app_constants.dart';
import '../../booking/domain/earning.dart';
import '../data/driver_repository.dart';

/// Driver earnings overview with recent ledger entries (mobile spec §46–47).
class EarningsScreen extends StatefulWidget {
  final DriverRepository repository;

  const EarningsScreen({super.key, required this.repository});

  @override
  State<EarningsScreen> createState() => _EarningsScreenState();
}

class _EarningsScreenState extends State<EarningsScreen> {
  EarningSummary? _summary;
  String? _error;

  @override
  void initState() {
    super.initState();
    widget.repository.earnings().then((summary) {
      if (mounted) setState(() => _summary = summary);
    }).catchError((_) {
      if (mounted) setState(() => _error = 'Could not load earnings. Please try again.');
    });
  }

  @override
  Widget build(BuildContext context) {
    final summary = _summary;
    return Scaffold(
      appBar: AppBar(title: const Text('Earnings')),
      body: summary == null
          ? _error == null
              ? const Center(child: CircularProgressIndicator())
              : Center(child: Text(_error!))
          : ListView(
              padding: const EdgeInsets.all(24),
              children: [
                Card(
                  child: ListTile(
                    title: Text(summary.balancePhp, key: const Key('balance')),
                    subtitle: Text(
                        '${summary.tripCount} trips · ${summary.totalPhp} earned'),
                  ),
                ),
                const SizedBox(height: 16),
                const Text('Recent earnings'),
                const SizedBox(height: 8),
                if (summary.recent.isEmpty)
                  const Text('No earnings yet.')
                else
                  for (final entry in summary.recent)
                    _EarningCard(entry: entry),
              ],
            ),
    );
  }
}

/// Orders-style card for one ledger entry: icon, amount, type + ride ref.
class _EarningCard extends StatelessWidget {
  final LedgerEntry entry;

  const _EarningCard({required this.entry});

  IconData get _icon {
    switch (entry.type) {
      case 'RIDE_EARNING':
        return Icons.directions_car;
      case 'TOP_UP':
        return Icons.add_card;
      default:
        return Icons.receipt_long;
    }
  }

  @override
  Widget build(BuildContext context) {
    return Card(
      key: Key('earningCard-${entry.id}'),
      margin: const EdgeInsets.only(bottom: 12),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Row(
          children: [
            Container(
              width: 40,
              height: 40,
              decoration: const BoxDecoration(
                color: BrandColors.primary,
                shape: BoxShape.circle,
              ),
              child: Icon(_icon, color: Colors.white, size: 22),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    '₱${(entry.amountCentavos / 100).toStringAsFixed(2)}',
                    style: const TextStyle(
                        fontSize: 16, fontWeight: FontWeight.w800),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    entry.rideId == null
                        ? entry.type
                        : '${entry.type} · Ride ${entry.rideId}',
                    style: const TextStyle(
                        fontSize: 12, color: BrandColors.secondary),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}
