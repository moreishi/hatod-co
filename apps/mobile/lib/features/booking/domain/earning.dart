/// Driver earnings models (mobile spec §46–47).
class LedgerEntry {
  final String id;
  final String type;
  final int amountCentavos;
  final String? rideId;

  const LedgerEntry({
    required this.id,
    required this.type,
    required this.amountCentavos,
    this.rideId,
  });

  factory LedgerEntry.fromJson(Map<String, dynamic> json) => LedgerEntry(
        id: json['id'] as String,
        type: json['type'] as String,
        amountCentavos: json['amountCentavos'] as int? ?? 0,
        rideId: json['rideId'] as String?,
      );
}

class EarningSummary {
  final int balanceCentavos;
  final int totalCentavos;
  final int tripCount;
  final List<LedgerEntry> recent;

  const EarningSummary({
    required this.balanceCentavos,
    required this.totalCentavos,
    required this.tripCount,
    required this.recent,
  });

  String get balancePhp => '₱${(balanceCentavos / 100).toStringAsFixed(2)}';
  String get totalPhp => '₱${(totalCentavos / 100).toStringAsFixed(2)}';

  factory EarningSummary.fromJson(Map<String, dynamic> json) => EarningSummary(
        balanceCentavos: json['balanceCentavos'] as int? ?? 0,
        totalCentavos: json['totalCentavos'] as int? ?? 0,
        tripCount: json['tripCount'] as int? ?? 0,
        recent: ((json['recent'] as List?) ?? [])
            .map((e) => LedgerEntry.fromJson(e as Map<String, dynamic>))
            .toList(),
      );
}
