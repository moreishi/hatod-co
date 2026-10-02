import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import '../../../core/constants/app_constants.dart';
import '../../../core/widgets/driver_card.dart';
import '../../booking/data/booking_repository.dart';
import '../../booking/domain/ride.dart';
import '../../maps/domain/map_models.dart';
import '../../maps/presentation/hatod_map.dart';
import '../../messaging/data/messaging_repository.dart';
import '../../messaging/domain/conversation.dart';
import '../../messaging/presentation/chat_screen.dart';


/// Live trip after a driver is found: arriving → arrived → on trip →
/// completed + rating. Driven by status polling; cancel follows the backend
/// guard (allowed until the trip starts).
class ActiveTripScreen extends StatefulWidget {
  final Ride ride;
  final BookingRepository booking;
  final MessagingRepository messaging;
  final String myId;
  final Duration pollInterval;

  const ActiveTripScreen({
    super.key,
    required this.ride,
    required this.booking,
    required this.messaging,
    required this.myId,
    this.pollInterval = const Duration(seconds: 3),
  });

  @override
  State<ActiveTripScreen> createState() => _ActiveTripScreenState();
}

class _ActiveTripScreenState extends State<ActiveTripScreen> {
  late Ride _ride;
  late final MapController _mapController = MapController();
  Timer? _poll;
  bool _cancelling = false;
  String? _error;
  Conversation? _convo;
  int _stars = 0;
  DriverPing? _driverPing;

  /// Road route for the trip (re-quoted once on open); straight-line fallback.
  List<HatodMapPoint> _routePoints = [];

  static const _cancellable = {
    'ASSIGNED',
    'DRIVER_EN_ROUTE',
    'DRIVER_ARRIVED',
  };

  @override
  void initState() {
    super.initState();
    _ride = widget.ride;
    _poll = Timer.periodic(widget.pollInterval, (_) => _refresh());
    widget.messaging
        .conversationForRide(widget.ride.id)
        .then((c) => mounted ? setState(() => _convo = c) : null);
    _loadRoute();
  }

  @override
  void dispose() {
    _poll?.cancel();
    _mapController.dispose();
    super.dispose();
  }

  Future<void> _refresh() async {
    if (!mounted) return;
    try {
      final ride = await widget.booking.rideDetail(_ride.id);
      final ping = await widget.booking.driverLocation(_ride.id);
      if (!mounted) return;
      setState(() {
        _ride = ride;
        _driverPing = ping;
      });
      if (ride.status == RideStatus.completed) _poll?.cancel();
    } catch (_) {
      // Offline blip: keep polling.
    }
    // The conversation may not have existed when the screen opened
    // (accept races the handoff); keep retrying until it appears.
    if (_convo == null) {
      try {
        final convo =
            await widget.messaging.conversationForRide(widget.ride.id);
        if (mounted && convo != null) setState(() => _convo = convo);
      } catch (_) {
        // Still nothing: next poll retries.
      }
    }
  }

  /// Display-only road route for this trip (one backend quote on open).
  /// Falls back to a straight line when the quote fails.
  Future<void> _loadRoute() async {
    final pickup = _pt(_ride.pickupLat, _ride.pickupLng);
    final dropoff = _pt(_ride.dropoffLat, _ride.dropoffLng);
    if (pickup == null || dropoff == null) return;
    try {
      final quote = await widget.booking.quote(
        origin: LatLng(pickup.lat, pickup.lng),
        destination: LatLng(dropoff.lat, dropoff.lng),
        vehicleType: _ride.vehicleType ?? 'MOTORCYCLE',
      );
      if (!mounted || quote.geometry.isEmpty) return;
      setState(
          () => _routePoints = MapMath.decodePolyline(quote.geometry));
    } catch (_) {
      // Offline: the straight-line fallback stands in.
    }
  }

  /// Live driver distance: to the pickup while arriving, to the destination
  /// once on trip. Null when unknown. Carries the GPS age so a frozen
  /// marker is never ambiguous.
  String? get _driverEta {
    final ping = _driverPing;
    if (ping == null) return null;
    final onTrip = _ride.status == RideStatus.inProgress;
    final target = onTrip
        ? _pt(_ride.dropoffLat, _ride.dropoffLng)
        : _pt(_ride.pickupLat, _ride.pickupLng);
    if (target == null) return null;
    final km = MapMath.distanceKm(
        HatodMapPoint(ping.lat, ping.lng), target);
    final fresh = ping.ageSec < 15 ? 'live' : '${ping.ageSec}s ago';
    if (km < 0.1) return onTrip ? 'Almost there · $fresh' : 'Arriving now · $fresh';
    return onTrip
        ? '${km.toStringAsFixed(1)} km to go · $fresh'
        : '${km.toStringAsFixed(1)} km away · $fresh';
  }

  Future<void> _cancel() async {
    setState(() {
      _cancelling = true;
      _error = null;
    });
    try {
      await widget.booking
          .transition(_ride.id, 'CANCELLED', cancelReason: 'rider cancelled');
      if (mounted) Navigator.of(context).pop();
    } catch (_) {
      if (mounted) {
        setState(() {
          _cancelling = false;
          _error = 'Could not cancel. Please try again.';
        });
      }
    }
  }

  Future<void> _openChat() async {
    final convo = _convo;
    if (convo == null || !mounted) return;
    Navigator.of(context).push(MaterialPageRoute(
      builder: (_) => ChatScreen(
        repository: widget.messaging,
        conversationId: convo.id,
        myId: widget.myId,
        closed: !convo.isActive,
        counterpartLabel: [
          _ride.driverName ?? 'Your driver',
          if (_ride.driverPlate != null) _ride.driverPlate!,
        ].join(' · '),
      ),
    ));
  }

  HatodMapPoint? _pt(double? lat, double? lng) =>
      lat == null || lng == null ? null : HatodMapPoint(lat, lng);

  @override
  Widget build(BuildContext context) {
    final pickup = _pt(_ride.pickupLat, _ride.pickupLng);
    final dropoff = _pt(_ride.dropoffLat, _ride.dropoffLng);
    final ping = _driverPing;
    return Scaffold(
      extendBodyBehindAppBar: true,
      body: Stack(
        children: [
          HatodMap(
            key: const Key('map'),
            height: null,
            controller: _mapController,
            pickup: pickup,
            dropoff: dropoff,
            driver: ping == null
                ? null
                : HatodMapPoint(ping.lat, ping.lng),
            route: _routePoints.isNotEmpty
                ? _routePoints
                : (pickup != null && dropoff != null
                    ? MapMath.straightLine(pickup, dropoff)
                    : const []),
          ),
          Positioned(
            left: 0,
            right: 0,
            bottom: 0,
            child: SafeArea(
              child: Container(
                constraints: const BoxConstraints(maxHeight: 480),
                decoration: const BoxDecoration(
                  color: Colors.white,
                  borderRadius:
                      BorderRadius.vertical(top: Radius.circular(20)),
                ),
                child: SingleChildScrollView(
                  padding: const EdgeInsets.all(20),
                  child: _sheet(),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _sheet() {
    switch (_ride.status) {
      case RideStatus.completed:
        return _completedSheet();
      case RideStatus.inProgress:
        return Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          mainAxisSize: MainAxisSize.min,
          children: [
            const _HeaderChip(label: 'On trip'),
            const SizedBox(height: 12),
            _destinationCard(),
            const SizedBox(height: 12),
            _messageButton(),
          ],
        );
      default:
        final arrived = _ride.status == RideStatus.driverArrived;
        return Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          mainAxisSize: MainAxisSize.min,
          children: [
            _HeaderChip(
                label: arrived ? 'Driver arrived' : 'Driver arriving'),
            if (arrived) ...[
              const SizedBox(height: 8),
              const Text('Meet your driver at the pickup point.',
                  textAlign: TextAlign.center,
                  style: TextStyle(
                      fontSize: 13, color: BrandColors.secondary)),
            ],
            const SizedBox(height: 12),
            DriverCard(
              name: _ride.driverName ?? 'Your driver',
              rating: _ride.driverRating ?? 0,
              rides: 0,
              vehicle: _ride.vehicleType ?? 'Motorcycle',
              plate: _ride.driverPlate ?? '—',
              eta: _driverEta ??
                  (arrived ? 'Arrived' : 'On the way…'),
              onMessage: _convo == null ? null : _openChat,
              onCancel: _cancellable.contains(_ride.status) && !_cancelling
                  ? _cancel
                  : null,
            ),
            if (_error != null) ...[
              const SizedBox(height: 8),
              Text(_error!,
                  textAlign: TextAlign.center,
                  style:
                      const TextStyle(fontSize: 13, color: Colors.red)),
            ],
          ],
        );
    }
  }

  Widget _destinationCard() {
    final eta = _driverEta;
    return Card(
      margin: EdgeInsets.zero,
      child: ListTile(
        leading: const Icon(Icons.location_on, color: BrandColors.danger),
        title: Text(_ride.dropoffLabel,
            style:
                const TextStyle(fontSize: 15, fontWeight: FontWeight.w600)),
        subtitle: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
                '₱${(_ride.fareCentavos / 100).toStringAsFixed(2)} · ${_ride.distanceKm != null ? '${_ride.distanceKm!.toStringAsFixed(1)} km' : 'On the way'}',
                style: const TextStyle(
                    fontSize: 13, color: BrandColors.secondary)),
            if (eta != null)
              Text(eta,
                  style: const TextStyle(
                      fontSize: 13,
                      fontWeight: FontWeight.w700,
                      color: BrandColors.success)),
          ],
        ),
      ),
    );
  }

  Widget _messageButton() {
    return OutlinedButton.icon(
      key: const Key('tripMessage'),
      onPressed: _convo == null ? null : _openChat,
      icon: const Icon(Icons.message_outlined),
      label: const Text('Message driver'),
    );
  }

  Widget _completedSheet() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      mainAxisSize: MainAxisSize.min,
      children: [
        const _HeaderChip(label: 'Trip completed'),
        const SizedBox(height: 12),
        Text('${_ride.pickupLabel} → ${_ride.dropoffLabel}',
            textAlign: TextAlign.center,
            style:
                const TextStyle(fontSize: 15, fontWeight: FontWeight.w600)),
        const SizedBox(height: 4),
        Text(
          '${formatTripDate(_ride.requestedAt)} · ${formatTripTime(_ride.requestedAt)} → ${formatTripTime(_ride.completedAt)}',
          textAlign: TextAlign.center,
          style: const TextStyle(
              fontSize: 12, color: BrandColors.secondary),
        ),
        const SizedBox(height: 8),
        Text('₱${(_ride.fareCentavos / 100).toStringAsFixed(2)}',
            textAlign: TextAlign.center,
            style:
                const TextStyle(fontSize: 24, fontWeight: FontWeight.w800)),
        const SizedBox(height: 12),
        const Text('Rate your trip',
            textAlign: TextAlign.center,
            style: TextStyle(fontSize: 14, fontWeight: FontWeight.w600)),
        const SizedBox(height: 4),
        Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            for (var i = 1; i <= 5; i++)
              IconButton(
                key: Key('star-$i'),
                icon: Icon(Icons.star,
                    color: i <= _stars
                        ? BrandColors.accent
                        : BrandColors.muted),
                onPressed: () => setState(() => _stars = i),
              ),
          ],
        ),
        const SizedBox(height: 8),
        ElevatedButton(
          onPressed: () =>
              Navigator.of(context).popUntil((r) => r.isFirst),
          child: const Text('Done'),
        ),
      ],
    );
  }
}

class _HeaderChip extends StatelessWidget {
  final String label;
  const _HeaderChip({required this.label});

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Container(
        padding:
            const EdgeInsets.symmetric(horizontal: 14, vertical: 6),
        decoration: BoxDecoration(
          color: BrandColors.success.withValues(alpha: 0.12),
          borderRadius: const BorderRadius.all(Radius.circular(20)),
        ),
        child: Text(label,
            style: const TextStyle(
                fontSize: 13,
                fontWeight: FontWeight.w700,
                color: BrandColors.success)),
      ),
    );
  }
}
