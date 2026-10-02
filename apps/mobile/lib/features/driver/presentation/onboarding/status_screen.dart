import 'package:flutter/material.dart';
import '../../data/onboarding_repository.dart';

/// Step 3: pipeline position, document verdicts, and what to do next.
class DriverStatusScreen extends StatefulWidget {
  final OnboardingRepository repository;
  final VoidCallback? onAddDocuments;

  const DriverStatusScreen(
      {super.key, required this.repository, this.onAddDocuments});

  @override
  State<DriverStatusScreen> createState() => _DriverStatusScreenState();
}

const _steps = [
  'Applied',
  'Documents',
  'Under review',
  'Active',
];

int _stepIndex(String? status) {
  switch (status) {
    case 'APPLICANT':
      return 0;
    case 'DOCUMENTS_PENDING':
      return 1;
    case 'DOCUMENTS_UNDER_REVIEW':
      return 2;
    case 'ACTIVE':
      return 3;
    default:
      return 0;
  }
}

String _headline(String? status) {
  switch (status) {
    case 'APPLICANT':
      return 'Application received';
    case 'DOCUMENTS_PENDING':
      return 'Documents pending';
    case 'DOCUMENTS_UNDER_REVIEW':
      return 'Under review';
    case 'ACTIVE':
      return "You're approved";
    case 'REJECTED':
      return 'Application not approved';
    case 'SUSPENDED':
      return 'Account suspended';
    default:
      return 'Application received';
  }
}

class _DriverStatusScreenState extends State<DriverStatusScreen> {
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
        setState(() => _error = 'Could not load status. Try again.');
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final profile = _profile;
    return Scaffold(
      appBar: AppBar(
        title: const Text('Application status'),
        actions: [
          IconButton(
            key: const Key('statusRefresh'),
            icon: const Icon(Icons.refresh),
            tooltip: 'Refresh',
            onPressed: () {
              setState(() {
                _profile = null;
                _error = null;
              });
              _load();
            },
          ),
        ],
      ),
      body: profile == null
          ? Center(
              child: _error == null
                  ? const CircularProgressIndicator()
                  : Text(_error!),
            )
          : ListView(
              padding: const EdgeInsets.all(16),
              children: [
                Text(_headline(profile.status),
                    style: const TextStyle(
                        fontSize: 20, fontWeight: FontWeight.w800)),
                const SizedBox(height: 12),
                Row(
                  children: [
                    for (var i = 0; i < _steps.length; i++) ...[
                      Expanded(
                        child: Column(
                          children: [
                            CircleAvatar(
                              radius: 14,
                              backgroundColor:
                                  i <= _stepIndex(profile.status)
                                      ? Colors.green
                                      : Colors.grey[300],
                              child: Text('${i + 1}',
                                  style: const TextStyle(
                                      fontSize: 12,
                                      color: Colors.white)),
                            ),
                            const SizedBox(height: 4),
                            Text(_steps[i],
                                textAlign: TextAlign.center,
                                style: const TextStyle(fontSize: 11)),
                          ],
                        ),
                      ),
                      if (i < _steps.length - 1)
                        const Expanded(child: Divider()),
                    ],
                  ],
                ),
                const SizedBox(height: 16),
                for (final req in profile.requirements)
                  Builder(builder: (context) {
                    final match = profile.documents
                        .where((d) => d.type == req.type)
                        .toList();
                    final status =
                        match.isEmpty ? 'MISSING' : match.first.status;
                    final note = match.isEmpty
                        ? null
                        : match.first.reviewNote;
                    return ListTile(
                      contentPadding: EdgeInsets.zero,
                      leading: Icon(
                        status == 'VERIFIED'
                            ? Icons.check_circle
                            : Icons.pending_outlined,
                        color: status == 'VERIFIED'
                            ? Colors.green
                            : Colors.orange,
                      ),
                      title: Text(req.label),
                      subtitle: note == null || note.isEmpty
                          ? null
                          : Text('Reviewer note: $note',
                              style: const TextStyle(fontSize: 12)),
                      trailing: Text(status,
                          style:
                              const TextStyle(fontSize: 12)),
                    );
                  }),
                const SizedBox(height: 8),
                _nextStep(profile.status),
              ],
            ),
    );
  }

  Widget _nextStep(String? status) {
    switch (status) {
      case 'APPLICANT':
        return Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            const Text(
                'Next: submit your documents so the agency can review them.'),
            const SizedBox(height: 8),
            if (widget.onAddDocuments != null)
              ElevatedButton(
                onPressed: widget.onAddDocuments,
                child: const Text('Submit documents'),
              ),
          ],
        );
      case 'ACTIVE':
        return const Text(
            "You're approved. Please log out and back in so your driver role activates, then toggle ONLINE to receive requests.");
      case 'REJECTED':
        return const Text(
            'Your application was not approved. Contact support to appeal.');
      case 'SUSPENDED':
        return const Text(
            'Your account is suspended. Contact support for details.');
      default:
        return const Text(
            'Your agency is reviewing your documents. Check back soon — this screen refreshes with the verdict.');
    }
  }
}
