import 'package:flutter/material.dart';
import '../../../core/network/api_exception.dart';
import '../../../core/widgets/hatod_button.dart';
import '../../../core/widgets/hatod_header.dart';
import '../data/auth_repository.dart';
import 'session_scope.dart';

/// Spec §4-03 Sign Up: phone + name + what-happens-next + Continue + Terms.
/// OTP-only: no password, no Google sign-in. Registering creates the
/// account and hands the first OTP challenge to the OTP screen.
class SignupScreen extends StatefulWidget {
  final void Function({
    required String phone,
    required String name,
    required String challengeId,
    String? devCode,
  })? onRegistered;

  const SignupScreen({super.key, this.onRegistered});

  @override
  State<SignupScreen> createState() => _SignupScreenState();
}

class _SignupScreenState extends State<SignupScreen> {
  final _phone = TextEditingController();
  final _name = TextEditingController();
  final _form = GlobalKey<FormState>();
  String? _error;
  bool _busy = false;

  @override
  void dispose() {
    _phone.dispose();
    _name.dispose();
    super.dispose();
  }

  AuthRepository get _auth => SessionScope.of(context);

  Future<void> _register() async {
    if (!(_form.currentState?.validate() ?? false)) return;
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      final challenge = await _auth.register(
        _phone.text.trim(),
        displayName: _name.text.trim(),
      );
      widget.onRegistered?.call(
        phone: _phone.text.trim(),
        name: _name.text.trim(),
        challengeId: challenge.challengeId,
        devCode: challenge.devCode,
      );
    } catch (e) {
      setState(() => _error = _registerError(e));
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  String _registerError(Object e) {
    final status = e is ApiException ? e.statusCode : null;
    if (status == 409) {
      return 'An account already uses this number. Please log in instead.';
    }
    if (status == null) return 'No connection. Please try again.';
    return 'Could not create your account. Please try again.';
  }

  @override
  Widget build(BuildContext context) {
    const input = InputDecoration();
    return Scaffold(
      backgroundColor: Colors.white,
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Form(
            key: _form,
            child: ListView(
              children: [
                const HatodHeader(
                    title: 'Create your account',
                    subtitle: 'Ride in minutes — all you need is your number'),
                const SizedBox(height: 16),
                TextFormField(
                  key: const Key('signupPhone'),
                  controller: _phone,
                  keyboardType: TextInputType.phone,
                  decoration:
                      input.copyWith(hintText: '+63 912 345 6789'),
                  validator: (v) {
                    if (v == null || v.trim().isEmpty) {
                      return 'Phone required';
                    }
                    if (v.trim().length < 7) return 'Enter a valid number';
                    return null;
                  },
                ),
                const SizedBox(height: 12),
                TextFormField(
                  key: const Key('signupName'),
                  controller: _name,
                  textCapitalization: TextCapitalization.words,
                  decoration: input.copyWith(hintText: 'Full name'),
                  validator: (v) {
                    if (v == null || v.trim().isEmpty) {
                      return 'Name required';
                    }
                    if (v.trim().length < 2) return 'Enter your name';
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
                              fontSize: 13, fontWeight: FontWeight.w700)),
                      SizedBox(height: 8),
                      _Step(
                          icon: Icons.sms_outlined,
                          text:
                              'We text you a 6-digit code to verify this number.'),
                      SizedBox(height: 6),
                      _Step(
                          icon: Icons.timer_outlined,
                          text:
                              'Enter it within 5 minutes — you get 5 tries.'),
                      SizedBox(height: 6),
                      _Step(
                          icon: Icons.person_outline,
                          text:
                              'Your name is only shown so drivers know who to look for.'),
                    ],
                  ),
                ),
                if (_error != null) ...[
                  const SizedBox(height: 12),
                  Text(_error!,
                      style: const TextStyle(color: Colors.red)),
                ],
                const SizedBox(height: 16),
                HatodButton(
                  label: _busy ? 'Creating...' : 'Continue',
                  onPressed: _busy ? null : _register,
                ),
                const SizedBox(height: 12),
                const Text(
                  'By continuing you agree to Terms & Privacy Policy.',
                  textAlign: TextAlign.center,
                  style: TextStyle(fontSize: 12, color: Colors.grey),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class _Step extends StatelessWidget {
  final IconData icon;
  final String text;

  const _Step({required this.icon, required this.text});

  @override
  Widget build(BuildContext context) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Icon(icon, size: 16, color: Colors.grey),
        const SizedBox(width: 8),
        Expanded(
          child: Text(text,
              style:
                  const TextStyle(fontSize: 13, color: Colors.black87)),
        ),
      ],
    );
  }
}
