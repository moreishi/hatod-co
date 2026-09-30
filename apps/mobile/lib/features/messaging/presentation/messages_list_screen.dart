import 'package:flutter/material.dart';
import '../../../core/widgets/list_row.dart';

/// Spec §4-20 Messages list.
class MessagesListScreen extends StatelessWidget {
  final void Function(String conversationId)? onOpen;

  const MessagesListScreen({super.key, this.onOpen});

  @override
  Widget build(BuildContext context) {
    const items = [
      ('c-carlos', 'Carlos Reyes', 'On my way!', '9:41', 'C'),
      ('c-juan', 'Juan Dela Cruz', 'Thanks!', 'Yesterday', 'J'),
      ('c-support', 'Driver Support', 'How can we help?', 'Mon', 'S'),
      ('c-maria', 'Maria Santos', 'See you!', 'Sun', 'M'),
    ];
    return Scaffold(
      appBar: AppBar(title: const Text('Messages')),
      body: ListView(
        children: [
          for (final (id, name, preview, time, initial) in items)
            HatodListRow(
              leading: CircleAvatar(radius: 24, child: Text(initial)),
              title: name,
              subtitle: '$preview · $time',
              onTap: () => onOpen?.call(id),
            ),
        ],
      ),
    );
  }
}
