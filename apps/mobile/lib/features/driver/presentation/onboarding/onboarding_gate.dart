import 'package:flutter/material.dart';
import '../../data/onboarding_repository.dart';
import 'apply_screen.dart';
import 'documents_screen.dart';
import 'status_screen.dart';

/// Entry point: routes to apply (never applied), documents (applied but
/// empty-handed), or status (everything else), then chains forward.
class DriverOnboardingGate extends StatefulWidget {
  final OnboardingRepository repository;

  const DriverOnboardingGate({super.key, required this.repository});

  @override
  State<DriverOnboardingGate> createState() => _DriverOnboardingGateState();
}

class _DriverOnboardingGateState extends State<DriverOnboardingGate> {
  OnboardingProfile? _profile;
  String? _error;

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
        setState(() => _error = 'Could not load. Please try again.');
      }
    }
  }

  void _go(Widget screen) {
    Navigator.of(context).pushReplacement(MaterialPageRoute(
      builder: (_) => screen,
    ));
  }

  @override
  Widget build(BuildContext context) {
    final profile = _profile;
    if (profile == null) {
      return Scaffold(
        appBar: AppBar(title: const Text('Drive with HATOD')),
        body: Center(
          child: _error == null
              ? const CircularProgressIndicator()
              : Text(_error!),
        ),
      );
    }
    final driverId = profile.driverId;
    if (driverId == null) {
      return DriverApplyScreen(
        repository: widget.repository,
        onApplied: (id) => _go(DriverDocumentsScreen(
          repository: widget.repository,
          driverId: id,
          onDone: () => _go(DriverStatusScreen(
            repository: widget.repository,
          )),
        )),
      );
    }
    if (profile.status == 'APPLICANT') {
      return DriverDocumentsScreen(
        repository: widget.repository,
        driverId: driverId,
        onDone: () => _go(DriverStatusScreen(
          repository: widget.repository,
        )),
      );
    }
    return DriverStatusScreen(
      repository: widget.repository,
      onAddDocuments: () => _go(DriverDocumentsScreen(
        repository: widget.repository,
        driverId: driverId,
        onDone: () => _go(DriverStatusScreen(
          repository: widget.repository,
        )),
      )),
    );
  }
}
