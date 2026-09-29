import 'package:flutter/material.dart';
import 'core/theme/app_theme.dart';
import 'features/auth/presentation/login_screen.dart';

void main() {
  runApp(const HailingApp());
}

class HailingApp extends StatelessWidget {
  const HailingApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Hailing',
      theme: AppTheme.light(),
      home: const LoginScreen(),
    );
  }
}
