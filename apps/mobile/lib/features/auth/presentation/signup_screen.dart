import 'package:flutter/material.dart';
import '../../../core/widgets/hatod_button.dart';
import '../../../core/widgets/hatod_header.dart';
import '../../../core/widgets/hatod_input.dart';

/// Spec §4-03 Sign Up: Create your account + phone + Continue + Terms.
/// OTP-only: no password, no Google sign-in.
class SignupScreen extends StatefulWidget {
  final void Function(String phone) onContinue;

  const SignupScreen({super.key, required this.onContinue});

  @override
  State<SignupScreen> createState() => _SignupScreenState();
}

class _SignupScreenState extends State<SignupScreen> {
  final _phone = TextEditingController();
  final _form = GlobalKey<FormState>();

  @override
  void dispose() {
    _phone.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.white,
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Form(
            key: _form,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                const HatodHeader(
                    title: 'Create your account',
                    subtitle: 'Enter your mobile number to get started'),
                const SizedBox(height: 16),
                HatodInput(
                  controller: _phone,
                  hint: '+63 912 345 6789',
                  leadingIcon: Icons.phone,
                  keyboardType: TextInputType.phone,
                  validator: (v) {
                    if (v == null || v.trim().isEmpty) return 'Phone required';
                    if (v.trim().length < 7) return 'Enter a valid number';
                    return null;
                  },
                ),
                const Spacer(),
                HatodButton(
                  label: 'Continue',
                  onPressed: () {
                    if (_form.currentState!.validate()) {
                      widget.onContinue(_phone.text.trim());
                    }
                  },
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
