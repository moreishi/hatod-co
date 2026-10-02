import 'package:flutter_test/flutter_test.dart';
import 'package:hailing_mobile/features/driver/domain/driver_actions.dart';

void main() {
  group('driver action labels', () {
    test('each next step reads as plain language', () {
      expect(driverActionLabel('DRIVER_EN_ROUTE'), 'Head to pickup');
      expect(driverActionLabel('DRIVER_ARRIVED'), "I've arrived");
      expect(driverActionLabel('IN_PROGRESS'), 'Start trip');
      expect(driverActionLabel('COMPLETED'), 'Complete trip');
    });

    test('unknown codes fall back to the raw code', () {
      expect(driverActionLabel('SOMETHING_NEW'), 'SOMETHING_NEW');
    });

    test('next steps follow the trip state machine', () {
      expect(nextDriverActions('ASSIGNED'), ['DRIVER_EN_ROUTE']);
      expect(nextDriverActions('DRIVER_EN_ROUTE'), ['DRIVER_ARRIVED']);
      expect(nextDriverActions('DRIVER_ARRIVED'), ['IN_PROGRESS']);
      expect(nextDriverActions('IN_PROGRESS'), ['COMPLETED']);
      expect(nextDriverActions('COMPLETED'), isEmpty);
      expect(nextDriverActions('REQUESTED'), isEmpty);
    });
  });
}
