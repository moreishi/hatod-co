/// Centralized configuration (mobile spec §5, §82 backend-controlled rules).
class AppConfig {
  final String apiUrl;
  final Duration otpTimeout;

  const AppConfig({
    this.apiUrl = 'http://10.0.2.2:3001',
    this.otpTimeout = const Duration(seconds: 20),
  });

  static AppConfig fromEnvironment() {
    const apiUrl = String.fromEnvironment('API_URL', defaultValue: 'http://10.0.2.2:3001');
    return AppConfig(apiUrl: apiUrl);
  }
}
