import 'session.dart';

/// Home destination per session roles (mobile spec §11 role routing).
/// Drivers land on the driver home; everyone else (riders, staff preview)
/// lands on the rider home.
enum HomeDestination { riderHome, driverHome }

HomeDestination homeFor(Session session) {
  return session.isDriver ? HomeDestination.driverHome : HomeDestination.riderHome;
}
