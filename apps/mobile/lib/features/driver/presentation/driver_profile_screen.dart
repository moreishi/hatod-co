import 'package:flutter/material.dart';
import '../../../core/constants/app_constants.dart';
import '../../../core/widgets/list_row.dart';

/// Driver identity + sign out. Vehicle details come from the active
/// assignment when present; the row hides otherwise.
class DriverProfileScreen extends StatelessWidget {
  final String phone;
  final String? vehicleType;
  final String? plate;
  final Future<void> Function()? onSignOut;
  final VoidCallback? onSwitchToRider;

  const DriverProfileScreen({
    super.key,
    required this.phone,
    this.vehicleType,
    this.plate,
    this.onSignOut,
    this.onSwitchToRider,
  });

  @override
  Widget build(BuildContext context) {
    final vehicleBits = [
      if (vehicleType != null) vehicleType!,
      if (plate != null) plate!,
    ];
    return Scaffold(
      appBar: AppBar(title: const Text('Driver profile')),
      body: ListView(
        children: [
          Padding(
            padding: const EdgeInsets.all(16),
            child: Row(
              children: [
                CircleAvatar(
                  radius: 38,
                  backgroundColor: BrandColors.primary,
                  child: const Icon(Icons.person, size: 40, color: Colors.white),
                ),
                const SizedBox(width: 12),
                Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(phone,
                        style: const TextStyle(
                            fontSize: 18, fontWeight: FontWeight.w700)),
                    const Text('Driver',
                        style: TextStyle(
                            fontSize: 14, color: Colors.grey)),
                  ],
                ),
              ],
            ),
          ),
          const Padding(
            padding: EdgeInsets.fromLTRB(16, 8, 16, 4),
            child: Text('Account',
                style: TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.w700,
                    letterSpacing: 0.5,
                    color: Colors.grey)),
          ),
          if (vehicleBits.isNotEmpty)
            HatodListRow(
              leading: const Icon(Icons.two_wheeler),
              title: 'Vehicle',
              trailing: vehicleBits.join(' · '),
            ),
          if (onSwitchToRider != null)
            HatodListRow(
              leading: const Icon(Icons.swap_horiz),
              title: 'Switch to rider mode',
              subtitle: 'Book a ride as a passenger',
              onTap: onSwitchToRider,
            ),
          if (onSignOut != null)
            HatodListRow(
              key: const Key('signOut'),
              leading: const Icon(Icons.logout, color: Colors.red),
              title: 'Sign Out',
              onTap: () async {
                await onSignOut!();
                if (context.mounted) Navigator.of(context).pop();
              },
            ),
        ],
      ),
    );
  }
}
