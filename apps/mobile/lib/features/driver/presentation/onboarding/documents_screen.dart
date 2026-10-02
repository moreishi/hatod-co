import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import '../../../../core/constants/app_constants.dart';
import '../../../../core/widgets/trip_order_card.dart';
import '../../data/onboarding_repository.dart';

/// Step 2: photograph each required document. Photos go to the backend
/// inline (base64 data URL) for agency review; retakes overwrite per type.
class DriverDocumentsScreen extends StatefulWidget {
  final OnboardingRepository repository;
  final String driverId;
  final VoidCallback? onDone;

  /// Injected for tests; defaults to the device camera.
  final Future<List<int>?> Function()? capturePhoto;

  const DriverDocumentsScreen({
    super.key,
    required this.repository,
    required this.driverId,
    this.onDone,
    this.capturePhoto,
  });

  @override
  State<DriverDocumentsScreen> createState() =>
      _DriverDocumentsScreenState();
}

class _DriverDocumentsScreenState extends State<DriverDocumentsScreen> {
  OnboardingProfile? _profile;
  String? _error;
  String? _busyType;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    try {
      final profile = await widget.repository.profile();
      if (mounted) setState(() => _profile = profile);
    } catch (_) {
      if (mounted) {
        setState(() => _error = 'Could not load documents. Pull to retry.');
      }
    }
  }

  Future<List<int>?> _defaultCapture() async {
    final file = await ImagePicker().pickImage(
      source: ImageSource.camera,
      maxWidth: 1280,
      imageQuality: 70,
    );
    if (file == null) return null;
    return file.readAsBytes();
  }

  String _docStatus(String type) {
    final docs = _profile?.documents ?? [];
    for (final d in docs) {
      if (d.type == type) return d.status;
    }
    return 'MISSING';
  }

  Future<void> _capture(DocRequirement req) async {
    setState(() {
      _busyType = req.type;
      _error = null;
    });
    try {
      final bytes =
          await (widget.capturePhoto ?? _defaultCapture)();
      if (bytes == null) return;
      await widget.repository.submitDocument(
        driverId: widget.driverId,
        type: req.type,
        photoBytes: bytes,
      );
      await _load();
    } catch (_) {
      if (mounted) {
        setState(() => _error = 'Could not send the photo. Try again.');
      }
    } finally {
      if (mounted) setState(() => _busyType = null);
    }
  }

  @override
  Widget build(BuildContext context) {
    final profile = _profile;
    return Scaffold(
      appBar: AppBar(title: const Text('Documents')),
      body: profile == null
          ? Center(
              child: _error == null
                  ? const CircularProgressIndicator()
                  : Text(_error!),
            )
          : ListView(
              padding: const EdgeInsets.all(16),
              children: [
                const Text(
                  'Photograph each document in good light. Your agency reviews every photo before approval.',
                  style: TextStyle(fontSize: 14, color: Colors.grey),
                ),
                const SizedBox(height: 16),
                for (final req in profile.requirements)
                  Builder(builder: (context) {
                    final status = _docStatus(req.type);
                    final sent = status != 'MISSING';
                    return Card(
                      margin: const EdgeInsets.only(bottom: 12),
                      child: Padding(
                        padding: const EdgeInsets.all(16),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.stretch,
                          children: [
                            Row(
                              children: [
                                Container(
                                  width: 40,
                                  height: 40,
                                  decoration: const BoxDecoration(
                                    color: BrandColors.primary,
                                    shape: BoxShape.circle,
                                  ),
                                  child: const Icon(
                                      Icons.badge_outlined,
                                      color: Colors.white,
                                      size: 22),
                                ),
                                const SizedBox(width: 12),
                                Expanded(
                                  child: Column(
                                    crossAxisAlignment:
                                        CrossAxisAlignment.start,
                                    children: [
                                      Text(req.label,
                                          style: const TextStyle(
                                              fontSize: 15,
                                              fontWeight:
                                                  FontWeight.w600)),
                                      if (!req.required)
                                        const Text('Optional',
                                            style: TextStyle(
                                                fontSize: 12,
                                                color: BrandColors
                                                    .secondary)),
                                    ],
                                  ),
                                ),
                                StatusBadge(
                                  status: status,
                                  color: status == 'VERIFIED'
                                      ? BrandColors.success
                                      : status == 'PENDING'
                                          ? BrandColors.route
                                          : BrandColors.secondary,
                                ),
                              ],
                            ),
                            const SizedBox(height: 12),
                            OutlinedButton(
                              key: Key('docPhoto-${req.type}'),
                              onPressed: _busyType != null
                                  ? null
                                  : () => _capture(req),
                              child: Text(_busyType == req.type
                                  ? 'Sending...'
                                  : sent
                                      ? 'Retake photo'
                                      : 'Take photo'),
                            ),
                          ],
                        ),
                      ),
                    );
                  }),
                if (_error != null)
                  Text(_error!,
                      style: const TextStyle(color: Colors.red)),
                const SizedBox(height: 8),
                ElevatedButton(
                  onPressed: widget.onDone,
                  child: const Text('Done'),
                ),
              ],
            ),
    );
  }
}
