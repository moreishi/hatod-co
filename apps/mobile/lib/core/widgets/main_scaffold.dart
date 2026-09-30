import 'package:flutter/material.dart';
import 'hatod_bottom_nav.dart';

/// Spec §1 MainScaffold: bottom nav Home / History / Messages / Profile.
class MainScaffold extends StatelessWidget {
  final int index;
  final ValueChanged<int> onTap;
  final Widget body;

  const MainScaffold(
      {super.key, required this.index, required this.onTap, required this.body});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: body,
      bottomNavigationBar: HatodBottomNav(index: index, onTap: onTap),
    );
  }
}
