# HATOD Mobile Screens, Flows & UI Specification

**Project:** HATOD
**Platform:** Flutter Mobile
**Primary Roles:** Rider, Driver
**Document Type:** Mobile UI/UX and Flow Specification
**Status:** Development Blueprint
**Target Market:** Philippines
**Initial Service:** Motorcycle Hailing

---

# 1. Purpose

This document defines the complete screen, navigation, user-flow, UI-element, state, and interaction specification for the HATOD Flutter mobile application.

The specification is designed to align with the existing HATOD architecture, including:

* Rider application flow
* Driver application flow
* Authentication
* Driver verification
* Ride booking
* Driver matching
* Real-time location
* Trip lifecycle
* Internal rider/driver messaging
* Notifications
* Maps and routing abstraction
* Fare calculation
* Payments
* Ratings
* Driver earnings
* Simulator
* Seed data
* Backend-controlled business rules
* WebSocket-based realtime communication

The Flutter application will use **one codebase** for both riders and drivers.

---

# 2. Core Product Principle

HATOD should be implemented as:

```text
                    HATOD MOBILE
                         |
             +-----------+-----------+
             |                       |
           RIDER                   DRIVER
             |                       |
             +-----------+-----------+
                         |
                 SHARED FLUTTER CORE
                         |
       +---------+-------+-------+---------+
       |         |       |       |         |
      REST   WebSocket  Maps  Messages Notifications
       |         |       |       |         |
       +---------+-------+-------+---------+
                         |
                    HATOD BACKEND
```

Do not create separate Flutter projects for Rider and Driver.

Share:

* Authentication
* Networking
* Models
* API client
* WebSocket infrastructure
* Location service
* Map abstraction
* Messaging
* Notifications
* Theme
* Common widgets
* Error handling
* Storage
* Constants
* Configuration

Separate only the role-specific presentation and business workflows.

---

# 3. UI Architecture

Recommended Flutter architecture:

```text
lib/
|
+-- app/
|
+-- core/
|
+-- features/
|   |
|   +-- authentication/
|   +-- profile/
|   +-- rider/
|   +-- driver/
|   +-- booking/
|   +-- trip/
|   +-- messaging/
|   +-- maps/
|   +-- notifications/
|   +-- payments/
|   +-- ratings/
|   +-- earnings/
|
+-- shared/
|   |
|   +-- widgets/
|   +-- components/
|   +-- dialogs/
|   +-- models/
|
+-- main.dart
```

Recommended technologies:

* Flutter
* Dart
* Riverpod
* GoRouter
* Dio
* WebSocket
* Secure storage
* Local persistence
* JSON serialization

---

# 4. Global UI Rules

Every major screen must support:

```text
LOADING
SUCCESS
EMPTY
ERROR
OFFLINE
RETRY
```

Reusable HATOD components should include:

```text
HatodAppBar
HatodButton
HatodSecondaryButton
HatodTextField
HatodSearchField
HatodBottomSheet
HatodDialog
HatodLoading
HatodErrorState
HatodEmptyState
HatodMap
HatodAvatar
HatodRating
HatodStatusBadge
HatodPrice
HatodLocationRow
HatodTripCard
HatodDriverCard
HatodMessageBubble
HatodBottomNavigation
```

Do not duplicate common UI components across Rider and Driver features.

---

# 5. Global Constants

Values should not be scattered throughout the UI.

Use centralized constants.

Recommended structure:

```text
core/constants/

app_constants.dart
api_constants.dart
booking_constants.dart
driver_constants.dart
map_constants.dart
notification_constants.dart
validation_constants.dart
```

Examples:

```dart
const defaultCountryCode = '+63';

const bookingRequestTimeout = Duration(seconds: 15);

const maxMessageLength = 500;

const defaultMapZoom = 15.0;
```

Values that are business-configurable should preferably come from backend configuration.

---

# 6. Geographic Data

Do not hard-code Philippine locations in UI code.

Use data assets:

```text
assets/
|
+-- data/
    |
    +-- countries.json
    +-- regions.json
    +-- provinces.json
    +-- cities.json
    +-- barangays.json
```

These datasets should be used consistently for:

* Registration
* Profile
* Address selection
* Driver onboarding
* Testing
* Simulator
* Seed data

The backend remains authoritative for geographic/service-area validation.

---

# 7. Route Architecture

Recommended route structure:

```text
/
|
+-- splash
|
+-- auth
|   |
|   +-- welcome
|   +-- login
|   +-- account-type
|   +-- phone
|   +-- otp
|   +-- rider-signup
|   +-- driver-signup
|   +-- profile-setup
|
+-- rider
|   |
|   +-- home
|   +-- pickup
|   +-- destination
|   +-- service
|   +-- fare
|   +-- booking-confirmation
|   +-- active-booking
|   +-- trips
|   +-- trip-details
|   +-- messages
|   +-- chat
|   +-- wallet
|   +-- profile
|
+-- driver
    |
    +-- home
    +-- verification
    +-- ride-request
    +-- pickup
    +-- active-trip
    +-- trips
    +-- earnings
    +-- messages
    +-- chat
    +-- profile
    +-- vehicle
    +-- documents
```

---

# 8. Splash Screen

## Purpose

Initialize the application and determine the user's authentication/session state.

## UI Elements

```text
HATOD logo
HATOD name
Loading indicator
```

## Process

```text
Launch
  |
Initialize application
  |
Initialize local storage
  |
Load session
  |
Validate session
  |
Load user profile
  |
Determine role
  |
Navigate
```

## Navigation

```text
No session
    -> Welcome

Authenticated Rider
    -> Rider Home

Authenticated Driver
    -> Driver Home

Expired session
    -> Login
```

Do not perform unnecessary API calls during splash.

---

# 9. Welcome Screen

## Purpose

Entry point for unauthenticated users.

## UI Elements

```text
HATOD logo
App name
Short introduction

[ Log In ]

[ Create Account ]
```

Optional:

```text
Terms & Conditions
Privacy Policy
```

## Actions

```text
Log In
    -> Login

Create Account
    -> Account Type
```

---

# 10. Account Type Screen

## Purpose

Allow a new user to select their intended account type.

## UI

```text
How will you use HATOD?

+-------------------------+
| RIDER                   |
| Book a motorcycle ride  |
+-------------------------+

+-------------------------+
| DRIVER                  |
| Drive with HATOD        |
+-------------------------+

[ Continue ]
```

## States

```text
No selection
Rider selected
Driver selected
```

The selected role must be sent to the backend during registration.

---

# 11. Login Screen

## UI Elements

```text
Phone Number
[ +63 | __________ ]

[ Continue ]

Don't have an account?
Create account
```

## Flow

```text
Enter phone
    |
Validate
    |
Request OTP
    |
OTP screen
```

---

# 12. OTP Verification Screen

## UI Elements

```text
Verify your phone

Code sent to:
+63 XXX XXX XXXX

[ _ _ _ _ _ _ ]

Didn't receive it?

Resend in XX seconds

[ Verify ]
```

## States

```text
Entering
Verifying
Invalid code
Expired code
Too many attempts
Resend available
Success
```

## Successful Flow

```text
OTP verified
     |
Authenticated
     |
Profile exists?
     |
 +---+---+
 |       |
YES      NO
 |       |
Role    Profile Setup
Home
```

---

# 13. Rider Profile Setup

## UI Elements

```text
Profile Photo
[ Add Photo ]

First Name
Last Name

Phone Number

Email

Address

[ Continue ]
```

## Address Fields

```text
Region
Province
City/Municipality
Barangay
Street / Address
```

## Validation

* Required fields
* Valid phone
* Valid email where provided
* Valid geographic selection
* Valid profile image

---

# 14. Driver Registration Flow

Driver registration must be separate from basic rider registration.

```text
Personal Information
        |
Profile Photo
        |
Driver Information
        |
Vehicle Information
        |
Documents
        |
Review
        |
Submit
        |
Verification
```

---

# 15. Driver Personal Information Screen

## UI Elements

```text
Profile Photo
First Name
Last Name
Phone
Email
Address
```

---

# 16. Driver Information Screen

## UI Elements

```text
License Number
License Type
License Expiry
```

Additional fields should be added only when required by backend/business requirements.

---

# 17. Driver Vehicle Screen

## UI Elements

```text
Vehicle Type
Brand
Model
Color
Plate Number
Registration Information
```

Example:

```text
Motorcycle
Honda
Click 125
Black
ABC 1234
```

---

# 18. Driver Documents Screen

## Documents

Examples:

```text
Driver License
Vehicle Registration
Insurance
Other Required Documents
```

Each document supports:

```text
Upload
Preview
Replace
Delete
Status
```

Possible states:

```text
NOT_SUBMITTED
PENDING
APPROVED
REJECTED
EXPIRED
```

---

# 19. Driver Verification Status Screen

## Pending

```text
Application Submitted

Status:
PENDING REVIEW

Submitted:
Date

We'll notify you when your application
has been reviewed.
```

## Approved

```text
Verification Approved

You can now operate as a HATOD driver.

[ Go to Driver Home ]
```

## Rejected

```text
Verification Unsuccessful

Reason:
Backend-provided reason

[ Update Documents ]
[ Resubmit ]
```

The backend controls verification status.

---

# 20. Rider Home Screen

This is the primary Rider screen.

## Layout

```text
+--------------------------------+
| HATOD                 Profile  |
|                                |
| Where are you going?           |
|                                |
| [ Pickup location ]            |
| [ Destination ]                |
|                                |
|                                |
|              MAP               |
|                                |
|                                |
+--------------------------------+
| Home Trips Messages Profile    |
+--------------------------------+
```

## Elements

* Current location
* Pickup
* Destination
* Map
* Recent destinations
* Saved places
* Active booking card

## Actions

```text
Pickup
    -> Pickup Screen

Destination
    -> Destination Screen

Active Booking
    -> Active Booking Screen

Trips
    -> Trips

Messages
    -> Messages

Profile
    -> Profile
```

---

# 21. Pickup Location Screen

## UI

```text
< Pickup Location

[ Search location ]

[ Use current location ]

MAP

Pickup Pin

Selected Address

[ Confirm Pickup ]
```

## Data

Store:

```text
latitude
longitude
formattedAddress
placeId
```

Coordinates are authoritative for the actual location.

---

# 22. Destination Search Screen

## UI

```text
< Where to?

[ Search destination ]

Recent Places

Home
Work
Recent Destination

Search Results
```

## Search Process

```text
User types
    |
Debounce
    |
Map/geocoding service
    |
Results
    |
Select
    |
Store coordinate
```

Do not call the external geocoding provider for every keystroke.

---

# 23. Location Confirmation Screen

## UI

```text
Pickup
[Selected pickup]

Destination
[Selected destination]

MAP

Route Preview

Distance
X.X km

Estimated Duration
XX min

[ Continue ]
```

---

# 24. Service Selection Screen

For initial launch:

```text
Choose your ride

+-------------------------+
| Motorcycle              |
| Fast & convenient       |
|                         |
| ₱XXX estimated          |
+-------------------------+

[ Continue ]
```

Future service types may include:

```text
Motorcycle
Car
Delivery
```

Service configuration should be backend-driven.

---

# 25. Fare Estimate Screen

## UI

```text
Pickup
        |
Destination

Motorcycle

Distance
X.X km

Estimated Duration
XX min

Fare Estimate
₱XXX

Payment
Cash

[ Continue ]
```

Optional fare breakdown:

```text
Base Fare
Distance
Time
Discount
Total
```

## Critical Rule

Flutter displays the fare.

The backend calculates and validates the fare.

Never trust a client-calculated final fare.

---

# 26. Booking Confirmation Screen

## UI

```text
Confirm Your Ride

Pickup
████████████

Destination
████████████

Motorcycle

Estimated Fare
₱XXX

Payment
Cash

[ Confirm Ride ]
```

## Process

```text
Confirm
   |
Backend creates booking
   |
Booking status = REQUESTED
   |
SEARCHING_DRIVER
```

---

# 27. Searching Driver Screen

## UI

```text
MAP

Pickup Marker

Searching for a driver...

Loading indicator

[ Cancel Ride ]
```

Optional:

```text
Estimated waiting time
```

Do not expose internal driver-matching logic.

---

# 28. Driver Assigned Screen

## UI

```text
MAP

+-----------------------------+
| DRIVER                      |
|                             |
| [Photo] Juan D.             |
|                             |
| ★★★★★ 4.92                 |
|                             |
| Motorcycle                  |
| ABC 1234                    |
|                             |
| ETA: 3 min                  |
|                             |
| [ Message ] [ Call ]        |
+-----------------------------+
```

Map displays:

```text
Pickup
Driver
Route
```

---

# 29. Driver Arriving State

This should generally remain within the Active Booking experience.

## UI

```text
Driver arriving

Juan D.
★★★★★

Motorcycle
ABC 1234

ETA 2 min

MAP

[ Message ]
[ Call ]
[ Cancel ]
```

---

# 30. Driver Arrived State

## UI

```text
Your driver has arrived

Juan D.
Motorcycle
ABC 1234

MAP

[ Message ]
```

Backend state:

```text
DRIVER_AT_PICKUP
```

---

# 31. Active Trip — Rider

## UI

```text
TRIP IN PROGRESS

MAP

Driver
    |
    |
Destination

ETA
12 min

Destination
SM City

[ Message ]
```

Optional:

```text
Current fare
₱XXX
```

Only display dynamic fare information if required by the product rules.

---

# 32. Active Trip — Driver

## UI

```text
TRIP IN PROGRESS

MAP

Current Location
       |
       |
Destination

ETA
12 min

[ Message ]

[ Complete Trip ]
```

The driver cannot directly change:

* Fare
* Distance
* Commission
* Booking ownership
* Final trip state

These are backend-controlled.

---

# 33. Trip Completion — Rider

## UI

```text
Trip Completed

From
Pickup

To
Destination

Distance
X.X km

Duration
XX min

Total
₱XXX

Payment
Cash

[ Continue ]
```

Then:

```text
Rating Screen
```

---

# 34. Trip Completion — Driver

## UI

```text
Trip Completed

Fare
₱XXX

Commission
₱XX

Net Earnings
₱XXX

Payment
Cash

[ Done ]
```

---

# 35. Rating Screen — Rider

## UI

```text
Rate Your Driver

[ Driver Photo ]

Juan D.

★★★★★

How was your ride?

[ Optional Comment ]

[ Submit ]
```

---

# 36. Rating Screen — Driver

## UI

```text
Rate Your Rider

★★★★★

Optional Comment

[ Submit ]
```

---

# 37. Rider Trips Screen

## Bottom Navigation

```text
Home
Trips
Messages
Profile
```

## Trip List

```text
TODAY

Motorcycle
General Santos
→ Destination

₱120
Completed

-------------------------

YESTERDAY

Motorcycle
...
```

Trip cards should display:

* Date
* Service
* Pickup
* Destination
* Fare
* Status

Use server-side pagination.

---

# 38. Rider Trip Details Screen

## UI

```text
Trip Details

MAP

Driver
Juan D.

Vehicle
Motorcycle
ABC 1234

Pickup
████████

Destination
████████

Distance
X.X km

Duration
XX min

Fare
₱XXX

Payment
Cash

Rating
★★★★★
```

---

# 39. Driver Home Screen

## Layout

```text
+--------------------------------+
| HATOD DRIVER                   |
|                                |
|             OFFLINE            |
|                                |
|          [ GO ONLINE ]         |
|                                |
| Today's Earnings               |
| ₱1,250                         |
|                                |
| Trips              Rating     |
| 12                 ★ 4.92     |
|                                |
|             MAP                |
|                                |
+--------------------------------+
| Home Trips Earnings Messages   |
| Profile                        |
+--------------------------------+
```

---

# 40. Driver Online Screen

## UI

```text
ONLINE

MAP

Current Location

Nearby Service Area

Today's Earnings
₱1,250

Trips
12

[ GO OFFLINE ]
```

When the driver goes online:

```text
Location Service
     |
GPS updates
     |
Location filtering
     |
Backend
```

---

# 41. Driver Ride Request Screen

This should be visually prominent.

## UI

```text
NEW RIDE REQUEST

Pickup
1.2 km away

Destination
4.8 km away

Estimated Distance
5.9 km

Estimated Duration
15 min

Estimated Fare
₱XXX

Expires in
12 sec

[ DECLINE ]    [ ACCEPT ]
```

The backend controls request availability and expiration.

---

# 42. Driver Pickup Screen

## UI

```text
RIDER PICKUP

MAP

Driver
    |
    |
Rider

1.2 km
4 min

Rider Location

[ Message Rider ]

[ I've Arrived ]
```

Navigation may be handed to the selected navigation provider.

---

# 43. Driver Arrived Screen

## UI

```text
YOU HAVE ARRIVED

Rider:
Maria S.

Pickup:
████████

[ Message ]

[ START TRIP ]
```

Backend validates:

* Driver identity
* Booking ownership
* Booking state
* Proximity
* Cancellation state

---

# 44. Driver Active Trip Screen

## UI

```text
TRIP IN PROGRESS

MAP

Current Location
       |
       |
Destination

ETA
12 min

[ Message ]

[ Complete Trip ]
```

---

# 45. Driver Trips Screen

## UI

```text
Trips

Today
12 Trips
₱1,250

-------------------------

Trip
Pickup → Destination
₱120
Completed

Trip
Pickup → Destination
₱150
Completed
```

Filters:

```text
Today
This Week
This Month
```

---

# 46. Driver Earnings Screen

## UI

```text
Earnings

TODAY

₱1,250

12 Trips

Gross
₱1,450

Commission
-₱200

Net
₱1,250
```

Filters:

```text
Today
Week
Month
Custom
```

---

# 47. Driver Earnings Details

## UI

```text
Earnings Details

Date
September 29

Trips
12

Gross Fares
₱1,450

Commission
₱200

Adjustments
₱0

Net
₱1,250
```

All values are backend-derived.

---

# 48. Messages Screen

Shared by Rider and Driver.

## UI

```text
Messages

Juan D.
I'm outside.
2m

Maria S.
Okay, coming.
5m
```

Unread indicator:

```text
Messages (2)
```

---

# 49. Chat Screen

## UI

```text
< Juan D.

----------------------------

        Hi, I'm outside.

I'm coming down.

        Okay 👍

----------------------------

[ Type a message... ] [Send]
```

## Message Types — MVP

```text
TEXT
SYSTEM
```

Future:

```text
IMAGE
LOCATION
```

## Message State

```text
SENT
DELIVERED
READ
```

---

# 50. Messaging Architecture

```text
Booking
   |
Conversation
   |
Messages
```

Message fields:

```text
id
conversationId
bookingId
senderId
recipientId
messageType
content
createdAt
readAt
```

Messages are persisted by the backend.

WebSocket provides realtime delivery.

---

# 51. Notifications Screen

## UI

```text
Notifications

TODAY

Driver accepted your ride
5 min ago

Driver arrived
10 min ago

Trip completed
25 min ago

EARLIER

Payment received
```

Notification categories can be added later.

---

# 52. Push Notification Behavior

Important events include:

```text
Driver Accepted
Driver Arriving
Driver Arrived
Trip Started
Trip Completed
New Message
Payment Status
Driver Verification
```

Push notifications are not authoritative.

On notification:

```text
Push
 |
Open App
 |
Fetch/Synchronize authoritative backend state
 |
Update UI
```

---

# 53. Rider Wallet Screen

If wallet is enabled in the current MVP:

```text
Wallet

Balance
₱500.00

[ Add Money ]

Payment Methods

Cash
Card
Wallet
```

Transactions:

```text
₱120
Ride
Sep 29

+₱500
Wallet Top-up
Sep 29
```

If wallet is not enabled for the first release, hide it through feature configuration.

---

# 54. Payment Method Screen

## UI

```text
Payment Method

○ Cash
○ HATOD Wallet
○ Online Payment

[ Save ]
```

The backend determines available payment methods.

---

# 55. Rider Profile Screen

## UI

```text
[Profile Photo]

Name
★★★★★

Personal Information
Saved Places
Payment Methods
Trips

Notifications
Privacy
Security

Help
Terms & Conditions

Logout
```

---

# 56. Driver Profile Screen

## UI

```text
[Driver Photo]

Name
★★★★★ 4.92

Driver Status
VERIFIED

Personal Information
Vehicle
Documents
Verification
Payout Information

Notifications
Security

Help
Terms

Logout
```

---

# 57. Vehicle Screen

## UI

```text
Vehicle

Motorcycle

Brand
Honda

Model
Click 125

Color
Black

Plate
ABC 1234

Registration
Verified

[ Edit ]
```

Vehicle changes requiring verification must be submitted to the backend.

---

# 58. Driver Documents Screen

## UI

```text
Documents

Driver License
✓ Approved

Vehicle Registration
✓ Approved

Insurance
● Pending

Other Document
✕

[ Upload Document ]
```

Document statuses are backend-controlled.

---

# 59. Settings Screen

## UI

```text
Settings

Account
Notifications
Privacy
Security
Language
Location
About HATOD

Log Out
```

---

# 60. Help & Support Screen

## UI

```text
Help & Support

Common Questions

Booking
Payments
Trips
Account
Driver Verification

[ Contact Support ]
```

During an active trip, support should be accessible without leaving the trip experience.

---

# 61. Cancellation Screen

## UI

```text
Cancel Ride?

Why are you cancelling?

○ Driver is too far
○ Changed my mind
○ Wrong destination
○ Found another ride
○ Other

[ Keep Ride ]

[ Cancel Ride ]
```

Backend determines:

* Whether cancellation is allowed
* Cancellation fee
* Cancellation status
* Refund implications

---

# 62. No Driver Found Screen

## UI

```text
We couldn't find a driver

There are currently no available
drivers nearby.

[ Try Again ]

[ Cancel ]
```

Do not expose internal matching errors.

---

# 63. Network Error Screen

## Standard

```text
Connection Problem

We couldn't connect to HATOD.

[ Try Again ]
```

## Active Trip

```text
Connection Interrupted

Trying to reconnect...

Your trip remains active.
```

The UI must distinguish between normal browsing and an active trip.

---

# 64. Session Expired Screen

```text
Session Expired

Please log in again.

[ Log In ]
```

For active trips:

```text
Synchronize active trip state
before forcing the user completely out
of the active-trip experience.
```

---

# 65. Empty States

## No Trips

```text
No trips yet

Your completed rides will appear here.

[ Book a Ride ]
```

## No Messages

```text
No messages

Your rider/driver conversations
will appear here.
```

## No Notifications

```text
You're all caught up.
```

---

# 66. Rider Bottom Navigation

Preferred initial structure:

```text
Home
Trips
Messages
Profile
```

If wallet becomes a primary feature:

```text
Home
Trips
Wallet
Messages
Profile
```

Keep navigation minimal.

---

# 67. Driver Bottom Navigation

```text
Home
Trips
Earnings
Messages
Profile
```

---

# 68. Active Booking Persistence

An active booking must survive:

* App restart
* App backgrounding
* Network reconnect
* Push notification opening
* Device rotation
* Temporary WebSocket disconnect

Startup behavior:

```text
Launch
 |
Session
 |
Check Active Booking
 |
+----------------------+
|                      |
No Active Booking      Active Booking
|                      |
Normal Home             Restore Active Booking
```

The user should never have to recreate a booking after reopening the application.

---

# 69. Rider Complete Flow

```text
SPLASH
  |
WELCOME
  |
LOGIN / SIGNUP
  |
OTP
  |
PROFILE
  |
RIDER HOME
  |
PICKUP
  |
DESTINATION
  |
SERVICE
  |
FARE
  |
CONFIRM
  |
SEARCHING DRIVER
  |
DRIVER ASSIGNED
  |
DRIVER ARRIVING
  |
DRIVER AT PICKUP
  |
TRIP STARTED
  |
TRIP COMPLETED
  |
PAYMENT
  |
RATING
  |
RIDER HOME
```

Alternative:

```text
Any cancellable state
  |
CANCELLED
  |
Rider Home
```

---

# 70. Driver Complete Flow

```text
SPLASH
  |
WELCOME
  |
LOGIN / SIGNUP
  |
OTP
  |
DRIVER ONBOARDING
  |
DOCUMENTS
  |
VERIFICATION
  |
DRIVER HOME
  |
GO ONLINE
  |
RIDE REQUEST
  |
+------------------+
|                  |
DECLINE            ACCEPT
|                  |
Driver Home        Pickup
                   |
                   Arrived
                   |
                   Start Trip
                   |
                   Active Trip
                   |
                   Complete
                   |
                   Earnings
                   |
                   Rating
                   |
                   Driver Home
```

---

# 71. Booking State Machine

The UI must follow the backend booking state machine.

```text
REQUESTED
    |
SEARCHING_DRIVER
    |
DRIVER_ASSIGNED
    |
DRIVER_ARRIVING
    |
DRIVER_AT_PICKUP
    |
TRIP_STARTED
    |
TRIP_COMPLETED
    |
PAYMENT_PENDING
    |
COMPLETED
```

Alternative states:

```text
REQUESTED
    |
CANCELLED
```

```text
SEARCHING_DRIVER
    |
NO_DRIVER
```

```text
DRIVER_ASSIGNED
    |
CANCELLED
```

Flutter must not invent its own business states.

---

# 72. Active Booking Screen Architecture

Do not create an entirely separate screen for every booking state.

Use:

```text
ActiveBookingScreen
|
+-- SEARCHING_DRIVER
|   +-- SearchingPanel
|
+-- DRIVER_ASSIGNED
|   +-- DriverCard
|
+-- DRIVER_ARRIVING
|   +-- DriverTrackingPanel
|
+-- DRIVER_AT_PICKUP
|   +-- ArrivedPanel
|
+-- TRIP_STARTED
|   +-- ActiveTripPanel
|
+-- PAYMENT_PENDING
|   +-- PaymentPanel
|
+-- COMPLETED
    +-- CompletionPanel
```

This avoids duplicated code and improves state transitions.

---

# 73. Real-Time Architecture

```text
Driver GPS
    |
Driver Flutter
    |
HATOD API/WebSocket
    |
Backend
    |
Redis / Realtime State
    |
Rider WebSocket
    |
Rider Flutter
```

Real-time events include:

```text
booking.searching
booking.driver_assigned
booking.driver_arriving
booking.driver_at_pickup
trip.started
trip.updated
trip.completed
booking.cancelled
message.created
message.read
```

Event names should be centralized constants.

---

# 74. Driver Location Optimization

Do not transmit every GPS callback.

Apply:

```text
Minimum time interval
Minimum movement threshold
Accuracy filtering
Battery-aware behavior
Background location constraints
```

Conceptual rule:

```text
Send update when:

distance moved >= configured threshold

OR

time >= configured maximum interval
```

This reduces:

* Mobile battery consumption
* Network traffic
* Backend traffic
* Redis updates
* Realtime processing

---

# 75. Map Architecture

Flutter must depend on an abstraction.

```text
MapService
RoutingService
GeocodingService
LocationService
```

Do not make the whole application directly dependent on one provider.

Architecture:

```text
Map Interface
      |
+-----+------+----------+
|            |          |
Provider A Provider B Provider C
```

This allows HATOD to change mapping providers later.

---

# 76. Map Cost Optimization

The mobile application should work through the HATOD map layer.

Preferred:

```text
Flutter
   |
HATOD Map Layer
   |
Cache
   |
Routing Provider
```

Where appropriate, cache:

* Geocoding results
* Places
* Routes
* Repeated destinations
* Static geographic information

Do not make unnecessary mapping API requests from the client.

---

# 77. Network Architecture

Use a centralized API client.

```text
Dio
 |
Auth Interceptor
 |
Logging Interceptor
 |
Error Interceptor
 |
Repository
 |
Use Case
 |
Provider
 |
Screen
```

Handle:

```text
401
403
404
409
422
429
500
503
Timeout
Offline
```

UI should receive normalized application errors instead of raw HTTP exceptions.

---

# 78. WebSocket Architecture

Create one reusable WebSocket manager.

```text
WebSocketManager

connect()
disconnect()
reconnect()
subscribe()
unsubscribe()
send()
```

Responsibilities:

* Authentication
* Connection
* Reconnection
* Subscription
* Event routing
* Error handling
* Heartbeat if required

---

# 79. Offline Strategy

Cache locally:

```text
User profile
Recent trips
Recent destinations
Conversations
App configuration
```

Never treat offline data as authoritative for:

```text
Booking state
Fare
Driver assignment
Trip state
Payment
Driver verification
```

Always synchronize authoritative data with the backend.

---

# 80. Permissions

## Rider

Potential permissions:

```text
Location
Notifications
Camera
Photo Library
```

## Driver

Potential permissions:

```text
Location
Background Location
Notifications
Camera
Photo Library
```

Permission states:

```text
NOT_REQUESTED
GRANTED
DENIED
PERMANENTLY_DENIED
```

Explain the purpose of permissions before requesting them where appropriate.

---

# 81. Security

Never store sensitive backend credentials in Flutter.

Never include:

```text
Database passwords
Redis passwords
RabbitMQ passwords
Backend private keys
Server secrets
```

Implement:

```text
Secure token storage
TLS
Authenticated REST
Authenticated WebSocket
Session expiration
Logout
Token refresh
Request validation
```

---

# 82. Backend-Controlled Rules

Flutter must not be authoritative for:

```text
Fare
Commission
Booking ownership
Driver assignment
Driver verification
Payment status
Trip completion
Cancellation fees
Service availability
Driver eligibility
```

Flutter is the client.

Backend is authoritative.

---

# 83. Simulator Support

The Flutter application must be compatible with the HATOD simulator.

Simulator should support:

```text
Create Rider
Create Driver
Create Booking
Accept Booking
Move Driver
Arrive
Start Trip
Complete Trip
Send Message
Cancel Trip
Disconnect Network
Reconnect Network
Simulate Push Notification
Simulate Payment
```

Example:

```text
Rider Simulator
      |
Create Booking
      |
Backend
      |
Driver Simulator
      |
Accept
      |
Backend
      |
Rider Simulator
```

---

# 84. Seed Data

Development/test environments should use deterministic seed data.

Initial dataset:

```text
40–50 users
```

including:

```text
Riders
Drivers
```

Transactions:

```text
200–500 transactions
```

Seed data must use the same geographic datasets and constants used by the application.

---

# 85. Testing Requirements

Testing layers:

```text
Unit Tests
    |
Widget Tests
    |
Integration Tests
    |
Simulator Tests
    |
Backend Integration Tests
```

---

# 86. Unit Tests

Test:

* State transitions
* Validators
* Serialization
* Repository behavior
* Error mapping
* Location filtering
* UI state logic
* Booking rules exposed to the client

---

# 87. Widget Tests

Minimum screens:

```text
Login
OTP
Signup
Rider Home
Pickup
Destination
Fare
Booking Confirmation
Searching
Driver Assigned
Driver Request
Active Trip
Messages
Chat
Rating
Driver Home
Earnings
Profile
```

---

# 88. End-to-End Test

One critical automated flow must always work:

```text
Rider Login
    |
Set Pickup
    |
Set Destination
    |
Request Ride
    |
Driver Receives
    |
Driver Accepts
    |
Rider Sees Driver
    |
Driver Arrives
    |
Start Trip
    |
Move Driver
    |
Complete Trip
    |
Fare Finalized
    |
Payment
    |
Rating
```

If this flow fails, the release should be considered blocked.

---

# 89. Screen Specification Standard

Every future screen specification must define:

```text
Screen ID
Screen Name
Purpose
Route
Role
Entry Conditions
Exit Conditions
UI Elements
User Actions
Loading State
Empty State
Error State
Offline State
Backend Data
API Calls
WebSocket Events
Permissions
Navigation
Acceptance Criteria
```

This format should be used whenever a new HATOD screen is added.

---

# 90. MVP P0 Screens

The following screens are required for the first functional MVP.

## Shared

```text
Splash
Welcome
Login
Account Type
OTP
Profile Setup
```

## Rider

```text
Rider Home
Pickup
Destination
Service Selection
Fare Estimate
Booking Confirmation
Searching Driver
Driver Assigned
Active Booking
Trip Completion
Rating
Trips
Trip Details
Messages
Chat
Profile
```

## Driver

```text
Driver Home
Driver Onboarding
Verification
Ride Request
Pickup
Driver Arrived
Active Trip
Trip Completion
Rating
Trips
Earnings
Messages
Chat
Profile
```

---

# 91. MVP P1 Screens

```text
Wallet
Payment Methods
Notifications
Saved Places
Driver Documents
Vehicle
Help
Settings
```

These should be implemented according to the actual enabled backend features.

---

# 92. MVP P2 Features

Do not prioritize these before the core ride lifecycle is stable:

```text
Advanced Promotions
Referral System
Loyalty Points
Advanced Incentives
Corporate Accounts
Advanced Analytics
Additional Vehicle Categories
Advanced AI Features
```

---

# 93. Development Sequence

Implementation order:

```text
01. Flutter Project Foundation
02. Theme
03. Constants
04. Configuration
05. Routing
06. Local Storage
07. Network Layer
08. Authentication
09. Session Management
10. Profile
11. Role Routing
12. Rider Home
13. Driver Home
14. Location Service
15. Map Abstraction
16. Booking Models
17. Fare Estimate
18. Rider Booking
19. Driver Matching
20. Driver Request
21. Booking State Machine
22. WebSocket
23. Driver Location
24. Trip Lifecycle
25. Messaging
26. Notifications
27. Payments
28. Ratings
29. Driver Earnings
30. Trip History
31. Driver Verification
32. Simulator
33. Seed Data
34. Unit Tests
35. Widget Tests
36. Integration Tests
37. Performance Testing
38. Production Hardening
```

---

# 94. Definition of Done

A screen is not considered complete merely because its UI exists.

A feature is complete when:

```text
UI
 |
State Management
 |
Use Case
 |
Repository
 |
API/WebSocket
 |
Backend Validation
 |
Database
 |
Realtime Events
 |
Error Handling
 |
Offline Handling
 |
Tests
```

all work together.

Example:

## Driver Accept Ride

```text
Driver taps ACCEPT
        |
API Request
        |
Backend Validation
        |
Booking Lock
        |
Database Update
        |
RabbitMQ/Event
        |
Realtime Update
        |
Rider Receives Update
        |
Driver UI Updates
        |
Both States Survive Reconnect
```

---

# 95. Final Rider UX

The rider experience should feel like one continuous process:

```text
WHERE?
  |
HOW MUCH?
  |
BOOKED
  |
WHO IS MY DRIVER?
  |
WHERE IS MY DRIVER?
  |
DRIVER ARRIVED
  |
ON THE WAY
  |
ARRIVED
  |
PAY
  |
RATE
```

---

# 96. Final Driver UX

The driver experience should feel like:

```text
ONLINE
  |
NEW REQUEST
  |
ACCEPTED
  |
GO TO RIDER
  |
ARRIVED
  |
TRIP
  |
COMPLETE
  |
EARNINGS
```

---

# 97. Final Architecture

```text
                         HATOD MOBILE
                              |
                 +------------+------------+
                 |                         |
               RIDER                     DRIVER
                 |                         |
                 +------------+------------+
                              |
                     SHARED FLUTTER CORE
                              |
       +--------------+-------+-------+--------------+
       |              |       |       |              |
      REST        WebSocket  Maps  Messaging   Notifications
       |              |       |       |              |
       +--------------+-------+-------+--------------+
                              |
                        HATOD BACKEND
                              |
          +-------------------+-------------------+
          |                   |                   |
       Database            Redis              RabbitMQ
          |                   |                   |
          +-------------------+-------------------+
                              |
                    External Services
                              |
             +----------------+----------------+
             |                |                |
           Maps           Push/SMS         Payments
```

---

# 98. Core Implementation Rules

1. One Flutter codebase for Rider and Driver.
2. Backend is authoritative.
3. Use Riverpod for application state.
4. Use GoRouter for navigation and role guards.
5. Use REST for request/response operations.
6. Use WebSocket for realtime operations.
7. Use RabbitMQ for backend event processing.
8. Use Redis for realtime/temporary state where appropriate.
9. Use a map abstraction rather than hard-coding one provider.
10. Minimize external map API calls.
11. Cache appropriate geographic data.
12. Do not send every GPS callback.
13. Use centralized constants.
14. Use Philippine geographic data assets.
15. Support simulator workflows.
16. Use deterministic seed data.
17. Test the complete rider-to-driver lifecycle.
18. Preserve active booking state across app restarts.
19. Handle network loss gracefully.
20. Do not place backend secrets in Flutter.
21. Build reusable components.
22. Avoid duplicating Rider/Driver business logic.
23. Use server-side pagination for histories.
24. Do not trust client-calculated fare or trip completion data.
25. Keep the core ride lifecycle stable before adding secondary features.

---

# 99. Final MVP Success Criteria

The Flutter application is ready for the next development stage when a test environment can successfully execute:

```text
RIDER
  |
  | Login
  v
Rider Home
  |
  | Select Pickup
  v
Destination
  |
  | Request Fare
  v
Fare
  |
  | Confirm
  v
Booking
  |
  | Matching
  v
DRIVER
  |
  | Accept
  v
Pickup
  |
  | Arrived
  v
RIDER
  |
  | Sees Driver
  v
TRIP
  |
  | Start
  v
Active Trip
  |
  | Complete
  v
Payment
  |
  | Rating
  v
Completed
```

At the same time:

```text
Driver
  |
Online
  |
Receives Request
  |
Accepts
  |
Navigates
  |
Arrives
  |
Starts Trip
  |
Completes Trip
  |
Receives Earnings
```

And throughout the process:

```text
Realtime Location
Realtime Booking State
Realtime Messaging
Push Notifications
Backend Validation
Database Persistence
Reconnect Handling
```

must operate correctly.

---

# 100. HATOD Mobile Implementation Principle

The mobile application should be treated as a **real-time client of the HATOD platform**, not as an independent business-logic system.

The desired architecture is:

```text
                    USER
                     |
                     v
                FLUTTER UI
                     |
                     v
              RIVERPOD STATE
                     |
                     v
                 USE CASE
                     |
                     v
                REPOSITORY
                     |
          +----------+----------+
          |                     |
         REST               WEBSOCKET
          |                     |
          +----------+----------+
                     |
                     v
                HATOD BACKEND
                     |
          +----------+----------+
          |          |          |
       Database    Redis    RabbitMQ
```

This structure keeps the Flutter application maintainable, testable, scalable, and compatible with the HATOD backend, simulator, messaging system, and map-cost optimization strategy.
