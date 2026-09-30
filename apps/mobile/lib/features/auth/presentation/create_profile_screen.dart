import 'package:flutter/material.dart';
import '../../../core/widgets/hatod_button.dart';
import '../../../core/widgets/hatod_header.dart';
import '../../../core/widgets/hatod_input.dart';

/// Spec §4-05 Create Profile: avatar 76 + camera badge + Full Name + Continue.
class CreateProfileScreen extends StatefulWidget {
  final void Function(String name) onContinue;

  const CreateProfileScreen({super.key, required this.onContinue});

  @override
  State<CreateProfileScreen> createState() => _CreateProfileScreenState();
}

class _CreateProfileScreenState extends State<CreateProfileScreen> {
  final _name = TextEditingController();
  final _form = GlobalKey<FormState>();

  @override
  void dispose() {
    _name.dispose();
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
                    title: 'Create profile', subtitle: 'Tell us who you are'),
                const SizedBox(height: 16),
                Center(
                  child: Stack(
                    children: [
                      const CircleAvatar(
                          radius: 38, child: Icon(Icons.person, size: 40)),
                      Positioned(
                        bottom: 0,
                        right: 0,
                        child: Container(
                          padding: const EdgeInsets.all(6),
                          decoration: const BoxDecoration(
                            color: Colors.green,
                            shape: BoxShape.circle,
                          ),
                          child: const Icon(Icons.camera_alt,
                              size: 16, color: Colors.white),
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 16),
                HatodInput(
                  controller: _name,
                  label: 'Full Name',
                  hint: 'Juan Dela Cruz',
                  validator: (v) =>
                      (v == null || v.trim().isEmpty) ? 'Name required' : null,
                ),
                const Spacer(),
                HatodButton(
                  label: 'Continue',
                  onPressed: () {
                    if (_form.currentState!.validate()) {
                      widget.onContinue(_name.text.trim());
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
