# HATOD Routing & Maps Implementation Specification

**Project:** HATOD
**Market:** Philippines
**Initial Launch Area:** General Santos City
**Primary Platform:** Flutter
**Backend:** HATOD API
**Database:** PostgreSQL + PostGIS
**Cache:** Redis
**Messaging/Event Bus:** RabbitMQ
**Primary Routing Engine:** Self-hosted Valhalla
**Commercial Routing Fallback:** GrabMaps through AWS Location Service
**Secondary Providers:** Mapbox / Google / HERE through provider adapters

---

# 1. Purpose

This document defines the complete routing, mapping, location, driver-dispatch, GPS, ETA, caching, fallback, benchmarking, monitoring, and provider-abstraction architecture for HATOD.

The implementation must prioritize:

1. Motorcycle-aware routing
2. Low recurring API cost
3. High route quality
4. Reliable driver matching
5. Low latency
6. Provider independence
7. Graceful fallback
8. Accurate ETA
9. Scalable live tracking
10. Ability to improve routing using HATOD's own trip data

The application must **not** become tightly coupled to a single commercial map provider.

---

# 2. Core Architecture

```text
                         HATOD MOBILE APPS
                       Rider       Driver
                          │           │
                          └─────┬─────┘
                                │
                         HATOD Backend API
                                │
              ┌─────────────────┼──────────────────┐
              │                 │                  │
              ▼                 ▼                  ▼
          Location          Dispatch           Routing
           Service           Service            Service
              │                 │                  │
              ▼                 ▼                  ▼
          PostgreSQL          Redis         Routing Provider
          + PostGIS                            Abstraction
              │                 │                  │
              │                 │        ┌─────────┼──────────┐
              │                 │        │         │          │
              │                 │        ▼         ▼          ▼
              │                 │    Valhalla   GrabMaps   Secondary
              │                 │    Primary    Fallback   Providers
              │                 │
              └────────────┬────┘
                           │
                       RabbitMQ
                           │
                    Realtime Events
                           │
                       WebSocket
                           │
                    Rider / Driver
                         Apps
```

---

# 3. Architectural Principle

The map is a **presentation layer**.

Location, driver proximity, dispatch, routing decisions, ETA logic, trip state, and business rules belong to HATOD.

Flutter must never contain provider-specific routing business logic.

Flutter communicates only with HATOD APIs.

```text
Flutter
   ↓
HATOD API
   ↓
RoutingService
   ↓
RoutingProvider
```

Never:

```text
Flutter
   ↓
GrabMaps
```

or:

```text
Flutter
   ↓
Google Routes API
```

---

# 4. Routing Provider Strategy

## 4.1 Primary Provider

Use self-hosted **Valhalla** as the primary routing engine.

Reasons:

* OpenStreetMap-based
* Self-hostable
* No per-request commercial routing charge
* Supports routing profiles
* Supports motorcycle/motor-scooter costing
* Supports route matrices
* Supports map matching
* Suitable for regional deployment
* Allows HATOD to control routing infrastructure

Valhalla must be deployed independently from the main API when practical.

---

# 5. Commercial Fallback

Use **GrabMaps through AWS Location Service** as the primary commercial fallback.

Use cases:

* Valhalla unavailable
* Low route confidence
* Missing or questionable road information
* Route validation
* Difficult motorcycle routes
* Traffic-sensitive routing
* Benchmarking
* Production fallback

Do not route every HATOD trip through GrabMaps by default.

The purpose is to retain commercial routing capability without making commercial API requests the default cost center.

---

# 6. Secondary Providers

The architecture must support additional providers:

```text
Mapbox
Google
HERE
```

These must be implemented as independent adapters.

Do not hardcode provider-specific code throughout the application.

---

# 7. Provider Abstraction

Create:

```text
RoutingService
```

and:

```text
RoutingProvider
```

Recommended structure:

```text
RoutingService
├── ValhallaRoutingProvider
├── GrabMapsRoutingProvider
├── MapboxRoutingProvider
├── GoogleRoutingProvider
└── HereRoutingProvider
```

The business layer calls:

```text
RoutingService.calculateRoute()
```

It must not call:

```text
ValhallaRoutingProvider.calculateRoute()
```

directly.

---

# 8. Routing Service Interface

The routing service should support at minimum:

```text
calculateRoute()
calculateETA()
calculateDistance()
calculateMatrix()
matchRoute()
validateRoute()
```

Recommended logical interface:

```text
RoutingService

calculateRoute(origin, destination, options)

calculateETA(origin, destination, options)

calculateDistance(origin, destination, options)

calculateMatrix(origins, destinations, options)

matchRoute(gpsTrack, options)

validateRoute(route, options)
```

Use strongly typed request/response models.

---

# 9. Standard Route Response

All providers must be normalized into the same HATOD model.

Example:

```json
{
  "provider": "valhalla",
  "routingProfile": "motor_scooter",
  "distanceMeters": 5200,
  "durationSeconds": 780,
  "geometry": "...",
  "legs": [],
  "waypoints": [],
  "confidence": 0.94,
  "calculatedAt": "2026-09-29T10:00:00Z",
  "expiresAt": "2026-09-29T10:05:00Z"
}
```

Provider-specific fields must remain internal to the provider adapter unless explicitly needed by HATOD.

---

# 10. Routing Profiles

At minimum support:

```text
motor_scooter
motorcycle
```

Use the profile that best represents HATOD's actual motorcycle fleet.

Do not assume that a generic automobile route is appropriate for motorcycles.

The exact profile and configuration must be validated using the General Santos benchmark.

---

# 11. PostGIS Responsibilities

PostGIS is responsible for geospatial operations.

Use it for:

* Driver proximity
* Service-area checks
* Location queries
* Distance calculations
* Geographic filtering
* Location search
* Geofencing
* Historical GPS analysis
* Map-matching data storage
* Service-area management

PostGIS must be the first tool used for nearby-driver discovery.

---

# 12. Driver Matching

When a rider requests a trip:

```text
Rider
  │
  ▼
Pickup coordinates
  │
  ▼
PostGIS
  │
  ▼
Nearby drivers
  │
  ├── online?
  ├── available?
  ├── correct vehicle?
  ├── GPS fresh?
  ├── inside service area?
  └── acceptable radius?
  │
  ▼
Candidate drivers
```

Do not immediately query a commercial route matrix for every nearby driver.

---

# 13. Two-Stage Driver Matching

## Stage 1: Geospatial filtering

Use PostGIS.

Filter by:

* Driver status
* Online status
* Availability
* Vehicle type
* GPS freshness
* Service area
* Search radius
* Excluded drivers
* Existing trip status

Use:

```text
ST_DWithin()
ST_Distance()
```

where appropriate.

---

## Stage 2: Route-aware ranking

Only calculate road ETA for the final candidate set.

Example:

```text
Pickup

Driver A
350m straight-line

Driver B
620m straight-line

Driver C
890m straight-line
```

Then calculate actual road ETA for the final candidates.

Example:

```text
Driver A
1.1km road distance
3 min ETA

Driver B
0.8km road distance
5 min ETA

Driver C
1.3km road distance
4 min ETA
```

Driver selection must be based on configurable dispatch rules rather than simple straight-line distance alone.

---

# 14. Avoid Excessive Route Matrix Calls

Do not perform:

```text
10 drivers × every ride × commercial matrix API
```

unless there is a specific reason.

Preferred:

```text
PostGIS
    ↓
filter candidates
    ↓
Valhalla
    ↓
route-aware ranking
```

Commercial matrix APIs should be reserved for cases where they provide measurable value.

---

# 15. Route Calculation Triggers

Calculate a route when:

### Rider requests fare estimate

```text
Pickup → Destination
```

### Driver accepts trip

```text
Driver → Pickup
```

### Trip starts

```text
Current Driver Position → Destination
```

### Destination changes

Recalculate.

### Driver significantly deviates

Recalculate.

### Route becomes stale

Recalculate.

---

# 16. Do Not Recalculate on Every GPS Update

Incorrect:

```text
GPS
 ↓
Route API

GPS
 ↓
Route API

GPS
 ↓
Route API
```

Correct:

```text
GPS
 ↓
Update driver position
 ↓
Check route deviation
 ↓
Only reroute if necessary
```

GPS updates and route calculations must be independent.

---

# 17. Route Recalculation Rules

Create configurable thresholds.

Examples:

```text
MAX_ROUTE_DEVIATION_METERS
MIN_ROUTE_RECALCULATION_INTERVAL_SECONDS
MAX_ROUTE_AGE_SECONDS
DESTINATION_CHANGE_THRESHOLD_METERS
```

Do not scatter numeric values through the codebase.

---

# 18. Route Confidence

Every route should have a HATOD confidence score.

Potential factors:

```text
OSM road availability
Road freshness
Access restrictions
Motorcycle access
Historical HATOD usage
Provider agreement
Route geometry validity
Previous route failures
```

Example conceptual values:

```text
0.95 - 1.00 = very high
0.85 - 0.94 = high
0.70 - 0.84 = medium
< 0.70       = low
```

These values are configurable and must be validated during benchmarking.

---

# 19. Automatic Provider Fallback

Preferred flow:

```text
Route Request
     │
     ▼
Valhalla
     │
     ▼
Validate result
     │
 ┌───┴────┐
 │        │
Good     Poor
 │        │
 ▼        ▼
Return   GrabMaps
route      │
           ▼
        Validate
           │
           ▼
        Return
```

Fallback triggers:

* timeout
* server failure
* invalid response
* low confidence
* missing route
* unacceptable route
* configured special case

---

# 20. Provider Circuit Breaker

Each provider must have:

```text
timeout
retry policy
rate limit
circuit breaker
quota tracking
health status
```

Example:

```text
Valhalla timeout
     ↓
Retry
     ↓
Failure
     ↓
Circuit breaker
     ↓
GrabMaps
```

Prevent repeated requests to a failing provider.

---

# 21. GPS Architecture

Driver GPS remains inside HATOD infrastructure.

```text
Driver
   │
   ▼
HATOD API
   │
   ├── Redis
   ├── PostGIS
   └── RabbitMQ
          │
          ▼
       WebSocket
          │
     ┌────┴────┐
     ▼         ▼
   Rider     Driver
```

Do not send raw driver GPS to commercial routing providers unless required for a specific routing operation.

---

# 22. Driver GPS States

Use different GPS update policies depending on state.

### Offline

No GPS transmission.

### Available

Lower-frequency updates.

### Searching for passenger

Higher-frequency updates.

### En route to pickup

Higher-frequency updates.

### Active trip

High-frequency updates.

### Completed trip

Stop active tracking.

All intervals must be configurable.

---

# 23. GPS Configuration Constants

Create:

```text
GpsConstants
```

Examples:

```text
AVAILABLE_DRIVER_UPDATE_INTERVAL
SEARCHING_DRIVER_UPDATE_INTERVAL
EN_ROUTE_UPDATE_INTERVAL
ACTIVE_TRIP_UPDATE_INTERVAL
GPS_ACCURACY_THRESHOLD
GPS_STALE_AFTER_SECONDS
```

Exact values must be determined through battery, bandwidth, and dispatch testing.

---

# 24. Redis Responsibilities

Use Redis for high-frequency transient location state.

Examples:

```text
driver:location:{driverId}
driver:status:{driverId}
driver:availability:{driverId}
trip:live:{tripId}
route:lock:{tripId}
```

Do not write every GPS event directly to PostgreSQL synchronously.

---

# 25. RabbitMQ Responsibilities

Use RabbitMQ for asynchronous events.

Examples:

```text
driver.location.updated
driver.status.changed
ride.requested
ride.accepted
trip.started
trip.destination.changed
trip.completed
route.recalculation.requested
routing.fallback.triggered
```

Do not use RabbitMQ as the primary source of current driver location.

Redis/PostGIS should provide current state.

---

# 26. WebSocket Responsibilities

WebSocket is responsible for real-time client updates.

Examples:

```text
driver position
ride status
driver assigned
route changed
ETA changed
trip state
```

Flutter should not poll excessively for live-trip information.

---

# 27. Location Database

Maintain HATOD-owned location data.

Recommended entities:

```text
countries
provinces
cities
municipalities
barangays
service_areas
landmarks
pickup_points
popular_destinations
```

Use consistent location IDs.

Do not hardcode province/city/barangay strings throughout the application.

---

# 28. Location Assets

Store country/province/city/barangay datasets as controlled data assets.

Recommended flow:

```text
Location Data Asset
        ↓
Validation
        ↓
Seed
        ↓
PostgreSQL
        ↓
HATOD Location Service
```

Use stable IDs.

---

# 29. Location Search

Preferred:

```text
Rider searches
      ↓
HATOD Location DB
      ↓
Match found?
   /        \
 YES        NO
  │          │
  ▼          ▼
Return    External
result    fallback
```

External search should not be the default for every query.

Respect provider licensing and storage/caching restrictions.

---

# 30. Popular Places

Seed and maintain HATOD-managed places for:

* malls
* hospitals
* universities
* terminals
* markets
* government offices
* airports
* major transport hubs
* major establishments

This improves search speed and reduces external API usage.

---

# 31. Route Caching

Use Redis for route caching.

Conceptual key:

```text
route:{profile}:{origin}:{destination}:{routingVersion}
```

Normalize coordinates before cache key generation.

Do not over-round coordinates.

The normalization precision must be tested against route correctness.

---

# 32. Cached Route Data

Cache:

```text
distance
duration
geometry
provider
routingProfile
routingVersion
createdAt
expiresAt
```

Do not assume external provider responses can be cached indefinitely.

Follow provider terms.

---

# 33. Route Cache Invalidation

Invalidate or version cached routes when:

```text
OSM data changes
routing configuration changes
routing profile changes
provider configuration changes
major map update
route becomes stale
```

Use a routing data version in cache keys.

---

# 34. ETA Architecture

Do not expose raw provider ETA directly as the final HATOD ETA.

Use:

```text
Provider ETA
      +
HATOD historical travel data
      +
time-of-day information
      +
day-of-week information
      +
current conditions
      ↓
HATOD ETA
```

Return a normalized ETA.

Example:

```json
{
  "etaSeconds": 480,
  "distanceMeters": 3200
}
```

---

# 35. Fare Calculation Separation

Routing must not calculate fares.

Use:

```text
RoutingService
       ↓
distance + duration
       ↓
FareService
       ↓
fare
```

FareService owns:

```text
base fare
distance fare
time component
surge
promotions
discounts
```

This prevents map-provider dependencies from affecting pricing logic.

---

# 36. Driver Trip Tracks

Create a historical GPS tracking model.

Recommended logical table:

```text
driver_trip_tracks
```

Fields:

```text
id
trip_id
driver_id
latitude
longitude
accuracy
speed
heading
timestamp
created_at
```

Use appropriate indexes.

Do not permanently store unlimited high-frequency raw GPS data without a retention policy.

---

# 37. GPS Data Processing

Pipeline:

```text
Driver GPS
    ↓
Redis
    ↓
Realtime tracking
    ↓
Trip completed
    ↓
Async processing
    ↓
Track aggregation
    ↓
PostGIS
    ↓
Map matching
    ↓
Travel-time analytics
```

---

# 38. Map Matching

Use Valhalla map matching where appropriate.

Purpose:

```text
Raw GPS trace
     ↓
Map matching
     ↓
Actual road path
```

This allows HATOD to compare predicted routes against actual motorcycle routes.

---

# 39. Historical Travel Times

Build road/trip travel-time analytics.

Example:

```text
Road Segment A

Morning      12 min
Afternoon   10 min
5 PM        19 min
10 PM        8 min
```

Use historical HATOD data to improve ETA over time.

Do not immediately modify routing behavior based on insufficient data.

Require minimum sample sizes.

---

# 40. Routing Benchmark

Before production dependence on Valhalla, create a General Santos benchmark.

Target:

```text
500–1,000 routes
```

Cover:

* downtown
* barangays
* subdivisions
* national highways
* secondary roads
* rural roads
* terminals
* malls
* hospitals
* universities
* major landmarks
* short trips
* long trips
* motorcycle-specific roads
* one-way roads
* restricted roads

---

# 41. Benchmark Providers

Run the same test set against:

```text
Valhalla
GrabMaps
Mapbox
Google
HERE
```

The purpose is measurement, not assuming one provider is automatically correct.

---

# 42. Benchmark Metrics

Measure:

| Metric            | Description                    |
| ----------------- | ------------------------------ |
| Distance          | Route distance                 |
| ETA               | Estimated travel time          |
| Geometry          | Route shape                    |
| Road selection    | Which roads were selected      |
| Motorcycle access | Validity for motorcycle        |
| Missing roads     | Road absent from routing graph |
| Access errors     | Incorrect road restrictions    |
| Latency           | Response time                  |
| Availability      | Successful requests            |
| Cost              | Estimated provider cost        |
| Fallback          | Whether fallback was needed    |

---

# 43. Ground Truth

Provider-to-provider comparison is not sufficient.

Use actual motorcycle trip traces.

```text
Actual Driver GPS
       ↓
Map Matching
       ↓
Actual Road Path
       ↓
Compare
       ↓
Predicted Route
```

This becomes HATOD's real-world routing validation dataset.

---

# 44. Route Quality Metrics

Track:

```text
route_success_rate
route_failure_rate
route_fallback_rate
route_deviation_rate
motorcycle_access_error_rate
median_eta_error
p95_eta_error
median_route_latency
p95_route_latency
```

Do not create arbitrary claims such as "99% accurate" without benchmark evidence.

---

# 45. Infrastructure

Recommended early separation:

```text
VPS 1
├── HATOD API
├── Authentication
├── Dispatch
├── Messaging
└── WebSocket

VPS 2
├── PostgreSQL
├── PostGIS
├── Redis
└── RabbitMQ

Routing VPS
└── Valhalla
```

The exact CPU/RAM configuration must be determined through load testing.

Do not overprovision before measuring actual workload.

---

# 46. Valhalla Deployment

Valhalla should be deployed as an independent service.

Requirements:

```text
Docker
OSM regional data
Valhalla configuration
routing profile configuration
health endpoint
metrics
logs
```

Use General Santos/regional data initially.

Do not load the entire Philippines map into production unless necessary.

---

# 47. OSM Data Update Pipeline

Use:

```text
OSM source
   ↓
Regional extract
   ↓
Staging Valhalla
   ↓
Benchmark
   ↓
Validation
   ↓
Production Valhalla
```

Never blindly replace production routing data.

---

# 48. Routing Data Versioning

Every Valhalla deployment should expose:

```text
routingDataVersion
routingConfigVersion
routingEngineVersion
```

Include the routing version in route cache keys.

---

# 49. Monitoring

Create routing metrics:

```text
route_requests_total
route_success_total
route_failures_total

valhalla_requests_total
grabmaps_requests_total
mapbox_requests_total
google_requests_total
here_requests_total

fallback_total
fallback_rate

route_latency
route_p95_latency
route_p99_latency

cache_hits
cache_misses
cache_hit_rate

routing_cost_estimate

eta_error
```

---

# 50. Provider Health Dashboard

Display:

```text
Provider       Requests    Success    Failure    Latency
---------------------------------------------------------
Valhalla       XXXXX       XX%        XX%        XXms
GrabMaps       XXXXX       XX%        XX%        XXms
Mapbox         XXXXX       XX%        XX%        XXms
Google         XXXXX       XX%        XX%        XXms
HERE           XXXXX       XX%        XX%        XXms
```

Do not expose sensitive provider credentials.

---

# 51. Cost Monitoring

Every commercial routing request must be measurable.

Recommended logical model:

```text
routing_usage
```

Fields:

```text
id
provider
operation
request_count
estimated_cost
region
date
created_at
```

Monitor:

```text
commercial_requests_per_ride
fallback_requests_per_ride
estimated_routing_cost
cost_per_completed_trip
```

---

# 52. Cost Optimization Rules

Follow these rules:

1. PostGIS first for proximity.
2. Valhalla first for normal routing.
3. Do not call commercial matrix APIs for every candidate.
4. Do not route every GPS update.
5. Cache routes where legally and technically permitted.
6. Search HATOD location data first.
7. Use external geocoding/search only when needed.
8. Use commercial routing for fallback/special cases.
9. Monitor provider usage.
10. Keep provider adapters interchangeable.

---

# 53. Map Rendering vs Routing

Keep these concerns separate.

```text
Map Rendering
     │
     ├── map tiles
     ├── markers
     ├── polylines
     └── camera

Routing
     │
     ├── distance
     ├── ETA
     ├── route
     ├── matrix
     └── map matching
```

Changing the map renderer must not require rewriting dispatch or routing logic.

---

# 54. Flutter Map Architecture

Create a HATOD abstraction such as:

```text
MapService
```

and keep provider-specific implementation isolated.

Flutter should receive:

```text
DriverMarker
PickupMarker
DestinationMarker
RoutePolyline
MapCamera
```

rather than raw provider-specific objects.

---

# 55. Security

Commercial API keys must never be embedded in Flutter.

Correct:

```text
Flutter
   ↓
HATOD Backend
   ↓
Provider API
```

Credentials must be stored in backend secrets/configuration.

Never commit:

```text
API keys
AWS credentials
provider secrets
database passwords
```

to source control.

---

# 56. Configuration

Use constants/configuration rather than magic numbers.

Recommended groups:

```text
RoutingConstants
GpsConstants
DispatchConstants
CacheConstants
ProviderConstants
LocationConstants
BenchmarkConstants
MapConstants
```

Examples:

```text
MAX_DRIVER_SEARCH_RADIUS
MAX_ROUTE_DEVIATION_METERS
MAX_ROUTE_AGE_SECONDS
ROUTE_CACHE_TTL
VALHALLA_TIMEOUT
GRABMAPS_TIMEOUT
MAX_ROUTING_RETRIES
ROUTE_CONFIDENCE_THRESHOLD
GPS_STALE_AFTER_SECONDS
```

Configuration must be environment-aware:

```text
development
staging
production
```

---

# 57. Error Handling

Routing errors must be classified.

Example:

```text
ROUTE_NOT_FOUND
ROUTE_PROVIDER_TIMEOUT
ROUTE_PROVIDER_UNAVAILABLE
ROUTE_INVALID_RESPONSE
ROUTE_LOW_CONFIDENCE
ROUTE_ACCESS_RESTRICTION
ROUTE_INTERNAL_ERROR
```

Do not expose raw provider errors to users.

Flutter receives user-safe messages.

---

# 58. Observability

Every route request should have a correlation ID.

Example:

```text
requestId
tripId
riderId
driverId
provider
routingProfile
latency
result
fallback
```

Do not log unnecessary personal data.

---

# 59. Testing

## Unit Tests

Test:

```text
distance calculations
route normalization
provider selection
fallback logic
confidence scoring
cache keys
ETA calculation
configuration loading
```

## Integration Tests

Test:

```text
PostGIS → Dispatch
Dispatch → Routing
Routing → Valhalla
Routing → GrabMaps
RabbitMQ → WebSocket
Redis → Location
```

## Failure Tests

Simulate:

```text
Valhalla unavailable
GrabMaps unavailable
network timeout
invalid route
empty route
provider rate limit
Redis failure
RabbitMQ failure
PostGIS failure
```

---

# 60. Load Testing

Simulate increasing driver populations:

```text
100 drivers
500 drivers
1,000 drivers
2,000 drivers
5,000 drivers
```

Simulate:

* GPS updates
* ride requests
* driver matching
* route calculations
* active trips
* WebSocket updates
* messaging
* trip completion

Measure:

```text
CPU
RAM
PostGIS latency
Redis latency
RabbitMQ throughput
Valhalla latency
API latency
WebSocket connections
fallback rate
```

---

# 61. Realistic HATOD Load Test

The most important test is a realistic simulated operating day.

Example:

```text
2,000 drivers
+
multiple concurrent riders
+
GPS updates
+
ride requests
+
driver matching
+
route calculations
+
live trips
+
messaging
+
trip completion
```

Measure the complete system rather than testing routing alone.

---

# 62. General Santos Production Strategy

Start with:

```text
General Santos City
```

Do not initially attempt nationwide routing infrastructure.

Recommended expansion:

```text
General Santos
       ↓
Nearby/SOCCSKSARGEN coverage
       ↓
Other major Philippine cities
       ↓
Nationwide
```

The routing architecture must support expansion without redesign.

---

# 63. Production Decision Gate

Valhalla becomes the default production router only after benchmark validation.

Process:

```text
500–1,000 route benchmark
        ↓
General Santos
        ↓
Compare providers
        ↓
Evaluate route quality
        ↓
Evaluate ETA quality
        ↓
Evaluate latency
        ↓
Evaluate motorcycle access
        ↓
Evaluate fallback rate
        ↓
Production decision
```

Do not claim production route accuracy before this validation.

---

# 64. Long-Term Routing Architecture

```text
                    HATOD
                      │
          ┌───────────┴────────────┐
          │                        │
      Location                  Routing
       Engine                    Engine
          │                        │
      PostGIS                  Valhalla
          │                        │
          │                 Historical Data
          │                        │
          │                        ▼
          │                    HATOD ETA
          │
          ▼
     Driver Dispatch
          │
          ▼
      Live Tracking
```

Commercial providers:

```text
Valhalla
   ↓
Primary

GrabMaps
   ↓
Commercial fallback

Mapbox
   ↓
Secondary adapter

Google
   ↓
Secondary adapter

HERE
   ↓
Secondary adapter / benchmark
```

---

# 65. Recommended Backend Modules

Create these logical modules:

```text
location/
dispatch/
routing/
routing/providers/
routing/models/
routing/cache/
routing/benchmark/
routing/analytics/
gps/
tracking/
eta/
fare/
service_area/
```

---

# 66. Recommended Routing Domain Models

Create strongly typed models:

```text
Coordinate
RouteRequest
RouteResponse
RouteLeg
RouteWaypoint
RouteGeometry
RouteOptions
RouteProviderResult
RouteConfidence
RouteMatrixRequest
RouteMatrixResponse
MapMatchedTrack
RoutingUsage
RoutingBenchmarkResult
```

---

# 67. Recommended Services

```text
LocationService
RoutingService
DispatchService
GpsTrackingService
EtaService
FareService
RouteCacheService
RouteBenchmarkService
RouteAnalyticsService
ProviderHealthService
```

---

# 68. Important Separation of Responsibilities

### LocationService

Owns:

```text
places
cities
barangays
landmarks
service areas
search
geofencing
```

### DispatchService

Owns:

```text
driver discovery
candidate filtering
driver ranking
assignment
```

### RoutingService

Owns:

```text
routes
distance
ETA source data
matrix
map matching
provider fallback
```

### EtaService

Owns:

```text
ETA calculation
historical adjustments
```

### FareService

Owns:

```text
pricing
```

Do not combine these responsibilities.

---

# 69. No Provider Leakage

Business logic must never contain:

```text
if provider == google
if provider == grab
if provider == mapbox
```

Provider-specific behavior belongs inside provider adapters.

The only provider selection logic belongs in:

```text
RoutingProviderSelector
```

or equivalent infrastructure logic.

---

# 70. Provider Selection Policy

Conceptually:

```text
if normal route:
    Valhalla

if Valhalla unavailable:
    GrabMaps

if confidence low:
    GrabMaps

if configured special case:
    selected provider

if provider failure:
    fallback
```

The actual policy must be configurable.

---

# 71. Cost-Safety Mechanism

Implement a commercial API budget guard.

Example:

```text
daily provider budget
monthly provider budget
per-minute request limit
per-trip commercial request limit
```

If abnormal usage occurs:

```text
Alert
   ↓
Rate limit
   ↓
Fallback to self-hosted
   ↓
Investigate
```

Never allow a software bug to generate uncontrolled commercial API usage.

---

# 72. Routing Logs

Every request should log enough information to diagnose routing issues.

Example:

```text
requestId
tripId
provider
profile
origin
destination
distance
duration
confidence
latency
fallback
success
errorCode
routingVersion
createdAt
```

Avoid storing unnecessary sensitive information.

---

# 73. Route Quality Feedback

Allow internal/admin systems to flag bad routes.

Example:

```text
Route issue
├── Wrong road
├── Road unavailable
├── Motorcycle prohibited
├── Bad ETA
├── Missing road
├── Incorrect one-way
└── Other
```

Use these reports for routing data improvement.

---

# 74. Driver Feedback

After trips, optionally collect internal route-quality signals.

Example:

```text
Driver:
"Route was incorrect"

Reason:
Road closed
Road unavailable
Better motorcycle shortcut
Wrong access
Other
```

Aggregate these signals before changing routing rules.

---

# 75. Rider Feedback

Do not burden riders with routing questions on every trip.

Use targeted feedback only when useful:

```text
Route issue?
```

Possible categories:

```text
Wrong route
ETA inaccurate
Pickup road inaccessible
Destination incorrect
Other
```

---

# 76. Data Retention

Define retention policies for:

```text
raw GPS
aggregated GPS
route requests
route responses
routing logs
provider usage
benchmark data
```

High-volume data should have lifecycle management.

---

# 77. Privacy

Location data is sensitive.

Apply:

* access control
* encryption in transit
* encryption at rest where appropriate
* limited retention
* audit logging
* least-privilege access
* separation between operational and analytics access

Only authorized services/users should access detailed trip traces.

---

# 78. Deployment Environments

Maintain:

```text
development
staging
production
```

Each environment must have separate:

```text
database
Redis
RabbitMQ
routing configuration
provider credentials
API keys
```

Never use production provider credentials during development.

---

# 79. Docker Services

Conceptual development environment:

```text
docker-compose

postgres
postgis
redis
rabbitmq
valhalla
hatod-api
```

Optional:

```text
monitoring
logging
```

Production deployment may separate these services across VPS instances.

---

# 80. Development Sequence

Implement in this order:

```text
1. PostGIS foundation
2. LocationService
3. Routing domain models
4. RoutingProvider interface
5. Valhalla adapter
6. RoutingService
7. Route caching
8. Dispatch integration
9. GPS tracking
10. WebSocket tracking
11. GrabMaps adapter
12. Fallback logic
13. Benchmark framework
14. Route analytics
15. Historical ETA
16. Monitoring
17. Load testing
18. Production hardening
```

---

# 81. Definition of Done

Routing implementation is not complete until:

* [ ] PostGIS driver proximity works
* [ ] Valhalla routing works
* [ ] Motorcycle profile works
* [ ] Route normalization works
* [ ] Routing abstraction works
* [ ] GrabMaps fallback works
* [ ] Provider timeout works
* [ ] Circuit breaker works
* [ ] Route caching works
* [ ] GPS tracking works
* [ ] Route recalculation rules work
* [ ] Driver dispatch integration works
* [ ] ETA service works
* [ ] Routing metrics work
* [ ] Commercial usage is tracked
* [ ] 500–1,000 route benchmark exists
* [ ] General Santos benchmark is completed
* [ ] Load testing is completed
* [ ] Security review is completed
* [ ] Failure scenarios are tested
* [ ] Production monitoring is enabled

---

# 82. Final Architecture Decision

HATOD should use:

```text
                    HATOD
                      │
             ┌────────┴────────┐
             │                 │
          PostGIS           Valhalla
             │                 │
       Driver Matching      Primary Route
             │                 │
             └────────┬────────┘
                      │
                 RoutingService
                      │
             ┌────────┴─────────┐
             │                  │
          GrabMaps          Other Providers
          Fallback          Mapbox/Google/HERE
             │
             ▼
          HATOD ETA
             │
             ▼
        Rider / Driver
```

This architecture intentionally avoids making HATOD dependent on a single mapping provider.

The system should begin with General Santos, validate actual motorcycle routing quality using 500–1,000 representative routes and real driver GPS traces, then expand geographically.

The primary optimization is:

> **Use HATOD infrastructure for location intelligence and self-hosted routing; use commercial routing selectively where it provides additional value.**

This keeps routing cost predictable while preserving a commercial safety net for route quality and availability.
