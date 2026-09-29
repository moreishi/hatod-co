import 'package:flutter/widgets.dart';
import '../data/auth_repository.dart';

/// Provides the AuthRepository down the widget tree.
class SessionScope extends InheritedWidget {
  final AuthRepository auth;

  const SessionScope({super.key, required this.auth, required super.child});

  static AuthRepository of(BuildContext context) {
    final scope = context.dependOnInheritedWidgetOfExactType<SessionScope>();
    assert(scope != null, 'SessionScope not found');
    return scope!.auth;
  }

  @override
  bool updateShouldNotify(SessionScope oldWidget) => auth != oldWidget.auth;
}
