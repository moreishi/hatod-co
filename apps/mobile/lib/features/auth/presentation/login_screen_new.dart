import 'package:flutter/material.dart';
import '../../../core/widgets/hatod_button.dart';
import '../../../core/widgets/hatod_header.dart';
import '../../../core/widgets/hatod_input.dart';

/// Spec §4-07 Login: Welcome back + phone + password + Forgot + Log In + Google.
class LoginFormScreen extends StatefulWidget {
  final void Function(String phone, String password) onLogin;

  const LoginFormScreen({super.key, required this.onLogin});

  @override
  State<LoginFormScreen> createState() => _LoginFormScreenState();
}

class _LoginFormScreenState extends State<LoginFormScreen> {
  final _phone = TextEditingController();
  final _pass = TextEditingController();
  final _form = GlobalKey<FormState>();
  bool _obscure = true;

  @override
  void dispose() {
    _phone.dispose();
    _pass.dispose();
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
                    title: 'Welcome back!',
                    subtitle: 'Log in to continue riding'),
                const SizedBox(height: 16),
                HatodInput(
                  controller: _phone,
                  hint: '+63 phone',
                  leadingIcon: Icons.phone,
                  keyboardType: TextInputType.phone,
                  validator: (v) => (v == null || v.isEmpty)
                      ? 'Phone required'
                      : null,
                ),
                const SizedBox(height: 12),
                HatodInput(
                  controller: _pass,
                  hint: 'Password',
                  leadingIcon: Icons.lock,
                  obscure: _obscure,
                  suffix: IconButton(
                    icon: Icon(_obscure
                        ? Icons.visibility
                        : Icons.visibility_off),
                    onPressed: () =>
                        setState(() => _obscure = !_obscure),
                  ),
                  validator: (v) => (v == null || v.isEmpty)
                      ? 'Password required'
                      : null,
                ),
                Align(
                  alignment: Alignment.centerRight,
                  child: TextButton(
                      onPressed: () {},
                      child: const Text('Forgot password?')),
                ),
                const Spacer(),
                HatodButton(
                  label: 'Log In',
                  onPressed: () {
                    if (_form.currentState!.validate()) {
                      widget.onLogin(
                          _phone.text.trim(), _pass.text);
                    }
                  },
                ),
                const SizedBox(height: 12),
                const Row(children: [
                  Expanded(child: Divider()),
                  Padding(
                      padding: EdgeInsets.symmetric(horizontal: 8),
                      child: Text('or')),
                  Expanded(child: Divider()),
                ]),
                const SizedBox(height: 12),
                HatodButton(
                  label: 'Continue with Google',
                  variant: HatodButtonVariant.secondary,
                  onPressed: () {},
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
