import 'package:flutter/material.dart';
import '../../auth/presentation/session_scope.dart';
import '../../booking/data/booking_repository.dart';
import '../../booking/domain/ride.dart';

/// Rider home: fare quote → book → active ride card (mobile spec §20, §28).
class RiderHomeScreen extends StatefulWidget {
  final String userId;

  const RiderHomeScreen({super.key, required this.userId});

  @override
  State<RiderHomeScreen> createState() => _RiderHomeScreenState();
}

class _RiderHomeScreenState extends State<RiderHomeScreen> {
  static const landmarks = {
    'Ayala Center Cebu': LatLng(10.3181, 123.9054),
    'SM City Cebu': LatLng(10.3111, 123.9185),
    'Mactan Airport': LatLng(10.3075, 123.9795),
    'IT Park': LatLng(10.3297, 123.9058),
  };

  String _pickup = 'Ayala Center Cebu';
  String _dropoff = 'SM City Cebu';
  String _vehicle = 'SEDAN';
  FareQuote? _quote;
  Ride? _active;
  String? _error;
  bool _busy = false;

  BookingRepository get _booking =>
      BookingRepository(api: SessionScope.of(context).api);

  Future<void> _getFare() async {
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      final quote = await _booking.quote(
        origin: landmarks[_pickup]!,
        destination: landmarks[_dropoff]!,
        vehicleType: _vehicle,
      );
      setState(() => _quote = quote);
    } catch (_) {
      setState(() => _error = 'Could not price this trip. Please try again.');
    } finally {
      setState(() => _busy = false);
    }
  }

  Future<void> _book() async {
    final quote = _quote;
    if (quote == null) return;
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      final ride = await _booking.requestRide(
        pickupLabel: _pickup,
        pickupBrgyCode: '072217001',
        pickup: landmarks[_pickup],
        dropoffLabel: _dropoff,
        dropoffBrgyCode: '072217002',
        distanceKm: quote.distanceKm,
        vehicleType: _vehicle,
      );
      setState(() => _active = ride);
    } catch (_) {
      setState(() => _error = 'Booking failed. Please try again.');
    } finally {
      setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Hailing Rider')),
      body: ListView(
        padding: const EdgeInsets.all(24),
        children: [
          DropdownButtonFormField<String>(
            key: ValueKey('pickup-$_pickup'),
            initialValue: _pickup,
            decoration: const InputDecoration(labelText: 'Pickup'),
            items: landmarks.keys
                .map((n) => DropdownMenuItem(value: n, child: Text(n)))
                .toList(),
            onChanged: (v) => setState(() {
              _pickup = v!;
              _quote = null;
            }),
          ),
          const SizedBox(height: 12),
          DropdownButtonFormField<String>(
            key: ValueKey('dropoff-$_dropoff'),
            initialValue: _dropoff,
            decoration: const InputDecoration(labelText: 'Dropoff'),
            items: landmarks.keys
                .map((n) => DropdownMenuItem(value: n, child: Text(n)))
                .toList(),
            onChanged: (v) => setState(() {
              _dropoff = v!;
              _quote = null;
            }),
          ),
          const SizedBox(height: 12),
          DropdownButtonFormField<String>(
            key: ValueKey('vehicle-$_vehicle'),
            initialValue: _vehicle,
            decoration: const InputDecoration(labelText: 'Vehicle'),
            items: const ['MOTORCYCLE', 'SEDAN', 'SUV', 'VAN']
                .map((t) => DropdownMenuItem(value: t, child: Text(t)))
                .toList(),
            onChanged: (v) => setState(() {
              _vehicle = v!;
              _quote = null;
            }),
          ),
          const SizedBox(height: 16),
          if (_quote != null)
            Card(
              child: ListTile(
                title: Text(_quote!.farePhp, key: const Key('fare')),
                subtitle: Text('${_quote!.distanceKm.toStringAsFixed(1)} km'),
              ),
            ),
          Row(
            children: [
              Expanded(
                child: OutlinedButton(
                  onPressed: _busy ? null : _getFare,
                  child: const Text('Get fare'),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: ElevatedButton(
                  onPressed: _busy || _quote == null ? null : _book,
                  child: const Text('Book ride'),
                ),
              ),
            ],
          ),
          if (_active != null)
            Card(
              key: const Key('activeRide'),
              child: ListTile(
                title: Text('${_active!.pickupLabel} → ${_active!.dropoffLabel}'),
                subtitle: Text('${_active!.status}${_active!.driverName != null ? ' · ${_active!.driverName}' : ''}'),
              ),
            ),
          if (_error != null) ...[
            const SizedBox(height: 12),
            Text(_error!, style: const TextStyle(color: Colors.red)),
          ],
        ],
      ),
    );
  }
}
