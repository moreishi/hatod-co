import 'package:flutter/material.dart';
import '../../../core/constants/app_constants.dart';

/// Bookable leaf option (the code goes to the backend quote).
class VehicleOption {
  final String code;
  final String name;
  final String caption;
  final IconData icon;
  const VehicleOption({
    required this.code,
    required this.name,
    required this.caption,
    required this.icon,
  });
}

/// Top-level category. A lone child means one tap selects it directly.
class VehicleCategory {
  final String code;
  final String name;
  final String caption;
  final String seats;
  final IconData icon;
  final List<VehicleOption> children;
  const VehicleCategory({
    required this.code,
    required this.name,
    required this.caption,
    required this.seats,
    required this.icon,
    required this.children,
  });
}

const vehicleCategories = [
  VehicleCategory(
    code: 'MOTORCYCLE',
    name: 'Motorcycle',
    caption: '1 rider',
    seats: '1 rider',
    icon: Icons.two_wheeler,
    children: [
      VehicleOption(
        code: 'MOTORCYCLE',
        name: 'Motorcycle',
        caption: '1 rider',
        icon: Icons.two_wheeler,
      ),
    ],
  ),
  VehicleCategory(
    code: 'CAR',
    name: 'Passenger Car',
    caption: 'Taxi · 4 or 6 seats',
    seats: '1–6 seats',
    icon: Icons.directions_car,
    children: [
      VehicleOption(
        code: 'TAXI',
        name: 'Taxi',
        caption: 'Metered car',
        icon: Icons.local_taxi,
      ),
      VehicleOption(
        code: 'CAR_4SEATER',
        name: '4 Seater',
        caption: 'Up to 4 seats',
        icon: Icons.directions_car,
      ),
      VehicleOption(
        code: 'CAR_6SEATER',
        name: '6 Seater',
        caption: 'Up to 6 seats',
        icon: Icons.airport_shuttle,
      ),
    ],
  ),
  VehicleCategory(
    code: 'TRUCK',
    name: 'Truck',
    caption: 'Cargo · limited drivers',
    seats: 'Cargo · up to 2 t',
    icon: Icons.local_shipping,
    children: [
      VehicleOption(
        code: 'TRUCK_600KG',
        name: 'Up to 600kg',
        caption: 'Small cargo',
        icon: Icons.local_shipping,
      ),
      VehicleOption(
        code: 'TRUCK_600KG_MOVER',
        name: '600kg + 1 mover',
        caption: 'With helper',
        icon: Icons.person_add_alt_1,
      ),
      VehicleOption(
        code: 'TRUCK_1000KG',
        name: 'Up to 1000kg',
        caption: 'Medium cargo',
        icon: Icons.local_shipping,
      ),
      VehicleOption(
        code: 'TRUCK_2000KG',
        name: 'Up to 2000kg',
        caption: 'Heavy cargo',
        icon: Icons.local_shipping,
      ),
    ],
  ),
];

/// Horizontal snap carousel of rich category cards (icon, seats, from-price);
/// tapping a multi-child category opens a modal sub-type picker, tapping a
/// card selects it. Lone-child categories select directly. The category
/// card shows the chosen sub-type when set.
class VehicleCards extends StatefulWidget {
  final String selected;
  final ValueChanged<String> onSelect;

  /// Cheapest quoted fare per category code; null entries mean no quote yet.
  final Map<String, int>? fromFares;

  /// Quoted fare per leaf vehicle code (powers the picker-modal prices).
  final Map<String, int>? fares;

  const VehicleCards(
      {super.key,
      required this.selected,
      required this.onSelect,
      this.fromFares,
      this.fares});

  @override
  State<VehicleCards> createState() => _VehicleCardsState();
}

class _VehicleCardsState extends State<VehicleCards> {
  late final PageController _pages = PageController(viewportFraction: 0.55);
  int _page = 0;

  @override
  void dispose() {
    _pages.dispose();
    super.dispose();
  }

  String get selected => widget.selected;

  @override
  Widget build(BuildContext context) {
    return Column(
      key: const Key('vehicleRow'),
      mainAxisSize: MainAxisSize.min,
      children: [
        SizedBox(
          height: 128,
          child: PageView.builder(
            controller: _pages,
            itemCount: vehicleCategories.length,
            onPageChanged: (i) => setState(() => _page = i),
            itemBuilder: (context, i) {
              final c = vehicleCategories[i];
              final first = i == 0;
              final last = i == vehicleCategories.length - 1;
              return Padding(
                padding: EdgeInsets.only(
                    left: first ? 0 : 3, right: last ? 0 : 3),
                child: _card(
                  key: Key(c.children.length == 1
                      ? 'vehicleCard-${c.code}'
                      : 'vehicleCat-${c.code}'),
                  category: c,
                  onTap: () {
                    if (c.children.length == 1) {
                      widget.onSelect(c.children.first.code);
                      return;
                    }
                    _openPicker(context, c);
                  },
                ),
              );
            },
          ),
        ),
        const SizedBox(height: 8),
        Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            for (var i = 0; i < vehicleCategories.length; i++)
              Container(
                width: 6,
                height: 6,
                margin: const EdgeInsets.symmetric(horizontal: 3),
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  color: _page == i
                      ? BrandColors.primary
                      : BrandColors.border,
                ),
              ),
          ],
        ),
      ],
    );
  }

  bool _isSelected(VehicleCategory c) =>
      c.children.any((v) => v.code == selected);

  String? _priceLabel(VehicleCategory c) {
    final fare = widget.fromFares?[c.code];
    if (fare == null) return null;
    final php = '₱${(fare / 100).toStringAsFixed(2)}';
    return c.children.length == 1 ? php : 'from $php';
  }

  Widget _card({
    Key? key,
    required VehicleCategory category,
    required VoidCallback onTap,
  }) {
    final isSelected = _isSelected(category);
    final price = _priceLabel(category);
    return InkWell(
      key: key,
      borderRadius: const BorderRadius.all(Radius.circular(16)),
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 6),
        decoration: BoxDecoration(
          color: isSelected
              ? BrandColors.primary.withValues(alpha: 0.08)
              : Colors.white,
          borderRadius: const BorderRadius.all(Radius.circular(16)),
          border: Border.all(
            color: isSelected ? BrandColors.primary : BrandColors.border,
            width: isSelected ? 2 : 1,
          ),
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              width: 44,
              height: 44,
              decoration: const BoxDecoration(
                color: BrandColors.primary,
                shape: BoxShape.circle,
              ),
              child: Icon(category.icon, color: Colors.white, size: 24),
            ),
            const SizedBox(height: 6),
            Text(category.name,
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                textAlign: TextAlign.center,
                style: const TextStyle(
                    fontSize: 14, fontWeight: FontWeight.w700)),
            Text(_subtitle(category),
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                textAlign: TextAlign.center,
                style: const TextStyle(
                    fontSize: 11, color: BrandColors.secondary)),
            const SizedBox(height: 2),
            SizedBox(
              height: 18,
              child: price == null
                  ? null
                  : Text(price,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      textAlign: TextAlign.center,
                      style: const TextStyle(
                          fontSize: 13,
                          fontWeight: FontWeight.w800,
                          color: BrandColors.primary)),
            ),
          ],
        ),
      ),
    );
  }

  VehicleOption? _selectedChild(VehicleCategory c) {
    for (final v in c.children) {
      if (v.code == selected) return v;
    }
    return null;
  }

  String _subtitle(VehicleCategory c) {
    final child = _selectedChild(c);
    if (child != null && child.code != c.code) {
      return '${child.name} · ${child.caption}';
    }
    return c.seats;
  }

  String _optionSubtitle(VehicleOption v) {
    final fare = widget.fares?[v.code];
    if (fare == null) return v.caption;
    return '${v.caption} · ₱${(fare / 100).toStringAsFixed(2)}';
  }

  void _openPicker(BuildContext context, VehicleCategory c) {
    showDialog(
      context: context,
      builder: (ctx) => Dialog(
        key: const Key('vehiclePickerDialog'),
        shape: const RoundedRectangleBorder(
          borderRadius: BorderRadius.all(Radius.circular(20)),
        ),
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Text(c.name,
                  style: const TextStyle(
                      fontSize: 16, fontWeight: FontWeight.w800)),
              const SizedBox(height: 2),
              const Text('Choose a type',
                  style: TextStyle(
                      fontSize: 12, color: BrandColors.secondary)),
              const SizedBox(height: 12),
              for (final v in c.children)
                Padding(
                  padding: const EdgeInsets.only(bottom: 8),
                  child: _row(
                    key: Key('vehicleCard-${v.code}'),
                    icon: v.icon,
                    title: v.name,
                    subtitle: _optionSubtitle(v),
                    selected: selected == v.code,
                    trailing: _check(selected == v.code),
                    onTap: () {
                      widget.onSelect(v.code);
                      Navigator.of(ctx).pop();
                    },
                  ),
                ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _check(bool active) => active
      ? const Icon(Icons.check_circle,
          size: 20, color: BrandColors.success)
      : const Icon(Icons.circle_outlined,
          size: 20, color: BrandColors.muted);

  Widget _row({
    Key? key,
    required IconData icon,
    required String title,
    required String subtitle,
    required bool selected,
    required Widget trailing,
    required VoidCallback onTap,
  }) {
    return InkWell(
      key: key,
      borderRadius:
          const BorderRadius.all(Radius.circular(14)),
      onTap: onTap,
      child: Container(
        padding:
            const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
        decoration: BoxDecoration(
          color: selected
              ? BrandColors.primary.withValues(alpha: 0.08)
              : Colors.white,
          borderRadius:
              const BorderRadius.all(Radius.circular(14)),
          border: Border.all(
            color:
                selected ? BrandColors.primary : BrandColors.border,
            width: selected ? 2 : 1,
          ),
        ),
        child: Row(
          children: [
            Container(
              width: 40,
              height: 40,
              decoration: const BoxDecoration(
                color: BrandColors.primary,
                shape: BoxShape.circle,
              ),
              child: Icon(icon, color: Colors.white, size: 22),
            ),
            const SizedBox(width: 10),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisSize: MainAxisSize.min,
                children: [
                  Text(title,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(
                          fontSize: 14, fontWeight: FontWeight.w700)),
                  Text(subtitle,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(
                          fontSize: 11,
                          color: BrandColors.secondary)),
                ],
              ),
            ),
            trailing,
          ],
        ),
      ),
    );
  }
}
