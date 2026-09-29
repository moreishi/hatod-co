import 'package:flutter/material.dart';
import '../constants/app_constants.dart';

/// Brand theme (mobile spec §5-adjacent global constants).
class AppTheme {
  static ThemeData light() {
    const brand = BrandColors.brand700;
    return ThemeData(
      colorScheme: ColorScheme.fromSeed(seedColor: brand),
      inputDecorationTheme: const InputDecorationTheme(
        border: OutlineInputBorder(
          borderRadius: BorderRadius.all(Radius.circular(8)),
        ),
      ),
      elevatedButtonTheme: ElevatedButtonThemeData(
        style: ElevatedButton.styleFrom(
          minimumSize: const Size.fromHeight(48),
          shape: const RoundedRectangleBorder(
            borderRadius: BorderRadius.all(Radius.circular(8)),
          ),
        ),
      ),
    );
  }
}
