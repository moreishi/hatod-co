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

  const ProfileScreen({
    super.key,
    required this.name,
    required this.phone,
    this.onHistory,
    this.onWallet,
    this.onEdit,
    this.onHelp,
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
                    Text(phone,
                        style: const TextStyle(
                            fontSize: 14, color: Colors.grey)),
                  ],
                ),
              ],
            ),
          ),
          HatodListRow(
              leading: const Icon(Icons.history),
              title: 'Ride History',
              onTap: onHistory),
          HatodListRow(
              leading: const Icon(Icons.account_balance_wallet_outlined),
              title: 'Wallet',
              trailing: '₱120',
              onTap: onWallet),
          HatodListRow(
              leading: const Icon(Icons.edit_outlined),
              title: 'Edit Profile',
              onTap: onEdit),
          HatodListRow(
              leading: const Icon(Icons.help_outline),
              title: 'Help & Support',
              onTap: onHelp),
        ],
      ),
    );
  }
}
