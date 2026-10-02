import 'package:flutter/material.dart';
import '../../../core/constants/app_constants.dart';
import '../../booking/domain/ride.dart' show formatPesos;

/// Booking extras: tip chips, change-for bill presets, and a short note
/// for the driver. Everything persists into the booking payload.
class TripDetails {
  final int tipCentavos;
  final int? changeFor;
  final String note;

  /// CASH (default) or WALLET.
  final String paymentMethod;

  const TripDetails({
    this.tipCentavos = 0,
    this.changeFor,
    this.note = '',
    this.paymentMethod = 'CASH',
  });

  bool get isEmpty =>
      tipCentavos == 0 &&
      changeFor == null &&
      note.isEmpty &&
      paymentMethod == 'CASH';

  String summary() {
    if (isEmpty) return 'Add trip details';
    final parts = <String>[];
    if (tipCentavos > 0) parts.add('${formatPesos(tipCentavos)} tip');
    if (changeFor != null) {
      parts.add('Change for ${formatPesos(changeFor!)}');
    }
    if (note.isNotEmpty) parts.add('“$note”');
    if (paymentMethod != 'CASH') parts.add('E-Wallet');
    return parts.join(' · ');
  }
}

const tipOptions = [0, 1000, 2000, 5000];

const paymentOptions = [
  ('CASH', 'Cash', Icons.money_outlined),
  ('WALLET', 'E-Wallet', Icons.account_balance_wallet_outlined),
];

class TripDetailsScreen extends StatefulWidget {
  final TripDetails initial;
  final ValueChanged<TripDetails> onSave;

  const TripDetailsScreen(
      {super.key, required this.initial, required this.onSave});

  @override
  State<TripDetailsScreen> createState() => _TripDetailsScreenState();
}

class _TripDetailsScreenState extends State<TripDetailsScreen> {
  late int _tip = widget.initial.tipCentavos;
  late int? _change = widget.initial.changeFor;
  late String _pay = widget.initial.paymentMethod;
  late final TextEditingController _note =
      TextEditingController(text: widget.initial.note);

  @override
  void dispose() {
    _note.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Trip details')),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          const Text('Add a tip',
              style: TextStyle(fontSize: 14, fontWeight: FontWeight.w700)),
          const SizedBox(height: 8),
          Wrap(
            spacing: 8,
            children: [
              for (final t in tipOptions)
                ChoiceChip(
                  key: Key('tip-$t'),
                  label: Text(t == 0 ? 'No tip' : formatPesos(t)),
                  selected: _tip == t,
                  onSelected: (_) => setState(() => _tip = t),
                ),
            ],
          ),
          const SizedBox(height: 20),
          const Text('Cash change (barya)',
              style: TextStyle(fontSize: 14, fontWeight: FontWeight.w700)),
          const SizedBox(height: 8),
          Wrap(
            spacing: 8,
            children: [
              ChoiceChip(
                key: const Key('change-exact'),
                label: const Text('Exact fare'),
                selected: _change == null,
                onSelected: (_) => setState(() => _change = null),
              ),
              for (final b in [50000, 100000])
                ChoiceChip(
                  key: Key('change-$b'),
                  label: Text(formatPesos(b)),
                  selected: _change == b,
                  onSelected: (_) => setState(() => _change = b),
                ),
            ],
          ),
          const SizedBox(height: 8),
          const Text('The driver brings change for the selected bill.',
              style:
                  TextStyle(fontSize: 12, color: BrandColors.secondary)),
          const SizedBox(height: 20),
          const Text('Payment',
              style: TextStyle(fontSize: 14, fontWeight: FontWeight.w700)),
          const SizedBox(height: 8),
          Wrap(
            spacing: 8,
            children: [
              for (final p in paymentOptions)
                ChoiceChip(
                  key: Key('pay-${p.$1}'),
                  avatar: Icon(p.$3, size: 18),
                  label: Text(p.$2),
                  selected: _pay == p.$1,
                  onSelected: (_) => setState(() => _pay = p.$1),
                ),
            ],
          ),
          const SizedBox(height: 20),
          const Text('Note for the driver',
              style: TextStyle(fontSize: 14, fontWeight: FontWeight.w700)),
          const SizedBox(height: 8),
          TextField(
            key: const Key('noteField'),
            controller: _note,
            maxLength: 140,
            maxLines: 3,
            decoration: const InputDecoration(
              hintText: 'e.g. Gate 2, blue house',
              border: OutlineInputBorder(),
            ),
          ),
          const SizedBox(height: 16),
          ElevatedButton(
            onPressed: () {
              widget.onSave(TripDetails(
                tipCentavos: _tip,
                changeFor: _change,
                note: _note.text.trim(),
                paymentMethod: _pay,
              ));
              Navigator.of(context).pop();
            },
            child: const Text('Save'),
          ),
        ],
      ),
    );
  }
}
