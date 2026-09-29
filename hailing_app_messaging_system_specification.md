# Messaging System

## 1. Purpose

Implement an internal **Rider ↔ Assigned Driver messaging system** inside the existing Hailing App architecture.

The messaging system is strictly tied to a booking/transaction. It is **not a general-purpose social chat system**.

The system must reuse the existing:

* Authentication
* PostgreSQL database
* Backend API
* RabbitMQ event system
* WebSocket/realtime infrastructure
* Push notification infrastructure
* Background worker/scheduler
* Admin/support authorization

Do **not** introduce a separate messaging microservice or another realtime technology for V1.

---

## 2. Core Rules

1. A conversation belongs to exactly **one booking**.
2. A booking can have only **one conversation**.
3. A conversation is created only after a driver is successfully assigned/accepted.
4. Rejected, unmatched, or unassigned drivers must not receive a conversation.
5. Only the assigned rider and assigned driver may participate.
6. Sender identity must always come from the authenticated session/token.
7. Never trust `sender_id` or `recipient_id` supplied by the client.
8. Messages must be persisted in PostgreSQL.
9. RabbitMQ is used for events/background processing, not as message storage.
10. Existing WebSocket infrastructure must be used for realtime delivery.
11. Push notifications are used when the recipient is offline/backgrounded or is not currently viewing the conversation.
12. Conversation access ends when the booking is completed or cancelled.
13. Closed conversations are read-only for rider/driver.
14. Message history must use pagination.
15. Duplicate sends must be handled safely.
16. Message content must not be written to ordinary application logs.

---

# 3. Conversation Lifecycle

Recommended states:

```text
PENDING
ACTIVE
CLOSED
```

### PENDING

Optional transitional state while the booking is being assigned.

### ACTIVE

The driver has been successfully assigned/accepted.

The rider and assigned driver can exchange messages.

### CLOSED

The booking has completed or been cancelled.

No new rider/driver messages may be created.

Historical messages remain available according to the configured retention policy.

---

# 4. Conversation Creation

Create the conversation when:

```text
Booking
   ↓
Driver successfully assigned/accepted
   ↓
Create conversation
   ↓
Conversation becomes ACTIVE
```

Do not create conversations for:

```text
Booking created
Driver search
Driver rejected
Driver timeout
No driver found
Cancelled before assignment
```

Database constraint:

```text
booking_id UNIQUE
```

This guarantees one conversation per booking.

Conversation creation must be idempotent so repeated assignment events cannot create duplicate conversations.

---

# 5. Participants

Each conversation contains exactly:

```text
rider_id
driver_id
booking_id
```

Authorization must verify:

```text
authenticated_user.id == rider_id
OR
authenticated_user.id == driver_id
```

Additionally validate that:

```text
conversation.booking_id
    ==
authenticated user's active relationship to the booking
```

A rider must never be able to access another rider's conversation.

A driver must never be able to access another driver's conversation.

A driver who was previously rejected or replaced must not gain access to the conversation.

---

# 6. Message Types

V1 supports:

```text
TEXT
SYSTEM
```

Future-ready enum values may include:

```text
IMAGE
LOCATION
```

Do not implement IMAGE or LOCATION functionality in V1 unless explicitly required.

---

# 7. Message Status

Messages use:

```text
SENT
DELIVERED
READ
```

### SENT

Message has been successfully persisted.

### DELIVERED

Recipient's application has received/synchronized the message.

### READ

Recipient has opened/read the conversation and the message has been marked as read.

Recommended timestamp fields:

```text
sent_at
delivered_at
read_at
```

---

# 8. Database Schema

## conversations

```text
conversations
------------------------------
id
booking_id UNIQUE
rider_id
driver_id
status
last_message_id
last_message_at
created_at
updated_at
closed_at
```

Recommended indexes:

```text
UNIQUE(booking_id)

INDEX(rider_id)

INDEX(driver_id)

INDEX(status)

INDEX(last_message_at)
```

Foreign keys should reference the appropriate booking, rider/user, and driver/user records according to the existing database design.

---

## messages

```text
messages
------------------------------
id
conversation_id
sender_id
recipient_id
message_type
content
status
client_message_id
sent_at
delivered_at
read_at
created_at
updated_at
```

Recommended indexes:

```text
INDEX(conversation_id, created_at)

INDEX(sender_id)

INDEX(recipient_id)

INDEX(status)
```

If `client_message_id` is used for idempotency, add an appropriate uniqueness constraint scoped to the authenticated sender/conversation.

---

# 9. Message Persistence

The database is the source of truth.

Message flow:

```text
Client
  ↓
Authenticate
  ↓
Validate conversation access
  ↓
Validate booking relationship
  ↓
Validate message
  ↓
Persist message in PostgreSQL
  ↓
Publish domain/event message
  ↓
Deliver through WebSocket
  ↓
Update delivery status
  ↓
Push notification if required
```

A RabbitMQ or push notification failure must **not delete or invalidate an already persisted message**.

---

# 10. WebSocket Integration

Reuse the application's existing WebSocket infrastructure.

Do not create a separate messaging socket server.

Example logical events:

```text
message.send
message.created
message.delivered
message.read
conversation.updated
```

The WebSocket layer must still enforce authentication and authorization.

A client must not be able to subscribe to arbitrary conversation IDs without authorization.

---

# 11. HTTP API

Recommended endpoints:

```http
GET /conversations/{conversationId}
```

Returns conversation metadata and participant information.

```http
GET /conversations/{conversationId}/messages
```

Returns paginated message history.

```http
POST /conversations/{conversationId}/read
```

Marks appropriate messages as read.

Optional:

```http
POST /conversations/{conversationId}/messages
```

This may be provided as an HTTP fallback.

The HTTP and WebSocket paths must use the same messaging domain/service logic so business rules do not become duplicated.

---

# 12. Pagination

Never load the entire conversation history.

Use cursor-based pagination where possible.

Example:

```http
GET /conversations/{id}/messages?before={messageId}&limit={MESSAGE_PAGE_SIZE}
```

Centralize:

```text
MESSAGE_PAGE_SIZE
```

The Flutter application should initially load the newest messages and fetch older messages as the user scrolls upward.

---

# 13. Unread Messages

Unread messages are determined by:

```text
recipient_id == authenticated_user.id
AND
read_at IS NULL
```

The backend should expose:

```text
unread_count
```

When the user opens the conversation, the client calls the read endpoint or sends the appropriate realtime event.

The backend updates:

```text
read_at
status = READ
```

Only the authenticated recipient can mark their received messages as read.

---

# 14. Offline Messaging

If the recipient is offline:

```text
Sender
  ↓
Persist message
  ↓
Publish event
  ↓
Recipient offline
  ↓
Send push notification if appropriate
```

When the recipient reconnects:

```text
WebSocket reconnect
  ↓
Authenticate
  ↓
Synchronize missing messages
  ↓
Mark received messages DELIVERED
```

The server/database remains the source of truth.

Do not depend on WebSocket delivery for message persistence.

---

# 15. Push Notifications

Send a push notification when:

* recipient is offline
* application is backgrounded
* recipient is not currently viewing the conversation

Avoid duplicate notifications when the recipient is actively viewing the conversation.

Push notification should contain minimal information according to the application's privacy requirements.

Example:

```text
New message from your driver
```

or:

```text
New message from your rider
```

Do not expose unnecessary booking or personal information in push payloads.

---

# 16. RabbitMQ Events

Use the existing RabbitMQ infrastructure.

Recommended events:

```text
conversation.created
conversation.closed

message.created
message.delivered
message.read

message.notification.requested
```

Example:

```text
message.created
{
    message_id,
    conversation_id,
    booking_id,
    sender_id,
    recipient_id,
    created_at
}
```

Do not place full message content into RabbitMQ events unless there is a specific architectural requirement.

Prefer IDs and metadata.

---

# 17. System Messages

System messages are generated by the backend/domain logic.

Flutter must not be allowed to create arbitrary system messages.

Examples:

```text
Driver accepted the booking.
Driver arrived.
Ride started.
Ride completed.
Ride cancelled.
```

These should be generated from actual booking state transitions.

Example:

```text
Driver accepts booking
        ↓
Booking state changes
        ↓
Backend creates SYSTEM message
        ↓
Persist
        ↓
Realtime event
        ↓
Recipient receives update
```

---

# 18. Message Validation

Every message must be validated server-side.

Centralize configuration constants such as:

```text
MAX_MESSAGE_LENGTH
MIN_MESSAGE_LENGTH
MESSAGE_PAGE_SIZE
MAX_MESSAGES_PER_MINUTE
MESSAGE_RETENTION_DAYS
CLOSED_CONVERSATION_RETENTION_DAYS
```

Validate:

* authentication
* conversation existence
* conversation status
* participant authorization
* booking relationship
* message type
* message length
* empty/whitespace-only messages
* rate limits
* duplicate requests
* malformed input

---

# 19. Rate Limiting

Protect the messaging system against spam and accidental message loops.

Use centralized constants:

```text
MAX_MESSAGES_PER_MINUTE
MAX_MESSAGES_PER_CONVERSATION_PER_MINUTE
MAX_MESSAGE_LENGTH
```

Rate limiting must be enforced server-side.

Do not rely on Flutter to enforce rate limits.

---

# 20. Duplicate Message Protection

Mobile networks can retry requests.

The system must support idempotency.

Recommended client-generated identifier:

```text
client_message_id
```

Flow:

```text
Client generates client_message_id
        ↓
Send message
        ↓
Connection fails
        ↓
Client retries
        ↓
Server recognizes existing message
        ↓
Do not create duplicate
```

The exact idempotency implementation should follow the existing backend architecture if one already exists.

---

# 21. Conversation Closing

When the booking reaches a terminal state:

```text
COMPLETED
CANCELLED
```

the backend closes the conversation.

Example:

```text
Booking completed
      ↓
Conversation CLOSED
      ↓
Create SYSTEM message if required
      ↓
Notify participants
```

After closure:

```text
POST message
     ↓
REJECT
```

Historical messages remain readable according to retention rules.

---

# 22. Admin / Support Access

Admin/support users may inspect a conversation when authorized.

Default behavior:

```text
READ ONLY
```

Support access must be role-restricted and audited.

V1 should not allow administrators to impersonate riders/drivers or arbitrarily send messages as another user.

Audit events should record:

```text
admin_id
conversation_id
booking_id
action
timestamp
```

Do not expose message content in ordinary audit logs unless specifically required by the audit design.

---

# 23. Backend Module Structure

Messaging should be a module within the existing backend:

```text
backend/
├── auth/
├── users/
├── riders/
├── drivers/
├── vehicles/
├── bookings/
├── payments/
├── notifications/
├── messaging/
├── ratings/
└── admin/
```

Messaging:

```text
messaging/
├── controllers/
├── services/
├── repositories/
├── models/
├── websocket/
├── events/
├── validators/
└── dto/
```

Responsibilities:

### Controllers

HTTP API endpoints.

### Services

Business rules and messaging workflows.

### Repositories

Database persistence.

### Models

Conversation and message entities.

### WebSocket

Realtime message handling.

### Events

RabbitMQ/domain events.

### Validators

Message and authorization validation.

### DTO

Request/response models.

---

# 24. Flutter Structure

Reuse the existing Flutter architecture and state-management conventions.

Recommended feature structure:

```text
lib/
├── core/
│   ├── constants/
│   ├── enums/
│   ├── network/
│   └── realtime/
│
└── features/
    └── messaging/
        ├── data/
        │   ├── models/
        │   ├── datasources/
        │   └── repositories/
        │
        ├── domain/
        │   ├── entities/
        │   ├── repositories/
        │   └── usecases/
        │
        └── presentation/
            ├── screens/
            ├── widgets/
            └── controllers/
```

Both Rider and Driver applications should use the same messaging concepts while respecting their respective permissions and UI flows.

---

# 25. Rider Messaging UI

The rider should be able to access messaging from the active booking/ride screen.

Example:

```text
Active Ride
-------------------------
Driver information
Vehicle information
ETA
Map
-------------------------
[ Message Driver ]
-------------------------
```

Conversation screen should support:

* message list
* text input
* send button
* sending state
* delivered state
* read state
* unread state
* retry failed message
* pagination
* reconnect handling
* closed conversation state

---

# 26. Driver Messaging UI

The driver should be able to access messaging from the assigned/active booking screen.

Example:

```text
Current Passenger
-------------------------
Booking information
Pickup
Destination
-------------------------
[ Message Rider ]
-------------------------
```

The driver must only access the rider associated with the current booking.

---

# 27. Realtime State Handling

Flutter must handle:

```text
CONNECTED
CONNECTING
DISCONNECTED
RECONNECTING
```

When disconnected:

```text
Message may be queued/retried according to the existing realtime architecture.
```

After reconnect:

```text
Authenticate
↓
Restore subscriptions
↓
Synchronize missed messages
↓
Update delivery state
```

Do not assume that every WebSocket event was received.

---

# 28. Error Handling

Handle at minimum:

```text
Authentication expired
Conversation not found
Unauthorized participant
Booking mismatch
Conversation closed
Message too long
Empty message
Rate limit exceeded
Duplicate message
Database failure
RabbitMQ unavailable
WebSocket disconnected
Push notification failure
Network timeout
```

User-facing errors should be clear and non-technical.

Example:

```text
Unable to send message. Please try again.
```

Internal logs should contain the appropriate technical context without storing message content.

---

# 29. Observability

Recommended metrics:

```text
messages_sent_total
messages_delivered_total
messages_read_total

message_send_failures_total
message_delivery_failures_total

message_delivery_latency
message_read_latency

websocket_message_connections
websocket_message_disconnects

message_rate_limit_hits
```

Track IDs and metadata where appropriate.

Do not log complete message contents in normal application logs, metrics, or tracing data.

---

# 30. Retention

Message retention must be configurable.

Use centralized constants/configuration:

```text
MESSAGE_RETENTION_DAYS
CLOSED_CONVERSATION_RETENTION_DAYS
```

Use the existing scheduled/background worker system for cleanup.

Do not create a separate scheduler only for messaging.

Retention behavior must comply with the application's privacy/data-retention requirements.

---

# 31. Seed Data

The existing seed system must include messaging data alongside the existing:

```text
40–50 users
200–500 transactions/bookings
```

Messaging seeds should include:

* active conversations
* completed conversations
* closed conversations
* unread messages
* read messages
* empty conversations
* system messages
* rider messages
* driver messages
* realistic conversation sequences

Example:

```text
Rider:
Where are you?

Driver:
I'm near the main entrance.

Rider:
Okay, I'm coming now.

System:
Ride started.

System:
Ride completed.
```

Seed data should respect the actual booking/driver/rider relationships.

Use deterministic seed data where supported.

---

# 32. Testing

## Backend Unit Tests

Test:

```text
Conversation creation
Duplicate conversation prevention
Participant authorization
Unauthorized sender
Non-participant access
Closed conversation protection
Empty message rejection
Oversized message rejection
Rate limiting
Unread count
Message read state
Message delivered state
Pagination
Idempotency
System message creation
```

## Integration Tests

Test:

```text
Rider → backend → database → driver

Driver → backend → database → rider

Offline recipient
Reconnect synchronization
Push notification event
RabbitMQ message event
Conversation creation after assignment
Conversation closure after completion
Conversation closure after cancellation
```

## Flutter Tests

Test:

```text
Conversation loading
Message rendering
Empty state
Send message
Send failure
Retry
Unread count
Read state
Pagination
WebSocket disconnect
WebSocket reconnect
Closed conversation
```

## Security Tests

Test:

```text
Unauthorized conversation access
Cross-booking access
Cross-user access
Forged sender_id
Forged recipient_id
Closed conversation messaging
Rate-limit bypass
Duplicate-send attacks
Malformed payloads
```

---

# 33. Failure Guarantees

The messaging system must follow this principle:

> **Persist first, distribute second.**

If:

```text
PostgreSQL succeeds
RabbitMQ fails
```

the message must still exist.

If:

```text
PostgreSQL succeeds
WebSocket fails
```

the message must still exist and be synchronized later.

If:

```text
PostgreSQL succeeds
Push notification fails
```

the message must still exist.

If:

```text
Client disconnects after sending
```

the server must prevent duplicate creation when the client retries using the same idempotency identifier.

---

# 34. Security Requirements

The implementation must enforce:

* authenticated access
* server-side sender identity
* conversation participant authorization
* booking ownership validation
* assigned-driver validation
* closed-conversation protection
* message length validation
* input sanitization/validation
* rate limiting
* duplicate-send protection
* secure WebSocket authentication
* secure API authentication
* minimal push notification data
* restricted admin/support access
* audited support access
* no sensitive message content in normal logs

Never trust:

```text
sender_id
recipient_id
rider_id
driver_id
booking_id
```

from the client without server-side validation against the authenticated user and booking state.

---

# 35. Centralized Constants

Messaging-related values must not be scattered as magic numbers or strings.

Use centralized constants/configuration for:

```text
MESSAGE_PAGE_SIZE
MAX_MESSAGE_LENGTH
MIN_MESSAGE_LENGTH
MAX_MESSAGES_PER_MINUTE
MAX_MESSAGES_PER_CONVERSATION_PER_MINUTE
MESSAGE_RETENTION_DAYS
CLOSED_CONVERSATION_RETENTION_DAYS

CONVERSATION_PENDING
CONVERSATION_ACTIVE
CONVERSATION_CLOSED

MESSAGE_TYPE_TEXT
MESSAGE_TYPE_SYSTEM

MESSAGE_STATUS_SENT
MESSAGE_STATUS_DELIVERED
MESSAGE_STATUS_READ
```

Follow the project's existing constants/enums/configuration conventions.

---

# 36. Definition of Done

Messaging is complete only when:

* [ ] Conversation is tied to exactly one booking.
* [ ] One conversation per booking is enforced.
* [ ] Conversation is created after successful driver assignment.
* [ ] Rider and assigned driver can exchange messages.
* [ ] Unauthorized users cannot access conversations.
* [ ] Sender identity is derived server-side.
* [ ] Messages are persisted in PostgreSQL.
* [ ] Existing WebSocket infrastructure provides realtime delivery.
* [ ] Existing RabbitMQ infrastructure handles messaging events.
* [ ] Offline messages synchronize after reconnect.
* [ ] Push notifications work when appropriate.
* [ ] SENT/DELIVERED/READ states work.
* [ ] Unread counts work.
* [ ] Pagination works.
* [ ] Duplicate sends are prevented.
* [ ] Rate limiting is implemented.
* [ ] System messages come from backend booking events.
* [ ] Conversations close after completion/cancellation.
* [ ] Closed conversations reject new rider/driver messages.
* [ ] Admin/support access is restricted and audited.
* [ ] Message content is excluded from ordinary logs.
* [ ] Retention is configurable.
* [ ] Seed data includes messaging scenarios.
* [ ] Backend unit tests pass.
* [ ] Backend integration tests pass.
* [ ] Flutter messaging tests pass.
* [ ] Security tests pass.
* [ ] Existing booking, RabbitMQ, WebSocket, notification, and authentication architecture remains intact.
