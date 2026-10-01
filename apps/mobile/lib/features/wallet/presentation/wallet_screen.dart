import 'package:flutter/material.dart';
import '../../../core/widgets/list_row.dart';
import '../../../core/widgets/wallet_hero.dart';

/// Spec §4-24 Wallet: hero ₱120 + history + Cash/GCash + Add.
class WalletScreen extends StatelessWidget {
  final String balance;

  const WalletScreen({super.key, this.balance = '₱120.00'});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Wallet')),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          WalletHero(amount: balance, onTopUp: () {}),
          const SizedBox(height: 16),
          const Text('Payment methods',
              style: TextStyle(fontSize: 16, fontWeight: FontWeight.w600)),
          const HatodListRow(
              leading: Icon(Icons.money), title: 'Cash', trailing: 'Default'),
          const HatodListRow(
              leading: Icon(Icons.account_balance_wallet_outlined),
              title: 'GCash',
              subtitle: 'Not linked'),
          const HatodListRow(
              leading: Icon(Icons.add), title: 'Add Payment Method'),
          const SizedBox(height: 16),
          const Text('Transaction History',
              style: TextStyle(fontSize: 16, fontWeight: FontWeight.w600)),
          const HatodListRow(title: 'Ride to KCC Mall', subtitle: 'Sep 29 · 9:41', trailing: '₱58'),
          const HatodListRow(title: 'Top Up', subtitle: 'Sep 28', trailing: '₱120'),
        ],
      ),
    );
  }
}
