import 'package:flutter/material.dart';
import '../../auth/presentation/session_scope.dart';
import '../../booking/domain/ride.dart';
import '../../messaging/data/messaging_repository.dart';
import '../data/driver_repository.dart';
import 'earnings_screen.dart';
import 'trips_screen.dart';

/// Driver home: online toggle, current assignment, next-step actions
/// (mobile spec §39–44 adapted to backend states).
class DriverHomeScreen extends StatefulWidget {
  final String userId;
  final DriverRepository? repository;

  const DriverHomeScreen({super.key, required this.userId, this.repository});

  @override
  State<DriverHomeScreen> createState() => _DriverHomeScreenState();
}

const _next = {
  'ASSIGNED': ['DRIVER_EN_ROUTE'],
  'DRIVER_EN_ROUTE': ['DRIVER_ARRIVED'],
  'DRIVER_ARRIVED': ['IN_PROGRESS'],
  'IN_PROGRESS': ['COMPLETED'],
};

class _DriverHomeScreenState extends State<DriverHomeScreen> {
  bool _online = false;
  Ride? _current;
  String? _error;
  bool _busy = false;

  @override
  void initState() {
    super.initState();
    _refresh();
  }

  DriverRepository get _repo => widget.repository!;

  Future<void> _refresh() async {
    try {
      final rides = await _repo.myRides();
      final active = rides.where((r) => r.isActive).toList();
      if (mounted) setState(() => _current = active.isEmpty ? null : active.first);
    } catch (_) {
      // Leave stale state; retry on next action.
    }
  }

  Future<void> _toggle(bool online) async {
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      await _repo.setOnline(online);
      setState(() => _online = online);
    } catch (_) {
      setState(() => _error = 'Could not change status. Please try again.');
    } finally {
      setState(() => _busy = false);
    }
  }

  Future<void> _transition(String to) async {
    final current = _current;
    if (current == null) return;
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      final updated = await _repo.transition(current.id, to);
      setState(() => _current = updated);
    } catch (_) {
      setState(() => _error = 'Action failed. Please try again.');
    } finally {
      setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final current = _current;
    return Scaffold(
      appBar: AppBar(title: const Text('Hailing Driver')),
      body: ListView(
        padding: const EdgeInsets.all(24),
        children: [
          Card(
            child: ListTile(
              title: Text(_online ? 'ONLINE' : 'OFFLINE', key: const Key('status')),
              trailing: Switch(
                value: _online,
                onChanged: _busy ? null : _toggle,
              ),
            ),
          ),
          const SizedBox(height: 16),
          if (current != null)
            Card(
              key: const Key('assignment'),
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    Text('${current.pickupLabel} → ${current.dropoffLabel}',
                        style: Theme.of(context).textTheme.titleMedium),
                    const SizedBox(height: 4),
                    Text(current.status),
                    const SizedBox(height: 12),
                    for (final to in _next[current.status] ?? <String>[])
                      Padding(
                        padding: const EdgeInsets.only(bottom: 8),
                        child: ElevatedButton(
                          onPressed: _busy ? null : () => _transition(to),
                          child: Text('→ $to'),
                        ),
                      ),
                  ],
                ),
              ),
            )
          else
            const Card(
              child: ListTile(title: Text('No active ride. Stay online for offers.')),
            ),
          Row(
            children: [
              Expanded(
                child: OutlinedButton(
                  onPressed: () {
                    final repo = widget.repository;
                    if (repo == null) return;
                    final api = SessionScope.of(context).api;
                    Navigator.of(context).push(MaterialPageRoute(
                      builder: (_) => DriverTripsScreen(
                        myId: widget.userId,
                        repository: repo,
                        messaging: MessagingRepository(api: api),
                      ),
                    ));
                  },
                  child: const Text('My trips'),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: OutlinedButton(
                  onPressed: () {
                    final repo = widget.repository;
                    if (repo == null) return;
                    Navigator.of(context).push(MaterialPageRoute(
                      builder: (_) => EarningsScreen(repository: repo),
                    ));
                  },
                  child: const Text('Earnings'),
                ),
              ),
            ],
          ),
          if (_error != null) ...[
            const SizedBox(height: 12),
            Text(_error!, style: const TextStyle(color: Colors.red)),
          ],
        ],
      ),
    );
  }
}
