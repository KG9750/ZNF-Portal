## Zone
GET /zones
POST /zones

## Device
GET /devices
POST /devices

## Booking
POST /zone-booking
POST /device-booking
POST /visit-booking

Booking create requests must send `startTime` and `endTime` as ISO 8601 date-time strings with an explicit timezone offset.

The backend accepts `Z` or an extended numeric offset in `+HH:MM` / `-HH:MM` form only. Timezone-less strings are rejected so booking times remain deterministic across server environments.

Frontend `datetime-local` form values are interpreted as venue local time (`UTC+08:00`) and sent to the backend as UTC ISO strings.

Accepted examples:

- `2026-01-01T10:00:00.000Z`
- `2026-01-01T18:00:00+08:00`
- `2026-01-01T13:30:00+05:30`
- `2026-01-01T05:00:00-05:00`

Rejected example:

- `2026-01-01T10:00`
