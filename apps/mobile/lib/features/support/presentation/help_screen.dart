import 'package:flutter/material.dart';
import '../../../core/widgets/list_row.dart';

/// Spec §4-26 Help: FAQs/Contact/Report/About 1.0.0 + footer logo.
class HelpScreen extends StatelessWidget {
  const HelpScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Help & Support')),
      body: ListView(
        children: const [
          HatodListRow(leading: Icon(Icons.help_outline), title: 'FAQs'),
          HatodListRow(leading: Icon(Icons.call_outlined), title: 'Contact Us'),
          HatodListRow(leading: Icon(Icons.report_outlined), title: 'Report an Issue'),
          HatodListRow(leading: Icon(Icons.info_outline), title: 'About', subtitle: 'v1.0.0'),
          Padding(
            padding: EdgeInsets.all(24),
            child: Text('HATOD',
                textAlign: TextAlign.center,
                style: TextStyle(fontWeight: FontWeight.w800, letterSpacing: 1.5)),
          ),
        ],
      ),
    );
  }
}
