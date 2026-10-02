/// Messaging domain (mobile spec §48–50 adapted to backend models).
class Conversation {
  final String id;
  final String rideId;
  final String status;

  const Conversation({required this.id, required this.rideId, required this.status});

  bool get isActive => status == 'ACTIVE';

  factory Conversation.fromJson(Map<String, dynamic> json) => Conversation(
        id: json['id'] as String,
        rideId: json['rideId'] as String? ?? '',
        status: json['status'] as String,
      );
}

class ChatMessage {
  final String id;
  final String senderId;
  final String type;
  final String content;
  final String status;
  final DateTime? createdAt;

  const ChatMessage({
    required this.id,
    required this.senderId,
    required this.type,
    required this.content,
    required this.status,
    this.createdAt,
  });

  bool get isSystem => type == 'SYSTEM';

  factory ChatMessage.fromJson(Map<String, dynamic> json) => ChatMessage(
        id: json['id'] as String,
        senderId: json['senderId'] as String? ?? '',
        type: json['type'] as String? ?? 'TEXT',
        content: json['content'] as String? ?? '',
        status: json['status'] as String? ?? 'SENT',
        createdAt: json['createdAt'] == null
            ? null
            : DateTime.tryParse(json['createdAt'] as String),
      );
}
