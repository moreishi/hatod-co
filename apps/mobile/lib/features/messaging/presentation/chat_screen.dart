import 'dart:async';
import 'package:flutter/material.dart';
import '../data/messaging_repository.dart';
import '../domain/conversation.dart';

/// Conversation view with polling sync (mobile spec §48–49; sockets land
/// later). Polished bubbles, timestamps, delivery ticks, and a compact
/// composer; closed trips stay read-only with a clear explanation.
class ChatScreen extends StatefulWidget {
  final MessagingRepository repository;
  final String conversationId;
  final String myId;
  final bool closed;

  /// Who you are chatting with, shown under the title ("Driver · plate").
  final String? counterpartLabel;

  const ChatScreen({
    super.key,
    required this.repository,
    required this.conversationId,
    required this.myId,
    required this.closed,
    this.counterpartLabel,
  });

  @override
  State<ChatScreen> createState() => _ChatScreenState();
}

class _ChatScreenState extends State<ChatScreen> {
  List<ChatMessage> _messages = [];
  final _draft = TextEditingController();
  final _scroll = ScrollController();
  Timer? _poll;
  String? _error;

  @override
  void initState() {
    super.initState();
    _refresh();
    if (!widget.closed) {
      _poll =
          Timer.periodic(const Duration(seconds: 5), (_) => _refresh(silent: true));
    }
  }

  @override
  void dispose() {
    _poll?.cancel();
    _draft.dispose();
    _scroll.dispose();
    super.dispose();
  }

  Future<void> _refresh({bool silent = false}) async {
    try {
      final messages = await widget.repository.history(widget.conversationId);
      if (!mounted) return;
      setState(() => _messages = messages);
      _scrollToBottom();
      await widget.repository.markRead(widget.conversationId);
    } catch (_) {
      if (!silent && mounted) {
        setState(() => _error = 'Could not load messages.');
      }
    }
  }

  void _scrollToBottom() {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (_scroll.hasClients) {
        _scroll.jumpTo(_scroll.position.maxScrollExtent);
      }
    });
  }

  Future<void> _send() async {
    final text = _draft.text.trim();
    if (text.isEmpty) return;
    setState(() => _error = null);
    try {
      final sent =
          await widget.repository.send(widget.conversationId, text);
      setState(() {
        _messages = [..._messages, sent];
        _draft.clear();
      });
      _scrollToBottom();
    } catch (_) {
      setState(() => _error = 'Unable to send message. Please try again.');
    }
  }

  String _time(DateTime? dt) {
    if (dt == null) return '';
    final l = dt.toLocal();
    final h = l.hour % 12 == 0 ? 12 : l.hour % 12;
    final m = l.minute.toString().padLeft(2, '0');
    return '$h:$m ${l.hour < 12 ? 'AM' : 'PM'}';
  }

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return Scaffold(
      backgroundColor: const Color(0xFFF6F5F2),
      appBar: AppBar(
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text('Chat'),
            if (widget.closed)
              const Text('Read-only',
                  style: TextStyle(
                      fontSize: 11, fontWeight: FontWeight.w400))
            else if (widget.counterpartLabel != null)
              Text(widget.counterpartLabel!,
                  style: const TextStyle(
                      fontSize: 11, fontWeight: FontWeight.w400)),
          ],
        ),
      ),
      body: Column(
        children: [
          Expanded(
            child: _messages.isEmpty
                ? Center(
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Icon(Icons.forum_outlined,
                            size: 44, color: Colors.grey[400]),
                        const SizedBox(height: 8),
                        Text(
                          widget.closed
                              ? 'No messages were exchanged.'
                              : 'No messages yet — say hi!',
                          style: const TextStyle(color: Colors.grey),
                        ),
                      ],
                    ),
                  )
                : ListView.builder(
                    controller: _scroll,
                    padding: const EdgeInsets.all(16),
                    itemCount: _messages.length,
                    itemBuilder: (context, i) {
                      final m = _messages[i];
                      final mine = m.senderId == widget.myId;
                      if (m.isSystem) {
                        return Padding(
                          padding: const EdgeInsets.symmetric(vertical: 6),
                          child: Center(
                            child: Container(
                              padding: const EdgeInsets.symmetric(
                                  horizontal: 12, vertical: 5),
                              decoration: BoxDecoration(
                                color: Colors.white,
                                borderRadius: BorderRadius.circular(12),
                                border: Border.all(color: Colors.grey.shade300),
                              ),
                              child: Text(m.content,
                                  style: Theme.of(context)
                                      .textTheme
                                      .bodySmall),
                            ),
                          ),
                        );
                      }
                      final isLast = i == _messages.length - 1 ||
                          _messages[i + 1].senderId != m.senderId;
                      return Align(
                        alignment:
                            mine ? Alignment.centerRight : Alignment.centerLeft,
                        child: Container(
                          margin: const EdgeInsets.symmetric(vertical: 4),
                          constraints: const BoxConstraints(maxWidth: 300),
                          padding: const EdgeInsets.symmetric(
                              horizontal: 14, vertical: 10),
                          decoration: BoxDecoration(
                            color: mine
                                ? scheme.primary
                                : Colors.white,
                            borderRadius: BorderRadius.only(
                              topLeft: const Radius.circular(16),
                              topRight: const Radius.circular(16),
                              bottomLeft: Radius.circular(mine ? 16 : 4),
                              bottomRight: Radius.circular(mine ? 4 : 16),
                            ),
                            boxShadow: [
                              BoxShadow(
                                color: Colors.black.withValues(alpha: 0.05),
                                blurRadius: 6,
                                offset: const Offset(0, 2),
                              ),
                            ],
                          ),
                          child: Column(
                            crossAxisAlignment: mine
                                ? CrossAxisAlignment.end
                                : CrossAxisAlignment.start,
                            children: [
                              Text(
                                m.content,
                                style: TextStyle(
                                    fontSize: 15,
                                    color: mine ? Colors.white : null),
                              ),
                              if (isLast && m.createdAt != null)
                                Padding(
                                  padding:
                                      const EdgeInsets.only(top: 2),
                                  child: Row(
                                    mainAxisSize: MainAxisSize.min,
                                    children: [
                                      Text(
                                        _time(m.createdAt),
                                        style: TextStyle(
                                            fontSize: 10,
                                            color: mine
                                                ? Colors.white70
                                                : Colors.grey),
                                      ),
                                      if (mine) ...[
                                        const SizedBox(width: 4),
                                        _ticks(m.status),
                                      ],
                                    ],
                                  ),
                                ),
                            ],
                          ),
                        ),
                      );
                    },
                  ),
          ),
          if (_error != null)
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16),
              child: Text(_error!,
                  style: const TextStyle(color: Colors.red, fontSize: 13)),
            ),
          if (!widget.closed)
            SafeArea(
              top: false,
              child: Padding(
                padding:
                    const EdgeInsets.fromLTRB(12, 6, 12, 12),
                child: Row(
                  children: [
                    Expanded(
                      child: TextField(
                        controller: _draft,
                        maxLength: 1000,
                        textCapitalization: TextCapitalization.sentences,
                        decoration: InputDecoration(
                          counterText: '',
                          hintText: 'Message…',
                          isDense: true,
                          filled: true,
                          fillColor: Colors.white,
                          contentPadding: const EdgeInsets.symmetric(
                              horizontal: 16, vertical: 14),
                          border: OutlineInputBorder(
                            borderRadius:
                                BorderRadius.circular(24),
                            borderSide:
                                BorderSide(color: Colors.grey.shade300),
                          ),
                          enabledBorder: OutlineInputBorder(
                            borderRadius:
                                BorderRadius.circular(24),
                            borderSide:
                                BorderSide(color: Colors.grey.shade300),
                          ),
                          focusedBorder: OutlineInputBorder(
                            borderRadius:
                                BorderRadius.circular(24),
                            borderSide: BorderSide(
                                color: scheme.primary, width: 1.5),
                          ),
                        ),
                      ),
                    ),
                    const SizedBox(width: 8),
                    ElevatedButton(
                      onPressed: _send,
                      style: ElevatedButton.styleFrom(
                        minimumSize: const Size(0, 48),
                        padding: const EdgeInsets.symmetric(
                            horizontal: 20),
                        shape: const RoundedRectangleBorder(
                          borderRadius:
                              BorderRadius.all(Radius.circular(24)),
                        ),
                      ),
                      child: const Text('Send'),
                    ),
                  ],
                ),
              ),
            )
          else
            const Padding(
              padding: EdgeInsets.all(16),
              child: Text(
                'This trip ended, so this chat is read-only. New bookings open a fresh chat.',
                textAlign: TextAlign.center,
              ),
            ),
        ],
      ),
    );
  }

  Widget _ticks(String status) {
    final color = Colors.white70;
    switch (status) {
      case 'READ':
        return Icon(Icons.done_all, size: 14, color: Colors.amber[200]);
      case 'DELIVERED':
        return Icon(Icons.done_all, size: 14, color: color);
      default:
        return Icon(Icons.done, size: 14, color: color);
    }
  }
}
