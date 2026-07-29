# Design

## Boundaries

- `packages/strategy-service/internal/modelchain` owns abnormal-finish recovery and model fallback selection.
- `packages/strategy-front/.../session-message-list.tsx` owns workbench retry presentation.

## Modelchain State

Extend per-session tracking with:

- handled assistant message IDs for event deduplication;
- the model currently being recovered and its `finish=other` recovery count;
- the existing `swap` flag as the single in-flight continuation/fallback guard.

On the first active `finish=other`, atomically mark the message handled, keep the current model in `used`, set `swap`, and post the existing continuation prompt with the same model. On a later distinct `finish=other` from that same model, route through `fail` so `next()` selects an unused model. A normal assistant `stop` clears the abnormal-finish recovery counter without starting fallback.

The continuation is a new synthetic user message rather than replaying the original request. This preserves already emitted text and completed tool side effects.

## Provider Retry

Treat `attempt >= 3` as fallback-eligible in the strategy-service event consumer. The existing atomic `swap` transition prevents duplicate model changes while `used` prevents selection of an already failed model. If no unused model remains, abort the current session and clear tracking so the retry loop cannot continue indefinitely. OpenCode source remains unchanged.

## Frontend

Remove the sticky retry cache from `SessionMessageList`. The Redux `ChatStatus` is authoritative: render the warning only for `status.type === "retry"`; render the normal busy indicator for `busy`; render no status for `idle`.

## Compatibility And Rollback

No HTTP, SSE, SDK, database, or persisted schema changes are required. Rollback is file-local: restore the modelchain event behavior and component cache independently.

## Tests

- Go unit tests exercise same-model continuation, duplicate message dedupe, second-other fallback, stop reset, and retry threshold idempotency.
- Frontend behavior is extracted into a small pure status helper if needed so `retry -> busy/idle` is directly testable without component mocks.
