import 'package:flutter/material.dart';
import '../constants/app_constants.dart';

/// Spec §3 Chat bubbles max-75% p-2.5 rounded-14 incoming grey / outgoing green.
class ChatBubble extends StatelessWidget {
  final String text;
  final bool outgoing;
  final String? time;

  const ChatBubble({super.key, required this.text, required this.outgoing, this.time});

  @override
  Widget build(BuildContext context) {
    return Align(
      alignment: outgoing ? Alignment.centerRight : Alignment.centerLeft,
      child: ConstrainedBox(
        constraints: BoxConstraints(
            maxWidth: MediaQuery.of(context).size.width * 0.75),
        child: Container(
          padding: const EdgeInsets.all(10),
          decoration: BoxDecoration(
            color: outgoing ? BrandColors.primary : BrandColors.chatIn,
            borderRadius: BorderRadius.circular(14),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.end,
            mainAxisSize: MainAxisSize.min,
            children: [
              Text(text,
                  style: TextStyle(
                      color: outgoing ? Colors.white : BrandColors.ink,
                      fontSize: 14)),
              if (time != null)
                Text(time!,
                    style: TextStyle(
                        fontSize: 11,
                        color: outgoing ? Colors.white70 : BrandColors.muted)),
            ],
          ),
        ),
      ),
    );
  }
}
