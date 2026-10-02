import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:hailing_mobile/features/maps/domain/map_models.dart';
import 'package:hailing_mobile/features/maps/domain/places.dart';
import 'package:hailing_mobile/features/rider/presentation/favorites_screen.dart';

void main() {
  group('FavoriteStore', () {
    test('round-trips entries with coordinates', () async {
      SharedPreferences.setMockInitialValues({});
      final store = FavoriteStore();
      await store.save(const [
        FavoritePlace(
            label: 'Gym', address: 'Block 1', lat: 6.1, lng: 125.1),
      ]);
      final loaded = await store.load();
      expect(loaded, hasLength(1));
      expect(loaded.single.point?.lat, 6.1);
    });

    test('seeds the demo entries on first run', () async {
      SharedPreferences.setMockInitialValues({});
      expect(await FavoriteStore().load(), hasLength(2));
    });
  });

  group('FavoritesScreen', () {
    testWidgets('tapping a pinned entry sets the destination',
        (tester) async {
      SharedPreferences.setMockInitialValues({});
      HatodPlace? selected;
      await tester.pumpWidget(MaterialApp(
        home: FavoritesScreen(
          onSelect: (p) => selected = p,
        ),
      ));
      await tester.pumpAndSettle();
      await tester.enterText(
          find.byKey(const Key('favLabel')), 'Gym');
      await tester.enterText(
          find.byKey(const Key('favAddress')), 'Block 1');
      await tester.tap(find.byKey(const Key('favAdd')));
      await tester.pumpAndSettle();
      // Address-only entries resolve through search on tap.
      await tester.tap(find.text('Gym'));
      await tester.pumpAndSettle();
      // No resolver wired: nothing selected, entry kept.
      expect(selected, isNull);
      expect(find.text('Gym'), findsOneWidget);
    });

    testWidgets('entries delete and stay deleted', (tester) async {
      SharedPreferences.setMockInitialValues({});
      await tester.pumpWidget(const MaterialApp(home: FavoritesScreen()));
      await tester.pumpAndSettle();
      expect(find.text('Home'), findsOneWidget);
      await tester.tap(find.byKey(const Key('favDelete-Home')));
      await tester.pumpAndSettle();
      expect(find.text('Home'), findsNothing);
      expect(
          (await FavoriteStore().load()).any((p) => p.label == 'Home'),
          isFalse);
    });

    testWidgets('address-only entries resolve through search',
        (tester) async {
      SharedPreferences.setMockInitialValues({});
      HatodPlace? selected;
      await tester.pumpWidget(MaterialApp(
        home: FavoritesScreen(
          onSelect: (p) => selected = p,
          resolveAddress: (q) async => [
            HatodPlace(
                name: 'Gym',
                address: q,
                point: const HatodMapPoint(6.2, 125.2)),
          ],
        ),
      ));
      await tester.pumpAndSettle();
      await tester.enterText(
          find.byKey(const Key('favLabel')), 'Gym');
      await tester.enterText(
          find.byKey(const Key('favAddress')), 'Block 1');
      await tester.tap(find.byKey(const Key('favAdd')));
      await tester.pumpAndSettle();
      await tester.tap(find.text('Gym'));
      await tester.pumpAndSettle();
      expect(selected?.point.lat, 6.2);
    });

    testWidgets('unresolvable entries explain instead of failing',
        (tester) async {
      SharedPreferences.setMockInitialValues({});
      HatodPlace? selected;
      await tester.pumpWidget(MaterialApp(
        home: FavoritesScreen(
          onSelect: (p) => selected = p,
          resolveAddress: (_) async => [],
        ),
      ));
      await tester.pumpAndSettle();
      await tester.enterText(
          find.byKey(const Key('favLabel')), 'Nowhere');
      await tester.enterText(
          find.byKey(const Key('favAddress')), 'Nope');
      await tester.tap(find.byKey(const Key('favAdd')));
      await tester.pumpAndSettle();
      await tester.tap(find.text('Nowhere'));
      await tester.pumpAndSettle();
      expect(selected, isNull);
      expect(find.textContaining('Could not find'), findsOneWidget);
    });

    testWidgets('save current destination pins it with coordinates',
        (tester) async {
      SharedPreferences.setMockInitialValues({});
      HatodPlace? selected;
      await tester.pumpWidget(MaterialApp(
        home: FavoritesScreen(
          onSelect: (p) => selected = p,
          destination: HatodPlace(
              name: 'KCC Mall',
              address: 'KCC Mall of Gensan',
              point: const HatodMapPoint(6.13, 125.19)),
        ),
      ));
      await tester.pumpAndSettle();
      await tester.tap(find.byKey(const Key('favSaveCurrent')));
      await tester.pumpAndSettle();
      expect(find.text('KCC Mall'), findsWidgets);
      await tester.tap(find.text('KCC Mall').first);
      await tester.pumpAndSettle();
      expect(selected?.point.lat, 6.13);
      final reloaded = await FavoriteStore().load();
      expect(reloaded.any((p) => p.label == 'KCC Mall'), isTrue);
      expect(reloaded.firstWhere((p) => p.label == 'KCC Mall').point,
          isNotNull);
    });
  });
}
