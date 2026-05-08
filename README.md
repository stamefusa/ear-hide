# EarController

EarController is a small location-aware controller for an ATOM Lite and DRV8833 motor driver. The web app sends BLE commands, and the firmware drives an N20 motor for short, bounded movements.

## Repository Layout

- `docs/SystemRequirements.md`: source requirements
- `src/`: React + TypeScript web app
- `firmware/EarController/EarController.ino`: Arduino IDE sketch for ATOM Lite
- `package.json`: web app scripts and dependencies

## Setup

### Web App

Install dependencies and run the local development server with:

```sh
npm install
npm run dev
```

Build the production bundle with:

```sh
npm run build
```

Web Bluetooth and geolocation require HTTPS or `localhost`. For phone testing, serve the app over HTTPS from a reachable host, or use a development tunnel that provides HTTPS.

### Android Chrome Notes

- Use Android Chrome with Web Bluetooth support.
- Grant location permission when prompted.
- Keep Bluetooth and location services enabled on the phone.
- Pairing from Android settings is not required; connect from the app.
- BLE device filtering should prefer the device name `EarController`.

## BLE Communication Spec

Device name:

```text
EarController
```

GATT service:

```text
7b15f8d0-7f5b-4c4b-9a5f-7f0f2c2c0001
```

Command characteristic:

```text
7b15f8d0-7f5b-4c4b-9a5f-7f0f2c2c0002
```

The app writes UTF-8 command strings to the command characteristic:

```text
RETRACT:<durationMs>
RELEASE:<durationMs>
STOP
PING
```

Examples:

```text
RETRACT:1500
RELEASE:800
STOP
PING
```

Firmware behavior:

- `RETRACT:<durationMs>` runs the motor in the take-up direction.
- `RELEASE:<durationMs>` runs the motor in the loosen direction.
- `STOP` stops the motor immediately.
- `PING` is accepted as a no-op connection check.
- Invalid or unknown commands are ignored.
- Durations must be positive integers.
- Durations above `3000` ms are clamped to `3000` ms.
- A valid new movement stops the current movement before starting.

## Operating Modes

The web app provides three modes:

- Production mode: map, center point, current location, threshold checks, BLE connection, one automatic take-up action after repeated threshold exceedance, manual loosen and stop controls.
- Distance test mode: map and location threshold checks without BLE communication.
- Motor test mode: BLE connection and manual take-up, loosen, and stop controls without map or location tracking.

## Wiring

Connect the DRV8833 and ATOM Lite as follows:

| DRV8833 | ATOM Lite |
| --- | --- |
| AIN1 | G19 |
| AIN2 | G33 |
| STBY | G22 |
| GND | GND |

Also connect the motor power ground to ATOM Lite ground so all grounds are common.

Motor direction can vary by wiring. If the physical direction is reversed, swap AIN1/AIN2 behavior in firmware or swap the motor leads.

## Firmware Flashing

1. Open `firmware/EarController/EarController.ino` in Arduino IDE.
2. Install the ESP32 board package if it is not already installed.
3. Select the ATOM Lite compatible ESP32 board target and the correct serial port.
4. Build and upload the sketch.
5. After reset, scan for the BLE device named `EarController`.

Firmware constants:

| Setting | Value |
| --- | --- |
| Max drive duration | `3000` ms |
| PWM value | `180` |
| AIN1 pin | `19` |
| AIN2 pin | `33` |
| STBY pin | `22` |

## Safety Notes

- Test with the motor mechanically unloaded first.
- Keep each movement short and verify that `STOP` works before attaching the mechanism.
- The firmware stops the motor on boot, BLE disconnect, `STOP`, and elapsed duration.
- The firmware uses a non-blocking `millis()` stop timer so BLE events can still be handled.
- Use an external motor power source sized for the motor, and share ground with ATOM Lite.
- Do not exceed the motor driver or motor current ratings.

## Verification Steps

### Firmware

1. Flash the sketch to ATOM Lite.
2. Confirm that `EarController` appears in a BLE scanner or the web app.
3. Write `PING` and confirm the connection stays active.
4. Write `RETRACT:500` and confirm the motor runs briefly, then stops.
5. Write `RELEASE:500` and confirm the opposite movement, then stop.
6. While the motor is running, write `STOP` and confirm it stops immediately.
7. Write `RETRACT:9999` and confirm the movement is bounded to about 3 seconds.
8. Disconnect BLE while the motor is running and confirm it stops.

### Web App

1. Run the app with `npm run dev`.
2. Open it from Android Chrome over HTTPS or `localhost`.
3. Grant location permission.
4. Connect to `EarController`.
5. Verify the motor test controls send `RETRACT`, `RELEASE`, and `STOP`.
6. In distance test mode, set a center point and confirm the threshold status changes with location updates.
7. In production mode, verify automatic take-up occurs only after the configured consecutive threshold count and does not repeat until state reset.
