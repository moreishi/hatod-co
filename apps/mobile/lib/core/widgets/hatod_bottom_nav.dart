import 'package:flutter/material.dart';
import '../constants/app_constants.dart';

/// Bottom nav h-68 4 tabs active green: Home / Orders / Favorites / Me.
class HatodBottomNav extends StatelessWidget {
  final int index;
  final ValueChanged<int> onTap;

  const HatodBottomNav({super.key, required this.index, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return NavigationBar(
      height: AppSizes.bottomNavHeight,
      selectedIndex: index,
      onDestinationSelected: onTap,
      destinations: const [
        NavigationDestination(icon: Icon(Icons.home_outlined), label: 'Home'),
        NavigationDestination(icon: Icon(Icons.receipt_long_outlined), label: 'Orders'),
        NavigationDestination(icon: Icon(Icons.favorite_outline), label: 'Favorites'),
        NavigationDestination(icon: Icon(Icons.person_outline), label: 'Me'),
      ],
    );
  }

  static Color activeColor(bool active) =>
      active ? BrandColors.primary : BrandColors.muted;
}
