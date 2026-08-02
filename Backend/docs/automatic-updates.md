# Automatic Updates Proof of Concept

## Approved Approach

REST polling was selected for Sprint 1 because AquaBlend already uses a REST API and only requires a proof of concept rather than a complete real-time synchronisation system.

## Endpoint

```http
GET /api/changes?since={timestamp}
```

### Example Request

```http
GET /api/changes?since=2026-08-01T03:00:00Z
```

The `since` value must be supplied as a valid ISO 8601 UTC timestamp.

## Response

The endpoint returns:

- The timestamp supplied by the client.
- The current server UTC timestamp.
- Water Sources created or updated after the supplied timestamp.
- Scenarios created or updated after the supplied timestamp.

### Example Response

```json
{
  "requestedSince": "2026-08-01T03:00:00Z",
  "serverTimestamp": "2026-08-01T03:00:30Z",
  "waterSources": [],
  "scenarios": []
}
```

## Future Frontend Polling

The frontend can retrieve updates using the following workflow:

1. Store the `serverTimestamp` returned by the previous successful request.
2. Wait for the polling interval (for example, every 30 seconds).
3. Call:

```http
GET /api/changes?since={lastServerTimestamp}
```

4. Update the displayed Water Sources and Scenarios using the returned data.
5. Save the new `serverTimestamp`.
6. Repeat the process.

### Example JavaScript

```javascript
let lastSuccessfulTimestamp = "2026-08-01T03:00:00Z";

async function pollForChanges() {

    const response = await fetch(
        `/api/changes?since=${encodeURIComponent(lastSuccessfulTimestamp)}`
    );

    if (!response.ok) {
        console.error("Polling failed");
        return;
    }

    const changes = await response.json();

    updateWaterSources(changes.waterSources);
    updateScenarios(changes.scenarios);

    lastSuccessfulTimestamp = changes.serverTimestamp;
}

setInterval(pollForChanges, 30000);
```

## Notes

- REST polling was selected instead of SignalR for the Sprint 1 proof of concept.
- All timestamps should use UTC.
- The polling interval can be adjusted later depending on application requirements.
- The endpoint returns only records created or updated after the supplied timestamp.