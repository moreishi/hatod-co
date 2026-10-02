import 'package:flutter/material.dart';
import '../../../core/widgets/list_row.dart';

/// Spec §4-21 Profile: avatar 76 + menu + nav.
class ProfileScreen extends StatelessWidget {
  final String name;
  final String phone;
  final VoidCallback? onHistory;
  final VoidCallback? onWallet;
  final VoidCallback? onEdit;
  final VoidCallback? onHelp;
  final VoidCallback? onDrive;
  final VoidCallback? onSwitchToDriver;
  final VoidCallback? onSignOut;

  const ProfileScreen({
    super.key,
    required this.name,
    this.phone = '',
    this.onHistory,
    this.onWallet,
    this.onEdit,
    this.onHelp,
    this.onDrive,
    this.onSwitchToDriver,
    this.onSignOut,
  });

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Profile')),
      body: ListView(
        children: [
          Padding(
            padding: const EdgeInsets.all(16),
            child: Row(
              children: [
                const CircleAvatar(radius: 38, child: Icon(Icons.person, size: 40)),
                const SizedBox(width: 12),
                Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(name,
                        style: const TextStyle(
                            fontSize: 18, fontWeight: FontWeight.w700)),
                    if (phone.isNotEmpty)
                      Text(phone,
                          style: const TextStyle(
                              fontSize: 14, color: Colors.grey)),
                  ],
                ),
              ],
            ),
          ),
          // Menu rows render only when wired: an unwired row is a dead tap.
          if (onHistory != null)
            HatodListRow(
                leading: const Icon(Icons.history),
                title: 'Ride History',
                onTap: onHistory),
          if (onWallet != null)
            HatodListRow(
                leading:
                    const Icon(Icons.account_balance_wallet_outlined),
                title: 'Wallet',
                trailing: '₱120',
                onTap: onWallet),
          if (onEdit != null)
            HatodListRow(
                leading: const Icon(Icons.edit_outlined),
                title: 'Edit Profile',
                onTap: onEdit),
          if (onHelp != null)
            HatodListRow(
                leading: const Icon(Icons.help_outline),
                title: 'Help & Support',
                onTap: onHelp),
          if (onDrive != null)
            HatodListRow(
                leading: const Icon(Icons.directions_car),
                title: 'Become a driver',
                subtitle: 'Earn on your own schedule',
                onTap: onDrive),
          if (onSwitchToDriver != null)
            HatodListRow(
                leading: const Icon(Icons.swap_horiz),
                title: 'Switch to driver mode',
                subtitle: 'Go online and receive requests',
                onTap: onSwitchToDriver),
          if (onSignOut != null)
            HatodListRow(
              key: const Key('signOut'),
              leading: const Icon(Icons.logout, color: Colors.red),
              title: 'Sign Out',
              onTap: onSignOut,
            ),
        ],
      ),
    );
  }
}
