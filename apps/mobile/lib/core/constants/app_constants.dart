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
  static const brand50 = Color(0xFFEEF7FF);
  static const brand500 = Color(0xFF0E7CD6);
  static const brand700 = Color(0xFF0A5DA3);
  static const brand900 = Color(0xFF083F6E);
}
