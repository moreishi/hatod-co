import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:hailing_mobile/core/network/api_client.dart';
import 'package:hailing_mobile/features/messaging/data/messaging_repository.dart';
import 'package:hailing_mobile/features/messaging/presentation/chat_screen.dart';

MessagingRepository repo(MockClient handler) => MessagingRepository(
      api: ApiClient(baseUrl: 'http://x', httpClient: handler),
    );

Map<String, dynamic> msg(String id, String sender, String content) => {
      'id': id,
      'senderId': sender,
      'type': 'TEXT',
      'content': content,
      'status': 'SENT',
    };

void main() {
  group('MessagingRepository', () {
    test('history, send, read, unread', () async {
      final calls = <String>[];
      final api = repo(MockClient((req) async {
        calls.add('${req.method} ${req.url.path}');
        final path = req.url.path;
        if (path.endsWith('/messages') && req.method == 'GET') {
          return http.Response(jsonEncode([msg('m-1', 'u-2', 'hi')]), 200);
        }
        if (path.endsWith('/messages')) {
          return http.Response(
              jsonEncode(msg('m-2', 'u-1', 'hello')), 200);
        }
        if (path.endsWith('/read')) {
          return http.Response(jsonEncode({'read': 1}), 200);
        }
        if (path.endsWith('/unread-count')) {
          return http.Response(jsonEncode({'total': 2}), 200);
        }
        if (path.contains('/by-ride/')) {
          return http.Response(
              jsonEncode({'id': 'c-1', 'rideId': 'r-1', 'status': 'ACTIVE'}), 200);
        }
        return http.Response('{}', 404);
      }));

      final history = await api.history('c-1');
      expect(history.map((m) => m.id), ['m-1']);
      final sent = await api.send('c-1', 'hello');
      expect(sent.id, 'm-2');
      await api.markRead('c-1');
      expect(await api.unreadCount(), 2);
      final convo = await api.conversationForRide('r-1');
      expect(convo!.id, 'c-1');
      expect(calls.where((c) => c.contains('/messages')), hasLength(2));
    });

    test('conversationForRide returns null without a conversation', () async {
      final api = repo(MockClient((_) async => http.Response('{}', 404)));
      expect(await api.conversationForRide('r-x'), isNull);
    });

    test('history returns chronological order (newest last)', () async {
      // API pages newest-first (createdAt desc); the view wants oldest→newest.
      final api = repo(MockClient((_) async => http.Response(
            jsonEncode([
              msg('m-3', 'u-1', 'latest'),
              msg('m-2', 'u-2', 'middle'),
              msg('m-1', 'u-1', 'oldest'),
            ]),
            200,
          )));
      final h = await api.history('c-1');
      expect(h.map((m) => m.id).toList(), ['m-1', 'm-2', 'm-3']);
    });
  });

  group('ChatScreen', () {
    testWidgets('sends a message and appends it', (tester) async {
      final api = repo(MockClient((req) async {
        if (req.method == 'GET') {
          return http.Response(jsonEncode([msg('m-1', 'u-2', 'hi')]), 200);
        }
        return http.Response(jsonEncode(msg('m-9', 'u-1', 'yo')), 200);
      }));
      await tester.pumpWidget(MaterialApp(
        home: ChatScreen(
          repository: api,
          conversationId: 'c-1',
          myId: 'u-1',
          closed: false,
        ),
      ));
      await tester.pumpAndSettle();
      expect(find.text('hi'), findsOneWidget);

      await tester.enterText(find.byType(TextField), 'yo');
      await tester.tap(find.text('Send'));
      await tester.pumpAndSettle();
      expect(find.text('yo'), findsOneWidget);
    });

    testWidgets('closed conversations hide the composer', (tester) async {
      final api = repo(MockClient((_) async => http.Response(jsonEncode([]), 200)));
      await tester.pumpWidget(MaterialApp(
        home: ChatScreen(
          repository: api,
          conversationId: 'c-1',
          myId: 'u-1',
          closed: true,
        ),
      ));
      await tester.pumpAndSettle();
      expect(
          find.text(
              'This trip ended, so this chat is read-only. New bookings open a fresh chat.'),
          findsOneWidget);
      expect(find.text('Send'), findsNothing);
    });

    testWidgets('newest message renders at the bottom (Messenger-style)',
        (tester) async {
      // Server returns newest-first; both senders differ.
      final api = repo(MockClient((_) async => http.Response(
            jsonEncode([
              msg('m-2', 'u-1', 'latest-from-me'),
              msg('m-1', 'u-2', 'earlier-from-them'),
            ]),
            200,
          )));
      await tester.pumpWidget(MaterialApp(
        home: ChatScreen(
          repository: api,
          conversationId: 'c-1',
          myId: 'u-1',
          closed: false,
        ),
      ));
      await tester.pumpAndSettle();
      final earlier = tester.getRect(find.text('earlier-from-them'));
      final latest = tester.getRect(find.text('latest-from-me'));
      // Chronological: newest sits lower on the screen (larger top y).
      expect(latest.top, greaterThan(earlier.top));
    });
  });
}
