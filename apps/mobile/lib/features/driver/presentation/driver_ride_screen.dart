import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import '../../../core/constants/app_constants.dart';
import '../../booking/domain/ride.dart';
import '../../maps/domain/map_models.dart';
import '../../maps/presentation/hatod_map.dart';
import '../../messaging/data/messaging_repository.dart';
import '../../messaging/presentation/chat_screen.dart';
import '../data/driver_repository.dart';
import '../domain/driver_actions.dart';

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

class _DriverRideScreenState extends State<DriverRideScreen> {
  Ride? _ride;
  String? _error;
  final MapController _mapController = MapController();

  @override
  void initState() {
    super.initState();
    _refresh();
  }

  /// Loads by id: offered rides are not assigned yet, so they never
  /// appear in the driver's own ride list.
  Future<void> _refresh() async {
    try {
      final ride = await widget.driver.rideDetail(widget.rideId);
      if (mounted) setState(() => _ride = ride);
    } catch (_) {
      if (mounted) setState(() => _error = 'Could not load this ride.');
    }
  }

  Future<void> _decline(String rideId) async {
    setState(() => _error = null);
    try {
      await widget.driver.declineOffer(rideId);
      if (mounted) Navigator.of(context).pop();
    } catch (_) {
      if (mounted) setState(() => _error = 'Action failed. Please try again.');
    }
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

  /// Passenger extras in one line, defaults included so the driver sees
  /// the full picture (same phrasing as the rider's trip-details summary).
  String _extrasSummary(Ride ride) {
    final parts = <String>[
      ride.tipCentavos > 0
          ? '${formatPesos(ride.tipCentavos)} tip'
          : 'No tip',
      ride.changeFor != null
          ? 'Change for ${formatPesos(ride.changeFor!)}'
          : 'Exact fare',
      if (ride.riderNote.isNotEmpty) '“${ride.riderNote}”',
      ride.paymentMethod == 'WALLET' ? 'E-Wallet' : 'Cash',
    ];
    return parts.join(' · ');
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

  HatodMapPoint? _pt(double? lat, double? lng) =>
      lat == null || lng == null ? null : HatodMapPoint(lat, lng);

  @override
  Widget build(BuildContext context) {
    final ride = _ride;
    final pickup = ride == null
        ? null
        : _pt(ride.pickupLat, ride.pickupLng);
    final dropoff = ride == null
        ? null
        : _pt(ride.dropoffLat, ride.dropoffLng);
    return Scaffold(
      extendBodyBehindAppBar: true,
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        elevation: 0,
        leading: Padding(
          padding: const EdgeInsets.all(8),
          child: CircleAvatar(
            backgroundColor: Colors.white,
            child: IconButton(
              icon: const Icon(Icons.arrow_back, color: Colors.black),
              onPressed: () => Navigator.of(context).pop(),
            ),
          ),
        ),
      ),
      body: ride == null
          ? Center(
              child: _error == null
                  ? const CircularProgressIndicator()
                  : Text(_error!),
            )
          : Stack(
              children: [
                // Fullscreen map background: pins + route fill the screen,
                // details live in the sheet on top. The camera fits BOTH
                // pins into the visible area above the sheet.
                HatodMap(
                  key: const Key('map'),
                  height: null,
                  controller: _mapController,
                  pickup: pickup,
                  dropoff: dropoff,
                  bottomInset: 540,
                  route: pickup != null && dropoff != null
                      ? MapMath.straightLine(pickup, dropoff)
                      : const [],
                ),
                Positioned(
                  right: 16,
                  bottom: 540,
                  child: FloatingActionButton.small(
                    key: const Key('rideRecenter'),
                    heroTag: 'ride_recenter',
                    backgroundColor: Colors.white,
                    foregroundColor: BrandColors.primary,
                    tooltip: 'Show the whole route',
                    onPressed: () {
                      if (pickup == null || dropoff == null) return;
                      final cam = HatodMap.routeCameraFit(pickup, dropoff,
                              bottomInset: 540)
                          .fit(_mapController.camera);
                      _mapController.move(cam.center, cam.zoom);
                    },
                    child: const Icon(Icons.route),
                  ),
                ),
                Positioned(
                  left: 0,
                  right: 0,
                  bottom: 0,
                  child: SafeArea(
                    child: Container(
                      constraints: const BoxConstraints(maxHeight: 460),
                      decoration: const BoxDecoration(
                        color: Colors.white,
                        borderRadius:
                            BorderRadius.vertical(top: Radius.circular(20)),
                      ),
                      child: SingleChildScrollView(
                        padding: const EdgeInsets.all(20),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.stretch,
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Text('${ride.pickupLabel} → ${ride.dropoffLabel}',
                                style:
                                    Theme.of(context).textTheme.titleMedium),
                            const SizedBox(height: 6),
                            Row(
                              children: [
                                Text(ride.status,
                                    key: const Key('rideStatus'),
                                    style: const TextStyle(
                                        fontSize: 12,
                                        fontWeight: FontWeight.w700,
                                        color: BrandColors.secondary)),
                              ],
                            ),
                            const SizedBox(height: 12),
                            Container(
                              key: const Key('passengerExtras'),
                              padding: const EdgeInsets.all(12),
                              decoration: BoxDecoration(
                                color:
                                    BrandColors.primary.withValues(alpha: 0.05),
                                borderRadius: const BorderRadius.all(
                                    Radius.circular(12)),
                              ),
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  const Text('PASSENGER EXTRAS',
                                      style: TextStyle(
                                          fontSize: 11,
                                          fontWeight: FontWeight.w700,
                                          color: BrandColors.secondary)),
                                  const SizedBox(height: 4),
                                  Text(_extrasSummary(ride),
                                      style: const TextStyle(fontSize: 14)),
                                ],
                              ),
                            ),
                            const SizedBox(height: 12),
                            if (ride.status == 'REQUESTED') ...[
                              ElevatedButton(
                                onPressed: () =>
                                    _act(() => widget.driver.acceptRide(ride.id)),
                                child: const Text('Accept'),
                              ),
                              const SizedBox(height: 8),
                              OutlinedButton(
                                onPressed: () => _decline(ride.id),
                                child: const Text('Decline'),
                              ),
                              const SizedBox(height: 8),
                            ],
                            if (ride.status == 'ASSIGNED') ...[
                              ElevatedButton(
                                onPressed: () =>
                                    _act(() => widget.driver.acceptRide(ride.id)),
                                child: const Text('Accept'),
                              ),
                              const SizedBox(height: 8),
                            ],
                            for (final to in nextDriverActions(ride.status))
                              Padding(
                                padding: const EdgeInsets.only(bottom: 8),
                                child: ElevatedButton(
                                  onPressed: () => _act(() =>
                                      widget.driver.transition(ride.id, to)),
                                  child: Text(driverActionLabel(to)),
                                ),
                              ),
                            OutlinedButton(
                              onPressed: _openChat,
                              child: Row(
                                mainAxisAlignment: MainAxisAlignment.center,
                                children: const [
                                  Icon(Icons.chat_bubble_outline, size: 18),
                                  SizedBox(width: 8),
                                  Text('Open chat'),
                                ],
                              ),
                            ),
                            if (_error != null) ...[
                              const SizedBox(height: 12),
                              Text(_error!,
                                  style:
                                      const TextStyle(color: Colors.red)),
                            ],
                          ],
                        ),
                      ),
                    ),
                  ),
                ),
              ],
            ),
    );
  }
}
