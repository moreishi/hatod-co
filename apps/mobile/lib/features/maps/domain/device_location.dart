import 'package:geolocator/geolocator.dart';
import 'map_models.dart';

/// Device GPS; null on denied permission / disabled service / timeout,
/// in which case callers fall back to the Gensan default.
Future<HatodMapPoint?> locateDeviceGps() async {
  try {
    var perm = await Geolocator.checkPermission();
    if (perm == LocationPermission.denied) {
      perm = await Geolocator.requestPermission();
    }
    if (perm == LocationPermission.denied ||
        perm == LocationPermission.deniedForever) {
      return null;
    }
    final pos = await Geolocator.getCurrentPosition(
      locationSettings: const LocationSettings(
        accuracy: LocationAccuracy.high,
        timeLimit: Duration(seconds: 8),
      ),
    );
    return HatodMapPoint(pos.latitude, pos.longitude);
  } catch (_) {
    return null;
  }
}
