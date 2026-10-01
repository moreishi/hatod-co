import 'package:flutter/material.dart';
import '../constants/app_constants.dart';

/// Spec §3 Header: back-24 + title-18/700 + subtitle-14/grey.
class HatodHeader extends StatelessWidget {
  final String title;
  final String? subtitle;
  final bool showBack;
  final bool centered;

  const HatodHeader({
    super.key,
    required this.title,
    this.subtitle,
    this.showBack = true,
    this.centered = false,
  });

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        if (showBack)
          IconButton(
            icon: const Icon(Icons.arrow_back, size: 24),
            onPressed: () => Navigator.of(context).maybePop(),
          ),
        Expanded(
          child: Column(
            crossAxisAlignment:
                centered ? CrossAxisAlignment.center : CrossAxisAlignment.start,
            children: [
              Text(title,
                  textAlign: centered ? TextAlign.center : TextAlign.left,
                  style: const TextStyle(
                      fontSize: 18,
                      fontWeight: FontWeight.w700,
                      color: BrandColors.ink)),
              if (subtitle != null)
                Text(subtitle!,
                    style: const TextStyle(fontSize: 14, color: BrandColors.secondary)),
            ],
          ),
        ),
      ],
    );
  }
}
