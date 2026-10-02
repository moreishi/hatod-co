import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:hailing_mobile/features/profile/presentation/profile_screen.dart';

void main() {
  group('ProfileScreen', () {
    testWidgets('hides menu rows without callbacks', (tester) async {
      await tester.pumpWidget(const MaterialApp(
        home: ProfileScreen(name: 'T'),
      ));
      await tester.pumpAndSettle();
      expect(find.text('Ride History'), findsNothing);
      expect(find.text('Wallet'), findsNothing);
      expect(find.text('Edit Profile'), findsNothing);
      expect(find.text('Help & Support'), findsNothing);
      expect(find.text('Become a driver'), findsNothing);
      expect(find.byKey(const Key('signOut')), findsNothing);
    });

    testWidgets('shows wired rows and the phone line', (tester) async {
      await tester.pumpWidget(MaterialApp(
        home: ProfileScreen(
          name: 'Juan',
          phone: '+639171000031',
          onHistory: () {},
          onWallet: () {},
          onEdit: () {},
          onHelp: () {},
          onDrive: () {},
          onSignOut: () {},
        ),
      ));
      await tester.pumpAndSettle();
      expect(find.text('Ride History'), findsOneWidget);
      expect(find.text('Wallet'), findsOneWidget);
      expect(find.text('Edit Profile'), findsOneWidget);
      expect(find.text('Help & Support'), findsOneWidget);
      expect(find.text('Become a driver'), findsOneWidget);
      expect(find.text('+639171000031'), findsOneWidget);
      expect(find.byKey(const Key('signOut')), findsOneWidget);
    });

    testWidgets('hides the phone line when empty', (tester) async {
      await tester.pumpWidget(const MaterialApp(
        home: ProfileScreen(name: 'Juan'),
      ));
      await tester.pumpAndSettle();
      expect(find.text('Juan'), findsOneWidget);
      expect(find.text(''), findsNothing);
    });
  });
}
