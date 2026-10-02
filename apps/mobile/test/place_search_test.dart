import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:hailing_mobile/features/maps/domain/map_models.dart';
import 'package:hailing_mobile/features/maps/domain/places.dart'
    show HatodPlace, ScopedArea;
import 'package:hailing_mobile/features/rider/presentation/place_search_sheet.dart';

Widget sheet() {
  return MaterialApp(
    home: Scaffold(
      body: PlaceSearchSheet(
        title: 'Set pickup',
        showCurrentLocation: true,
        onSelect: (_) {},
        onClose: () {},
      ),
    ),
  );
}

void main() {
  group('PlaceSearchSheet', () {
    testWidgets('shows current-location row and suggestions', (tester) async {
      HatodPlace? picked;
      await tester.pumpWidget(MaterialApp(
        home: Scaffold(
          body: PlaceSearchSheet(
            title: 'Set pickup',
            showCurrentLocation: true,
            currentPoint: const HatodMapPoint(6.12, 125.18),
            onSelect: (p) => picked = p,
            onClose: () {},
          ),
        ),
      ));
      expect(find.byKey(const Key('currentLocationRow')), findsOneWidget);
      expect(find.text('KCC Mall of Gensan'), findsOneWidget);
      expect(picked, isNull);
    });

    testWidgets('names which endpoint is being set', (tester) async {
      await tester.pumpWidget(sheet());
      await tester.pumpAndSettle();
      // Visible header (the hint alone vanishes once you type).
      expect(find.byKey(const Key('searchHeader')), findsOneWidget);
      expect(find.text('Set pickup'), findsOneWidget);
      expect(find.text('Type to search…'), findsOneWidget);
    });

    testWidgets('pin toggle reads as pick-on-map, not back', (tester) async {
      await tester.pumpWidget(sheet());
      await tester.pumpAndSettle();
      final toggle =
          tester.widget<IconButton>(find.byKey(const Key('pinToggle')));
      expect((toggle.icon as Icon).icon, Icons.map_outlined);
      expect(toggle.tooltip, 'Pick on map');
    });

    testWidgets('typing filters suggestions', (tester) async {
      await tester.pumpWidget(sheet());
      await tester.enterText(find.byKey(const Key('placeQuery')), 'airport');
      await tester.pumpAndSettle();
      expect(find.textContaining('Airport'), findsWidgets);
      expect(find.text('KCC Mall of Gensan'), findsNothing);
    });

    testWidgets('tapping a suggestion selects it', (tester) async {
      HatodPlace? picked;
      await tester.pumpWidget(MaterialApp(
        home: Scaffold(
          body: PlaceSearchSheet(
            title: 'Set destination',
            showCurrentLocation: false,
            onSelect: (p) => picked = p,
            onClose: () {},
          ),
        ),
      ));
      await tester.tap(find.text('SM City General Santos'));
      expect(picked?.name, 'SM City General Santos');
    });

    testWidgets('current-location row selects the GPS point', (tester) async {
      HatodPlace? picked;
      await tester.pumpWidget(MaterialApp(
        home: Scaffold(
          body: PlaceSearchSheet(
            title: 'Set pickup',
            showCurrentLocation: true,
            currentPoint: const HatodMapPoint(6.12, 125.18),
            onSelect: (p) => picked = p,
            onClose: () {},
          ),
        ),
      ));
      await tester.tap(find.byKey(const Key('currentLocationRow')));
      expect(picked?.name, 'Current location');
      expect(picked?.point.lat, 6.12);
    });

    testWidgets('merges debounced backend results after bundled ones',
        (tester) async {
      await tester.pumpWidget(MaterialApp(
        home: Scaffold(
          body: PlaceSearchSheet(
            title: 'Set pickup',
            showCurrentLocation: false,
            remoteSearch: (q, areaKey) async => [
              HatodPlace(
                  name: 'Baluan Gym',
                  address: 'Baluan Gym, Lagao',
                  point: const HatodMapPoint(6.1249864, 125.2171128)),
            ],
            onSelect: (_) {},
            onClose: () {},
          ),
        ),
      ));
      await tester.enterText(find.byKey(const Key('placeQuery')), 'lagao gym');
      await tester.pump(const Duration(milliseconds: 700));
      await tester.pumpAndSettle();
      expect(find.text('Baluan Gym'), findsOneWidget);
    });

    testWidgets('bundled results survive a backend failure', (tester) async {
      await tester.pumpWidget(MaterialApp(
        home: Scaffold(
          body: PlaceSearchSheet(
            title: 'Set pickup',
            showCurrentLocation: false,
            remoteSearch: (_, __) async => throw Exception('offline'),
            onSelect: (_) {},
            onClose: () {},
          ),
        ),
      ));
      await tester.enterText(find.byKey(const Key('placeQuery')), 'kcc');
      await tester.pump(const Duration(milliseconds: 700));
      await tester.pumpAndSettle();
      expect(find.text('KCC Mall of Gensan'), findsOneWidget);
    });

    testWidgets('area scope puts in-area first with outside section',
        (tester) async {
      await tester.pumpWidget(MaterialApp(
        home: Scaffold(
          body: PlaceSearchSheet(
            title: 'Set pickup',
            showCurrentLocation: false,
            area: const ScopedArea(
                city: 'General Santos',
                areaKey: 'ph-12',
                areaLabel: 'Soccsksargen',
                label: 'General Santos, Soccsksargen'),
            remoteSearch: (q, areaKey) async => [
              HatodPlace(
                  name: 'Ayala Center Cebu',
                  address: 'Cebu City',
                  areaKey: 'ph-07',
                  point: const HatodMapPoint(10.3181, 123.9054)),
            ],
            onSelect: (_) {},
            onClose: () {},
          ),
        ),
      ));
      await tester.enterText(find.byKey(const Key('placeQuery')), 'mall');
      await tester.pump(const Duration(milliseconds: 700));
      await tester.pumpAndSettle();
      // In-area bundled mall above the outside section.
      final kcc = tester.getTopLeft(find.text('KCC Mall of Gensan'));
      final outside = tester.getTopLeft(find.text('Outside Soccsksargen'));
      final ayala = tester.getTopLeft(find.text('Ayala Center Cebu'));
      expect(kcc.dy, lessThan(outside.dy));
      expect(outside.dy, lessThan(ayala.dy));
    });

    testWidgets('caret toggles pin mode, X cancels search', (tester) async {
      var toggled = 0;
      var closed = 0;
      await tester.pumpWidget(MaterialApp(
        home: Scaffold(
          body: PlaceSearchSheet(
            title: 'Set pickup',
            onSelect: (_) {},
            onTogglePin: () => toggled++,
            onClose: () => closed++,
          ),
        ),
      ));
      await tester.tap(find.byKey(const Key('pinToggle')));
      expect(toggled, 1);
      expect(closed, 0);
      await tester.tap(find.byKey(const Key('searchCancel')));
      expect(closed, 1);
    });

    testWidgets('pin mode hides list, offers search-again', (tester) async {
      var toggled = 0;
      await tester.pumpWidget(MaterialApp(
        home: Scaffold(
          body: PlaceSearchSheet(
            title: 'Set pickup',
            pinMode: true,
            onSelect: (_) {},
            onTogglePin: () => toggled++,
            onClose: () {},
          ),
        ),
      ));
      expect(find.byKey(const Key('placeQuery')), findsNothing);
      expect(find.text('KCC Mall of Gensan'), findsNothing);
      expect(find.byKey(const Key('searchCancel')), findsOneWidget);
      await tester.tap(find.byKey(const Key('searchAgain')));
      expect(toggled, 1);
    });

    testWidgets('rows show km from GPS, hidden without it', (tester) async {
      Widget withOrigin(HatodMapPoint? origin) => MaterialApp(
            home: Scaffold(
              body: PlaceSearchSheet(
                title: 'Set pickup',
                showCurrentLocation: false,
                origin: origin,
                onSelect: (_) {},
                onClose: () {},
              ),
            ),
          );
      await tester.pumpWidget(
          withOrigin(const HatodMapPoint(6.1117, 125.1749)));
      expect(find.textContaining('km'), findsWidgets);

      await tester.pumpWidget(withOrigin(null));
      await tester.pumpAndSettle();
      expect(find.textContaining('km'), findsNothing);
    });
  });
}
