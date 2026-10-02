import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:latlong2/latlong.dart' as ll;
import '../../../core/constants/app_constants.dart';
import '../../../core/constants/map_constants.dart';
import '../../../core/widgets/hatod_bottom_nav.dart';
import '../../auth/presentation/session_scope.dart';
import '../../booking/data/booking_repository.dart';
import '../../booking/domain/ride.dart';
import '../../driver/data/onboarding_repository.dart';
import '../../driver/presentation/onboarding/onboarding_gate.dart';
import '../../maps/data/place_repository.dart';
import '../../maps/domain/device_location.dart';
import '../../maps/domain/map_models.dart';
import '../../maps/domain/places.dart';
import '../../maps/presentation/hatod_map.dart';
import '../../messaging/data/messaging_repository.dart';
import '../../profile/presentation/profile_screen.dart';
import 'favorites_screen.dart';
import 'place_search_sheet.dart';
import 'finding_driver_screen.dart';
import 'trip_details_screen.dart';
import 'trips_screen.dart';
import 'vehicle_cards.dart';

/// Rider home: fullscreen map + tappable pickup/destination cards + bottom
/// sheet, with footer nav Home / Orders / Favorites / Me (mobile spec §20).
///
/// Tapping a card enters search mode: everything hides except the map and a
/// search sheet. Picking a suggestion restores the screen and moves the
/// pickup/destination to the new location.
class RiderHomeScreen extends StatefulWidget {
  final String userId;

  /// Verified login phone; shown on the profile instead of the user id.
  final String phone;

  /// True when the session carries a driver role: Me offers the mode switch.
  final bool canDrive;

  /// Switches the app to driver mode.
  final VoidCallback? onSwitchToDriver;

  /// Injected for tests; defaults to the device GPS via geolocator.
  final Future<HatodMapPoint?> Function()? locate;

  /// Signs out and returns the app shell to the welcome route.
  final Future<void> Function()? onSignOut;

  const RiderHomeScreen(
      {super.key,
      required this.userId,
      this.phone = '',
      this.canDrive = false,
      this.locate,
      this.onSignOut,
      this.onSwitchToDriver});

  @override
  State<RiderHomeScreen> createState() => _RiderHomeScreenState();
}

class _RiderHomeScreenState extends State<RiderHomeScreen> {
  int _tab = 0;

  /// Bumped on every Orders visit so the trip list reloads fresh —
  /// bookings made since the last visit would otherwise stay invisible.
  int _ordersNonce = 0;

  /// Pickup defaults to the GPS location once resolved; destination starts
  /// empty. Nothing quotes or routes until both are set.
  HatodPlace? _pickupPlace;
  HatodPlace? _dropoffPlace;

  /// 'pickup' | 'dropoff' | null — null means normal mode.
  String? _searchingFor;

  /// Pin mode: list hides, map drags under a fixed center pin, confirm
  /// button resolves the center via reverse-geocode.
  bool _pinMode = false;
  bool _pinBusy = false;

  String _vehicle = 'MOTORCYCLE';
  TripDetails _details = const TripDetails();
  FareQuote? _quote;
  String? _error;
  bool _busy = false;
  HatodMapPoint? _current;

  /// GPS scope from reverse-geocode (city label + area key). Null = unfiltered.
  ScopedArea? _area;

  /// Drawn route: fastest-road geometry from the quote, straight-line fallback.
  List<HatodMapPoint> _routePoints = [];

  /// Debounces auto-quote after pickup/destination/vehicle changes.
  Timer? _quoteTimer;
  final MapController _mapController = MapController();

  @override
  void dispose() {
    _quoteTimer?.cancel();
    super.dispose();
  }

  BookingRepository get _booking =>
      BookingRepository(api: SessionScope.of(context).api);

  @override
  void initState() {
    super.initState();
    (widget.locate ?? locateDeviceGps)().then((p) async {
      if (p != null && mounted) {
        setState(() {
          _current = p;
          _pickupPlace ??= HatodPlace(
            name: 'Current location',
            address: 'GPS position',
            point: p,
          );
        });
        _mapController.move(ll.LatLng(p.lat, p.lng), MapConstants.homeZoom);
        // One reverse lookup per session; failure keeps search unfiltered.
        try {
          final area = await PlaceRepository(
                  api: SessionScope.of(context).api)
              .reverse(p);
          if (!mounted) return;
          setState(() => _area = area.areaKey.isNotEmpty ? area : null);
        } catch (_) {
          // Offline/backend down: search stays unfiltered.
        }
      }
    });
  }


  LatLng _ll(HatodMapPoint p) => LatLng(p.lat, p.lng);

  bool get _ready => _pickupPlace != null && _dropoffPlace != null;

  void _onPlaceSelected(HatodPlace p) {
    setState(() {
      if (_searchingFor == 'pickup') {
        _pickupPlace = p;
      } else {
        _dropoffPlace = p;
      }
      _quote = null;
      _routePoints = [];
      _searchingFor = null;
      _pinMode = false;
      _pinBusy = false;
    });
    _scheduleQuote();
  }

  void _closeSearch() {
    setState(() {
      _searchingFor = null;
      _pinMode = false;
      _pinBusy = false;
    });
  }

  /// Resolves the map center to a named place via detail reverse-geocode.
  /// Falls back to a coords label when offline so a pin always works.
  Future<void> _confirmPin() async {
    final c = _mapController.camera.center;
    final point = HatodMapPoint(c.latitude, c.longitude);
    setState(() => _pinBusy = true);
    HatodPlace place;
    try {
      final area = await PlaceRepository(api: SessionScope.of(context).api)
          .reverse(point, detail: true);
      if (!mounted) return;
      final name = area.name.isNotEmpty ? area.name : 'Pinned location';
      place = HatodPlace(
        name: name,
        address: area.label.isNotEmpty
            ? area.label
            : '${point.lat.toStringAsFixed(5)}, ${point.lng.toStringAsFixed(5)}',
        point: point,
        areaKey: area.areaKey,
      );
    } catch (_) {
      if (!mounted) return;
      place = HatodPlace(
        name: 'Pinned location',
        address:
            '${point.lat.toStringAsFixed(5)}, ${point.lng.toStringAsFixed(5)}',
        point: point,
      );
    }
    _onPlaceSelected(place);
  }

  /// Auto-quote 600ms after a change so every keystroke/selection doesn't
  /// hammer the backend (OSRM demo is rate-limited; see routing spec §71).
  void _scheduleQuote() {
    if (!_ready) return;
    _quoteTimer?.cancel();
    _quoteTimer = Timer(const Duration(milliseconds: 600), _getFare);
  }

  /// Presets Home with the given endpoints (used by repeat + return-trip)
  /// after popping back from the order detail.
  void _presetTrip(HatodPlace pickup, HatodPlace dropoff) {
    Navigator.of(context).popUntil((r) => r.isFirst);
    setState(() {
      _pickupPlace = pickup;
      _dropoffPlace = dropoff;
      _quote = null;
      _routePoints = [];
      _tab = 0;
    });
    _scheduleQuote();
  }

  /// Cheapest quoted fare per vehicle category (min over its sub-types);
  /// null until a quote with per-type fares arrives.
  Map<String, int>? _categoryFares() {
    final fares = _quote?.fares;
    if (fares == null || fares.isEmpty) return null;
    final out = <String, int>{};
    for (final c in vehicleCategories) {
      int? best;
      for (final child in c.children) {
        final f = fares[child.code];
        if (f != null && (best == null || f < best)) best = f;
      }
      if (best != null) out[c.code] = best;
    }
    return out.isEmpty ? null : out;
  }

  Future<void> _getFare() async {
    _quoteTimer?.cancel();
    final pickup = _pickupPlace;
    final dropoff = _dropoffPlace;
    if (pickup == null || dropoff == null) return;
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      final quote = await _booking.quote(
        origin: _ll(pickup.point),
        destination: _ll(dropoff.point),
        vehicleType: _vehicle,
      );
      if (!mounted) return;
      setState(() {
        _quote = quote;
        _routePoints = quote.geometry.isNotEmpty
            ? MapMath.decodePolyline(quote.geometry)
            : MapMath.straightLine(pickup.point, dropoff.point);
      });
    } catch (_) {
      if (!mounted) return;
      setState(() => _error = 'Could not price this trip. Please try again.');
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<Ride> _requestRide() {
    final quote = _quote;
    final pickup = _pickupPlace;
    final dropoff = _dropoffPlace;
    if (quote == null || pickup == null || dropoff == null) {
      throw StateError('pickup, destination, and fare are required');
    }
    return _booking.requestRide(
      pickupLabel: pickup.name,
      pickupBrgyCode: '072217001',
      pickup: _ll(pickup.point),
      dropoffLabel: dropoff.name,
      dropoffBrgyCode: '072217002',
      dropoff: _ll(dropoff.point),
      distanceKm: quote.distanceKm,
      vehicleType: _vehicle,
      tipCentavos: _details.tipCentavos,
      changeFor: _details.changeFor,
      riderNote: _details.note,
      paymentMethod: _details.paymentMethod,
    );
  }

  Future<void> _book() async {
    if (_quote == null || _pickupPlace == null || _dropoffPlace == null) {
      return;
    }
    final pickup = _pickupPlace!;
    final dropoff = _dropoffPlace!;
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      final ride = await _requestRide();
      if (!mounted) return;
      setState(() => _busy = false);
      Navigator.of(context).push(MaterialPageRoute(
        builder: (_) => FindingDriverScreen(
          ride: ride,
          booking: _booking,
          messaging:
              MessagingRepository(api: SessionScope.of(context).api),
          myId: widget.userId,
          rebook: _requestRide,
          pickup: pickup.point,
          dropoff: dropoff.point,
        ),
      ));
    } catch (_) {
      if (!mounted) return;
      setState(() {
        _error = 'Booking failed. Please try again.';
        _busy = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final searching = _tab == 0 && _searchingFor != null;
    return Scaffold(
      extendBodyBehindAppBar: _tab == 0,
      appBar: searching
          ? null
          : _tab == 0
              ? AppBar(
                  title: const Text('HATOD'),
                  backgroundColor: Colors.transparent,
                  elevation: 0,
                )
              : null,
      body: IndexedStack(
        index: _tab,
        children: [
          _homeTab(),
          RiderTripsScreen(
            key: ValueKey('orders-$_ordersNonce'),
            myId: widget.userId,
            booking: BookingRepository(api: SessionScope.of(context).api),
            messaging: MessagingRepository(api: SessionScope.of(context).api),
            onRepeat: _presetTrip,
            onReturn: _presetTrip,
          ),
          FavoritesScreen(
            onSelect: (place) {
              setState(() {
                _dropoffPlace = place;
                _quote = null;
                _routePoints = [];
                _tab = 0;
              });
              _scheduleQuote();
            },
            destination: _dropoffPlace,
            resolveAddress: (q) => PlaceRepository(
                    api: SessionScope.of(context).api)
                .search(q, areaKey: _area?.areaKey ?? ''),
          ),
          ProfileScreen(
            name: widget.phone.isEmpty ? widget.userId : widget.phone,
            onSwitchToDriver:
                widget.canDrive ? widget.onSwitchToDriver : null,
            onDrive: widget.canDrive
                ? null
                : () => Navigator.of(context).push(MaterialPageRoute(
                      builder: (_) => DriverOnboardingGate(
                        repository: OnboardingRepository(
                            api: SessionScope.of(context).api),
                      ),
                    )),
            onSignOut: widget.onSignOut == null
                ? null
                : () => widget.onSignOut!(),
          ),
        ],
      ),
      bottomNavigationBar: searching
          ? null
          : HatodBottomNav(
              index: _tab,
              onTap: (i) => setState(() {
                _tab = i;
                if (i == 1) _ordersNonce++;
              }),
            ),
    );
  }

  Widget _homeTab() {
    final pickupPt = _pickupPlace?.point;
    final dropoffPt = _dropoffPlace?.point;
    final route = _routePoints.isNotEmpty
        ? _routePoints
        : (pickupPt != null && dropoffPt != null
            ? MapMath.straightLine(pickupPt, dropoffPt)
            : const <HatodMapPoint>[]);
    return Stack(
      children: [
        // Fullscreen map background; blue dot follows the device GPS.
        HatodMap(
          key: const Key('map'),
          height: null,
          controller: _mapController,
          zoom: MapConstants.homeZoom,
          current: _current ?? MapConstants.gensan,
          pickup: pickupPt,
          dropoff: dropoffPt,
          route: route,
        ),
        if (_searchingFor != null) ...[
          // Search mode: only the map and the search sheet stay visible.
          PlaceSearchSheet(
            title: _searchingFor == 'pickup'
                ? 'Set pickup location'
                : 'Set destination',
            showCurrentLocation: _searchingFor == 'pickup',
            currentPoint: _current,
            area: _area,
            origin: _current,
            remoteSearch: (q, areaKey) => PlaceRepository(
                    api: SessionScope.of(context).api)
                .search(q, areaKey: areaKey ?? ''),
            pinMode: _pinMode,
            onTogglePin: () => setState(() => _pinMode = !_pinMode),
            onSelect: _onPlaceSelected,
            onClose: _closeSearch,
          ),
          // Fixed center pin while the map drags underneath.
          if (_pinMode)
            IgnorePointer(
              child: Center(
                child: Icon(
                  _searchingFor == 'pickup'
                      ? Icons.my_location
                      : Icons.location_on,
                  key: const Key('centerPin'),
                  size: 48,
                  color: _searchingFor == 'pickup'
                      ? BrandColors.success
                      : BrandColors.danger,
                ),
              ),
            ),
          // Confirm the map center as the new pickup/destination.
          if (_pinMode)
            Positioned(
              left: 24,
              right: 24,
              bottom: 24,
              child: SafeArea(
                child: ElevatedButton(
                  onPressed: _pinBusy ? null : _confirmPin,
                  style: ElevatedButton.styleFrom(
                    minimumSize: const Size.fromHeight(50),
                  ),
                  child: Text(_pinBusy
                      ? 'Locating…'
                      : _searchingFor == 'pickup'
                          ? 'Set pickup here'
                          : 'Set destination here'),
                ),
              ),
            ),
        ]
        else ...[
          // Top pickup / destination cards (tappable, not inputs).
          Positioned(
            top: 0,
            left: 0,
            right: 0,
            child: SafeArea(
              child: Padding(
                padding: const EdgeInsets.fromLTRB(16, 8, 16, 0),
                child: Card(
                  elevation: 4,
                  shape: const RoundedRectangleBorder(
                    borderRadius: BorderRadius.all(Radius.circular(16)),
                  ),
                  child: Padding(
                    padding: const EdgeInsets.all(12),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.stretch,
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        const Text('Where are you going?',
                            style: TextStyle(
                                fontSize: 16, fontWeight: FontWeight.w700)),
                        const SizedBox(height: 8),
                        _placeCard(
                          key: const Key('pickupCard'),
                          icon: Icons.my_location,
                          iconColor: BrandColors.success,
                          label: 'Pickup',
                          place: _pickupPlace,
                          placeholder: 'Set pickup',
                          onTap: () =>
                              setState(() => _searchingFor = 'pickup'),
                        ),
                        const Divider(height: 16),
                        _placeCard(
                          key: const Key('dropoffCard'),
                          icon: Icons.location_on,
                          iconColor: BrandColors.danger,
                          label: 'Destination',
                          place: _dropoffPlace,
                          placeholder: 'Set destination',
                          onTap: () =>
                              setState(() => _searchingFor = 'dropoff'),
                        ),
                      ],
                    ),
                  ),
                ),
              ),
            ),
          ),
          // Bottom sheet with vehicle / fare / booking controls.
          Positioned(
            left: 0,
            right: 0,
            bottom: 0,
            child: SafeArea(
              child: Container(
                // Cap sheet to 45% of screen so it can never crowd the
                // pickup/destination card on short viewports.
                constraints: BoxConstraints(
                  maxHeight:
                      MediaQuery.sizeOf(context).height * 0.45,
                ),
                decoration: const BoxDecoration(
                  color: Colors.white,
                  borderRadius:
                      BorderRadius.vertical(top: Radius.circular(20)),
                ),
                child: SingleChildScrollView(
                  padding: const EdgeInsets.all(24),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Container(
                        width: 40,
                        height: 4,
                        margin: const EdgeInsets.only(bottom: 12),
                        decoration: BoxDecoration(
                          color: Colors.grey[300],
                          borderRadius: BorderRadius.circular(2),
                        ),
                      ),
                      VehicleCards(
                        selected: _vehicle,
                        fromFares: _categoryFares(),
                        fares: _quote?.fares,
                        onSelect: (v) {
                          setState(() {
                            _vehicle = v;
                            _quote = null;
                          });
                          _scheduleQuote();
                        },
                      ),
                      const SizedBox(height: 16),
                      if (!_ready)
                        const Padding(
                          padding: EdgeInsets.only(bottom: 12),
                          child: Text(
                            'Choose a destination to see your fare.',
                            textAlign: TextAlign.center,
                            style: TextStyle(
                                fontSize: 13,
                                color: BrandColors.secondary),
                          ),
                        ),
                      if (_quote != null)
                        Card(
                          margin:
                              const EdgeInsets.only(bottom: 12),
                          child: Padding(
                            padding: const EdgeInsets.all(16),
                            child: Row(
                              crossAxisAlignment:
                                  CrossAxisAlignment.start,
                              children: [
                                Expanded(
                                  child: Column(
                                    crossAxisAlignment:
                                        CrossAxisAlignment.start,
                                    children: [
                                      const Text('ESTIMATED FARE',
                                          style: TextStyle(
                                              fontSize: 11,
                                              fontWeight:
                                                  FontWeight.w700,
                                              color: BrandColors
                                                  .secondary)),
                                      const SizedBox(height: 4),
                                      Text(
                                          _details.tipCentavos == 0
                                              ? _quote!.farePhp
                                              : formatPesos(
                                                  _quote!.fareCentavos +
                                                      _details
                                                          .tipCentavos),
                                          key: const Key('fare'),
                                          style: const TextStyle(
                                              fontSize: 22,
                                              fontWeight:
                                                  FontWeight.w800)),
                                    ],
                                  ),
                                ),
                                const SizedBox(width: 12),
                                Column(
                                  crossAxisAlignment:
                                      CrossAxisAlignment.end,
                                  children: [
                                    Text(
                                        '${_quote!.distanceKm.toStringAsFixed(1)} km',
                                        style: const TextStyle(
                                            fontSize: 14,
                                            fontWeight: FontWeight.w600)),
                                    const SizedBox(height: 4),
                                    Text(_quote!.etaMin,
                                        style: const TextStyle(
                                            fontSize: 13,
                                            color: BrandColors
                                                .secondary)),
                                  ],
                                ),
                              ],
                            ),
                          ),
                        ),
                      InkWell(
                        key: const Key('bookingDetails'),
                        borderRadius: const BorderRadius.all(
                            Radius.circular(12)),
                        onTap: () => Navigator.of(context).push(
                            MaterialPageRoute(
                          builder: (_) => TripDetailsScreen(
                            initial: _details,
                            onSave: (d) =>
                                setState(() => _details = d),
                          ),
                        )),
                        child: Padding(
                          padding: const EdgeInsets.symmetric(vertical: 6),
                          child: Row(
                            children: [
                              const Icon(
                                  Icons.receipt_long_outlined,
                                  color: BrandColors.secondary),
                              const SizedBox(width: 12),
                              Expanded(
                                child: Text(
                                  _details.summary(),
                                  maxLines: 2,
                                  overflow: TextOverflow.ellipsis,
                                  style: const TextStyle(
                                      fontSize: 14,
                                      fontWeight: FontWeight.w600),
                                ),
                              ),
                              const Icon(Icons.chevron_right,
                                  color: BrandColors.muted),
                            ],
                          ),
                        ),
                      ),
                      const SizedBox(height: 12),
                      ElevatedButton(
                        onPressed: _busy || _quote == null ? null : _book,
                        child: const Text('Book ride'),
                      ),
                      if (_error != null) ...[
                        const SizedBox(height: 12),
                        Text(_error!,
                            style: const TextStyle(color: Colors.red)),
                      ],
                    ],
                  ),
                ),
              ),
            ),
          ),
        ],
      ],
    );
  }

  Widget _placeCard({
    Key? key,
    required IconData icon,
    required Color iconColor,
    required String label,
    required HatodPlace? place,
    required String placeholder,
    required VoidCallback onTap,
  }) {
    return InkWell(
      key: key,
      borderRadius: const BorderRadius.all(Radius.circular(12)),
      onTap: onTap,
      child: Padding(
        padding: const EdgeInsets.symmetric(vertical: 6),
        child: Row(
          children: [
            Icon(icon, color: iconColor),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(label,
                      style: const TextStyle(
                          fontSize: 12, color: BrandColors.secondary)),
                  if (place != null) ...[
                    Text(place.name,
                        style: const TextStyle(
                            fontSize: 15, fontWeight: FontWeight.w600)),
                    Text(place.address,
                        style: const TextStyle(
                            fontSize: 12, color: BrandColors.secondary)),
                  ] else
                    Text(placeholder,
                        style: const TextStyle(
                            fontSize: 15,
                            fontWeight: FontWeight.w600,
                            color: BrandColors.muted)),
                ],
              ),
            ),
            const Icon(Icons.chevron_right, color: BrandColors.muted),
          ],
        ),
      ),
    );
  }
}
