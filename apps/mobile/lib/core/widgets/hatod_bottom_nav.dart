import 'package:flutter/material.dart';
import '../constants/app_constants.dart';

/// Spec §3 Bottom nav h-68 4 tabs active green.
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
        NavigationDestination(icon: Icon(Icons.history), label: 'History'),
        NavigationDestination(icon: Icon(Icons.message_outlined), label: 'Messages'),
        NavigationDestination(icon: Icon(Icons.person_outline), label: 'Profile'),
      ],
    );
  }

  static Color activeColor(bool active) =>
      active ? BrandColors.primary : BrandColors.muted;
}
