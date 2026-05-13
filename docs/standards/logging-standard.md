# Logging Standard

All logs structured JSON.

Required fields:
- timestamp
- level
- service_name
- trace_id
- request_id
- user_id
- message

Never log:
- password
- access token
- refresh token