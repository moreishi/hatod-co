import 'package:firebase_core/firebase_core.dart';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter_local_notifications/flutter_local_notifications.dart';
import '../../auth/data/auth_repository.dart';

/// Background/terminated entry point: shows the message as a local
/// notification. Firebase may be unconfigured (no project yet) — then
/// this silently no-ops and the app is unaffected.
@pragma('vm:entry-point')
Future<void> pushBackgroundHandler(RemoteMessage message) async {
  try {
    await Firebase.initializeApp();
    await showPushNotification(message);
  } catch (_) {
    // No Firebase project configured yet.
  }
}

/// Foreground presentation for a data-bearing FCM message.
Future<void> showPushNotification(RemoteMessage message) async {
  final plugin = FlutterLocalNotificationsPlugin();
  const settings = InitializationSettings(
    android: AndroidInitializationSettings('@mipmap/ic_launcher'),
  );
  await plugin.initialize(settings: settings);
  final notification = message.notification;
  await plugin.show(
    id: message.hashCode,
    title: notification?.title ?? 'HATOD',
    body: notification?.body ?? 'You have a new message.',
    notificationDetails: const NotificationDetails(
      android: AndroidNotificationDetails(
        'hatod_chat',
        'Trip messages',
        importance: Importance.max,
        priority: Priority.high,
      ),
    ),
  );
}

/// FCM lifecycle: init once, upload the token whenever authenticated.
/// Every step is best-effort — without a Firebase project configured,
/// push stays off and nothing else changes.
class PushService {
  bool _ready = false;

  bool get isReady => _ready;

  Future<void> init(AuthRepository auth) async {
    try {
      // Firebase.initializeApp() already ran in main(); re-initializing the
      // default app here would throw, so just use it.
      final messaging = FirebaseMessaging.instance;
      await messaging.requestPermission();
      final android =
          FlutterLocalNotificationsPlugin()
              .resolvePlatformSpecificImplementation<
                AndroidFlutterLocalNotificationsPlugin
              >();
      await android?.requestNotificationsPermission();
      FirebaseMessaging.onBackgroundMessage(pushBackgroundHandler);
      FirebaseMessaging.onMessage.listen(showPushNotification);
      await syncToken(auth);
      FirebaseMessaging.instance.onTokenRefresh.listen(
        (token) => _upload(auth, token),
      );
      _ready = true;
    } catch (_) {
      _ready = false;
    }
  }

  /// Uploads the current FCM token (call after login/session restore).
  Future<void> syncToken(AuthRepository auth) async {
    try {
      final token = await FirebaseMessaging.instance.getToken();
      if (token != null) await _upload(auth, token);
    } catch (_) {
      // Offline or unconfigured: retry on the next login.
    }
  }

  Future<void> _upload(AuthRepository auth, String token) async {
    try {
      await auth.registerDeviceToken(token);
    } catch (_) {
      // Offline now: syncToken on the next authenticated launch retries.
    }
  }
}
