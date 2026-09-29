import 'package:flutter/material.dart';
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
                    ListTile(
                      title: Text(
                          '${entry.type} · ₱${(entry.amountCentavos / 100).toStringAsFixed(2)}'),
                      subtitle: entry.rideId == null ? null : Text('Ride ${entry.rideId}'),
                    ),
              ],
            ),
    );
  }
}
