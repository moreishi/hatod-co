/// Clear, non-technical errors for UI (mobile spec §28); technical detail stays in logs.
class ApiException implements Exception {
  final String userMessage;
  final int? statusCode;
  final String? technical;

  const ApiException(this.userMessage, {this.statusCode, this.technical});

  @override
  String toString() => 'ApiException($statusCode): $userMessage';

  static const network = ApiException('No connection. Please try again.');
  static const unauthorized = ApiException('Session expired. Please sign in again.');
  static const forbidden = ApiException('You do not have access.');
  static const notFound = ApiException('Not found.');
  static const server = ApiException('Something went wrong. Please try again.');
}
