import '../../../core/network/api_client.dart';
import '../domain/conversation.dart';

/// Conversation access over the real API (spec: sender identity is the token).
class MessagingRepository {
  final ApiClient api;

  MessagingRepository({required this.api});

  Future<Conversation?> conversationForRide(String rideId) async {
    try {
      final body = await api.get('/api/conversations/by-ride/$rideId')
          as Map<String, dynamic>;
      return Conversation.fromJson(body);
    } catch (_) {
      return null;
    }
  }

  Future<List<ChatMessage>> history(String conversationId, {int limit = 30}) async {
    final body = await api.get(
        '/api/conversations/$conversationId/messages?limit=$limit') as List;
    return body.map((m) => ChatMessage.fromJson(m as Map<String, dynamic>)).toList();
  }

  Future<ChatMessage> send(String conversationId, String content) async {
    final body = await api.post('/api/conversations/$conversationId/messages', {
      'content': content,
      'clientMessageId': DateTime.now().microsecondsSinceEpoch.toString(),
    }) as Map<String, dynamic>;
    return ChatMessage.fromJson(body);
  }

  Future<void> markRead(String conversationId) async {
    await api.post('/api/conversations/$conversationId/read', {});
  }

  Future<int> unreadCount() async {
    final body = await api.get('/api/conversations/unread-count') as Map<String, dynamic>;
    return (body['total'] as num?)?.toInt() ?? 0;
  }
}
