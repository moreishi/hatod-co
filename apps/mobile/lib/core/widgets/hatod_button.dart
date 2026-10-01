import 'package:flutter/material.dart';
import '../constants/app_constants.dart';

enum HatodButtonVariant { primary, accent, secondary, dangerOutline, smallPill }

/// Spec §3 Button primary: w-full h-50 rounded-12 bg #0E4D2E white 16/600.
class HatodButton extends StatelessWidget {
  final String label;
  final VoidCallback? onPressed;
  final HatodButtonVariant variant;
  final bool loading;

  const HatodButton({
    super.key,
    required this.label,
    this.onPressed,
    this.variant = HatodButtonVariant.primary,
    this.loading = false,
  });

  @override
  Widget build(BuildContext context) {
    final child = loading
        ? const SizedBox(
            height: 20,
            width: 20,
            child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
          )
        : Text(label,
            style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w600));

    switch (variant) {
      case HatodButtonVariant.accent:
        return SizedBox(
          width: double.infinity,
          height: AppSizes.buttonHeight,
          child: FilledButton(
            onPressed: loading ? null : onPressed,
            style: FilledButton.styleFrom(
              backgroundColor: BrandColors.accent,
              foregroundColor: Colors.black,
              shape: const RoundedRectangleBorder(
                  borderRadius: BorderRadius.all(Radius.circular(AppRadius.button))),
            ),
            child: child,
          ),
        );
      case HatodButtonVariant.secondary:
        return SizedBox(
          width: double.infinity,
          height: AppSizes.buttonHeight,
          child: OutlinedButton(
            onPressed: loading ? null : onPressed,
            style: OutlinedButton.styleFrom(
              foregroundColor: BrandColors.ink,
              side: const BorderSide(color: BrandColors.border),
              shape: const RoundedRectangleBorder(
                  borderRadius: BorderRadius.all(Radius.circular(AppRadius.button))),
            ),
            child: Text(label,
                style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w600)),
          ),
        );
      case HatodButtonVariant.dangerOutline:
        return SizedBox(
          width: double.infinity,
          height: AppSizes.buttonHeight,
          child: OutlinedButton(
            onPressed: loading ? null : onPressed,
            style: OutlinedButton.styleFrom(
              foregroundColor: BrandColors.danger,
              side: const BorderSide(color: Color(0xFFF97066)),
              shape: const RoundedRectangleBorder(
                  borderRadius: BorderRadius.all(Radius.circular(AppRadius.button))),
            ),
            child: child,
          ),
        );
      case HatodButtonVariant.smallPill:
        return SizedBox(
          height: 36,
          child: FilledButton(
            onPressed: loading ? null : onPressed,
            style: FilledButton.styleFrom(
              backgroundColor: BrandColors.primary,
              foregroundColor: Colors.white,
              padding: const EdgeInsets.symmetric(horizontal: 12),
              shape: const RoundedRectangleBorder(
                  borderRadius: BorderRadius.all(Radius.circular(10))),
              textStyle: const TextStyle(fontSize: 14, fontWeight: FontWeight.w600),
            ),
            child: child,
          ),
        );
      case HatodButtonVariant.primary:
        return SizedBox(
          width: double.infinity,
          height: AppSizes.buttonHeight,
          child: FilledButton(
            onPressed: loading ? null : onPressed,
            style: FilledButton.styleFrom(
              backgroundColor: BrandColors.primary,
              foregroundColor: Colors.white,
              shape: const RoundedRectangleBorder(
                  borderRadius: BorderRadius.all(Radius.circular(AppRadius.button))),
            ),
            child: child,
          ),
        );
    }
  }
}
