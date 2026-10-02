import 'package:flutter/material.dart';
import '../../../../core/network/api_exception.dart';
import '../../data/onboarding_repository.dart';

/// Step 1: pick an agency, add the license number, and submit. The agency
/// reviews the application; documents come next.
class DriverApplyScreen extends StatefulWidget {
  final OnboardingRepository repository;
  final void Function(String driverId)? onApplied;

  const DriverApplyScreen(
      {super.key, required this.repository, this.onApplied});

  @override
  State<DriverApplyScreen> createState() => _DriverApplyScreenState();
}

class _DriverApplyScreenState extends State<DriverApplyScreen> {
  List<AgencyOption>? _agencies;
  String? _agencyId;
  String? _error;
  bool _busy = false;
  bool _loadFailed = false;
  final _license = TextEditingController();
  final _dob = TextEditingController();
  final _form = GlobalKey<FormState>();

  @override
  void initState() {
    super.initState();
    _load();
  }

  @override
  void dispose() {
    _license.dispose();
    _dob.dispose();
    super.dispose();
  }

  Future<void> _load() async {
    setState(() {
      _loadFailed = false;
      _error = null;
    });
    try {
      final agencies = await widget.repository.agencies();
      if (!mounted) return;
      setState(() => _agencies = agencies);
    } catch (_) {
      if (mounted) setState(() => _loadFailed = true);
    }
  }

  Future<void> _submit() async {
    if (!(_form.currentState?.validate() ?? false)) return;
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      final created = await widget.repository.apply(
        agencyId: _agencyId!,
        licenseNo: _license.text.trim(),
        dateOfBirth:
            _dob.text.trim().isEmpty ? null : _dob.text.trim(),
      );
      widget.onApplied?.call(created['id'] as String);
    } catch (e) {
      setState(() => _error = _submitError(e));
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  String _submitError(Object e) {
    if (e is ApiException) {
      if (e.statusCode == 409) {
        return 'You already have an application. Check its status instead.';
      }
      if (e.statusCode == null) return 'No connection. Please try again.';
    }
    return 'Could not submit. Please try again.';
  }

  @override
  Widget build(BuildContext context) {
    const input = InputDecoration();
    return Scaffold(
      appBar: AppBar(title: const Text('Drive with HATOD')),
      body: _agencies == null
          ? Center(
              child: _loadFailed
                  ? Column(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        const Text('Could not load agencies.'),
                        const SizedBox(height: 8),
                        ElevatedButton(
                          onPressed: _load,
                          child: const Text('Retry'),
                        ),
                      ],
                    )
                  : const CircularProgressIndicator(),
            )
          : Form(
              key: _form,
              child: ListView(
                padding: const EdgeInsets.all(16),
                children: [
                  const Text(
                    'Earn on your own schedule. Pick your agency, add your license, and submit — the agency reviews every application.',
                    style: TextStyle(fontSize: 14, color: Colors.grey),
                  ),
                  const SizedBox(height: 16),
                  DropdownButtonFormField<String>(
                    key: const Key('agencyPicker'),
                    initialValue: _agencyId,
                    decoration:
                        input.copyWith(labelText: 'Agency'),
                    items: [
                      for (final a in _agencies!)
                        DropdownMenuItem(
                            value: a.id, child: Text(a.name)),
                    ],
                    onChanged: (v) => setState(() => _agencyId = v),
                    validator: (v) =>
                        v == null ? 'Choose your agency' : null,
                  ),
                  const SizedBox(height: 12),
                  TextFormField(
                    key: const Key('licenseField'),
                    controller: _license,
                    textCapitalization: TextCapitalization.characters,
                    decoration: input.copyWith(
                        labelText: "Driver's license number"),
                    validator: (v) {
                      if (v == null || v.trim().isEmpty) {
                        return 'License required';
                      }
                      return null;
                    },
                  ),
                  const SizedBox(height: 12),
                  TextFormField(
                    key: const Key('dobField'),
                    controller: _dob,
                    keyboardType: TextInputType.datetime,
                    decoration: input.copyWith(
                        labelText: 'Birth date (YYYY-MM-DD, optional)'),
                    validator: (v) {
                      final t = v?.trim() ?? '';
                      if (t.isEmpty) return null;
                      if (DateTime.tryParse(t) == null) {
                        return 'Use YYYY-MM-DD';
                      }
                      return null;
                    },
                  ),
                  const SizedBox(height: 16),
                  Container(
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: const Color(0xFFF2F4F7),
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: const Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text('What happens next',
                            style: TextStyle(
                                fontSize: 13,
                                fontWeight: FontWeight.w700)),
                        SizedBox(height: 8),
                        Text(
                            '1. Your agency reviews the application.\n'
                            '2. You photograph your license, OR/CR, and NBI clearance.\n'
                            '3. Approval activates your driver account.',
                            style: TextStyle(fontSize: 13)),
                      ],
                    ),
                  ),
                  if (_error != null) ...[
                    const SizedBox(height: 12),
                    Text(_error!,
                        style: const TextStyle(color: Colors.red)),
                  ],
                  const SizedBox(height: 16),
                  ElevatedButton(
                    onPressed: _busy ? null : _submit,
                    child: Text(
                        _busy ? 'Submitting...' : 'Submit application'),
                  ),
                ],
              ),
            ),
    );
  }
}
