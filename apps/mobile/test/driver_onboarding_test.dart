import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:hailing_mobile/core/network/api_client.dart';
import 'package:hailing_mobile/features/driver/data/onboarding_repository.dart';
import 'package:hailing_mobile/features/driver/presentation/onboarding/apply_screen.dart';
import 'package:hailing_mobile/features/driver/presentation/onboarding/documents_screen.dart';
import 'package:hailing_mobile/features/driver/presentation/onboarding/status_screen.dart';

OnboardingRepository repo(MockClient handler, {String baseUrl = 'http://x'}) =>
    OnboardingRepository(
        api: ApiClient(baseUrl: baseUrl, httpClient: handler));

void main() {
  group('OnboardingRepository', () {
    test('agencies, apply, profile, and document submit', () async {
      Map<String, dynamic>? applied;
      Map<String, dynamic>? submitted;
      final api = repo(MockClient((req) async {
        final path = req.url.path;
        if (path == '/api/agencies') {
          return http.Response(
              jsonEncode([
                {'id': 'ag-1', 'name': 'Queen City Wheels'}
              ]),
              200);
        }
        if (path.endsWith('/drivers/apply')) {
          applied = jsonDecode(req.body) as Map<String, dynamic>;
          return http.Response(
              jsonEncode({'id': 'd-9', 'status': 'APPLICANT'}), 200);
        }
        if (path.endsWith('/drivers/me')) {
          return http.Response(
              jsonEncode({
                'driver': {'id': 'd-9', 'status': 'DOCUMENTS_PENDING'},
                'documents': [
                  {'id': 'doc-1', 'type': 'DRIVERS_LICENSE', 'status': 'PENDING'}
                ],
                'requirements': {
                  'driver': [
                    {
                      'type': 'DRIVERS_LICENSE',
                      'label': "Driver's license",
                      'required': true
                    }
                  ]
                },
              }),
              200);
        }
        if (path.contains('/documents')) {
          submitted = jsonDecode(req.body) as Map<String, dynamic>;
          return http.Response(jsonEncode({'id': 'doc-2'}), 200);
        }
        return http.Response('{}', 404);
      }));

      final agencies = await api.agencies();
      expect(agencies.single.name, 'Queen City Wheels');

      final created = await api.apply(
          agencyId: 'ag-1', licenseNo: 'L123', dateOfBirth: '1990-01-01');
      expect(created['id'], 'd-9');
      expect(applied?['licenseNo'], 'L123');

      final profile = await api.profile();
      expect(profile.driverId, 'd-9');
      expect(profile.status, 'DOCUMENTS_PENDING');
      expect(profile.documents.single.type, 'DRIVERS_LICENSE');
      expect(profile.requirements.single.label, "Driver's license");

      await api.submitDocument(
          driverId: 'd-9', type: 'NBI_CLEARANCE', photoBytes: [1, 2, 3]);
      expect(submitted?['type'], 'NBI_CLEARANCE');
      expect((submitted?['storageKey'] as String?)?.startsWith('data:image/jpeg;base64,'), isTrue);
    });
  });

  group('DriverApplyScreen', () {
    testWidgets('validates, explains, and submits the application',
        (tester) async {
      Map<String, dynamic>? applied;
      final api = repo(MockClient((req) async {
        final path = req.url.path;
        if (path == '/api/agencies') {
          return http.Response(
              jsonEncode([
                {'id': 'ag-1', 'name': 'Queen City Wheels'}
              ]),
              200);
        }
        applied = jsonDecode(req.body) as Map<String, dynamic>;
        return http.Response(
            jsonEncode({'id': 'd-9', 'status': 'APPLICANT'}), 200);
      }));
      String? appliedId;
      await tester.pumpWidget(MaterialApp(
        home: DriverApplyScreen(
          repository: api,
          onApplied: (id) => appliedId = id,
        ),
      ));
      await tester.pumpAndSettle();
      // Informative copy: what happens after applying.
      expect(find.textContaining('agency reviews'), findsWidgets);
      // Validation first.
      await tester.tap(find.text('Submit application'));
      await tester.pump();
      expect(find.text('License required'), findsOneWidget);
      // Pick agency + license, submit.
      await tester.tap(find.byKey(const Key('agencyPicker')));
      await tester.pumpAndSettle();
      await tester.tap(find.text('Queen City Wheels').last);
      await tester.pumpAndSettle();
      await tester.enterText(
          find.byKey(const Key('licenseField')), 'L1234567');
      await tester.tap(find.text('Submit application'));
      await tester.pumpAndSettle();
      expect(applied?['agencyId'], 'ag-1');
      expect(applied?['licenseNo'], 'L1234567');
      expect(appliedId, 'd-9');
    });
  });

  group('DriverDocumentsScreen', () {
    testWidgets('required checklist with photo capture per type',
        (tester) async {
      final submitted = <Map<String, dynamic>>[];
      final stored = <String>[];
      final api = repo(MockClient((req) async {
        final path = req.url.path;
        if (path.endsWith('/drivers/me')) {
          return http.Response(
              jsonEncode({
                'driver': {'id': 'd-9', 'status': 'APPLICANT'},
                'documents': [
                  for (final t in stored)
                    {'id': 'doc-$t', 'type': t, 'status': 'PENDING'}
                ],
                'requirements': {
                  'driver': [
                    {
                      'type': 'DRIVERS_LICENSE',
                      'label': "Driver's license",
                      'required': true
                    },
                    {
                      'type': 'NBI_CLEARANCE',
                      'label': 'NBI clearance',
                      'required': true
                    },
                  ]
                },
              }),
              200);
        }
        if (path.contains('/documents')) {
          final body = jsonDecode(req.body) as Map<String, dynamic>;
          submitted.add(body);
          stored.add(body['type'] as String);
          return http.Response(jsonEncode({'id': 'doc-1'}), 200);
        }
        return http.Response('{}', 404);
      }));
      var done = 0;
      await tester.pumpWidget(MaterialApp(
        home: DriverDocumentsScreen(
          repository: api,
          driverId: 'd-9',
          capturePhoto: () async => [7, 8, 9],
          onDone: () => done++,
        ),
      ));
      await tester.pumpAndSettle();
      expect(find.text("Driver's license"), findsOneWidget);
      expect(find.text('NBI clearance'), findsOneWidget);
      // Missing docs wear grey pills until photographed.
      expect(find.byKey(const Key('statusBadge-MISSING')), findsNWidgets(2));
      // Card content stays inside the card: no row overflow.
      final card = tester.getRect(find
          .ancestor(
              of: find.byKey(const Key('docPhoto-DRIVERS_LICENSE')),
              matching: find.byType(Card))
          .first);
      final button = tester.getRect(
          find.byKey(const Key('docPhoto-DRIVERS_LICENSE')));
      expect(button.right, lessThanOrEqualTo(card.right + 1));
      expect(button.left, greaterThanOrEqualTo(card.left - 1));
      await tester.tap(find.byKey(const Key('docPhoto-DRIVERS_LICENSE')));
      await tester.pumpAndSettle();
      expect(
          submitted.where((s) => s['type'] == 'DRIVERS_LICENSE'), hasLength(1));
      expect(find.byKey(const Key('statusBadge-PENDING')), findsOneWidget);
      await tester.tap(find.text('Done'));
      await tester.pumpAndSettle();
      expect(done, 1);
    });
  });

  group('DriverStatusScreen', () {
    testWidgets('pipeline steps with current stage and re-login note',
        (tester) async {
      final api = repo(MockClient((req) async {
        return http.Response(
            jsonEncode({
              'driver': {'id': 'd-9', 'status': 'DOCUMENTS_UNDER_REVIEW'},
              'documents': [
                {
                  'id': 'doc-1',
                  'type': 'DRIVERS_LICENSE',
                  'status': 'VERIFIED'
                }
              ],
              'requirements': {
                'driver': [
                  {
                    'type': 'DRIVERS_LICENSE',
                    'label': "Driver's license",
                    'required': true
                  }
                ]
              },
            }),
            200);
      }));
      await tester.pumpWidget(MaterialApp(
        home: DriverStatusScreen(repository: api),
      ));
      await tester.pumpAndSettle();
      expect(find.text('Under review'), findsNWidgets(2));
      expect(find.textContaining('VERIFIED'), findsOneWidget);
    });

    testWidgets('rejected documents show the reviewer note',
        (tester) async {
      final api = repo(MockClient((req) async {
        return http.Response(
            jsonEncode({
              'driver': {'id': 'd-9', 'status': 'DOCUMENTS_PENDING'},
              'documents': [
                {
                  'id': 'doc-1',
                  'type': 'DRIVERS_LICENSE',
                  'status': 'REJECTED',
                  'reviewNote': 'Photo too blurry'
                }
              ],
              'requirements': {
                'driver': [
                  {
                    'type': 'DRIVERS_LICENSE',
                    'label': "Driver's license",
                    'required': true
                  }
                ]
              },
            }),
            200);
      }));
      await tester.pumpWidget(MaterialApp(
        home: DriverStatusScreen(repository: api),
      ));
      await tester.pumpAndSettle();
      expect(find.textContaining('Photo too blurry'), findsOneWidget);
    });

    testWidgets('active drivers are told to log back in', (tester) async {
      final api = repo(MockClient((req) async {
        return http.Response(
            jsonEncode({
              'driver': {'id': 'd-9', 'status': 'ACTIVE'},
              'documents': [],
              'requirements': {'driver': []},
            }),
            200);
      }));
      await tester.pumpWidget(MaterialApp(
        home: DriverStatusScreen(repository: api),
      ));
      await tester.pumpAndSettle();
      expect(find.textContaining('log out and back in'), findsOneWidget);
    });
  });
}
