import 'dart:convert';
import 'package:http/http.dart' as http;
import 'api_exception.dart';

/// Token-authenticated HTTP client (mobile spec §77 network architecture).
/// Every request carries the session token; 401/403 map to session errors.
class ApiClient {
  final String baseUrl;
  final http.Client _http;
  String? _token;

  ApiClient({required this.baseUrl, http.Client? httpClient})
      : _http = httpClient ?? http.Client();

  void setToken(String? token) => _token = token;

  Map<String, String> get _headers => {
        'content-type': 'application/json',
        if (_token != null) 'authorization': 'Bearer $_token',
      };

  Future<dynamic> get(String path) async {
    late http.Response res;
    try {
      res = await _http.get(Uri.parse('$baseUrl$path'), headers: _headers);
    } catch (e) {
      throw ApiException(ApiException.network.userMessage, technical: '$e');
    }
    return _decode(res);
  }

  Future<dynamic> post(String path, Map<String, dynamic> body) async {
    late http.Response res;
    try {
      res = await _http.post(Uri.parse('$baseUrl$path'),
          headers: _headers, body: jsonEncode(body));
    } catch (e) {
      throw ApiException(ApiException.network.userMessage, technical: '$e');
    }
    return _decode(res);
  }

  dynamic _decode(http.Response res) {
    final body = res.body.isEmpty
        ? <String, dynamic>{}
        : jsonDecode(res.body) as Map<String, dynamic>;
    switch (res.statusCode) {
      case 200:
      case 201:
        return body;
      case 400:
        throw ApiException((body['message'] as String?) ?? 'Invalid request.',
            statusCode: 400, technical: '${res.request?.url}');
      case 401:
        throw ApiException(ApiException.unauthorized.userMessage, statusCode: 401);
      case 403:
        throw ApiException(ApiException.forbidden.userMessage, statusCode: 403);
      case 404:
        throw ApiException(ApiException.notFound.userMessage, statusCode: 404);
      default:
        throw ApiException(ApiException.server.userMessage,
            statusCode: res.statusCode, technical: '${res.request?.url}');
    }
  }
}
