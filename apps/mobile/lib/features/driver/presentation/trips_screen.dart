import 'package:flutter/material.dart';
import '../../booking/domain/ride.dart';
import '../../messaging/data/messaging_repository.dart';
import '../data/driver_repository.dart';
import 'driver_ride_screen.dart';

/// Driver trip history (mobile spec §45). Taps open the assigned ride view.
class DriverTripsScreen extends StatefulWidget {
  final String myId;
  final DriverRepository repository;
  final MessagingRepository messaging;

  const DriverTripsScreen({
    super.key,
    required this.myId,
    required this.repository,
    required this.messaging,
  });

  @override
  State<DriverTripsScreen> createState() => _DriverTripsScreenState();
}

class _DriverTripsScreenState extends State<DriverTripsScreen> {
  List<Ride>? _trips;

  @override
  void initState() {
    super.initState();
    widget.repository.myRides().then((trips) {
      if (mounted) setState(() => _trips = trips);
    });
  }

  @override
  Widget build(BuildContext context) {
    final trips = _trips;
    return Scaffold(
      appBar: AppBar(title: const Text('My trips')),
      body: trips == null
          ? const Center(child: CircularProgressIndicator())
          : trips.isEmpty
              ? const Center(child: Text('No trips yet.'))
              : ListView.builder(
                  itemCount: trips.length,
                  itemBuilder: (context, i) {
                    final ride = trips[i];
                    return ListTile(
                      title: Text('${ride.pickupLabel} → ${ride.dropoffLabel}'),
                      subtitle: Text(ride.status),
                      onTap: () => Navigator.of(context).push(MaterialPageRoute(
                        builder: (_) => DriverRideScreen(
                          driver: widget.repository,
                          messaging: widget.messaging,
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
