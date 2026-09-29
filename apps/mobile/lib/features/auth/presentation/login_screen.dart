import 'package:flutter/material.dart';
import '../data/auth_repository.dart';
import '../domain/session.dart';
import 'session_scope.dart';

/// OTP login wired to the real backend (mobile spec §11–12).
class LoginScreen extends StatefulWidget {
  final void Function(Session session)? onAuthenticated;

  const LoginScreen({super.key, this.onAuthenticated});

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final _phone = TextEditingController();
  final _code = TextEditingController();
  String? _challengeId;
  String? _devCode;
  String? _error;
  bool _busy = false;

  @override
  void dispose() {
    _phone.dispose();
    _code.dispose();
    super.dispose();
  }

  AuthRepository get _auth => SessionScope.of(context);

  Future<void> _request() async {
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      final challenge = await _auth.requestOtp(_phone.text.trim());
      setState(() {
        _challengeId = challenge.challengeId;
        _devCode = challenge.devCode;
      });
    } catch (e) {
      setState(() => _error = 'Could not send code. Please try again.');
    } finally {
      setState(() => _busy = false);
    }
  }

  Future<void> _verify() async {
    final challengeId = _challengeId;
    if (challengeId == null) return;
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      final session = await _auth.verifyOtp(challengeId, _code.text.trim());
      widget.onAuthenticated?.call(session);
    } catch (_) {
      setState(() => _error = 'Invalid code. Please try again.');
    } finally {
      setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    const input = InputDecoration();
    return Scaffold(
      appBar: AppBar(title: const Text('Hailing')),
      body: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            if (_challengeId == null) ...[
              TextField(
                controller: _phone,
                keyboardType: TextInputType.phone,
                decoration: input.copyWith(labelText: 'Phone number'),
              ),
              const SizedBox(height: 16),
              ElevatedButton(
                onPressed: _busy ? null : _request,
                child: const Text('Send code'),
              ),
            ] else ...[
              TextField(
                controller: _code,
                keyboardType: TextInputType.number,
                maxLength: 6,
                decoration: input.copyWith(labelText: 'One-time code'),
              ),
              if (_devCode != null)
                Padding(
                  padding: const EdgeInsets.only(top: 8),
                  child: Text('LocalStage code: $_devCode',
                      key: const Key('devCode')),
                ),
              const SizedBox(height: 16),
              ElevatedButton(
                onPressed: _busy ? null : _verify,
                child: const Text('Verify'),
              ),
            ],
            if (_error != null) ...[
              const SizedBox(height: 12),
              Text(_error!, style: const TextStyle(color: Colors.red)),
            ],
          ],
        ),
      ),
    );
  }
}
