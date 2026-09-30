import 'package:flutter/material.dart';
import '../constants/app_constants.dart';

/// Spec §3 Lists h-56-64 icon/avatar + title/sub + trailing + divider.
class HatodListRow extends StatelessWidget {
  final Widget? leading;
  final String title;
  final String? subtitle;
  final String? trailing;
  final VoidCallback? onTap;

  const HatodListRow({
    super.key,
    this.leading,
    required this.title,
    this.subtitle,
    this.trailing,
    this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        ListTile(
          contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
          leading: leading,
          title: Text(title,
              style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w500),
              maxLines: 1,
              overflow: TextOverflow.ellipsis),
          subtitle: subtitle == null
              ? null
              : Text(subtitle!,
                  style: const TextStyle(fontSize: 12, color: BrandColors.secondary),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis),
          trailing: trailing == null
              ? const Icon(Icons.chevron_right, color: BrandColors.muted)
              : Text(trailing!,
                  style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w700)),
          onTap: onTap,
        ),
        const Divider(height: 1, color: BrandColors.divider),
      ],
    );
  }
}
