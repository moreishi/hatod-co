# HATOD Simulator Plan

## 1. Purpose

The HATOD Simulator is a separate development, QA, and load-testing system designed to exercise the real HATOD backend.

The simulator must not simply mock the rider and driver interfaces. It should behave as a collection of virtual riders and drivers that communicate through the same APIs, WebSockets, RabbitMQ messaging, and backend services used by the real HATOD applications.

The simulator must support:

* Development testing
* End-to-end ride testing
* Messaging/chat testing
* Failure and recovery testing
* Reproducible QA scenarios
* Load testing
* Stress testing
* Production-like backend testing

---

## 2. Core Principle

The simulator must use the real HATOD backend communication paths whenever possible.

### Correct

```text
Virtual Rider
    |
    v
HATOD API / WebSocket
    |
    v
HATOD Backend
    |
    +---- PostgreSQL
    |
    +---- RabbitMQ
    |
    +---- Messaging Service
    |
    v
Virtual Driver
```

### Avoid

```text
Simulator
    |
    +---- Direct database manipulation
    |
    +---- Fake chat responses
    |
    +---- Fake ride state changes
```

Direct database manipulation may only be used for controlled setup, cleanup, or test-data preparation.

---

# 3. Simulator Architecture

```text
HATOD
|
+-- backend/
|
+-- rider_app/
|
+-- driver_app/
|
+-- shared/
|
+-- simulator/
    |
    +-- agents/
    |   +-- rider/
    |   +-- driver/
    |
    +-- scenarios/
    |
    +-- ride_engine/
    |
    +-- messaging/
    |
    +-- movement/
    |
    +-- load_testing/
    |
    +-- failure_injection/
    |
    +-- recorder/
    |
    +-- dashboard/
    |
    +-- fixtures/
    |
    +-- configuration/
    |
    +-- tests/
```

The simulator must remain logically isolated from production application code.

---

# 4. Simulation Actors

## 4.1 Rider Agent

A Rider Agent represents a virtual HATOD rider.

Responsibilities:

* Login/authentication
* Maintain rider profile
* Select pickup location
* Select destination
* Request ride
* Receive driver assignment
* Receive ride status updates
* Send chat messages
* Receive chat messages
* Cancel ride
* Complete rating flow
* Disconnect/reconnect
* Simulate network conditions

---

## 4.2 Driver Agent

A Driver Agent represents a virtual HATOD driver.

Responsibilities:

* Login/authentication
* Maintain driver profile
* Set online/offline status
* Receive ride requests
* Accept/reject rides
* Send location updates
* Navigate to pickup
* Mark driver arrived
* Start trip
* Complete trip
* Send chat messages
* Receive chat messages
* Go offline/online
* Disconnect/reconnect
* Simulate network conditions

---

# 5. Ride Lifecycle Simulation

The simulator must support the complete HATOD ride lifecycle.

```text
RIDE_REQUESTED
       |
       v
SEARCHING_DRIVER
       |
       v
DRIVER_ASSIGNED
       |
       v
DRIVER_ACCEPTED
       |
       v
DRIVER_EN_ROUTE
       |
       v
DRIVER_ARRIVED
       |
       v
TRIP_STARTED
       |
       v
TRIP_COMPLETED
       |
       v
RATED
```

Alternative paths must include:

```text
RIDE_REQUESTED
    |
    +--> CANCELLED
    |
    +--> NO_DRIVER_FOUND

DRIVER_ASSIGNED
    |
    +--> DRIVER_REJECTED
    |
    +--> DRIVER_TIMEOUT

DRIVER_ACCEPTED
    |
    +--> RIDER_CANCELLED
    |
    +--> DRIVER_CANCELLED

DRIVER_EN_ROUTE
    |
    +--> DRIVER_DISCONNECTED
    |
    +--> RIDER_CANCELLED
```

---

# 6. Messaging and Chat Simulation

Messaging is a first-class part of the simulator.

The simulator must exercise the actual HATOD messaging infrastructure.

## 6.1 Conversation Relationship

Every ride conversation must be associated with:

```text
conversation_id
ride_id
rider_id
driver_id
created_at
updated_at
status
```

Every message must contain appropriate identifiers such as:

```text
message_id
conversation_id
ride_id
sender_id
receiver_id
message_type
content
created_at
delivered_at
read_at
status
```

Use the actual HATOD messaging schema where already defined. The simulator must not introduce a conflicting message model.

---

# 7. Chat Lifecycle

A typical conversation:

```text
Ride Requested
      |
      v
Driver Accepted
      |
      v
Conversation Available
      |
      +--> Rider sends message
      |
      +--> Driver responds
      |
      v
Driver En Route
      |
      +--> Two-way messaging
      |
      v
Driver Arrived
      |
      +--> Pickup coordination
      |
      v
Trip Started
      |
      +--> Messaging remains available
      |
      v
Trip Completed
      |
      v
Conversation Archived
```

---

# 8. Chat Scenarios

The simulator must support at least the following messaging scenarios:

### Normal conversation

```text
Rider -> Driver
"Hi, where are you?"

Driver -> Rider
"I'm on my way."
```

### Rapid messaging

Generate multiple messages from either participant in a short period.

Purpose:

* Test message throughput
* Test ordering
* Test WebSocket handling
* Test RabbitMQ behavior

### Delayed delivery

Introduce configurable artificial latency.

Example:

```text
Message generated
       |
       v
500 ms delay
       |
       v
Message delivered
```

### Offline recipient

```text
Rider sends message
       |
       v
Driver disconnected
       |
       v
Message pending
       |
       v
Driver reconnects
       |
       v
Message delivered
```

### Duplicate delivery

Simulate duplicate delivery events to verify idempotency.

### Out-of-order delivery

Simulate messages arriving in a different order from their creation time.

The system must preserve the appropriate ordering semantics defined by the HATOD messaging architecture.

### Reconnection

```text
Connected
   |
   v
Disconnected
   |
   v
Reconnect
   |
   v
Synchronize missed messages
```

### Conversation after cancellation

Test the configured HATOD behavior when a ride is cancelled.

### Conversation after completion

Verify that the conversation is correctly transitioned to its post-trip state.

---

# 9. Automated Chat Behavior

Virtual agents may have configurable message behavior.

Example:

```text
Rider Behavior:
- Send pickup confirmation
- Ask driver location
- Respond to driver
- Send cancellation message

Driver Behavior:
- Confirm acceptance
- Notify rider of arrival
- Respond to rider
- Send pickup instructions
```

Message behavior should be configurable rather than hard-coded.

---

# 10. Movement Simulation

Driver movement should initially support deterministic predefined routes.

Example:

```text
Driver
  |
  +-- Start Position
  |
  +-- Route Point 1
  |
  +-- Route Point 2
  |
  +-- Pickup
  |
  +-- Destination
```

Later versions may support randomized movement.

Movement must generate realistic driver location updates through the same backend path used by the actual driver application.

---

# 11. Simulation Clock

The simulator should support configurable simulation speed.

```text
1x
1 simulation minute = 1 real minute

2x
1 simulation minute = 30 real seconds

10x
1 simulation minute = 6 real seconds

100x
1 simulation minute = 0.6 real seconds
```

The simulation clock must be centralized so that ride, movement, messaging, and scheduled events use a consistent time source.

---

# 12. Simulation Modes

## Development

```text
5 riders
5 drivers
```

Purpose:

* Feature development
* Debugging
* Manual testing

## Small

```text
50 riders
50 drivers
```

Purpose:

* Integration testing
* Basic concurrency

## Medium

```text
500 riders
500 drivers
```

Purpose:

* Backend performance testing
* WebSocket testing
* RabbitMQ testing

## Target

```text
2,000 drivers
Configurable rider population
```

Purpose:

* HATOD target-scale testing

## Stress

```text
5,000+ virtual drivers/riders
```

Purpose:

* Determine system limits
* Identify bottlenecks
* Validate failure behavior

---

# 13. Scenario Engine

The simulator must provide reusable scenarios.

Initial scenarios:

```text
normal_ride
cancel_before_accept
cancel_after_accept
driver_reject
driver_timeout
driver_no_show
rider_no_show
driver_disconnect
rider_disconnect
websocket_reconnect
message_delay
message_retry
message_duplicate
message_out_of_order
chat_during_trip
chat_after_completion
```

Each scenario should define:

```text
scenario_name
seed
participants
initial_conditions
actions
timing
expected_events
expected_final_state
```

---

# 14. Deterministic Simulation

Every simulation should optionally accept a seed.

Example:

```text
Scenario:
driver_disconnect

Seed:
84921
```

Running the same scenario with the same seed should reproduce the same sequence whenever deterministic behavior is requested.

This is important for debugging.

---

# 15. Scenario Recorder

The simulator should record important simulation events.

Example:

```text
Simulation #18291
Seed: 928173

09:31:01 Ride requested
09:31:03 Driver accepted
09:31:07 Message sent
09:31:08 WebSocket disconnected
09:31:12 Message retry
09:31:13 Driver reconnected
09:31:14 Message delivered
09:31:20 Trip started
```

Recorded simulations should be replayable.

---

# 16. Replay System

The simulator should support:

```text
Record
  |
  v
Save Scenario
  |
  v
Replay
  |
  v
Compare Result
```

Replay should help reproduce:

* Ride failures
* Messaging failures
* WebSocket failures
* Race conditions
* Unexpected state transitions
* Performance problems

---

# 17. Failure Injection

The simulator should provide controlled failure injection.

Examples:

```text
Disconnect Rider
Disconnect Driver

Delay API
Delay WebSocket
Delay Messages

Drop Message
Duplicate Message
Reorder Message

Reject Ride
Cancel Ride

Force Reconnect
```

Failure injection must be configurable and disabled by default.

---

# 18. Load Testing

The simulator should generate realistic traffic instead of simply creating large numbers of database records.

Traffic should include:

* Rider authentication
* Driver authentication
* Driver availability
* Ride requests
* Ride matching
* Ride acceptance
* Location updates
* Ride status updates
* Chat messages
* WebSocket connections
* Reconnection
* Ride completion
* Ratings

---

# 19. Metrics

The simulator should collect at least:

## API

```text
Request count
Success count
Failure count
Average latency
P50 latency
P95 latency
P99 latency
```

## WebSocket

```text
Active connections
Connection failures
Reconnect count
Connection duration
Event latency
```

## Messaging

```text
Messages sent
Messages delivered
Messages failed
Messages pending
Message latency
Duplicate messages
Out-of-order messages
```

## RabbitMQ

```text
Queue depth
Publish rate
Consume rate
Consumer failures
Message processing latency
```

## Ride Matching

```text
Ride requests
Matched rides
Unmatched rides
Matching latency
Driver acceptance rate
```

## Infrastructure

```text
CPU
Memory
Database connections
Database latency
Application errors
```

---

# 20. Dashboard

The simulator should eventually provide a dashboard similar to:

```text
+------------------------------------------------------+
| HATOD SIMULATOR                                      |
+------------------------------------------------------+
|                                                      |
| Drivers       2,000       Riders       5,000         |
| Active Rides    426       Messages/sec     31        |
| WebSockets    6,800       Events/sec      184        |
|                                                      |
+------------------------------------------------------+
| RIDES                     | SELECTED RIDE            |
|                           |                          |
| HA-10021                  | Rider: Rider 102         |
| HA-10022                  | Driver: Driver 845       |
| HA-10023                  | Status: EN ROUTE         |
|                           |                          |
|                           | Chat                     |
|                           | Rider: Where are you?    |
|                           | Driver: 2 mins away.     |
|                           |                          |
+------------------------------------------------------+
```

The dashboard should allow filtering by:

* Ride
* Rider
* Driver
* Scenario
* Conversation
* Event
* Error

---

# 21. Simulation Configuration

Simulation configuration should use constants/configuration rather than scattered magic values.

Example configuration categories:

```text
SIMULATION
DRIVER_COUNT
RIDER_COUNT
SIMULATION_SPEED
MESSAGE_RATE
LOCATION_UPDATE_INTERVAL
RIDE_REQUEST_RATE
SCENARIO_SEED
MESSAGE_DELAY
FAILURE_RATE
```

Environment-specific values should be supplied through configuration/environment variables where appropriate.

---

# 22. Test Data

The simulator must keep generated simulation data separate from normal development seed data.

Existing HATOD development seed data remains available for normal application testing.

The simulator may generate:

```text
Virtual Riders
Virtual Drivers
Virtual Vehicles
Virtual Rides
Virtual Conversations
Virtual Messages
```

Simulation data should be identifiable using an appropriate test/simulation namespace or environment.

---

# 23. Development Environment

The simulator should be capable of running locally on the Windows development machine.

Recommended local architecture:

```text
Windows
|
+-- HATOD Flutter Development
|
+-- HATOD Simulator
|
+-- Docker
    |
    +-- HATOD Backend
    +-- PostgreSQL
    +-- RabbitMQ
    +-- Redis (if required by HATOD architecture)
```

The simulator must also support connecting to a staging/VPS environment for larger tests.

---

# 24. Real Application Integration

The simulator must support mixed testing.

Example:

```text
1 Real Rider App
       +
1 Real Driver App
       +
1,000 Virtual Drivers
       +
5,000 Virtual Riders
       |
       v
HATOD Backend
```

This allows testing the actual Flutter applications against realistic backend traffic.

---

# 25. Security

The simulator must never use real production user credentials by default.

Production testing must require explicit configuration.

Simulator credentials must be clearly identified as test credentials.

The simulator must not expose secrets in logs.

---

# 26. Implementation Phases

## Phase 1 — Core Simulator

Implement:

* Simulator project
* Rider Agent
* Driver Agent
* Authentication
* Ride request
* Matching
* Accept/reject
* Ride lifecycle
* Basic location simulation
* Basic event logging

---

## Phase 2 — Messaging

Implement:

* Conversation creation
* Rider-to-driver messaging
* Driver-to-rider messaging
* WebSocket messaging
* RabbitMQ integration
* Message delivery state
* Read state
* Message history
* Reconnection
* Pending message handling

---

## Phase 3 — Scenario Engine

Implement:

* Scenario definitions
* Scenario execution
* Deterministic seeds
* Timed actions
* Expected outcomes
* Failure injection

---

## Phase 4 — Recorder and Replay

Implement:

* Event recording
* Simulation snapshots
* Scenario persistence
* Replay
* Result comparison

---

## Phase 5 — Dashboard

Implement:

* Active simulation overview
* Ride list
* Driver list
* Rider list
* Conversation viewer
* Event viewer
* Error viewer
* Metrics

---

## Phase 6 — Load Testing

Implement:

* 50-user tests
* 500-user tests
* 2,000-driver tests
* Configurable rider populations
* Concurrent WebSockets
* High-frequency location updates
* High-frequency messaging
* Resource monitoring

---

# 27. Definition of Done

The simulator is considered functional when it can:

* Create virtual riders and drivers
* Authenticate against the HATOD backend
* Simulate driver availability
* Request rides
* Match riders and drivers
* Accept rides
* Simulate driver movement
* Start and complete trips
* Cancel rides
* Create ride conversations
* Send rider-to-driver messages
* Send driver-to-rider messages
* Receive messages through the real messaging infrastructure
* Handle WebSocket reconnection
* Handle pending messages
* Simulate message delays
* Record simulation events
* Replay deterministic scenarios
* Inject controlled failures
* Run multiple virtual users concurrently
* Report API, WebSocket, RabbitMQ, messaging, and ride metrics
* Scale toward the target HATOD driver population

---

# 28. Design Goal

The HATOD Simulator should evolve from a simple development tool into a reusable platform for validating the entire HATOD system.

The long-term flow is:

```text
Development
    |
    v
Functional Testing
    |
    v
Integration Testing
    |
    v
Failure Testing
    |
    v
Load Testing
    |
    v
Stress Testing
    |
    v
Production Readiness Testing
```

The simulator must prioritize realistic behavior, reproducibility, observability, and reuse of the actual HATOD backend infrastructure.
