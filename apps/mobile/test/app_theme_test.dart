import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:hailing_mobile/core/theme/app_theme.dart';

void main() {
  group('AppTheme button minimums', () {
    // Size.fromHeight carries an infinite min-width, which collapses any
    // button laid out in a Row (the chat input vanished on-device while
    // widget tests stayed green).
    test('elevated + outlined minimum sizes are finite', () {
      final theme = AppTheme.light();
      final elevated = theme.elevatedButtonTheme.style?.minimumSize
          ?.resolve(const <WidgetState>{});
      final outlined = theme.outlinedButtonTheme.style?.minimumSize
          ?.resolve(const <WidgetState>{});
      expect(elevated, isNotNull);
      expect(outlined, isNotNull);
      expect(elevated!.width.isFinite, isTrue);
      expect(elevated.height, greaterThan(0));
      expect(outlined!.width.isFinite, isTrue);
      expect(outlined.height, greaterThan(0));
    });
  });
}
