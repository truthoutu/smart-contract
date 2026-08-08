# Webhook Integration for User Activity Logging

## Steps
1. [x] Read and understand `public/app.js` and `app.js`
2. [x] Add `ANALYTICS_WEBHOOK_URL` constant at the top of `public/app.js`
3. [x] Create async `sendActivityToWebhook(entry)` helper using `fetch`, fully wrapped in try/catch
4. [x] Wrap the webhook call inside `logUserActivity` in its own try/catch (fire-and-forget)
5. [x] Verify the file has no syntax errors
