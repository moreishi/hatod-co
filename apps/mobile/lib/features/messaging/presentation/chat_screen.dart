import 'dart:async';
import 'package:flutter/material.dart';
import '../data/messaging_repository.dart';
import '../domain/conversation.dart';

/// Conversation view with polling sync (mobile spec §48–49; sockets land later).
class ChatScreen extends StatefulWidget {
  final MessagingRepository repository;
  final String conversationId;
  final String myId;
  final bool closed;

  const ChatScreen({
    super.key,
    required this.repository,
    required this.conversationId,
    required this.myId,
    required this.closed,
  });

  @override
  State<ChatScreen> createState() => _ChatScreenState();
}

class _ChatScreenState extends State<ChatScreen> {
  List<ChatMessage> _messages = [];
  final _draft = TextEditingController();
  Timer? _poll;
  String? _error;

  @override
  void initState() {
    super.initState();
    _refresh();
    if (!widget.closed) {
      _poll = Timer.periodic(const Duration(seconds: 5), (_) => _refresh(silent: true));
    }
  }

  @override
  void dispose() {
    _poll?.cancel();
    _draft.dispose();
    super.dispose();
  }

  Future<void> _refresh({bool silent = false}) async {
    try {
      final messages = await widget.repository.history(widget.conversationId);
      if (!mounted) return;
      setState(() => _messages = messages.reversed.toList());
      await widget.repository.markRead(widget.conversationId);
    } catch (_) {
      if (!silent && mounted) {
        setState(() => _error = 'Could not load messages.');
      }
    }
  }

  Future<void> _send() async {
    final text = _draft.text.trim();
    if (text.isEmpty) return;
    setState(() => _error = null);
    try {
      final sent = await widget.repository.send(widget.conversationId, text);
      setState(() {
        _messages = [..._messages, sent];
        _draft.clear();
      });
    } catch (_) {
      setState(() => _error = 'Unable to send message. Please try again.');
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Chat')),
      body: Column(
        children: [
          Expanded(
            child: ListView.builder(
              padding: const EdgeInsets.all(16),
              itemCount: _messages.length,
              itemBuilder: (context, i) {
                final m = _messages[i];
                final mine = m.senderId == widget.myId;
                if (m.isSystem) {
                  return Padding(
                    padding: const EdgeInsets.symmetric(vertical: 4),
                    child: Text(m.content,
                        textAlign: TextAlign.center,
                        style: Theme.of(context).textTheme.bodySmall),
                  );
                }
                return Align(
                  alignment: mine ? Alignment.centerRight : Alignment.centerLeft,
                  child: Container(
                    margin: const EdgeInsets.symmetric(vertical: 4),
                    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                    decoration: BoxDecoration(
                      color: mine
                          ? Theme.of(context).colorScheme.primary
                          : Theme.of(context).colorScheme.surfaceContainerHighest,
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Text(
                      m.content,
                      style: TextStyle(
                          color: mine ? Colors.white : null),
                    ),
                  ),
                );
              },
            ),
          ),
          if (_error != null)
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16),
              child: Text(_error!, style: const TextStyle(color: Colors.red)),
            ),
          if (!widget.closed)
            Padding(
              padding: const EdgeInsets.all(16),
              child: Row(
                children: [
                  Expanded(
                    child: TextField(
                      controller: _draft,
                      decoration: const InputDecoration(hintText: 'Message…'),
                      maxLength: 1000,
                    ),
                  ),
                  const SizedBox(width: 8),
                  ElevatedButton(onPressed: _send, child: const Text('Send')),
                ],
              ),
            )
          else
            const Padding(
              padding: EdgeInsets.all(16),
              child: Text('This conversation is closed.'),
            ),
        ],
      ),
    );
  }
}
