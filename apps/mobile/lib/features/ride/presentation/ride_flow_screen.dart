import 'package:flutter/material.dart';
import '../../../core/constants/app_constants.dart';
import '../../../core/widgets/driver_card.dart';
import '../../../core/widgets/hatod_button.dart';
import '../../../core/widgets/hatod_sheet.dart';

/// RideFlow states per hatod-ui-spec §1 + §4 (09-15,17 + missing 16 cancel).
enum RideFlowState {
  setPickup,
  setDestination,
  confirm,
  searching,
  driverFound,
  arriving,
  onTrip,
  completed,
  cancelled,
  noDriver,
}

/// Fullscreen map + bottom sheet flow (map placeholder until google_maps lands).
class RideFlowScreen extends StatefulWidget {
  final RideFlowState initial;

  const RideFlowScreen({super.key, this.initial = RideFlowState.setPickup});

  @override
  State<RideFlowScreen> createState() => _RideFlowScreenState();
}

class _RideFlowScreenState extends State<RideFlowScreen> {
  late RideFlowState _state;
  String? _cancelReason;

  @override
  void initState() {
    super.initState();
    _state = widget.initial;
  }

  void _go(RideFlowState s) => setState(() => _state = s);

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: BrandColors.mapBase,
      body: SafeArea(
        child: Stack(
          children: [
            // Map placeholder with center pin.
            const Center(
              child: Icon(Icons.location_on,
                  size: 32, color: BrandColors.primary),
            ),
            Positioned(
              top: 8,
              left: 8,
              right: 8,
              child: Row(
                children: [
                  IconButton(
                    icon: const Icon(Icons.menu, size: 24),
                    onPressed: () {},
                  ),
                  const Expanded(
                    child: Text('HATOD',
                        textAlign: TextAlign.center,
                        style: TextStyle(
                            fontWeight: FontWeight.w800,
                            letterSpacing: 1.5,
                            color: BrandColors.primary)),
                  ),
                  const SizedBox(width: 48),
                ],
              ),
            ),
            Positioned(
              left: 0,
              right: 0,
              bottom: 0,
              child: HatodSheet(child: _sheet()),
            ),
          ],
        ),
      ),
    );
  }

  Widget _sheet() {
    switch (_state) {
      case RideFlowState.setPickup:
        return Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            const Text('Where to?',
                style: TextStyle(fontSize: 18, fontWeight: FontWeight.w700)),
            const SizedBox(height: 8),
            const FareLocationRow(
                icon: Icons.my_location,
                label: 'Current location',
                address: 'General Santos City'),
            const SizedBox(height: 8),
            const FareLocationRow(
                icon: Icons.location_on,
                label: 'Destination',
                address: 'Enter destination'),
            const SizedBox(height: 12),
            HatodButton(label: 'Next', onPressed: () => _go(RideFlowState.setDestination)),
          ],
        );
      case RideFlowState.setDestination:
        return Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            const FareLocationRow(
                icon: Icons.my_location,
                label: 'Pickup',
                address: 'SM General Santos'),
            const SizedBox(height: 8),
            const FareLocationRow(
                icon: Icons.location_on,
                label: 'Destination',
                address: 'KCC Mall of Gensan'),
            const SizedBox(height: 8),
            const Text('₱45-60 (est.)',
                textAlign: TextAlign.center,
                style: TextStyle(fontSize: 20, fontWeight: FontWeight.w700)),
            const Text('Motorcycle · 1 rider · 1 seat',
                textAlign: TextAlign.center,
                style: TextStyle(fontSize: 12, color: BrandColors.secondary)),
            const SizedBox(height: 12),
            HatodButton(
                label: 'Request Ride', onPressed: () => _go(RideFlowState.confirm)),
          ],
        );
      case RideFlowState.confirm:
        return Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            const Text('Confirm Ride',
                textAlign: TextAlign.center,
                style: TextStyle(fontSize: 16, fontWeight: FontWeight.w600)),
            const SizedBox(height: 8),
            const FareLocationRow(
                icon: Icons.my_location,
                label: 'Pickup',
                address: 'SM General Santos'),
            const FareLocationRow(
                icon: Icons.location_on,
                label: 'Drop-off',
                address: 'KCC Mall of Gensan'),
            const SizedBox(height: 8),
            const Text('₱45-60 (est.)',
                textAlign: TextAlign.center,
                style: TextStyle(fontSize: 20, fontWeight: FontWeight.w700)),
            const SizedBox(height: 12),
            HatodButton(
                label: 'Request Ride', onPressed: () => _go(RideFlowState.searching)),
          ],
        );
      case RideFlowState.searching:
        return Column(
          children: [
            Container(
              padding: const EdgeInsets.all(24),
              decoration: const BoxDecoration(
                color: BrandColors.primaryDeep,
                borderRadius: BorderRadius.all(Radius.circular(16)),
              ),
              child: const Column(
                children: [
                  CircularProgressIndicator(color: Colors.white),
                  SizedBox(height: 12),
                  Text('Finding a driver...',
                      style: TextStyle(color: Colors.white, fontSize: 16)),
                ],
              ),
            ),
            const SizedBox(height: 12),
            HatodButton(
              label: 'Cancel',
              variant: HatodButtonVariant.dangerOutline,
              onPressed: () => _go(RideFlowState.cancelled),
            ),
            TextButton(
                onPressed: () => _go(RideFlowState.driverFound),
                child: const Text('(demo) driver found')),
          ],
        );
      case RideFlowState.driverFound:
        return Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            const Text('Driver Found',
                style: TextStyle(fontSize: 16, fontWeight: FontWeight.w600)),
            const SizedBox(height: 8),
            DriverCard(
              name: 'Carlos Reyes',
              rating: 4.9,
              rides: 120,
              vehicle: 'Honda Click',
              plate: 'GAK 1234',
              eta: '3 min away',
              onMessage: () {},
              onCancel: () => _go(RideFlowState.cancelled),
            ),
            TextButton(
                onPressed: () => _go(RideFlowState.arriving),
                child: const Text('(demo) arriving')),
          ],
        );
      case RideFlowState.arriving:
        return Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            const Text('Arriving soon · ETA 2 min · 0.3 km',
                style: TextStyle(
                    fontSize: 13,
                    fontWeight: FontWeight.w600,
                    color: BrandColors.success)),
            const SizedBox(height: 8),
            DriverCard(
              name: 'Carlos Reyes',
              rating: 4.9,
              rides: 120,
              vehicle: 'Honda Click',
              plate: 'GAK 1234',
              eta: '2 min - 0.3 km',
              onMessage: () {},
              onCancel: () => _go(RideFlowState.cancelled),
            ),
            TextButton(
                onPressed: () => _go(RideFlowState.onTrip),
                child: const Text('(demo) start trip')),
          ],
        );
      case RideFlowState.onTrip:
        return Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            const Text('On Trip',
                textAlign: TextAlign.center,
                style: TextStyle(fontSize: 16, fontWeight: FontWeight.w600)),
            const SizedBox(height: 8),
            DriverCard(
              name: 'Carlos Reyes',
              rating: 4.9,
              rides: 120,
              vehicle: 'Honda Click',
              plate: 'GAK 1234',
              eta: 'ETA 12 min',
              onMessage: () {},
              onCancel: () => _go(RideFlowState.cancelled),
            ),
            TextButton(
                onPressed: () => _go(RideFlowState.completed),
                child: const Text('(demo) complete')),
          ],
        );
      case RideFlowState.completed:
        return const Column(
          children: [
            Icon(Icons.check_circle, size: 64, color: BrandColors.success),
            SizedBox(height: 8),
            Text('Thank you!',
                style: TextStyle(fontSize: 18, fontWeight: FontWeight.w700)),
            Text('Total ₱58.00 (Base 45 · Service 5 · Tip 8)'),
            Text('Cash Paid', style: TextStyle(color: BrandColors.success)),
          ],
        );
      case RideFlowState.cancelled:
        return Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            const Text('Cancel ride',
                style: TextStyle(fontSize: 18, fontWeight: FontWeight.w700)),
            const SizedBox(height: 8),
            DropdownButtonFormField<String>(
              initialValue: _cancelReason,
              hint: const Text('Select a reason'),
              items: const [
                'Driver too far',
                'Changed plans',
                'Wrong pickup',
                'Other'
              ]
                  .map((r) => DropdownMenuItem(value: r, child: Text(r)))
                  .toList(),
              onChanged: (v) => setState(() => _cancelReason = v),
            ),
            const SizedBox(height: 12),
            HatodButton(
              label: 'Confirm cancel',
              variant: HatodButtonVariant.dangerOutline,
              onPressed: () => _go(RideFlowState.setPickup),
            ),
          ],
        );
      case RideFlowState.noDriver:
        return Column(
          children: [
            const Text('No driver found',
                style: TextStyle(fontSize: 18, fontWeight: FontWeight.w700)),
            const SizedBox(height: 8),
            const Text('Try again in a moment.'),
            const SizedBox(height: 12),
            HatodButton(label: 'Retry', onPressed: () => _go(RideFlowState.searching)),
          ],
        );
    }
  }
}
