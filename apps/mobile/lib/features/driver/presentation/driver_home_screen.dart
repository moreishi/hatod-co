import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:latlong2/latlong.dart' as ll;
import '../../../core/constants/app_constants.dart';
import '../../../core/constants/map_constants.dart';
import '../../../core/widgets/trip_order_card.dart';
import '../../auth/presentation/session_scope.dart';
import '../../booking/domain/ride.dart';
import '../../maps/domain/device_location.dart';
import '../../maps/domain/map_models.dart';
import '../../maps/presentation/hatod_map.dart';
import '../../messaging/data/messaging_repository.dart';
import '../data/driver_repository.dart';
import '../domain/driver_actions.dart';
import 'driver_profile_screen.dart';
import 'driver_ride_screen.dart';
import 'earnings_screen.dart';
import 'trips_screen.dart';

/// Driver home: online toggle, incoming dispatch offers with countdown,
/// current assignment with next-step actions (mobile spec §39–44 adapted
/// to backend states). While online the screen polls rides + offers and
/// uploads GPS pings (matching only offers drivers with fresh pings).
/// The map opens zoomed in close on the driver GPS dot.
class DriverHomeScreen extends StatefulWidget {
  final String userId;

  /// Verified login phone; shown on the profile instead of the user id.
  final String phone;

  final DriverRepository? repository;

  /// Signs out and returns the app shell to the welcome route.
  final Future<void> Function()? onSignOut;

  /// Switches the app to rider mode (guarded: no active trip, offline first).
  final VoidCallback? onSwitchToRider;

  /// Injected for tests; defaults to the device GPS via geolocator.
  final Future<HatodMapPoint?> Function()? locate;

  final Duration pollInterval;
  final Duration pingInterval;

  const DriverHomeScreen(
      {super.key,
      required this.userId,
      this.phone = '',
      this.repository,
      this.onSignOut,
      this.onSwitchToRider,
      this.locate,
      this.pollInterval = const Duration(seconds: 5),
      this.pingInterval = const Duration(seconds: 15)});

  @override
  State<DriverHomeScreen> createState() => _DriverHomeScreenState();
}

class _DriverHomeScreenState extends State<DriverHomeScreen> {
  bool _online = false;
  Ride? _current;
  String? _error;
  bool _busy = false;
  HatodMapPoint? _position;
  late final MapController _mapController = MapController();
  Timer? _poll;
  Timer? _clock;
  Timer? _ping;
  List<DriverOffer> _offers = [];
  final Map<String, Ride> _offerRides = {};

  @override
  void initState() {
    super.initState();
    _refresh();
    (widget.locate ?? locateDeviceGps)().then((p) {
      if (p != null && mounted) {
        setState(() => _position = p);
        _mapController.move(ll.LatLng(p.lat, p.lng), MapConstants.homeZoom);
      }
    });
    _poll =
        Timer.periodic(widget.pollInterval, (_) => _refreshWhileOnline());
    _clock = Timer.periodic(const Duration(seconds: 1), (_) {
      if (!mounted || _offers.isEmpty) return;
      final now = DateTime.now().millisecondsSinceEpoch;
      setState(() => _offers =
          _offers.where((o) => o.expiresAt > now).toList());
    });
    _ping = Timer.periodic(widget.pingInterval, (_) => _pingWhileOnline());
  }

  @override
  void dispose() {
    _poll?.cancel();
    _clock?.cancel();
    _ping?.cancel();
    _mapController.dispose();
    super.dispose();
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

  /// Poll tick: rides + offers only while online (offline drivers get
  /// no dispatches, so polling would just burn battery and data).
  Future<void> _refreshWhileOnline() async {
    if (!mounted || !_online) return;
    await _refresh();
    await _refreshOffers();
  }

  Future<void> _refreshOffers() async {
    try {
      final offers = await _repo.offers();
      if (!mounted) return;
      final now = DateTime.now().millisecondsSinceEpoch;
      final live = offers.where((o) => o.expiresAt > now).toList();
      for (final offer in live) {
        if (_offerRides.containsKey(offer.rideId)) continue;
        try {
          final ride = await _repo.rideDetail(offer.rideId);
          if (mounted) _offerRides[offer.rideId] = ride;
        } catch (_) {
          // Offer lapsed mid-fetch; the next poll drops it.
        }
      }
      if (!mounted) return;
      final known = live
          .where((o) => _offerRides.containsKey(o.rideId))
          .toList();
      setState(() {
        _offers = known;
        _offerRides.removeWhere((id, _) => known.every((o) => o.rideId != id));
      });
    } catch (_) {
      // Offline blip: keep the last offers until the next tick.
    }
  }

  /// GPS ping tick: matching only offers drivers with fresh pings, and
  /// the rider's live marker runs off the same feed.
  Future<void> _pingWhileOnline() async {
    if (!mounted || !_online) return;
    try {
      final p = await (widget.locate ?? locateDeviceGps)();
      if (p != null && mounted) await _repo.ping(p.lat, p.lng);
    } catch (_) {
      // Blip: the next tick retries; freshness window is generous.
    }
  }

  Future<void> _toggle(bool online) async {
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      await _repo.setOnline(online);
      if (!mounted) return;
      setState(() => _online = online);
      if (online) {
        await _refresh();
        await _refreshOffers();
      }
    } catch (_) {
      if (mounted) {
        setState(() => _error = 'Could not change status. Please try again.');
      }
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _acceptOffer(String rideId) async {
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      await _repo.acceptRide(rideId);
      if (!mounted) return;
      setState(() {
        _offers = _offers.where((o) => o.rideId != rideId).toList();
        _offerRides.remove(rideId);
      });
      await _refresh();
    } catch (_) {
      if (mounted) {
        setState(() => _error = 'Could not accept. Please try again.');
      }
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _declineOffer(String rideId) async {
    try {
      await _repo.declineOffer(rideId);
    } catch (_) {
      if (mounted) {
        setState(() => _error = 'Could not decline. Please try again.');
      }
      return;
    }
    if (!mounted) return;
    setState(() {
      _offers = _offers.where((o) => o.rideId != rideId).toList();
      _offerRides.remove(rideId);
    });
    await _refreshOffers();
  }

  VoidCallback? _openOfferRide(String rideId) {
    final repo = widget.repository;
    if (repo == null) return null;
    return () {
      final api = SessionScope.of(context).api;
      Navigator.of(context).push(MaterialPageRoute(
        builder: (_) => DriverRideScreen(
          driver: repo,
          messaging: MessagingRepository(api: api),
          rideId: rideId,
          myId: widget.userId,
        ),
      ));
    };
  }

  /// Mode switch with teeth: an active trip blocks (the rider is waiting),
  /// merely being online just flips offline first.
  Future<void> _switchToRider() async {
    Navigator.of(context).pop();
    if (_current != null) {
      setState(() => _error =
          'Finish the active trip before switching modes.');
      return;
    }
    if (_online) {
      try {
        await _repo.setOnline(false);
      } catch (_) {
        if (mounted) {
          setState(() => _error = 'Could not go offline. Please try again.');
        }
        return;
      }
      if (!mounted) return;
      setState(() => _online = false);
    }
    widget.onSwitchToRider?.call();
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
      extendBodyBehindAppBar: true,
      appBar: AppBar(
        title: const Text('HATOD Driver'),
        backgroundColor: Colors.transparent,
        elevation: 0,
        actions: [
          IconButton(
            key: const Key('driverProfile'),
            icon: const Icon(Icons.person),
            tooltip: 'Profile',
            onPressed: () {
              final ride = current;
              Navigator.of(context).push(MaterialPageRoute(
                builder: (_) => DriverProfileScreen(
                  phone: widget.phone.isEmpty
                      ? widget.userId
                      : widget.phone,
                  vehicleType: ride?.vehicleType,
                  plate: ride?.driverPlate,
                  onSignOut: widget.onSignOut,
                  onSwitchToRider:
                      widget.onSwitchToRider == null ? null : _switchToRider,
                ),
              ));
            },
          ),
        ],
      ),
      body: Stack(
        children: [
          // Fullscreen map background, zoomed in on the driver dot.
          HatodMap(
            key: const Key('map'),
            height: null,
            controller: _mapController,
            zoom: MapConstants.homeZoom,
            current: _position ?? MapConstants.gensan,
          ),
          SafeArea(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
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
          const Spacer(),
          if (_online)
            for (final offer in _offers)
              _OfferCard(
                offer: offer,
                ride: _offerRides[offer.rideId],
                busy: _busy,
                onAccept: () => _acceptOffer(offer.rideId),
                onDecline: () => _declineOffer(offer.rideId),
                onOpen: _openOfferRide(offer.rideId),
              ),
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
                    for (final to
                        in nextDriverActions(current.status))
                      Padding(
                        padding: const EdgeInsets.only(bottom: 8),
                        child: ElevatedButton(
                          onPressed: _busy ? null : () => _transition(to),
                          child: Text(driverActionLabel(to)),
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
                  style: OutlinedButton.styleFrom(
                    backgroundColor: Colors.white,
                  ),
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
                  style: OutlinedButton.styleFrom(
                    backgroundColor: Colors.white,
                  ),
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
            ),
          ),
        ],
      ),
    );
  }
}

/// One incoming dispatch offer: orders-style route card, live countdown,
/// and accept/decline actions.
class _OfferCard extends StatelessWidget {
  final DriverOffer offer;
  final Ride? ride;
  final bool busy;
  final VoidCallback onAccept;
  final VoidCallback onDecline;
  final VoidCallback? onOpen;

  const _OfferCard({
    required this.offer,
    required this.ride,
    required this.busy,
    required this.onAccept,
    required this.onDecline,
    required this.onOpen,
  });

  /// Note text and change-for demand driver action, so they force a
  /// review-first flow; a bare tip never does.
  bool get _demanding =>
      ride != null &&
      (ride!.riderNote.isNotEmpty || ride!.changeFor != null);

  @override
  Widget build(BuildContext context) {
    final detail = ride;
    final secs = offer.secondsLeft();
    final demanding = _demanding;
    return Card(
      key: Key('offer-${offer.rideId}'),
      margin: const EdgeInsets.only(bottom: 12),
      color: BrandColors.primary.withValues(alpha: 0.06),
      shape: demanding
          ? const RoundedRectangleBorder(
              borderRadius: BorderRadius.all(Radius.circular(12)),
              side: BorderSide(color: BrandColors.accent, width: 2),
            )
          : null,
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Row(
              children: [
                Expanded(
                  child: Text(demanding ? 'Special request' : 'Incoming request',
                      style: TextStyle(
                          fontSize: 15,
                          fontWeight: FontWeight.w800,
                          color: demanding
                              ? BrandColors.accent
                              : BrandColors.ink)),
                ),
                Text('${secs}s left',
                    key: Key('offerCountdown-${offer.rideId}'),
                    style: const TextStyle(
                        fontSize: 13,
                        fontWeight: FontWeight.w700,
                        color: BrandColors.secondary)),
              ],
            ),
            if (detail != null) ...[
              const SizedBox(height: 8),
              TripOrderCard(
                pickupLabel: detail.pickupLabel,
                dropoffLabel: detail.dropoffLabel,
                fareCentavos: detail.fareCentavos,
                dateLine:
                    '${formatTripDate(detail.requestedAt)} · ${formatTripTime(detail.requestedAt)} → ${formatTripTime(detail.completedAt)}',
                status: detail.status,
                onTap: onOpen ?? () {},
              ),
            ],
            const SizedBox(height: 8),
            Row(
              children: [
                Expanded(
                  child: demanding
                      ? ElevatedButton(
                          onPressed:
                              busy || onOpen == null ? null : onOpen,
                          child: const Text('Review request'),
                        )
                      : ElevatedButton(
                          onPressed: busy ? null : onAccept,
                          child: const Text('Accept'),
                        ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: OutlinedButton(
                    style: OutlinedButton.styleFrom(
                      backgroundColor: Colors.white,
                      foregroundColor: BrandColors.ink,
                      disabledForegroundColor: BrandColors.secondary,
                      side: const BorderSide(
                          color: BrandColors.border),
                    ),
                    onPressed: busy ? null : onDecline,
                    child: const Text('Decline'),
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}
