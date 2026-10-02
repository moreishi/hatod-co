import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import '../../../core/constants/app_constants.dart';
import 'active_trip_screen.dart';
import '../../booking/data/booking_repository.dart';
import '../../booking/domain/ride.dart';
import '../../maps/domain/map_models.dart';
import '../../maps/presentation/hatod_map.dart';
import '../../messaging/data/messaging_repository.dart';

/// Post-booking finding flow: fullscreen map + radar over the pickup,
/// live status polling, backend cancel, 60s no-drivers timeout + retry.
class FindingDriverScreen extends StatefulWidget {
  final Ride ride;
  final BookingRepository booking;
  final MessagingRepository messaging;
  final String myId;

  /// Re-books the same trip (timeout retry).
  final Future<Ride> Function() rebook;

  final Duration pollInterval;
  final Duration searchTimeout;

  /// Known endpoints for map pins (booking payloads carry labels only).
  final HatodMapPoint? pickup;
  final HatodMapPoint? dropoff;

  const FindingDriverScreen({
    super.key,
    required this.ride,
    required this.booking,
    required this.messaging,
    required this.myId,
    required this.rebook,
    this.pollInterval = const Duration(seconds: 3),
    this.searchTimeout = const Duration(seconds: 60),
    this.pickup,
    this.dropoff,
  });

  @override
  State<FindingDriverScreen> createState() => _FindingDriverScreenState();
}

class _FindingDriverScreenState extends State<FindingDriverScreen>
    with SingleTickerProviderStateMixin {
  late Ride _ride;
  late final MapController _mapController = MapController();
  late final AnimationController _radar;
  Timer? _clock;
  Timer? _poll;
  int _seconds = 0;
  bool _cancelling = false;
  bool _timedOut = false;
  String? _error;

  bool get _found =>
      !_timedOut &&
      _ride.status != RideStatus.requested &&
      _ride.status != RideStatus.noDrivers;

  @override
  void initState() {
    super.initState();
    _ride = widget.ride;
    _radar = AnimationController(
        vsync: this, duration: const Duration(seconds: 2))
      ..repeat();
    _clock = Timer.periodic(const Duration(seconds: 1), (_) {
      if (!mounted) return;
      setState(() => _seconds++);
      if (_seconds >= widget.searchTimeout.inSeconds) _onTimeout();
    });
    _poll = Timer.periodic(widget.pollInterval, (_) => _refresh());
  }

  @override
  void dispose() {
    _clock?.cancel();
    _poll?.cancel();
    _radar.dispose();
    _mapController.dispose();
    super.dispose();
  }

  Future<void> _refresh() async {
    if (!mounted || _timedOut || _found) return;
    try {
      final ride = await widget.booking.rideDetail(_ride.id);
      if (!mounted) return;
      // NO_DRIVERS from auto-match is rescuable by dispatcher assign, so it
      // keeps spinning until the search timeout — only then do we fail.
      // First real assignment hands off to the live trip screen.
      final wasSearching = !_found;
      setState(() => _ride = ride);
      if (wasSearching && _found) {
        _poll?.cancel();
        _clock?.cancel();
        if (!mounted) return;
        Navigator.of(context).pushReplacement(MaterialPageRoute(
          builder: (_) => ActiveTripScreen(
            ride: ride,
            booking: widget.booking,
            messaging: widget.messaging,
            myId: widget.myId,
          ),
        ));
      }
    } catch (_) {
      // Offline blip: keep polling until the timeout.
    }
  }

  void _onTimeout() {
    if (_timedOut || _found) return;
    setState(() {
      _timedOut = true;
      _poll?.cancel();
      _clock?.cancel();
    });
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

  Future<void> _retry() async {
    setState(() {
      _timedOut = false;
      _seconds = 0;
      _error = null;
    });
    try {
      final ride = await widget.rebook();
      if (!mounted) return;
      setState(() => _ride = ride);
      _clock = Timer.periodic(const Duration(seconds: 1), (_) {
        if (!mounted) return;
        setState(() => _seconds++);
        if (_seconds >= widget.searchTimeout.inSeconds) _onTimeout();
      });
      _poll = Timer.periodic(widget.pollInterval, (_) => _refresh());
    } catch (_) {
      if (mounted) {
        setState(() {
          _timedOut = true;
          _error = 'Could not reach the server. Please try again.';
        });
      }
    }
  }

  String get _elapsed =>
      '${(_seconds ~/ 60).toString().padLeft(2, '0')}:${(_seconds % 60).toString().padLeft(2, '0')}';

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      extendBodyBehindAppBar: true,
      body: Stack(
        children: [
          HatodMap(
            key: const Key('map'),
            height: null,
            controller: _mapController,
            pickup: widget.pickup,
            dropoff: widget.dropoff,
          ),
          if (!_found && !_timedOut)
            Center(
              child: _RadarPulse(
                animation: _radar,
                key: const Key('radar'),
              ),
            ),
          Positioned(
            left: 0,
            right: 0,
            bottom: 0,
            child: SafeArea(
              child: Container(
                margin: const EdgeInsets.all(16),
                padding: const EdgeInsets.all(20),
                decoration: const BoxDecoration(
                  color: BrandColors.primaryDeep,
                  borderRadius: BorderRadius.all(Radius.circular(20)),
                ),
                child: _sheet(),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _sheet() {
    if (_timedOut) {
      return Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        mainAxisSize: MainAxisSize.min,
        children: [
          const Text('No drivers found',
              textAlign: TextAlign.center,
              style: TextStyle(
                  fontSize: 18,
                  fontWeight: FontWeight.w700,
                  color: Colors.white)),
          const SizedBox(height: 8),
          const Text('Nobody accepted in time. Try again in a moment.',
              textAlign: TextAlign.center,
              style: TextStyle(fontSize: 13, color: Colors.white70)),
          if (_error != null) ...[
            const SizedBox(height: 8),
            Text(_error!,
                textAlign: TextAlign.center,
                style: const TextStyle(fontSize: 13, color: Colors.amber)),
          ],
          const SizedBox(height: 16),
          ElevatedButton(
            onPressed: _retry,
            child: const Text('Retry'),
          ),
          const SizedBox(height: 8),
          OutlinedButton(
            onPressed: _cancelling ? null : _cancel,
            style: OutlinedButton.styleFrom(foregroundColor: Colors.white),
            child: const Text('Back'),
          ),
        ],
      );
    }
    // Found rides hand off to the live trip screen; this sheet only ever
    // shows searching or timed-out states.
    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        const Text('Finding a driver…',
            style: TextStyle(
                fontSize: 18,
                fontWeight: FontWeight.w700,
                color: Colors.white)),
        const SizedBox(height: 4),
        Text('This may take a few seconds · ${_ride.pickupLabel} → ${_ride.dropoffLabel}',
            textAlign: TextAlign.center,
            style: const TextStyle(fontSize: 12, color: Colors.white70)),
        const SizedBox(height: 8),
        Text(_elapsed,
            key: const Key('findingElapsed'),
            style: const TextStyle(
                fontSize: 13,
                fontWeight: FontWeight.w600,
                color: Colors.white)),
        const SizedBox(height: 4),
        const Text('Free to cancel · most drivers accept within a minute.',
            textAlign: TextAlign.center,
            style: TextStyle(fontSize: 12, color: Colors.white70)),
        if (_error != null) ...[
          const SizedBox(height: 8),
          Text(_error!,
              textAlign: TextAlign.center,
              style:
                  const TextStyle(fontSize: 13, color: Colors.amber)),
        ],
        const SizedBox(height: 16),
        SizedBox(
          width: double.infinity,
          child: OutlinedButton(
            key: const Key('findingCancel'),
            onPressed: _cancelling ? null : _cancel,
            style: OutlinedButton.styleFrom(
              foregroundColor: Colors.white,
              side: const BorderSide(color: Colors.white54),
            ),
            child: Text(_cancelling ? 'Cancelling…' : 'Cancel'),
          ),
        ),
      ],
    );
  }
}

/// Expanding radar rings (Figma searching-driver visual).
class _RadarPulse extends AnimatedWidget {
  const _RadarPulse({super.key, required Animation<double> animation})
      : super(listenable: animation);

  @override
  Widget build(BuildContext context) {
    final t = (listenable as Animation<double>).value;
    return SizedBox(
      width: 180,
      height: 180,
      child: CustomPaint(
        painter: _RadarPainter(t),
      ),
    );
  }
}

class _RadarPainter extends CustomPainter {
  final double t;
  _RadarPainter(this.t);

  @override
  void paint(Canvas canvas, Size size) {
    final center = size.center(Offset.zero);
    for (var i = 0; i < 3; i++) {
      final phase = (t + i / 3) % 1.0;
      canvas.drawCircle(
        center,
        20 + phase * 70,
        Paint()
          ..color = Colors.white.withValues(alpha: (1 - phase) * 0.35)
          ..style = PaintingStyle.stroke
          ..strokeWidth = 2,
      );
    }
    canvas.drawCircle(
        center, 10, Paint()..color = BrandColors.primary);
    canvas.drawCircle(
        center,
        10,
        Paint()
          ..color = Colors.white
          ..style = PaintingStyle.stroke
          ..strokeWidth = 2);
  }

  @override
  bool shouldRepaint(_RadarPainter old) => old.t != t;
}
