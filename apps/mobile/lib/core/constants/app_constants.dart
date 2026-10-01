import 'package:flutter/material.dart';

/// Mirrors @hailing/constants (single source of truth stays in the monorepo;
/// this file is the Dart projection — update both together).
class RideStatus {
  static const requested = 'REQUESTED';
  static const assigned = 'ASSIGNED';
  static const driverEnRoute = 'DRIVER_EN_ROUTE';
  static const driverArrived = 'DRIVER_ARRIVED';
  static const inProgress = 'IN_PROGRESS';
  static const completed = 'COMPLETED';
  static const cancelled = 'CANCELLED';
  static const noDrivers = 'NO_DRIVERS';
}

class MessageType {
  static const text = 'TEXT';
  static const system = 'SYSTEM';
}

class MessageStatus {
  static const sent = 'SENT';
  static const delivered = 'DELIVERED';
  static const read = 'READ';
}

class ApiConstants {
  static const otpLength = 6;
  static const sessionCookie = 'hailing_session';
}

class MessagingConstants {
  static const pageSize = 30;
  static const maxLength = 1000;
  static const maxPerMinute = 20;
}

class BrandColors {
  static const primary = Color(0xFF0E4D2E);
  static const primaryDeep = Color(0xFF0B2E23);
  static const accent = Color(0xFFFFC400);
  static const ink = Color(0xFF111827);
  static const secondary = Color(0xFF475467);
  static const secondaryAlt = Color(0xFF6B7280);
  static const muted = Color(0xFF98A2B3);
  static const border = Color(0xFFD0D5DD);
  static const borderAlt = Color(0xFFE5E7EB);
  static const divider = Color(0xFFF2F4F7);
  static const chatIn = Color(0xFFF2F4F7);
  static const mapBase = Color(0xFFEDEBE3);
  static const route = Color(0xFF2563EB);
  static const success = Color(0xFF16A34A);
  static const danger = Color(0xFFD92D20);

  // legacy aliases (to be removed after migration)
  static const brand50 = Color(0xFFEEF7FF);
  static const brand500 = Color(0xFF0E7CD6);
  static const brand700 = Color(0xFF0E4D2E);
  static const brand900 = Color(0xFF0B2E23);
}

class AppSpacing {
  static const s4 = 4.0;
  static const s8 = 8.0;
  static const s12 = 12.0;
  static const s16 = 16.0;
  static const s24 = 24.0;
  static const screenPadding = 16.0;
}

class AppRadius {
  static const button = 12.0;
  static const input = 10.0;
  static const card = 16.0;
  static const sheetTop = 20.0;
  static const otpBox = 10.0;
}

class AppSizes {
  static const buttonHeight = 50.0;
  static const inputHeight = 48.0;
  static const otpBoxW = 48.0;
  static const otpBoxH = 56.0;
  static const avatarList = 48.0;
  static const avatarHeader = 76.0;
  static const bottomNavHeight = 68.0;
}
