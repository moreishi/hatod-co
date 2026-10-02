import 'dart:async';
import 'package:flutter/material.dart';
import '../../../core/widgets/hatod_button.dart';
import '../../../core/widgets/hatod_header.dart';
import '../../../core/widgets/otp_boxes.dart';

/// Spec §4-04 OTP: Verify your number + sent-to + 6 boxes + Resend 00:45.
class OtpScreen extends StatefulWidget {
  final String phone;
  final Future<void> Function(String code) onVerify;

  /// LocalStage dev code, shown for testing like the login screen does.
  final String? devCode;

  const OtpScreen(
      {super.key, required this.phone, required this.onVerify, this.devCode});

  @override
  State<OtpScreen> createState() => _OtpScreenState();
}

class _OtpScreenState extends State<OtpScreen> {
  String? _error;
  bool _busy = false;
  int _seconds = 45;
  Timer? _timer;

  @override
  void initState() {
    super.initState();
    _timer = Timer.periodic(const Duration(seconds: 1), (t) {
      if (_seconds > 0 && mounted) {
        setState(() => _seconds--);
      } else {
        t.cancel();
      }
    });
  }

  @override
  void dispose() {
    _timer?.cancel();
    super.dispose();
  }

  Future<void> _submit(String code) async {
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      await widget.onVerify(code);
    } catch (_) {
      setState(() => _error = 'Invalid code. Please try again.');
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.white,
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              HatodHeader(
                  title: 'Verify your number',
                  subtitle: 'Code sent to ${widget.phone}'),
              const SizedBox(height: 24),
              OtpBoxes(
                error: _error,
                onCompleted: (code) {
                  if (!_busy) _submit(code);
                },
              ),
              if (widget.devCode != null)
                Padding(
                  padding: const EdgeInsets.only(top: 8),
                  child: Text('LocalStage code: ${widget.devCode}',
                      key: const Key('devCode')),
                ),
              const SizedBox(height: 16),
              Center(
                child: Text(
                  _seconds > 0
                      ? 'Resend 00:${_seconds.toString().padLeft(2, '0')}'
                      : 'Resend code',
                  style: const TextStyle(fontSize: 13),
                ),
              ),
              const Spacer(),
              HatodButton(
                label: _busy ? 'Verifying...' : 'Verify',
                onPressed: null,
              ),
              const SizedBox(height: 8),
              const Text(
                'Use OS numeric keyboard + SMS autofill on Android.',
                textAlign: TextAlign.center,
                style: TextStyle(fontSize: 12, color: Colors.grey),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
