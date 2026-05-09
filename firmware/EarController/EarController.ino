#include <Arduino.h>
#include <BLEDevice.h>
#include <BLEServer.h>
#include <BLEUtils.h>

constexpr char BLE_DEVICE_NAME[] = "EarController";
constexpr char SERVICE_UUID[] = "7b15f8d0-7f5b-4c4b-9a5f-7f0f2c2c0001";
constexpr char COMMAND_CHAR_UUID[] = "7b15f8d0-7f5b-4c4b-9a5f-7f0f2c2c0002";

constexpr uint8_t PIN_AIN1 = 19;
constexpr uint8_t PIN_AIN2 = 33;
constexpr uint8_t PIN_STBY = 22;

constexpr uint16_t MAX_DRIVE_DURATION_MS = 10000;
constexpr uint8_t DEFAULT_PWM = 255;

constexpr uint8_t PWM_CHANNEL_AIN1 = 0;
constexpr uint8_t PWM_CHANNEL_AIN2 = 1;
constexpr uint16_t PWM_FREQUENCY_HZ = 20000;
constexpr uint8_t PWM_RESOLUTION_BITS = 8;

bool motorRunning = false;
unsigned long stopAtMs = 0;

void stopMotor();
void retract(uint16_t durationMs);
void releaseTape(uint16_t durationMs);
void handleCommand(String command);
bool configureMotorPwm();

uint16_t clampDuration(uint32_t durationMs) {
  if (durationMs == 0) {
    return 0;
  }

  if (durationMs > MAX_DRIVE_DURATION_MS) {
    return MAX_DRIVE_DURATION_MS;
  }

  return static_cast<uint16_t>(durationMs);
}

bool parseDuration(const String &value, uint16_t &durationMs) {
  if (value.length() == 0) {
    return false;
  }

  uint32_t parsed = 0;
  for (size_t index = 0; index < value.length(); index++) {
    char current = value.charAt(index);
    if (!isDigit(current)) {
      return false;
    }

    if (parsed <= MAX_DRIVE_DURATION_MS) {
      parsed = (parsed * 10) + static_cast<uint32_t>(current - '0');
    }
  }

  durationMs = clampDuration(parsed);
  return durationMs > 0;
}

void writeMotorPins(uint8_t ain1Pwm, uint8_t ain2Pwm, bool standbyEnabled) {
  digitalWrite(PIN_STBY, standbyEnabled ? HIGH : LOW);

#if defined(ESP_ARDUINO_VERSION_MAJOR) && ESP_ARDUINO_VERSION_MAJOR >= 3
  ledcWrite(PIN_AIN1, ain1Pwm);
  ledcWrite(PIN_AIN2, ain2Pwm);
#else
  ledcWrite(PWM_CHANNEL_AIN1, ain1Pwm);
  ledcWrite(PWM_CHANNEL_AIN2, ain2Pwm);
#endif
}

bool configureMotorPwm() {
#if defined(ESP_ARDUINO_VERSION_MAJOR) && ESP_ARDUINO_VERSION_MAJOR >= 3
  return ledcAttach(PIN_AIN1, PWM_FREQUENCY_HZ, PWM_RESOLUTION_BITS) &&
         ledcAttach(PIN_AIN2, PWM_FREQUENCY_HZ, PWM_RESOLUTION_BITS);
#else
  ledcSetup(PWM_CHANNEL_AIN1, PWM_FREQUENCY_HZ, PWM_RESOLUTION_BITS);
  ledcSetup(PWM_CHANNEL_AIN2, PWM_FREQUENCY_HZ, PWM_RESOLUTION_BITS);
  ledcAttachPin(PIN_AIN1, PWM_CHANNEL_AIN1);
  ledcAttachPin(PIN_AIN2, PWM_CHANNEL_AIN2);
  return true;
#endif
}

void stopMotor() {
  writeMotorPins(0, 0, false);
  motorRunning = false;
  stopAtMs = 0;
}

void startMotor(uint8_t ain1Pwm, uint8_t ain2Pwm, uint16_t durationMs) {
  uint16_t safeDurationMs = clampDuration(durationMs);
  if (safeDurationMs == 0) {
    return;
  }

  stopMotor();
  stopAtMs = millis() + safeDurationMs;
  motorRunning = true;
  writeMotorPins(ain1Pwm, ain2Pwm, true);
}

void retract(uint16_t durationMs) {
  startMotor(DEFAULT_PWM, 0, durationMs);
}

void releaseTape(uint16_t durationMs) {
  startMotor(0, DEFAULT_PWM, durationMs);
}

void handleTimedStop() {
  if (!motorRunning) {
    return;
  }

  if (static_cast<long>(millis() - stopAtMs) >= 0) {
    stopMotor();
  }
}

void handleCommand(String command) {
  command.trim();

  if (command == "STOP") {
    stopMotor();
    return;
  }

  if (command == "PING") {
    return;
  }

  const int separatorIndex = command.indexOf(':');
  if (separatorIndex < 0) {
    return;
  }

  const String action = command.substring(0, separatorIndex);
  const String durationValue = command.substring(separatorIndex + 1);

  uint16_t durationMs = 0;
  if (!parseDuration(durationValue, durationMs)) {
    return;
  }

  if (action == "RETRACT") {
    retract(durationMs);
    return;
  }

  if (action == "RELEASE") {
    releaseTape(durationMs);
  }
}

class ServerCallbacks : public BLEServerCallbacks {
  void onDisconnect(BLEServer *server) override {
    stopMotor();
    server->startAdvertising();
  }
};

class CommandCallbacks : public BLECharacteristicCallbacks {
  void onWrite(BLECharacteristic *characteristic) override {
    String command = characteristic->getValue().c_str();
    handleCommand(command);
  }
};

void setup() {
  pinMode(PIN_STBY, OUTPUT);
  configureMotorPwm();

  stopMotor();

  BLEDevice::init(BLE_DEVICE_NAME);
  BLEServer *server = BLEDevice::createServer();
  server->setCallbacks(new ServerCallbacks());

  BLEService *service = server->createService(SERVICE_UUID);
  BLECharacteristic *commandCharacteristic = service->createCharacteristic(
      COMMAND_CHAR_UUID,
      BLECharacteristic::PROPERTY_WRITE | BLECharacteristic::PROPERTY_WRITE_NR);
  commandCharacteristic->setCallbacks(new CommandCallbacks());

  service->start();

  BLEAdvertising *advertising = BLEDevice::getAdvertising();
  advertising->addServiceUUID(SERVICE_UUID);
  advertising->setScanResponse(true);
  advertising->start();
}

void loop() {
  handleTimedStop();
  delay(1);
}
