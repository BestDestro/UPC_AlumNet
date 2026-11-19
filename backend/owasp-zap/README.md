# OWASP ZAP Security Assessment

## Objective

This assessment evaluated the UPC AlumNet API with OWASP ZAP, with particular emphasis on SQL injection testing.

## Test environment

The assessment was performed against the local Docker Compose environment containing:

- Nginx gateway
- FastAPI backend
- PostgreSQL database

The API definition was imported from:

`http://localhost:8443/openapi.json`

## Assessment configuration

The OpenAPI definition was imported into OWASP ZAP to discover the available API routes. An authenticated scan used an Alumni account so that protected endpoints could be assessed. Authentication tokens and sensitive values have been removed from the published evidence.

The active-scan policy included generic and database-specific SQL injection rules.

## Results

The completed assessment recorded:

- 26 API endpoints identified
- 10,639 total requests
- 2,664 SQL-injection-related requests in the final presentation summary
- 100% scan completion
- 0 SQL injection alerts

No SQL injection vulnerability was identified within the endpoints, authenticated context, payloads, and scan configuration covered by this assessment. This result does not guarantee the absence of every possible SQL injection path.

## Additional observations

The exported evidence also contained low-risk observations unrelated to SQL injection. Recommended follow-up actions are:

1. Add the `X-Content-Type-Options: nosniff` response header through Nginx.
2. Manually validate the potential stored XSS observation.
3. Review server-side validation and context-aware frontend output encoding.
4. Complete any pending scan rules.
5. Repeat the authenticated OWASP ZAP assessment after corrections.

## Evidence structure

- `evidence/01-openapi-import.png`: OpenAPI import into OWASP ZAP.
- `evidence/02-scan-policy.png`: SQL injection rules enabled in the active-scan policy.
- `evidence/03-scan-results.png`: Scan completion and SQL injection results.
- `evidence/04-manual-response.png`: Manual inspection of an API response.
- `reports/zap-report-redacted.html`: HTML report with authentication data redacted.
- `reports/Progress_ZAP.txt`: Detailed active-scan progress.

## Security note

Do not commit OWASP ZAP session files (`*.session`, `*.session.*`), cookies, credentials, database secrets, encryption keys, or unredacted reports. Review every exported report before publication.

## Author

Jherson Cesar Condori Revollo
