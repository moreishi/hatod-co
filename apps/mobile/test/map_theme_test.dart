import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:hailing_mobile/core/constants/map_constants.dart';
import 'package:hailing_mobile/features/maps/domain/map_models.dart';
import 'package:hailing_mobile/features/maps/presentation/hatod_map.dart';

void main() {
  group('Map theme (CyclOSM, no key)', () {
    test('cyclosm tiles configured with attribution', () {
      expect(MapConstants.streetTileUrl, contains('tile-cyclosm'));
      expect(MapConstants.streetTileUrl, contains('cyclosm'));
      expect(MapConstants.tileAttribution, contains('OpenStreetMap'));
      expect(MapConstants.tileAttribution, contains('CyclOSM'));
    });

    test('home opens zoomed in close', () {
      expect(MapConstants.homeZoom, 17.0);
    });

    testWidgets('current location renders blue-dot marker', (tester) async {
      await tester.pumpWidget(const MaterialApp(
        home: Scaffold(
          body: HatodMap(
            height: 280,
            current: HatodMapPoint(6.1169, 125.1716),
          ),
        ),
      ));
      expect(find.byKey(const Key('currentMarker')), findsOneWidget);
      expect(find.byKey(const Key('currentDot')), findsOneWidget);
      expect(find.byKey(const Key('currentAccuracy')), findsOneWidget);
    });
  });
}
