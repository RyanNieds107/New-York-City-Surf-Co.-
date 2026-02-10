# Retention Engine Layer

Alert system for notifying users of good surf conditions.

## Core Files

- `swellDetection.ts` - Detects upcoming swells matching user criteria
- `notificationFormatter.ts` - Formats email/SMS messages
- `delivery/email.ts` - Resend email API (100/day free)
- `delivery/sms.ts` - SMS delivery

## Jobs

- `checkSwellAlerts.ts` - Checks active alerts every 6 hours
- `sendReportPrompts.ts` - Prompts users to submit reports

## Alert Frequencies

- **threshold** - Only when score crosses threshold
- **once** - Daily digest (6-9 AM ET)
- **twice** - AM (6-9 AM) + PM (4-7 PM)
- **realtime** - As conditions match
- **immediate** - Send when conditions match

## Database Operations

See `server/db/` for alert operations:

- `getAllSwellAlertsForUser()`, `createSwellAlert()`
- `checkIfAlertAlreadySent()`, `logSwellAlertSent()`
