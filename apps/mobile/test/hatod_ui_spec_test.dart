import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:hailing_mobile/core/widgets/chat_bubble.dart';
import 'package:hailing_mobile/core/widgets/driver_card.dart';
import 'package:hailing_mobile/core/widgets/hatod_bottom_nav.dart';
import 'package:hailing_mobile/core/widgets/hatod_button.dart';
import 'package:hailing_mobile/core/widgets/hatod_sheet.dart';
import 'package:hailing_mobile/core/widgets/list_row.dart';
import 'package:hailing_mobile/core/widgets/otp_boxes.dart';
import 'package:hailing_mobile/core/widgets/state_views.dart';
import 'package:hailing_mobile/core/widgets/wallet_hero.dart';
import 'package:hailing_mobile/features/auth/presentation/create_profile_screen.dart';
import 'package:hailing_mobile/features/auth/presentation/permissions_screen.dart';
import 'package:hailing_mobile/features/auth/presentation/signup_screen.dart';
import 'package:hailing_mobile/features/messaging/presentation/messages_list_screen.dart';
import 'package:hailing_mobile/features/profile/presentation/edit_profile_screen.dart';
import 'package:hailing_mobile/features/profile/presentation/profile_screen.dart';
import 'package:hailing_mobile/features/ride/presentation/ride_flow_screen.dart';
import 'package:hailing_mobile/features/support/presentation/help_screen.dart';
import 'package:hailing_mobile/features/wallet/presentation/wallet_screen.dart';

void main() {
  group('hatod-ui-spec §2 tokens + §3 components', () {
    testWidgets('primary button sizes per spec', (tester) async {
      await tester.pumpWidget(const MaterialApp(
          home: Scaffold(body: HatodButton(label: 'Request Ride'))));
      final sized = tester.widget<SizedBox>(
          find.ancestor(of: find.text('Request Ride'), matching: find.byType(SizedBox)).first);
      expect(sized.height, 50);
    });

    testWidgets('otp boxes render 6 inputs', (tester) async {
      await tester.pumpWidget(MaterialApp(
          home: Scaffold(body: OtpBoxes(onCompleted: (_) {}))));
      expect(find.byType(TextField), findsNWidgets(6));
    });

    testWidgets('driver card shows name rating plate eta', (tester) async {
      await tester.pumpWidget(const MaterialApp(
          home: Scaffold(
              body: DriverCard(
                  name: 'Carlos Reyes',
                  rating: 4.9,
                  rides: 120,
                  vehicle: 'Honda Click',
                  plate: 'GAK 1234',
                  eta: '3 min away'))));
      expect(find.text('Carlos Reyes'), findsOneWidget);
      expect(find.text('GAK 1234', findRichText: true), findsNothing);
      expect(find.textContaining('Honda Click'), findsOneWidget);
    });

    testWidgets('driver card has its own tinted surface', (tester) async {
      await tester.pumpWidget(const MaterialApp(
          home: Scaffold(
              body: DriverCard(
                  name: 'Carlos Reyes',
                  rating: 4.9,
                  rides: 120,
                  vehicle: 'Honda Click',
                  plate: 'GAK 1234',
                  eta: '3 min away'))));
      final card = tester.widget<Container>(find.byKey(const Key('driverCard')));
      final decoration = card.decoration as BoxDecoration?;
      expect(decoration?.color, isNotNull);
      expect(decoration?.color, isNot(equals(Colors.white)));
    });

    testWidgets('wallet hero shows balance', (tester) async {
      await tester.pumpWidget(const MaterialApp(
          home: WalletHero(amount: '₱120.00')));
      expect(find.text('₱120.00'), findsOneWidget);
      expect(find.text('Top Up'), findsOneWidget);
    });

    testWidgets('chat bubbles align by direction', (tester) async {
      await tester.pumpWidget(const MaterialApp(
          home: Scaffold(
              body: Column(children: [
        ChatBubble(text: 'hi', outgoing: false),
        ChatBubble(text: 'yo', outgoing: true),
      ]))));
      expect(find.text('hi'), findsOneWidget);
      expect(find.text('yo'), findsOneWidget);
    });

    testWidgets('bottom nav has 4 tabs', (tester) async {
      await tester.pumpWidget(MaterialApp(
          home: Scaffold(
              bottomNavigationBar:
                  HatodBottomNav(index: 0, onTap: (_) {}))));
      expect(find.text('Home'), findsOneWidget);
      expect(find.text('Orders'), findsOneWidget);
      expect(find.text('Favorites'), findsOneWidget);
      expect(find.text('Me'), findsOneWidget);
    });

    testWidgets('sheet + fare row render', (tester) async {
      await tester.pumpWidget(const MaterialApp(
          home: Scaffold(
              body: HatodSheet(
                  child: FareLocationRow(
                      icon: Icons.location_on,
                      label: 'Destination',
                      address: 'KCC Mall')))));
      expect(find.text('KCC Mall'), findsOneWidget);
    });

    testWidgets('list row + state views render', (tester) async {
      await tester.pumpWidget(const MaterialApp(
          home: Scaffold(
              body: SingleChildScrollView(
                  child: Column(children: [
        HatodListRow(title: 'Ride History'),
        NoDriverView(),
        OfflineView(),
        GpsOffView(),
      ])))));
      expect(find.text('Ride History'), findsOneWidget);
      expect(find.text('No driver found'), findsOneWidget);
    });
  });

  group('hatod-ui-spec §4 AuthStack', () {
    testWidgets('signup validates phone', (tester) async {
      await tester.pumpWidget(
          const MaterialApp(home: SignupScreen()));
      await tester.tap(find.text('Continue'));
      await tester.pump();
      expect(find.text('Phone required'), findsOneWidget);
      expect(find.text('Name required'), findsOneWidget);
    });

    testWidgets('create profile validates name', (tester) async {
      await tester.pumpWidget(MaterialApp(
          home: CreateProfileScreen(onContinue: (_) {})));
      await tester.tap(find.text('Continue'));
      await tester.pump();
      expect(find.text('Name required'), findsOneWidget);
    });

    testWidgets('permissions shows both actions', (tester) async {
      await tester.pumpWidget(MaterialApp(
          home: PermissionsScreen(onAllow: () {}, onLater: () {})));
      expect(find.text('Allow Location'), findsOneWidget);
      expect(find.text('Maybe Later'), findsOneWidget);
    });

    testWidgets('signup has no password or Google options', (tester) async {
      await tester.pumpWidget(
          const MaterialApp(home: SignupScreen()));
      expect(find.text('Continue'), findsOneWidget);
      expect(find.textContaining('Password'), findsNothing);
      expect(find.textContaining('Google'), findsNothing);
    });
  });

  group('hatod-ui-spec §4 RideFlow + tabs', () {
    testWidgets('ride flow starts at pickup sheet', (tester) async {
      await tester.pumpWidget(const MaterialApp(home: RideFlowScreen()));
      expect(find.text('Where to?'), findsOneWidget);
    });

    testWidgets('messages list shows 4 threads', (tester) async {
      await tester.pumpWidget(const MaterialApp(home: MessagesListScreen()));
      expect(find.text('Carlos Reyes'), findsOneWidget);
      expect(find.text('Driver Support'), findsOneWidget);
    });

    testWidgets('profile menu renders', (tester) async {
      await tester.pumpWidget(MaterialApp(
          home: ProfileScreen(
              name: 'Juan Dela Cruz',
              phone: '+63',
              onHistory: () {},
              onWallet: () {},
              onEdit: () {},
              onHelp: () {},
              onSignOut: () {})));
      expect(find.text('Wallet'), findsOneWidget);
      expect(find.text('Ride History'), findsOneWidget);
    });

    testWidgets('edit profile prefills', (tester) async {
      await tester.pumpWidget(const MaterialApp(home: EditProfileScreen()));
      expect(find.text('Juan Dela Cruz'), findsOneWidget);
    });

    testWidgets('wallet shows hero + methods', (tester) async {
      await tester.pumpWidget(const MaterialApp(home: WalletScreen()));
      expect(find.text('₱120.00'), findsOneWidget);
      expect(find.text('GCash'), findsOneWidget);
    });

    testWidgets('help shows version', (tester) async {
      await tester.pumpWidget(const MaterialApp(home: HelpScreen()));
      expect(find.text('About'), findsOneWidget);
    });
  });
}
