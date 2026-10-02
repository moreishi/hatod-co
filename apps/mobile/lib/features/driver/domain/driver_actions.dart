/// Driver trip state machine: which backend transitions each status offers.
const Map<String, List<String>> _next = {
  'ASSIGNED': ['DRIVER_EN_ROUTE'],
  'DRIVER_EN_ROUTE': ['DRIVER_ARRIVED'],
  'DRIVER_ARRIVED': ['IN_PROGRESS'],
  'IN_PROGRESS': ['COMPLETED'],
};

/// Next backend transitions for a trip status (empty when terminal).
List<String> nextDriverActions(String status) =>
    List.unmodifiable(_next[status] ?? const <String>[]);

/// Plain-language label for a transition code; unknown codes fall back
/// to the raw code so new backend states stay visible, not blank.
String driverActionLabel(String code) {
  switch (code) {
    case 'DRIVER_EN_ROUTE':
      return 'Head to pickup';
    case 'DRIVER_ARRIVED':
      return "I've arrived";
    case 'IN_PROGRESS':
      return 'Start trip';
    case 'COMPLETED':
      return 'Complete trip';
    default:
      return code;
  }
}
