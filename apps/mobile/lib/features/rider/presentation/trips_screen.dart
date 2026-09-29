import 'package:flutter/material.dart';
import '../../auth/presentation/session_scope.dart';
import '../../booking/data/booking_repository.dart';
import '../../booking/domain/ride.dart';
import '../../messaging/data/messaging_repository.dart';
import 'ride_detail_screen.dart';

/// Rider trip history (mobile spec §37–38). Taps open the trip details.
class RiderTripsScreen extends StatefulWidget {
  final String myId;
  final BookingRepository? booking;
  final MessagingRepository? messaging;

  const RiderTripsScreen({super.key, required this.myId, this.booking, this.messaging});

  @override
  State<RiderTripsScreen> createState() => _RiderTripsScreenState();
}

class _RiderTripsScreenState extends State<RiderTripsScreen> {
  List<Ride>? _trips;
  String? _error;

  @override
  void initState() {
    super.initState();
    _load();
  }

  BookingRepository get _booking =>
      widget.booking ?? BookingRepository(api: SessionScope.of(context).api);
  MessagingRepository get _messaging =>
      widget.messaging ?? MessagingRepository(api: SessionScope.of(context).api);

  Future<void> _load() async {
    try {
      final trips = await _booking.myRides();
      if (mounted) setState(() => _trips = trips);
    } catch (_) {
      if (mounted) setState(() => _error = 'Could not load trips. Please try again.');
    }
  }

  @override
  Widget build(BuildContext context) {
    final trips = _trips;
    return Scaffold(
      appBar: AppBar(title: const Text('My trips')),
      body: trips == null
          ? _error == null
              ? const Center(child: CircularProgressIndicator())
              : Center(child: Text(_error!))
          : trips.isEmpty
              ? const Center(child: Text('No trips yet.'))
              : ListView.builder(
                  itemCount: trips.length,
                  itemBuilder: (context, i) {
                    final ride = trips[i];
                    return ListTile(
                      title: Text('${ride.pickupLabel} → ${ride.dropoffLabel}'),
                      subtitle:
                          Text('${ride.status} · ₱${(ride.fareCentavos / 100).toStringAsFixed(2)}'),
                      onTap: () => Navigator.of(context).push(MaterialPageRoute(
                        builder: (_) => RideDetailScreen(
                          booking: _booking,
                          messaging: _messaging,
                          rideId: ride.id,
                          myId: widget.myId,
                        ),
                      )),
                    );
                  },
                ),
    );
  }
}
