import 'package:flutter/material.dart';

/// Driver home shell (online toggle + assignments land here next).
class DriverHomeScreen extends StatelessWidget {
  final String userId;

  const DriverHomeScreen({super.key, required this.userId});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Hailing Driver')),
      body: Center(
        child: Text('Driver home · $userId', key: const Key('driverHome')),
      ),
    );
  }
}
