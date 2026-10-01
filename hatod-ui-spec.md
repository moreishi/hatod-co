# HATOD - Flutter UI Replication Spec
> Source of truth: composite board `screen-b949d7e2-56e4-4349-a5c9-7596ecc78cdf.png` 1312x1199 + `screens/*.jpg` 572x1024 each
> Target: Flutter (Android first, iOS-style mocks must be adapted to Material + edge-to-edge)
> App: HATOD - Ride Safe. Go Further. Motorcycle hailing, PH (+63, General Santos City, PHP ₱, GCash)
> No code in this file. Measurements are spec only.

## 0. Board Overview

- Board: 1312x1199, white #FFFFFF, 3 rows, 24 phone mockups
- Row1 (Y~30 H~325): 1 Splash, 2 Welcome, 3 Sign Up, 4 OTP, 5 Create Profile, 6 Permissions, 7 Login = 7 phones
- Row2 (Y~392 H~318): 8 Home/Map, 9 Set Pickup, 10 Set Destination, 11 Confirm Ride, 12 Searching, 13 Driver Found, 14 Driver Arriving, 15 On Trip, 17 Ride Completed = 9 phones (label 16 missing)
- Row3 (Y~755 H~425): 18 Chat, 19 Chat Notification, 20 Messages, 21 Profile, 22 Edit Profile, 23 Ride History, 24 Wallet, 26 Help = 8 phones (label 25 missing)
- All phones show iOS `9:41` status mock, not Android. Thumbnail scale ~0.3x. For build use 375x812 logical. Thumbnail px x2.8-3.2 = 1x.
- Confidence: HIGH on structure/flow, MEDIUM on tokens/1x sizes, LOW on thumbnail-absolute px/shadows.

## 1. Information Architecture / Navigation Structure

```
AuthStack (no bottom nav)
├── 01-splash
├── 02-welcome (Get Started -> signup, Log In -> login)
├── 03-signup (phone -> otp)
├── 04-otp (success -> create-profile)
├── 05-create-profile (Continue -> permissions)
├── 06-permissions (Allow / Maybe Later -> home)
└── 07-login (Log In -> home)

MainScaffold (bottom nav: Home / History / Messages / Profile) - UNIFY, mocks vary
├── HomeTab
│   ├── 08-home-map
│   └── RideFlow (fullscreen, map + bottom sheet)
│       ├── 09-set-pickup
│       ├── 10-set-destination
│       ├── 11-confirm-ride
│       ├── 12-searching
│       ├── 13-driver-found
│       ├── 14-driver-arriving
│       ├── 15-on-trip
│       └── 17-ride-completed
├── HistoryTab
│   └── 23-ride-history (tabs: Completed / Cancelled)
├── MessagesTab
│   ├── 20-messages-list
│   └── 18-chat-with-driver
├── ProfileTab
│   ├── 21-profile (menu)
│   ├── 22-edit-profile
│   ├── 24-wallet
│   └── 26-help-support
```

Missing specs to create: 16-cancel-ride (reason + fee), 25-settings-notifications. Also needed: no-driver-found, offline, GPS-off, payment-failed, empty states.

## 2. Design Tokens

### 2.1 Colors
| Token | HEX | Usage | Confidence |
|---|---|---|---|
| board-bg | #FFFFFF | board | HIGH |
| primary | #0E4D2E | buttons, wallet hero, chat outgoing, splash bg | MEDIUM |
| primary-deep | #0B2E23 | searching bg | MEDIUM |
| accent | #FFC400 | Get Started only, splash bike | MEDIUM |
| ink | #111827 | titles | MEDIUM |
| secondary | #475467 / #6B7280 | subtitles, hints | MEDIUM |
| muted | #98A2B3 | placeholders, nav inactive | MEDIUM |
| border | #D0D5DD / #E5E7EB | inputs, cards | MEDIUM |
| divider | #F2F4F7 | list separators | LOW |
| map-base | #EDEBE3 | map tiles + #DDE8D5 parks | LOW |
| route | #2563EB | polyline | MEDIUM |
| success | #16A34A | check, ETA, Driver Found dot | MEDIUM |
| danger | #D92D20 | Cancel text/border | MEDIUM |
| chat-in | #F2F4F7 | incoming bubble | MEDIUM |

### 2.2 Spacing / Radius / Size
```
spacing: 4 / 8 / 12 / 16 / 24 (8pt system)
screen padding: 16-20px px-4/px-5
field gap: 12-16px space-y-3/4
card padding: 12-16px p-3/p-4
button: w-full h-[50px] rounded-[12px]
input: w-full h-[48px] rounded-[10px]
otp box: 48x56 rounded-[10px] gap-8
avatar: 48 list, 76 header, rounded-full
bottom nav: h-[68px] + safe-area
phone frame (board only): rounded-[20px] border + shadow
card radius: 16, sheet top: 20, button: 12, input: 10
```

Shadows (estimated, LOW):
```
phone-vs-board: x0 y4 blur16 black 10%
sheet/card: x0 y-2 blur12 black 8%
pin/FAB: y2 blur6 15%
button: flat or y1 blur2 6%
```

### 2.3 Typography
Family unknown, use sans-serif grotesk (Inter / Plus Jakarta style). Do not claim exact.

| Style | Size 1x | Weight | Color | Align |
|---|---|---|---|---|
| screen title | 18-20 | 700 | #111827 | left, centered on Confirm/OnTrip |
| subtitle/body | 14 | 400 | #475467 | left |
| button | 15-16 | 600-700 | white / black on accent | center |
| caption/ETA/link | 12-13 | 400-500 | grey / green / red | left / right |
| price/amount | 16-24 | 700 tabular | ink / white on green | right / left |
| bottom nav | 11 | 500 | active green inactive grey | center |
| board labels | 11 board | 600 | #111 | left |

Line-height 1.3-1.5, letter-spacing 0.

## 3. General Components (Tailwind-style spec, no code)

### Button primary
```text
w-full h-[50px] px-4 rounded-[12px] bg-[#0E4D2E] text-white text-[16px] font-semibold
```
Variants: accent `bg-[#FFC400] text-black`, secondary `bg-white border text-[#101828]`, danger-outline `bg-white border-[#F97066] text-[#D92D20]`, small pill `h-[36px] rounded-[10px] px-3 text-[14px]`.

Labels: Continue, Request Ride, Next, Save, Log In, Allow Location, Top Up, Rate Driver, Get Started (accent only).

### Input
```text
w-full h-[48px] px-3 rounded-[10px] border border-[#D0D5DD] text-[14px] placeholder-[#98A2B3]
```
Leading icon 20px + gap 8px. Types: phone (+63 prefix + flag), password (lock + eye), search (pin), text (Full Name), chat (rounded-full + send FAB 48px green circle paper-plane white).

### OTP
```text
flex-row gap-2 justify-center / box w-[48px] h-[56px] rounded-[10px] border text-[20px] font-semibold text-center
```
Numeric keyboard, SMS autofill, resend timer 00:45, error state required (not mocked).

### Header
Auth: `Row back-24 + Column title-18/700 + subtitle-14/grey`. Trip: `back + centered title-16/600`. Map: `hamburger-24 + HATOD logo center + controls right`.

### Bottom sheet (map flow)
```text
w-full bg-white rounded-t-[20px] p-4 shadow-up / handle 40x4 + Where to? + rows + CTA
```

### Driver card
```text
w-full p-3 rounded-[16px] bg-white border shadow-sm flex-row gap-3
avatar 48 rounded-full + Col name-15/600 rating-12 grey plate-12 grey ETA-13 green/600 + Row Message/Cancel pills
```
Vehicle line: `Honda Click | GAK 1234`, ETA `2 min - 0.3 km`.

### Fare / location rows
`Row icon-pin + Col label-12 grey + address-14/500 + Change link green`. Fare hero `₱45-60 (est.) 20/700 center + Motorcycle 1 rider 1 seat`.

### Lists (history/messages/profile/help/wallet)
`h-[56-64px] Row icon-24/avatar-48 + Col title-15/500 + sub-12 grey + trailing price-14/700 or chevron + divider #F2F4F7`.

Tabs: `Completed / Cancelled` underline green active.

### Wallet hero
```text
w-full p-4 rounded-[16px] bg-[#0E4D2E] text-white / label-12 + amount-24/700 + Top Up button white/green
```
Payment methods: Cash Default selected green radio, GCash Not linked, + Add Payment Method.

### Bottom nav
```text
h-[68px] bg-white border-t flex-row 4x icon-24 + label-11
```
Unify to Home / History / Messages / Profile. Active #0E4D2E.

### Badges / markers
Success check 64 green solid white check, online dot green 10px, map pin 32 teardrop green + shadow, radar concentric circles + bike glyph on deep green.

### Chat
Bubbles `max-w-[75%] p-2.5 rounded-[14px] incoming #F2F4F7 left / outgoing #0E4D2E white right + time-11 grey`. Input pinned bottom with SafeArea.

## 4. Screen-by-Screen (what AI must build)

1. Splash: fullscreen #0E4D2E, center bike white + HATOD 32/800 white + tagline 14 white.
2. Welcome: photo cover top 70% + scrim, HATOD green center-top, headline Fast.Safe.Reliable 20/700, sub 14, bottom Get Started accent + Log In black-outline + Already have account 12.
3. Sign Up: title Create your account + phone input + Continue + Terms links + or + Google button.
4. OTP: title Verify your number + sent-to +63 912... + 6 boxes + Resend 00:45 + custom keypad (replace with OS numeric on Android).
5. Create Profile: avatar 76 + camera badge + Full Name input + Profile Photo Add + Continue.
6. Permissions: illustration map + pin, Allow Location primary + Maybe Later outline. On Android implement rationale + system FINE_LOCATION dialog.
7. Login: Welcome back! + phone input + password + Forgot right + Log In + or + Google.
8. Home/Map: map full + top search card (Where are you going? + Current + Enter dest) + recenter FAB + bottom nav.
9. Set Pickup: map + Current Location chip + center pin + Where to? sheet (destination + SM/KCC/Tuna + Next).
10. Set Destination: route blue + Pickup/Drop chips + Destination KCC + Change + fare ₱45-60 + Request Ride.
11. Confirm Ride: pickup/dest rows + Motorcycle card + fare hero + Cash/Change + Request Ride.
12. Searching: deep bg, radar animation, Finding a driver... + Cancel.
13. Driver Found: map + sheet Driver Found + Carlos Reyes 4.9 (120 rides) + Honda Click GAK 1234 + ETA 3 min + Message/Cancel.
14. Driver Arriving: same + route + Arriving soon + ETA 2 min 0.3km.
15. On Trip: header On Trip + route + driver row + ETA + Message/Cancel.
17. Ride Completed: check + Thank you + Total ₱58.00 (Base 45 Service 5 Tip 8) + Cash Paid + Rate Driver + View Receipt.
18. Chat: header Carlos Online + bubbles (pickup, Okay minute green, Got it) + input + send.
19. Push example: lock screen 9:41 Mon Sep 29 + HATOD card New message... (do not build as screen, build notification payload).
20. Messages: title + list Carlos/Juan/Driver Support/Maria + time + preview + nav.
21. Profile: avatar 76 Juan Dela Cruz +63... + menu Ride History/Payment/Wallet 120/Settings/Help + nav.
22. Edit Profile: photo + Full Name Juan + Phone + Email + Save.
23. Ride History: tabs + rows KCC Mall ₱58 etc + date/time.
24. Wallet: balance ₱120 Top Up + Transaction History + Cash Default / GCash + Add.
26. Help: FAQs/Contact/Report/About 1.0.0 + footer logo.

## 5. Layout Hierarchy Template

```
Scaffold (bg white, resizeToAvoidBottomInset true)
├── SafeArea
│   ├── Header (48px, back/title or map controls)
│   ├── Body Expanded
│   │   ├── Form: Column px-4 gap-3 (title, sub, inputs, Spacer, CTA)
│   │   ├── MapFlow: Stack (Map fill + Sheet bottom + Pin center + FAB)
│   │   └── List: ListView px-4 (rows + dividers)
│   └── Footer (CTA p-4 or NavigationBar 68px)
└── PhoneFrame (board preview only): AspectRatio 9/19.5 ClipRRect 20 Border Shadow
```

Positioning: Column/Row/Stack/Expanded/Spacer/Align/ListView. No absolute X/Y except map pin center. Board grid: Column(Row labels, Row phones).

## 6. Flutter Mapping (concepts, not code)

Screen=Scaffold, vertical=Column, horizontal=Row, map+sheet=Stack, scroll=SingleChildScrollView/ListView, card=Container+borderRadius+border+shadow, button=SizedBox full-width + FilledButton style, input=TextField+InputDecoration, OTP=Row+TextField+inputFormatters, image=Image cover/contain, avatar=CircleAvatar, nav=NavigationBar, badge=Badge/Container dot.

## 7. Responsive + Android

- Board: >=1100px 9-across, 800-1100 4-5 wrap, <600 2-across + scroll. Text inside thumbs not scalable.
- App 1x: padding fixed 16-20, buttons/cards fluid w-full, maps expand, lists scroll, nav fixed, keyboard resizes.
- Android: transparent status/nav, SystemUiOverlay dark-on-light / light-on-dark splash, SafeArea+gesture insets, runtime location permission, numeric OTP + SMS Retriever, back handling, NavigationBar indicator green tint, google_maps_flutter + my-location + sheet drag.
- Text wrap max 2 lines + ellipsis for addresses/chat/history.

## 8. Build Checklist for AI

- [ ] Tokens (colors, type, spacing, radius) as constants
- [ ] Components: buttons, inputs, OTP, header, sheet, driver-card, list-row, wallet-hero, chat-bubble, bottom-nav, badges, pins
- [ ] AuthStack 7 screens + validation/error/loading states (not mocked)
- [ ] RideFlow 8 screens + states: searching timeout, no-driver, driver-cancel, SOS/share-trip (missing, required for moto)
- [ ] Tabs: history/messages/profile/edit/wallet/help + empty states
- [ ] Maps + route + ETA + fare quote contracts
- [ ] Payments: cash/GCash select before request, tip select before completion (mock shows tip only after)
- [ ] Notifications payload for chat
- [ ] Verify against screens/*.jpg 572x1024, not thumbnails
