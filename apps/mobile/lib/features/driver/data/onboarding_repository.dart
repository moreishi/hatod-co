import 'dart:convert';
import '../../../core/network/api_client.dart';

/// One agency option for the onboarding picker.
class AgencyOption {
  final String id;
  final String name;
  final String? cityCode;

  const AgencyOption({required this.id, required this.name, this.cityCode});

  factory AgencyOption.fromJson(Map<String, dynamic> json) => AgencyOption(
        id: json['id'] as String,
        name: json['name'] as String,
        cityCode: json['cityCode'] as String?,
      );
}

/// One compliance document on the driver profile.
class DriverDoc {
  final String id;
  final String type;
  final String status;
  final String? reviewNote;

  const DriverDoc({
    required this.id,
    required this.type,
    required this.status,
    this.reviewNote,
  });

  factory DriverDoc.fromJson(Map<String, dynamic> json) => DriverDoc(
        id: json['id'] as String,
        type: json['type'] as String,
        status: json['status'] as String? ?? 'PENDING',
        reviewNote: json['reviewNote'] as String?,
      );
}

/// One required document type from the backend table.
class DocRequirement {
  final String type;
  final String label;
  final bool required;

  const DocRequirement(
      {required this.type, required this.label, required this.required});

  factory DocRequirement.fromJson(Map<String, dynamic> json) =>
      DocRequirement(
        type: json['type'] as String,
        label: json['label'] as String? ?? json['type'] as String,
        required: json['required'] as bool? ?? true,
      );
}

/// Driver onboarding profile: own driver row (null when never applied),
/// own documents, and the static requirements table for the checklist.
class OnboardingProfile {
  final String? driverId;
  final String? status;
  final String? licenseNo;
  final List<DriverDoc> documents;
  final List<DocRequirement> requirements;

  const OnboardingProfile({
    this.driverId,
    this.status,
    this.licenseNo,
    this.documents = const [],
    this.requirements = const [],
  });

  factory OnboardingProfile.fromJson(Map<String, dynamic> json) {
    final driver = json['driver'] as Map<String, dynamic>?;
    final req = json['requirements'] as Map<String, dynamic>?;
    final driverReqs = (req?['driver'] as List?) ?? const [];
    return OnboardingProfile(
      driverId: driver?['id'] as String?,
      status: driver?['status'] as String?,
      licenseNo: driver?['licenseNo'] as String?,
      documents: ((json['documents'] as List?) ?? const [])
          .map((d) => DriverDoc.fromJson(d as Map<String, dynamic>))
          .toList(),
      requirements: driverReqs
          .map((r) => DocRequirement.fromJson(r as Map<String, dynamic>))
          .toList(),
    );
  }
}

/// Driver onboarding operations against the real API.
class OnboardingRepository {
  final ApiClient api;

  OnboardingRepository({required this.api});

  Future<List<AgencyOption>> agencies() async {
    final body = await api.get('/api/agencies') as List;
    return body
        .map((a) => AgencyOption.fromJson(a as Map<String, dynamic>))
        .toList();
  }

  /// Applies as a driver; returns the created driver id and status.
  Future<Map<String, dynamic>> apply({
    required String agencyId,
    required String licenseNo,
    String? dateOfBirth,
  }) async {
    final body = await api.post('/api/onboarding/drivers/apply', {
      'agencyId': agencyId,
      'licenseNo': licenseNo,
      if (dateOfBirth != null && dateOfBirth.isNotEmpty)
        'dateOfBirth': dateOfBirth,
    }) as Map<String, dynamic>;
    return body;
  }

  Future<OnboardingProfile> profile() async {
    final body = await api.get('/api/drivers/me') as Map<String, dynamic>;
    return OnboardingProfile.fromJson(body);
  }

  /// Submits one document photo (JPEG bytes) under the given type.
  Future<void> submitDocument({
    required String driverId,
    required String type,
    required List<int> photoBytes,
  }) async {
    await api.post('/api/onboarding/drivers/$driverId/documents', {
      'type': type,
      'storageKey': _dataUrl(photoBytes),
    });
  }

  static String _dataUrl(List<int> bytes) =>
      'data:image/jpeg;base64,${base64Encode(bytes)}';
}
