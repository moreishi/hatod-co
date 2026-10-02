import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:hailing_mobile/features/driver/presentation/driver_profile_screen.dart';

void main() {
  group('DriverProfileScreen', () {
    testWidgets('shows phone, vehicle, and sign out', (tester) async {
      var signedOut = 0;
      await tester.pumpWidget(MaterialApp(
        home: DriverProfileScreen(
          phone: '0917100011',
          vehicleType: 'MOTORCYCLE',
          plate: 'GAK 1234',
          onSignOut: () async => signedOut++,
        ),
      ));
      await tester.pumpAndSettle();
      expect(find.text('0917100011'), findsOneWidget);
      expect(find.textContaining('MOTORCYCLE'), findsOneWidget);
      expect(find.textContaining('GAK 1234'), findsOneWidget);
      await tester.tap(find.byKey(const Key('signOut')));
      await tester.pumpAndSettle();
      expect(signedOut, 1);
    });

    testWidgets('switch row fires the mode callback', (tester) async {
      var switched = 0;
      await tester.pumpWidget(MaterialApp(
        home: DriverProfileScreen(
          phone: '0917100011',
          onSwitchToRider: () => switched++,
        ),
      ));
      await tester.pumpAndSettle();
      await tester.tap(find.text('Switch to rider mode'));
      expect(switched, 1);
    });

    testWidgets('hides the vehicle row without an assignment', (tester) async {
      await tester.pumpWidget(const MaterialApp(
        home: DriverProfileScreen(phone: '0917100011'),
      ));
      await tester.pumpAndSettle();
      expect(find.text('0917100011'), findsOneWidget);
      expect(find.text('Vehicle'), findsNothing);
    });
  });
}
