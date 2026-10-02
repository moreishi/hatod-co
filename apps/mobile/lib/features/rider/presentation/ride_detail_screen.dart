import 'package:flutter/material.dart';
import '../../../core/constants/app_constants.dart';
import '../../booking/data/booking_repository.dart';
import '../../booking/domain/ride.dart';
import '../../maps/domain/map_models.dart';
import '../../maps/domain/places.dart';
import '../../maps/presentation/hatod_map.dart';
import '../../messaging/data/messaging_repository.dart';
import '../../messaging/domain/conversation.dart';
import '../../messaging/presentation/chat_screen.dart';


/// Order detail: fullscreen map background with trip pins, back caret,
/// driver card with rating + message, thumbs, route info, fare, repeat.
class RideDetailScreen extends StatefulWidget {
  final BookingRepository booking;
  final MessagingRepository messaging;
  final String rideId;
  final String myId;

  /// Re-books the same endpoints (pickup + destination preset on Home).
  final void Function(HatodPlace pickup, HatodPlace dropoff)? onRepeat;

  /// Books the way back (called with destination-as-pickup, pickup-as-dropoff).
  final void Function(HatodPlace pickup, HatodPlace dropoff)? onReturn;

  const RideDetailScreen({
    super.key,
    required this.booking,
    required this.messaging,
    required this.rideId,
    required this.myId,
    this.onRepeat,
    this.onReturn,
  });

  @override
  State<RideDetailScreen> createState() => _RideDetailScreenState();
}

class _RideDetailScreenState extends State<RideDetailScreen> {
  Ride? _ride;
  Conversation? _convo;
  bool? _liked;

  @override
  void initState() {
    super.initState();
    widget.booking.rideDetail(widget.rideId).then((ride) {
      if (mounted) setState(() => _ride = ride);
    });
    widget.messaging.conversationForRide(widget.rideId).then((convo) {
      if (mounted) setState(() => _convo = convo);
    });
  }

  Future<void> _openChat() async {
    final convo = _convo;
    if (convo == null) return;
    if (!mounted) return;
    Navigator.of(context).push(MaterialPageRoute(
      builder: (_) => ChatScreen(
        repository: widget.messaging,
        conversationId: convo.id,
        myId: widget.myId,
        closed: !convo.isActive,
        counterpartLabel: _ride?.driverName == null
            ? null
            : [
                _ride!.driverName!,
                if (_ride!.driverPlate != null) _ride!.driverPlate!,
              ].join(' · '),
      ),
    ));
  }

  HatodMapPoint? _pt(double? lat, double? lng) =>
      lat == null || lng == null ? null : HatodMapPoint(lat, lng);

  @override
  Widget build(BuildContext context) {
    final ride = _ride;
    if (ride == null) {
      return Scaffold(
        appBar: AppBar(title: const Text('Order')),
        body: const Center(child: CircularProgressIndicator()),
      );
    }
    final pickup = _pt(ride.pickupLat, ride.pickupLng);
    final dropoff = _pt(ride.dropoffLat, ride.dropoffLng);
    final pickupPlace = pickup == null
        ? null
        : HatodPlace(
            name: ride.pickupLabel,
            address: ride.pickupLabel,
            point: pickup);
    final dropoffPlace = dropoff == null
        ? null
        : HatodPlace(
            name: ride.dropoffLabel,
            address: ride.dropoffLabel,
            point: dropoff);
    return Scaffold(
      extendBodyBehindAppBar: true,
      body: Stack(
        children: [
          HatodMap(
            key: const Key('map'),
            height: null,
            pickup: pickup,
            dropoff: dropoff,
            route: pickup != null && dropoff != null
                ? MapMath.straightLine(pickup, dropoff)
                : const [],
          ),
          Positioned(
            top: 0,
            left: 0,
            child: SafeArea(
              child: Padding(
                padding: const EdgeInsets.all(8),
                child: CircleAvatar(
                  backgroundColor: Colors.white,
                  child: IconButton(
                    key: const Key('detailBack'),
                    icon: const Icon(Icons.arrow_back, color: Colors.black),
                    onPressed: () => Navigator.of(context).pop(),
                  ),
                ),
              ),
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
                      _driverRow(ride),
                      const SizedBox(height: 12),
                      _ratingRow(),
                      const Divider(height: 24),
                      _placeRow(
                        icon: Icons.my_location,
                        color: BrandColors.success,
                        label: 'PICKUP',
                        value: ride.pickupLabel,
                      ),
                      const SizedBox(height: 8),
                      _placeRow(
                        icon: Icons.location_on,
                        color: BrandColors.danger,
                        label: 'DESTINATION',
                        value: ride.dropoffLabel,
                      ),
                      const SizedBox(height: 12),
                      Text(
                        '${formatTripDate(ride.requestedAt)} · ${formatTripTime(ride.requestedAt)} → ${formatTripTime(ride.completedAt)}',
                        style: const TextStyle(
                            fontSize: 12, color: BrandColors.secondary),
                      ),
                      const SizedBox(height: 12),
                      _receiptRow('Fare', ride.fareCentavos),
                      if (ride.tipCentavos > 0) ...[
                        const SizedBox(height: 4),
                        _receiptRow('Tip', ride.tipCentavos),
                      ],
                      const SizedBox(height: 4),
                      Row(
                        children: [
                          const Text('Total fare',
                              style: TextStyle(
                                  fontSize: 14,
                                  color: BrandColors.secondary)),
                          const Spacer(),
                          Text(
                            _php(ride.fareCentavos + ride.tipCentavos),
                            style: const TextStyle(
                                fontSize: 22, fontWeight: FontWeight.w800),
                          ),
                        ],
                      ),
                      const SizedBox(height: 2),
                      Align(
                        alignment: Alignment.centerRight,
                        child: Text(
                          'Paid with ${ride.paymentMethod == 'WALLET' ? 'E-Wallet' : 'Cash'}',
                          style: const TextStyle(
                              fontSize: 12,
                              color: BrandColors.secondary),
                        ),
                      ),
                      if (pickupPlace != null && dropoffPlace != null) ...[
                        const SizedBox(height: 12),
                        Row(
                          children: [
                            Expanded(
                              child: ElevatedButton(
                                onPressed: () => widget.onRepeat
                                    ?.call(pickupPlace, dropoffPlace),
                                child: const Text('Book again'),
                              ),
                            ),
                            const SizedBox(width: 12),
                            Expanded(
                              child: OutlinedButton(
                                onPressed: () => widget.onReturn
                                    ?.call(dropoffPlace, pickupPlace),
                                child: const Text('Return trip'),
                              ),
                            ),
                          ],
                        ),
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

  Widget _driverRow(Ride ride) {
    final rating = ride.driverRating;
    final vehicleBits = [
      if (ride.vehicleType != null) ride.vehicleType!,
      if (ride.driverPlate != null) ride.driverPlate!,
    ];
    return Row(
      children: [
        const CircleAvatar(
          radius: 24,
          child: Icon(Icons.person, size: 28),
        ),
        const SizedBox(width: 12),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(ride.driverName ?? 'Driver unavailable',
                  style: const TextStyle(
                      fontSize: 16, fontWeight: FontWeight.w700)),
              const SizedBox(height: 2),
              Text(
                vehicleBits.isEmpty
                    ? 'Vehicle info unavailable'
                    : vehicleBits.join(' · '),
                style: const TextStyle(
                    fontSize: 13, color: BrandColors.secondary),
              ),
              Row(
                children: [
                  const Icon(Icons.star,
                      size: 16, color: BrandColors.accent),
                  const SizedBox(width: 4),
                  Text(
                    rating == null
                        ? 'No ratings yet'
                        : rating.toStringAsFixed(1),
                    style: const TextStyle(
                        fontSize: 13, color: BrandColors.secondary),
                  ),
                ],
              ),
            ],
          ),
        ),
        if (_convo != null)
          IconButton(
            key: const Key('messageDriver'),
            icon: const Icon(Icons.message_outlined,
                color: BrandColors.primary),
            tooltip: 'Message driver',
            onPressed: _openChat,
          ),
      ],
    );
  }

  Widget _ratingRow() {
    Widget thumb({
      required Key key,
      required Key iconKey,
      required IconData icon,
      required bool selected,
      required VoidCallback onTap,
    }) {
      return Expanded(
        child: OutlinedButton.icon(
          key: key,
          onPressed: onTap,
          icon: Icon(icon,
              key: iconKey,
              color: selected
                  ? BrandColors.primary
                  : BrandColors.muted),
          label: Text(selected ? 'Rated' : 'Rate',
              style: TextStyle(
                  color: selected
                      ? BrandColors.primary
                      : BrandColors.muted)),
          style: OutlinedButton.styleFrom(
            side: BorderSide(
                color: selected
                    ? BrandColors.primary
                    : BrandColors.border),
          ),
        ),
      );
    }

    return Row(
      children: [
        thumb(
          key: const Key('thumbUp'),
          iconKey: const Key('thumbUpIcon'),
          icon: Icons.thumb_up_outlined,
          selected: _liked == true,
          onTap: () =>
              setState(() => _liked = _liked == true ? null : true),
        ),
        const SizedBox(width: 12),
        thumb(
          key: const Key('thumbDown'),
          iconKey: const Key('thumbDownIcon'),
          icon: Icons.thumb_down_outlined,
          selected: _liked == false,
          onTap: () =>
              setState(() => _liked = _liked == false ? null : false),
        ),
      ],
    );
  }

  String _php(int centavos) =>
      '₱${(centavos / 100).toStringAsFixed(2)}';

  Widget _receiptRow(String label, int centavos) {
    return Row(
      children: [
        Text(label,
            style: const TextStyle(
                fontSize: 14, color: BrandColors.secondary)),
        const Spacer(),
        Text(_php(centavos),
            style: const TextStyle(
                fontSize: 14, fontWeight: FontWeight.w700)),
      ],
    );
  }

  Widget _placeRow({
    required IconData icon,
    required Color color,
    required String label,
    required String value,
  }) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Icon(icon, size: 18, color: color),
        const SizedBox(width: 8),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(label,
                  style: const TextStyle(
                      fontSize: 11,
                      fontWeight: FontWeight.w700,
                      color: BrandColors.secondary)),
              Text(value,
                  style: const TextStyle(
                      fontSize: 15, fontWeight: FontWeight.w600)),
            ],
          ),
        ),
      ],
    );
  }
}
