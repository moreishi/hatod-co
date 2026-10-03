import 'package:flutter/material.dart';
import '../../../core/constants/app_constants.dart';
import '../../../core/widgets/trip_order_card.dart';
import '../../auth/presentation/session_scope.dart';
import '../../booking/data/booking_repository.dart';
import '../../booking/domain/ride.dart';
import '../../maps/domain/places.dart';
import '../../messaging/data/messaging_repository.dart';
import 'active_trip_screen.dart';
import 'ride_detail_screen.dart';

/// Rider trip history (mobile spec §37–38). Taps open the trip details.
class RiderTripsScreen extends StatefulWidget {
  final String myId;
  final BookingRepository? booking;
  final MessagingRepository? messaging;

  /// Re-books the same endpoints (preset on Home).
  final void Function(HatodPlace pickup, HatodPlace dropoff)? onRepeat;

  /// Books the way back (preset on Home as-is; already swapped).
  final void Function(HatodPlace pickup, HatodPlace dropoff)? onReturn;

  const RiderTripsScreen(
      {super.key,
      required this.myId,
      this.booking,
      this.messaging,
      this.onRepeat,
      this.onReturn});

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
    final active =
        trips?.where((r) => r.isActive).toList() ?? const [];
    final completed =
        trips?.where((r) => r.status == RideStatus.completed).toList() ?? [];
    return Scaffold(
      appBar: AppBar(title: const Text('My trips')),
      body: RefreshIndicator(
        onRefresh: _load,
        child: trips == null
            ? _error == null
                ? ListView(
                    physics: const AlwaysScrollableScrollPhysics(),
                    children: const [
                      SizedBox(height: 120),
                      Center(child: CircularProgressIndicator()),
                    ],
                  )
                : ListView(
                    physics: const AlwaysScrollableScrollPhysics(),
                    children: [
                      const SizedBox(height: 120),
                      Center(child: Text(_error!)),
                    ],
                  )
            : active.isEmpty && completed.isEmpty
                ? ListView(
                    physics: const AlwaysScrollableScrollPhysics(),
                    children: const [
                      SizedBox(height: 110),
                      Center(
                        child: Column(
                          children: [
                            Icon(Icons.route_outlined,
                                size: 48, color: Colors.black26),
                            SizedBox(height: 12),
                            Text('No completed trips yet.'),
                            SizedBox(height: 4),
                            Text('Book a ride and it will show up here.',
                                style: TextStyle(
                                    fontSize: 12, color: Colors.grey)),
                          ],
                        ),
                      ),
                    ],
                  )
                : ListView(
                    physics: const AlwaysScrollableScrollPhysics(),
                    padding: const EdgeInsets.all(16),
                    children: [
                    if (active.isNotEmpty) ...[
                      const Padding(
                        padding: EdgeInsets.only(bottom: 8),
                        child: Text('Active trip',
                            style: TextStyle(
                                fontSize: 14,
                                fontWeight: FontWeight.w700,
                                color: BrandColors.secondary)),
                      ),
                      for (final ride in active)
                        _ActiveTripCard(
                          ride: ride,
                          onTap: () => Navigator.of(context).push(
                              MaterialPageRoute(
                            builder: (_) => ActiveTripScreen(
                              ride: ride,
                              booking: _booking,
                              messaging: _messaging,
                              myId: widget.myId,
                            ),
                          )),
                        ),
                      const SizedBox(height: 8),
                    ],
                    if (completed.isNotEmpty) ...[
                      const Padding(
                        padding: EdgeInsets.only(bottom: 8),
                        child: Text('Completed',
                            style: TextStyle(
                                fontSize: 14,
                                fontWeight: FontWeight.w700,
                                color: BrandColors.secondary)),
                      ),
                      for (final ride in completed)
                        TripOrderCard(
                        pickupLabel: ride.pickupLabel,
                        dropoffLabel: ride.dropoffLabel,
                        fareCentavos: ride.fareCentavos,
                        dateLine:
                            '${formatTripDate(ride.requestedAt)} · ${formatTripTime(ride.requestedAt)} → ${formatTripTime(ride.completedAt)}',
                        status: ride.status,
                        onTap: () => Navigator.of(context).push(
                            MaterialPageRoute(
                          builder: (_) => RideDetailScreen(
                            booking: _booking,
                            messaging: _messaging,
                            rideId: ride.id,
                            myId: widget.myId,
                            onRepeat: widget.onRepeat,
                            onReturn: widget.onReturn,
                          ),
                        )),
                      ),
                    ],
                    if (completed.isEmpty)
                      const Center(
                          child: Padding(
                        padding: EdgeInsets.all(16),
                        child: Text('No completed trips yet.'),
                      )),
                  ],
                ),
      ),
    );
  }
}

/// Live entry point: an active ride opens the polling trip screen.
class _ActiveTripCard extends StatelessWidget {
  final Ride ride;
  final VoidCallback onTap;

  const _ActiveTripCard({required this.ride, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      color: BrandColors.primary.withValues(alpha: 0.06),
      child: InkWell(
        borderRadius: const BorderRadius.all(Radius.circular(12)),
        onTap: onTap,
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Expanded(
                    child: Text(
                      '${ride.pickupLabel} → ${ride.dropoffLabel}',
                      style: const TextStyle(
                          fontSize: 15, fontWeight: FontWeight.w600),
                    ),
                  ),
                  const Icon(Icons.chevron_right,
                      color: BrandColors.muted),
                ],
              ),
              const SizedBox(height: 8),
              Row(
                children: [
                  StatusBadge(status: ride.status),
                  const SizedBox(width: 8),
                  Text(
                    '₱${(ride.fareCentavos / 100).toStringAsFixed(2)}',
                    style: const TextStyle(
                        fontSize: 14, fontWeight: FontWeight.w800),
                  ),
                  const Spacer(),
                  const Text('Live →',
                      style: TextStyle(
                          fontSize: 12,
                          fontWeight: FontWeight.w700,
                          color: BrandColors.success)),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}
