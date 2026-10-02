import 'dart:async';

import 'package:flutter/material.dart';
import '../../../core/constants/app_constants.dart';
import '../../maps/domain/map_models.dart';
import '../../maps/domain/places.dart';

/// Fullscreen search overlay: everything hides except the map behind this
/// sheet. Type to filter bundled places, tap a suggestion (or current
/// location) to select, X to dismiss without changing anything.
class PlaceSearchSheet extends StatefulWidget {
  final String title;
  final bool showCurrentLocation;
  final HatodMapPoint? currentPoint;

  /// GPS scope from reverse-geocode: city label for the current-location row
  /// and area key for same-area-first ordering. Null = unfiltered.
  final ScopedArea? area;

  /// Straight-line distances render per row when set; hidden without GPS.
  final HatodMapPoint? origin;

  /// Backend place-cache lookup (debounced). Bundled results always show
  /// first and survive backend failures (offline-friendly).
  final Future<List<HatodPlace>> Function(String query, String? areaKey)?
      remoteSearch;
  final ValueChanged<HatodPlace> onSelect;
  final VoidCallback onClose;

  /// Pin mode: results hide, the map behind becomes the picker (fixed
  /// center pin). Caret toggles back to the list; X cancels everything.
  final bool pinMode;
  final VoidCallback? onTogglePin;

  const PlaceSearchSheet({
    super.key,
    required this.title,
    this.showCurrentLocation = false,
    this.currentPoint,
    this.area,
    this.origin,
    this.remoteSearch,
    this.pinMode = false,
    this.onTogglePin,
    required this.onSelect,
    required this.onClose,
  });

  @override
  State<PlaceSearchSheet> createState() => _PlaceSearchSheetState();
}

class _PlaceSearchSheetState extends State<PlaceSearchSheet> {
  final _query = TextEditingController();
  List<HatodPlace> _results = List.of(allPlaces);
  Timer? _remoteTimer;

  @override
  void dispose() {
    _query.dispose();
    _remoteTimer?.cancel();
    super.dispose();
  }

  void _onChanged(String v) {
    setState(() => _results = _ordered(searchPlaces(v)));
    _remoteTimer?.cancel();
    final remote = widget.remoteSearch;
    if (remote == null || v.trim().length < 3) return;
    final query = v.trim();
    final areaKey = widget.area?.areaKey;
    _remoteTimer = Timer(const Duration(milliseconds: 600), () async {
      try {
        final found = await remote(query, areaKey);
        if (!mounted) return;
        final known = _results.map((p) => p.name.toLowerCase()).toSet();
        setState(() => _results = _ordered([
              ..._results,
              ...found.where((p) => !known.contains(p.name.toLowerCase())),
            ]));
      } catch (_) {
        // Offline/backend down: bundled results stand on their own.
      }
    });
  }

  List<HatodPlace> _ordered(List<HatodPlace> places) =>
      orderByArea(places, widget.area?.areaKey ?? '');

  List<Widget> _rows() {
    final widgets = <Widget>[];
    for (final p in _sectioned()) {
      if (p is _OutsideHeader) {
        widgets.add(Padding(
          padding: const EdgeInsets.fromLTRB(16, 12, 16, 4),
          child: Text(
            'Outside ${widget.area!.areaLabel}',
            key: const Key('outsideHeader'),
            style: const TextStyle(
                fontSize: 12,
                fontWeight: FontWeight.w600,
                color: BrandColors.secondary),
          ),
        ));
        continue;
      }
      final place = p as HatodPlace;
      widgets.add(ListTile(
        leading:
            const Icon(Icons.location_on, color: BrandColors.danger),
        title: Text(place.name),
        subtitle: Text(place.address),
        trailing: widget.origin == null
            ? null
            : Text(
                '${MapMath.distanceKm(widget.origin!, place.point).toStringAsFixed(1)} km',
                style: const TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.w600,
                    color: BrandColors.secondary),
              ),
        onTap: () => widget.onSelect(place),
      ));
    }
    return widgets;
  }

  /// In-area rows, then an "Outside {area}" header, then the rest.
  /// No area scope (or nothing outside) means a plain list.
  List<Object> _sectioned() {
    final key = widget.area?.areaKey ?? '';
    if (key.isEmpty) return _results;
    final inside =
        _results.where((p) => p.areaKey.toLowerCase() == key).toList();
    final outside =
        _results.where((p) => p.areaKey.toLowerCase() != key).toList();
    if (outside.isEmpty) return inside;
    if (inside.isEmpty) return outside;
    return [...inside, const _OutsideHeader(), ...outside];
  }

  @override
  Widget build(BuildContext context) {
    final showCurrent =
        widget.showCurrentLocation && widget.currentPoint != null;
    return SafeArea(
      child: Padding(
        padding: const EdgeInsets.fromLTRB(16, 8, 16, 0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Padding(
              padding: const EdgeInsets.fromLTRB(4, 0, 4, 6),
              child: Text(
                widget.title,
                key: const Key('searchHeader'),
                style: const TextStyle(
                    fontSize: 13,
                    fontWeight: FontWeight.w700,
                    color: BrandColors.secondary),
              ),
            ),
            Card(
              elevation: 4,
              shape: const RoundedRectangleBorder(
                borderRadius: BorderRadius.all(Radius.circular(16)),
              ),
              child: Padding(
                padding:
                    const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                child: Row(
                  children: [
                    IconButton(
                      key: const Key('pinToggle'),
                      icon: const Icon(Icons.map_outlined),
                      tooltip: 'Pick on map',
                      onPressed: widget.onTogglePin,
                    ),
                    Expanded(
                      child: widget.pinMode
                          ? InkWell(
                              key: const Key('searchAgain'),
                              borderRadius: const BorderRadius.all(
                                  Radius.circular(12)),
                              onTap: widget.onTogglePin,
                              child: const Padding(
                                padding: EdgeInsets.symmetric(vertical: 14),
                                child: Text('Search for a place instead',
                                    style: TextStyle(
                                        fontSize: 15,
                                        color: BrandColors.secondary)),
                              ),
                            )
                          : TextField(
                              key: const Key('placeQuery'),
                              controller: _query,
                              autofocus: true,
                              onChanged: _onChanged,
                              decoration: const InputDecoration(
                                hintText: 'Type to search…',
                                border: InputBorder.none,
                              ),
                            ),
                    ),
                    IconButton(
                      key: const Key('searchCancel'),
                      icon: const Icon(Icons.close),
                      onPressed: widget.onClose,
                    ),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 8),
            if (!widget.pinMode)
              Expanded(
                child: Material(
                color: Colors.white,
                borderRadius:
                    const BorderRadius.vertical(top: Radius.circular(20)),
                clipBehavior: Clip.antiAlias,
                child: ListView(
                  padding: const EdgeInsets.symmetric(vertical: 8),
                  children: [
                    if (showCurrent)
                      ListTile(
                        key: const Key('currentLocationRow'),
                        leading: const Icon(Icons.my_location,
                            color: BrandColors.success),
                        title: const Text('Use current location'),
                        subtitle: Text(widget.area?.label.isNotEmpty == true
                            ? widget.area!.label
                            : 'GPS position'),
                        onTap: () => widget.onSelect(HatodPlace(
                          name: 'Current location',
                          address: widget.area?.label.isNotEmpty == true
                              ? widget.area!.label
                              : 'GPS position',
                          point: widget.currentPoint!,
                          areaKey: widget.area?.areaKey ?? '',
                        )),
                      ),
                    for (final row in _rows()) row,
                    if (_results.isEmpty)
                      const Padding(
                        padding: EdgeInsets.all(24),
                        child: Text('No places found. Try another search.',
                            textAlign: TextAlign.center),
                      ),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

/// Marker inserted before outside-area rows when a GPS scope is active.
class _OutsideHeader {
  const _OutsideHeader();
}
