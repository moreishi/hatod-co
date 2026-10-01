import 'package:flutter/material.dart';
import '../../../core/widgets/hatod_button.dart';
import '../../../core/widgets/hatod_header.dart';
import '../../../core/widgets/hatod_input.dart';

/// Spec §4-22 Edit Profile: photo + Full Name + Phone + Email + Save.
class EditProfileScreen extends StatefulWidget {
  final String initialName;
  final String initialPhone;
  final void Function(String name, String phone, String email)? onSave;

  const EditProfileScreen({
    super.key,
    this.initialName = 'Juan Dela Cruz',
    this.initialPhone = '+63',
    this.onSave,
  });

  @override
  State<EditProfileScreen> createState() => _EditProfileScreenState();
}

class _EditProfileScreenState extends State<EditProfileScreen> {
  late final TextEditingController _name;
  late final TextEditingController _phone;
  final _email = TextEditingController();
  final _form = GlobalKey<FormState>();

  @override
  void initState() {
    super.initState();
    _name = TextEditingController(text: widget.initialName);
    _phone = TextEditingController(text: widget.initialPhone);
  }

  @override
  void dispose() {
    _name.dispose();
    _phone.dispose();
    _email.dispose();
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
                const HatodHeader(title: 'Edit Profile'),
                const SizedBox(height: 12),
                const Center(
                    child: CircleAvatar(
                        radius: 38, child: Icon(Icons.person, size: 40))),
                const SizedBox(height: 12),
                HatodInput(
                    controller: _name,
                    label: 'Full Name',
                    validator: (v) => (v == null || v.isEmpty) ? 'Required' : null),
                const SizedBox(height: 12),
                HatodInput(
                    controller: _phone,
                    label: 'Phone',
                    keyboardType: TextInputType.phone,
                    validator: (v) => (v == null || v.isEmpty) ? 'Required' : null),
                const SizedBox(height: 12),
                HatodInput(
                    controller: _email,
                    label: 'Email',
                    hint: 'you@example.com',
                    keyboardType: TextInputType.emailAddress),
                const Spacer(),
                HatodButton(
                  label: 'Save',
                  onPressed: () {
                    if (_form.currentState!.validate()) {
                      widget.onSave?.call(
                          _name.text.trim(), _phone.text.trim(), _email.text.trim());
                      Navigator.of(context).maybePop();
                    }
                  },
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
