import 'package:flutter/material.dart';
import '../../booking/domain/ride.dart';
import '../../messaging/data/messaging_repository.dart';
import '../../messaging/presentation/chat_screen.dart';
import '../data/driver_repository.dart';

/// Assigned ride: actions + chat entry (mobile spec §42–44, §48).
class DriverRideScreen extends StatefulWidget {
  final DriverRepository driver;
  final MessagingRepository messaging;
  final String rideId;
  final String myId;

  const DriverRideScreen({
    super.key,
    required this.driver,
    required this.messaging,
    required this.rideId,
    required this.myId,
  });

  @override
  State<DriverRideScreen> createState() => _DriverRideScreenState();
}

const _next = {
  'ASSIGNED': ['DRIVER_EN_ROUTE'],
  'DRIVER_EN_ROUTE': ['DRIVER_ARRIVED'],
  'DRIVER_ARRIVED': ['IN_PROGRESS'],
  'IN_PROGRESS': ['COMPLETED'],
};

class _DriverRideScreenState extends State<DriverRideScreen> {
  Ride? _ride;
  String? _error;

  @override
  void initState() {
    super.initState();
    _refresh();
  }

  Future<void> _refresh() async {
    final rides = await widget.driver.myRides();
    final match = rides.where((r) => r.id == widget.rideId).toList();
    if (mounted && match.isNotEmpty) setState(() => _ride = match.first);
  }

  Future<void> _act(Future<Ride> Function() call) async {
    setState(() => _error = null);
    try {
      final updated = await call();
      setState(() => _ride = updated);
    } catch (_) {
      setState(() => _error = 'Action failed. Please try again.');
    }
  }

  Future<void> _openChat() async {
    final convo = await widget.messaging.conversationForRide(widget.rideId);
    if (!mounted || convo == null) return;
    Navigator.of(context).push(MaterialPageRoute(
      builder: (_) => ChatScreen(
        repository: widget.messaging,
        conversationId: convo.id,
        myId: widget.myId,
        closed: !convo.isActive,
      ),
    ));
  }

  @override
  Widget build(BuildContext context) {
    final ride = _ride;
    return Scaffold(
      appBar: AppBar(title: const Text('Ride')),
      body: ride == null
          ? const Center(child: CircularProgressIndicator())
          : Padding(
              padding: const EdgeInsets.all(24),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  Text('${ride.pickupLabel} → ${ride.dropoffLabel}',
                      style: Theme.of(context).textTheme.titleLarge),
                  const SizedBox(height: 8),
                  Text(ride.status, key: const Key('rideStatus')),
                  const SizedBox(height: 24),
                  if (ride.status == 'ASSIGNED') ...[
                    ElevatedButton(
                      onPressed: () => _act(() => widget.driver.acceptRide(ride.id)),
                      child: const Text('Accept'),
                    ),
                    const SizedBox(height: 8),
                  ],
                  for (final to in _next[ride.status] ?? <String>[])
                    Padding(
                      padding: const EdgeInsets.only(bottom: 8),
                      child: ElevatedButton(
                        onPressed: () => _act(() => widget.driver.transition(ride.id, to)),
                        child: Text('→ $to'),
                      ),
                    ),
                  OutlinedButton(
                    onPressed: _openChat,
                    child: const Text('Open chat'),
                  ),
                  if (_error != null) ...[
                    const SizedBox(height: 12),
                    Text(_error!, style: const TextStyle(color: Colors.red)),
                  ],
                ],
              ),
            ),
    );
  }
}
