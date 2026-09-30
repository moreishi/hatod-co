import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import '../constants/app_constants.dart';

/// Spec §3 OTP: 6 boxes 48x56 rounded-10 gap-8, numeric, error state.
class OtpBoxes extends StatefulWidget {
  final void Function(String code) onCompleted;
  final String? error;

  const OtpBoxes({super.key, required this.onCompleted, this.error});

  @override
  State<OtpBoxes> createState() => _OtpBoxesState();
}

class _OtpBoxesState extends State<OtpBoxes> {
  final _controllers = List.generate(6, (_) => TextEditingController());
  final _nodes = List.generate(6, (_) => FocusNode());

  @override
  void dispose() {
    for (final c in _controllers) {
      c.dispose();
    }
    for (final n in _nodes) {
      n.dispose();
    }
    super.dispose();
  }

  void _onChanged(int i, String v) {
    if (v.isNotEmpty && i < 5) {
      _nodes[i + 1].requestFocus();
    }
    if (v.isEmpty && i > 0) {
      _nodes[i - 1].requestFocus();
    }
    final code = _controllers.map((c) => c.text).join();
    if (code.length == 6) widget.onCompleted(code);
  }

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: List.generate(6, (i) {
            return Container(
              width: AppSizes.otpBoxW,
              height: AppSizes.otpBoxH,
              margin: EdgeInsets.only(right: i == 5 ? 0 : 8),
              child: TextField(
                controller: _controllers[i],
                focusNode: _nodes[i],
                textAlign: TextAlign.center,
                keyboardType: TextInputType.number,
                inputFormatters: [
                  FilteringTextInputFormatter.digitsOnly,
                  LengthLimitingTextInputFormatter(1),
                ],
                style: const TextStyle(fontSize: 20, fontWeight: FontWeight.w600),
                decoration: InputDecoration(
                  counterText: '',
                  border: OutlineInputBorder(
                    borderRadius:
                        const BorderRadius.all(Radius.circular(AppRadius.otpBox)),
                    borderSide: BorderSide(
                        color: widget.error != null
                            ? BrandColors.danger
                            : BrandColors.border),
                  ),
                ),
                onChanged: (v) => _onChanged(i, v),
              ),
            );
          }),
        ),
        if (widget.error != null)
          Padding(
            padding: const EdgeInsets.only(top: 8),
            child: Text(widget.error!,
                style: const TextStyle(color: BrandColors.danger, fontSize: 12)),
          ),
      ],
    );
  }
}
