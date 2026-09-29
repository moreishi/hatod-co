import 'package:flutter/material.dart';
import '../../booking/data/booking_repository.dart';
import '../../booking/domain/ride.dart';
import '../../messaging/data/messaging_repository.dart';
import '../../messaging/presentation/chat_screen.dart';

/// Ride detail with status, fare, and chat entry (mobile spec §38, §48).
class RideDetailScreen extends StatefulWidget {
  final BookingRepository booking;
  final MessagingRepository messaging;
  final String rideId;
  final String myId;

  const RideDetailScreen({
    super.key,
    required this.booking,
    required this.messaging,
    required this.rideId,
    required this.myId,
  });

  @override
  State<RideDetailScreen> createState() => _RideDetailScreenState();
}

class _RideDetailScreenState extends State<RideDetailScreen> {
  Ride? _ride;

  @override
  void initState() {
    super.initState();
    widget.booking.rideDetail(widget.rideId).then((ride) {
      if (mounted) setState(() => _ride = ride);
    });
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
                  Text('${ride.status} · ₱${(ride.fareCentavos / 100).toStringAsFixed(2)}'),
                  if (ride.driverName != null) Text('Driver: ${ride.driverName}'),
                  const SizedBox(height: 24),
                  ElevatedButton(
                    onPressed: _openChat,
                    child: const Text('Open chat'),
                  ),
                ],
              ),
            ),
    );
  }
}
