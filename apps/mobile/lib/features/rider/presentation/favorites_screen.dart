import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../../maps/domain/map_models.dart';
import '../../maps/domain/places.dart';

/// Saved place, optionally pinned to the map. Entries added by address
/// text alone resolve through search on first tap.
class FavoritePlace {
  final String label;
  final String address;
  final double? lat;
  final double? lng;

  const FavoritePlace({
    required this.label,
    required this.address,
    this.lat,
    this.lng,
  });

  HatodMapPoint? get point =>
      lat == null || lng == null ? null : HatodMapPoint(lat!, lng!);

  Map<String, dynamic> toJson() => {
        'label': label,
        'address': address,
        if (lat != null) 'lat': lat,
        if (lng != null) 'lng': lng,
      };

  factory FavoritePlace.fromJson(Map<String, dynamic> json) =>
      FavoritePlace(
        label: json['label'] as String? ?? '',
        address: json['address'] as String? ?? '',
        lat: (json['lat'] as num?)?.toDouble(),
        lng: (json['lng'] as num?)?.toDouble(),
      );
}

const defaultFavorites = [
  FavoritePlace(label: 'Home', address: 'General Santos City'),
  FavoritePlace(label: 'Work', address: 'KCC Mall of Gensan'),
];

/// Device persistence for favorites (first run seeds the demo entries).
class FavoriteStore {
  static const key = 'hatod_favorites';

  Future<List<FavoritePlace>> load() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final raw = prefs.getString(key);
      if (raw == null) return List.of(defaultFavorites);
      return (jsonDecode(raw) as List)
          .map((e) => FavoritePlace.fromJson(e as Map<String, dynamic>))
          .toList();
    } catch (_) {
      return List.of(defaultFavorites);
    }
  }

  Future<void> save(List<FavoritePlace> places) async {
    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.setString(
          key, jsonEncode(places.map((p) => p.toJson()).toList()));
    } catch (_) {
      // Persistence is a convenience; the in-memory list still works.
    }
  }
}

/// Saved places (Favorites tab). Tapping an entry sets it as the trip
/// destination; "Save current destination" pins whatever Home holds.
class FavoritesScreen extends StatefulWidget {
  final ValueChanged<HatodPlace>? onSelect;
  final HatodPlace? destination;
  final Future<List<HatodPlace>> Function(String query)? resolveAddress;

  const FavoritesScreen({
    super.key,
    this.onSelect,
    this.destination,
    this.resolveAddress,
  });

  @override
  State<FavoritesScreen> createState() => _FavoritesScreenState();
}

class _FavoritesScreenState extends State<FavoritesScreen> {
  final _store = FavoriteStore();
  List<FavoritePlace>? _places;
  final _label = TextEditingController();
  final _address = TextEditingController();
  String? _resolving;

  @override
  void initState() {
    super.initState();
    _store.load().then((p) {
      if (mounted) setState(() => _places = p);
    });
  }

  @override
  void dispose() {
    _label.dispose();
    _address.dispose();
    super.dispose();
  }

  Future<void> _persist() => _store.save(_places ?? const []);

  void _add() {
    final label = _label.text.trim();
    final address = _address.text.trim();
    if (label.isEmpty || address.isEmpty) return;
    setState(() {
      _places = [
        ...?_places,
        FavoritePlace(label: label, address: address)
      ];
      _label.clear();
      _address.clear();
    });
    _persist();
  }

  void _saveCurrent() {
    final dest = widget.destination;
    if (dest == null) return;
    setState(() {
      _places = [
        ...?_places,
        FavoritePlace(
          label: dest.name,
          address: dest.address,
          lat: dest.point.lat,
          lng: dest.point.lng,
        ),
      ];
    });
    _persist();
  }

  Future<void> _select(FavoritePlace place) async {
    final onSelect = widget.onSelect;
    if (onSelect == null) return;
    final point = place.point;
    if (point != null) {
      onSelect(HatodPlace(
          name: place.label, address: place.address, point: point));
      return;
    }
    final resolve = widget.resolveAddress;
    if (resolve == null) return;
    setState(() => _resolving = place.label);
    try {
      final hits = await resolve(place.address);
      if (!mounted) return;
      if (hits.isEmpty) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(
            content: Text(
                'Could not find "${place.label}" on the map yet.')));
        return;
      }
      onSelect(hits.first);
    } catch (_) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(
          content: Text('Could not look that up. Please try again.')));
    } finally {
      if (mounted) setState(() => _resolving = null);
    }
  }

  @override
  Widget build(BuildContext context) {
    final places = _places;
    return Scaffold(
      appBar: AppBar(title: const Text('Favorites')),
      body: places == null
          ? const Center(child: CircularProgressIndicator())
          : ListView(
              padding: const EdgeInsets.all(16),
              children: [
                if (widget.destination != null)
                  Padding(
                    padding: const EdgeInsets.only(bottom: 12),
                    child: OutlinedButton.icon(
                      key: const Key('favSaveCurrent'),
                      icon: const Icon(Icons.bookmark_add_outlined),
                      label: Text(
                          'Save current destination (${widget.destination!.name})'),
                      onPressed: _saveCurrent,
                    ),
                  ),
                for (final p in places)
                  Card(
                    child: ListTile(
                      leading: const Icon(Icons.favorite,
                          color: Colors.red),
                      title: Text(p.label),
                      subtitle: Text(p.address),
                      trailing: IconButton(
                        key: Key('favDelete-${p.label}'),
                        icon: const Icon(Icons.delete_outline),
                        onPressed: () {
                          setState(() => _places = List.of(places)
                            ..remove(p));
                          _persist();
                        },
                      ),
                      onTap: _resolving != null
                          ? null
                          : () => _select(p),
                    ),
                  ),
                const SizedBox(height: 16),
                TextField(
                  key: const Key('favLabel'),
                  controller: _label,
                  decoration:
                      const InputDecoration(labelText: 'Label (e.g. Gym)'),
                ),
                const SizedBox(height: 8),
                TextField(
                  key: const Key('favAddress'),
                  controller: _address,
                  decoration:
                      const InputDecoration(labelText: 'Address'),
                ),
                const SizedBox(height: 12),
                ElevatedButton(
                  key: const Key('favAdd'),
                  onPressed: _add,
                  child: const Text('Add favorite'),
                ),
              ],
            ),
    );
  }
}
