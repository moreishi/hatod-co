import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:latlong2/latlong.dart' as ll;
import '../../../core/constants/app_constants.dart';
import '../../../core/constants/map_constants.dart';
import '../domain/map_models.dart';

/// Shared map renderer (routing spec §53-54).
/// OSM tiles via flutter_map — free, no API key. Routing/ETA/fare stay backend.
class HatodMap extends StatelessWidget {
  final HatodMapPoint? pickup;
  final HatodMapPoint? dropoff;
  final HatodMapPoint? driver;
  final HatodMapPoint? current;
  final List<HatodMapPoint> route;
  /// Fixed height, or null to expand and fill the parent (fullscreen background).
  final double? height;
  final MapController? controller;

  /// Initial zoom when a single focus point drives the camera.
  final double? zoom;

  const HatodMap({
    super.key,
    this.pickup,
    this.dropoff,
    this.driver,
    this.current,
    this.route = const [],
    this.height = 280,
    this.controller,
    this.zoom,
  });

  ll.LatLng _to(HatodMapPoint p) => ll.LatLng(p.lat, p.lng);

  @override
  Widget build(BuildContext context) {
    final focus = pickup ?? dropoff ?? driver ?? current ?? MapConstants.gensan;
    final second = dropoff ?? pickup;
    final camera = second == null || focus == second
        ? HatodMapCamera(
            center: focus, zoom: zoom ?? MapConstants.defaultZoom)
        : MapMath.cameraFor(focus, second,
            distanceKm: route.isEmpty ? 2 : null);

    final markers = <Marker>[
      if (pickup != null)
        Marker(
          key: const Key('pickupMarker'),
          point: _to(pickup!),
          width: 36,
          height: 36,
          child: const Icon(Icons.my_location, color: BrandColors.primary, size: 30),
        ),
      if (dropoff != null)
        Marker(
          key: const Key('dropoffMarker'),
          point: _to(dropoff!),
          width: 36,
          height: 36,
          child: const Icon(Icons.location_on, color: BrandColors.danger, size: 30),
        ),
      if (driver != null)
        Marker(
          key: const Key('driverMarker'),
          point: _to(driver!),
          width: 40,
          height: 40,
          child: Container(
            decoration: const BoxDecoration(color: BrandColors.primary, shape: BoxShape.circle),
            child: const Icon(Icons.two_wheeler, color: Colors.white, size: 22),
          ),
        ),
      if (current != null && driver == null)
        Marker(
          key: const Key('currentMarker'),
          point: _to(current!),
          width: 72,
          height: 72,
          child: Stack(
            alignment: Alignment.center,
            children: [
              Container(
                key: const Key('currentAccuracy'),
                width: 64,
                height: 64,
                decoration: const BoxDecoration(
                  color: Color(0x331A73E8),
                  shape: BoxShape.circle,
                ),
              ),
              Container(
                key: const Key('currentDot'),
                width: 22,
                height: 22,
                decoration: BoxDecoration(
                  color: const Color(0xFF1A73E8),
                  shape: BoxShape.circle,
                  border: Border.all(color: Colors.white, width: 3),
                  boxShadow: const [
                    BoxShadow(
                      color: Color(0x40000000),
                      blurRadius: 4,
                      offset: Offset(0, 1),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
    ];

    final radius = height == null ? 0.0 : 16.0;
    final map = ClipRRect(
        borderRadius: BorderRadius.circular(radius),
        child: FlutterMap(
          mapController: controller,
          options: MapOptions(
            initialCenter: _to(camera.center),
            initialZoom: camera.zoom,
            minZoom: MapConstants.minZoom,
            maxZoom: MapConstants.maxZoom,
          ),
          children: [
            TileLayer(
              urlTemplate: MapConstants.streetTileUrl,
              userAgentPackageName: 'co.hatod.app',
            ),
            if (route.length >= 2)
              PolylineLayer(
                polylines: [
                  Polyline(
                    points: route.map(_to).toList(),
                    strokeWidth: 4,
                    color: BrandColors.route,
                  ),
                ],
              ),
            MarkerLayer(markers: markers),
          ],
        ),
      );
    if (height == null) return SizedBox.expand(child: map);
    return SizedBox(height: height, child: map);
  }
}
