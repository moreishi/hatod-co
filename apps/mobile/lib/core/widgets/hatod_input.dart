import 'package:flutter/material.dart';
import '../constants/app_constants.dart';

/// Spec §3 Input: h-48 rounded-10 border #D0D5DD placeholder #98A2B3.
class HatodInput extends StatelessWidget {
  final TextEditingController? controller;
  final String? label;
  final String? hint;
  final IconData? leadingIcon;
  final bool obscure;
  final TextInputType keyboardType;
  final String? Function(String?)? validator;
  final Widget? suffix;

  const HatodInput({
    super.key,
    this.controller,
    this.label,
    this.hint,
    this.leadingIcon,
    this.obscure = false,
    this.keyboardType = TextInputType.text,
    this.validator,
    this.suffix,
  });

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        if (label != null)
          Padding(
            padding: const EdgeInsets.only(bottom: 6),
            child: Text(label!,
                style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w500)),
          ),
        SizedBox(
          height: AppSizes.inputHeight,
          child: TextFormField(
            controller: controller,
            obscureText: obscure,
            keyboardType: keyboardType,
            validator: validator,
            decoration: InputDecoration(
              hintText: hint,
              hintStyle: const TextStyle(color: BrandColors.muted, fontSize: 14),
              prefixIcon: leadingIcon == null
                  ? null
                  : Icon(leadingIcon, size: 20, color: BrandColors.muted),
              suffixIcon: suffix,
              contentPadding: const EdgeInsets.symmetric(horizontal: 12),
              border: const OutlineInputBorder(
                borderRadius: BorderRadius.all(Radius.circular(AppRadius.input)),
                borderSide: BorderSide(color: BrandColors.border),
              ),
              enabledBorder: const OutlineInputBorder(
                borderRadius: BorderRadius.all(Radius.circular(AppRadius.input)),
                borderSide: BorderSide(color: BrandColors.border),
              ),
            ),
          ),
        ),
      ],
    );
  }
}
