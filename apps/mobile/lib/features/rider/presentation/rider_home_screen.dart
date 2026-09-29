import 'package:flutter/material.dart';

/// Rider home shell (booking UI lands here next).
class RiderHomeScreen extends StatelessWidget {
  final String userId;

  const RiderHomeScreen({super.key, required this.userId});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Hailing Rider')),
      body: Center(
        child: Text('Rider home · $userId', key: const Key('riderHome')),
      ),
    );
  }
}
