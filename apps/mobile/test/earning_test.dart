import 'package:flutter_test/flutter_test.dart';
import 'package:hailing_mobile/features/booking/domain/earning.dart';

void main() {
  group('EarningSummary', () {
    test('parses ledger-backed payload and formats pesos', () {
      final summary = EarningSummary.fromJson({
        'balanceCentavos': 12500,
        'totalCentavos': 12500,
        'tripCount': 2,
        'recent': [
          {'id': 't-1', 'type': 'RIDE_EARNING', 'amountCentavos': 8000, 'rideId': 'r-1'},
          {'id': 't-2', 'type': 'RIDE_EARNING', 'amountCentavos': 4500},
        ],
      });
      expect(summary.balancePhp, '₱125.00');
      expect(summary.totalPhp, '₱125.00');
      expect(summary.tripCount, 2);
      expect(summary.recent.map((e) => e.id), ['t-1', 't-2']);
      expect(summary.recent.first.rideId, 'r-1');
      expect(summary.recent.last.rideId, isNull);
    });

    test('defaults empty payloads', () {
      const summary = EarningSummary(balanceCentavos: 0, totalCentavos: 0, tripCount: 0, recent: []);
      expect(summary.balancePhp, '₱0.00');
      expect(EarningSummary.fromJson({}).tripCount, 0);
    });
  });
}
