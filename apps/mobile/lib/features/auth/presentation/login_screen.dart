import 'package:flutter/material.dart';
import '../../../core/network/api_exception.dart';
import '../data/auth_repository.dart';
import '../domain/session.dart';
import 'session_scope.dart';

/// OTP login wired to the real backend (mobile spec §11–12). Written for
/// first-timers: every step says what to do, what happens next, and how
/// to recover (wrong number starts over, expired codes ask for a new one).
class LoginScreen extends StatefulWidget {
  final void Function(Session session, String phone)? onAuthenticated;

  const LoginScreen({super.key, this.onAuthenticated});

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final _phone = TextEditingController();
  final _code = TextEditingController();
  String? _challengeId;
  String? _sentTo;
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
        _sentTo = _phone.text.trim();
        _devCode = challenge.devCode;
      });
    } catch (e) {
      setState(() => _error = _sendError(e));
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  String _sendError(Object e) {
    final status = e is ApiException ? e.statusCode : null;
    if (status == 404) {
      return 'No account for this number. Please sign up first.';
    }
    if (status == null) return 'No connection. Please try again.';
    return 'Could not send code. Please try again.';
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
      widget.onAuthenticated?.call(session, _phone.text.trim());
    } catch (e) {
      setState(() => _error = _verifyError(e));
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  String _verifyError(Object e) {
    final status = e is ApiException ? e.statusCode : null;
    if (status == null) return 'No connection. Please try again.';
    if (status == 400 || status == 404) {
      return 'Invalid or expired code. Please request a new one.';
    }
    return 'Invalid code. Please try again.';
  }

  void _changeNumber() {
    setState(() {
      _challengeId = null;
      _sentTo = null;
      _devCode = null;
      _code.clear();
      _error = null;
    });
  }

  @override
  Widget build(BuildContext context) {
    const input = InputDecoration();
    final sent = _challengeId != null;
    return Scaffold(
      appBar: AppBar(title: const Text('Hailing')),
      body: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            if (!sent) ...[
              const Text('Step 1 of 2 — your number',
                  style:
                      TextStyle(fontSize: 18, fontWeight: FontWeight.w800)),
              const SizedBox(height: 4),
              const Text('Use the mobile number you signed up with.',
                  style: TextStyle(fontSize: 14, color: Colors.grey)),
              const SizedBox(height: 16),
              TextField(
                controller: _phone,
                keyboardType: TextInputType.phone,
                decoration: input.copyWith(labelText: 'Phone number'),
              ),
              const SizedBox(height: 12),
              const _Hint(
                  text:
                      'Tap Send code and we text you a 6-digit code. It usually arrives within a minute.'),
              const SizedBox(height: 16),
              ElevatedButton(
                onPressed: _busy ? null : _request,
                child: const Text('Send code'),
              ),
            ] else ...[
              const Text('Step 2 of 2 — enter the code',
                  style:
                      TextStyle(fontSize: 18, fontWeight: FontWeight.w800)),
              const SizedBox(height: 4),
              Text(
                'We sent a 6-digit code to ${_sentTo ?? 'your phone'}. It stops working after 5 minutes.',
                style: const TextStyle(fontSize: 14, color: Colors.grey),
              ),
              const SizedBox(height: 16),
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
              const SizedBox(height: 8),
              Align(
                alignment: Alignment.centerLeft,
                child: TextButton(
                  onPressed: _changeNumber,
                  child: const Text('Use a different number'),
                ),
              ),
              const SizedBox(height: 8),
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

class _Hint extends StatelessWidget {
  final String text;

  const _Hint({required this.text});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: const Color(0xFFF2F4F7),
        borderRadius: BorderRadius.circular(12),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Icon(Icons.info_outline, size: 16, color: Colors.grey),
          const SizedBox(width: 8),
          Expanded(
            child: Text(text,
                style: const TextStyle(
                    fontSize: 13, color: Colors.black87)),
          ),
        ],
      ),
    );
  }
}
