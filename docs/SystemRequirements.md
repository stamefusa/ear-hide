# 耳収納装置 ソフトウェア仕様書・Codex実装指示書

## 1. 目的

Android Chrome上で動作するWebアプリを作成する。

Webアプリ上に地図を表示し、ユーザーが指定した中心点と現在地の距離を計算する。現在地が中心点から設定距離以上離れた場合、Web Bluetooth経由でATOM Liteへコマンドを送信する。

ATOM Liteは受信したBLEコマンドに応じてDRV8833を制御し、N20モータを駆動する。モータでテープを巻き取り、帽子に取り付けた耳を収納する。

耳を収納する動作は自動化する。収納後、テープをゆるめて耳を再装着できるよう、Webアプリ上のボタンから手動で逆回転操作できるようにする。

コード、変数名、画面表示、BLEデバイス名、README、コメントなどには、特定の商標名を含めないこと。特に Disney や Mickey などの語は使用しないこと。

## 2. 前提

### 2.1 スマートフォン側

- Android Chromeで動作させる
- Webアプリとして実装する
- 可能な限りクライアントのみで完結させる
- サーバ側にデータを保存しない
- HTTPSまたはlocalhostで動作させる
- Web Bluetooth APIを使用する
- Geolocation APIを使用する
- 地図はLeaflet + OpenStreetMapを使用する

### 2.2 ATOM Lite側

- ATOM Liteを使用する
- Arduino IDEで開発する
- BLE GATTサーバーとして動作する
- モータドライバはDRV8833を使用する
- モータはN20モータを使用する
- モータ速度はATOM Lite側の固定値とする
- スマホ側からは方向と駆動時間のみを指定する

## 3. 全体構成

### 3.1 Webアプリ

- React + TypeScript + Viteで実装する
- 単一ページアプリとして実装する
- 地図表示
- 中心点設定
- 現在地取得
- 距離計算
- しきい値判定
- BLE接続
- BLEコマンド送信
- 動作モード切り替え
- 状態表示
- 手動モータ操作

### 3.2 ATOM Lite

- BLE接続待機
- コマンド受信
- DRV8833制御
- モータ正転
- モータ逆転
- モータ停止
- 最大駆動時間による安全停止

## 4. 動作モード

Webアプリには以下の3モードを用意する。

### 4.1 本番モード

- 地図を表示する
- ユーザーが地図上をタップして中心点を設定できる
- 現在地を5秒おきに取得する
- 中心点と現在地の距離を計算する
- 距離がしきい値以上になった場合、しきい値超過としてカウントする
- しきい値超過が連続して指定回数に達した場合、ATOM Liteへ収納コマンドを送信する
- 収納コマンド送信後は「収納済み」状態にする
- 収納済み状態では、再度しきい値を超えても収納コマンドを送信しない
- 収納済み状態から未収納状態へ戻すには、ユーザーが状態リセットボタンを押す必要がある
- 本番モードでも、手動でゆるめ・停止を実行できる

### 4.2 距離判定テストモード

- BLE接続は行わない
- 地図を表示する
- ユーザーが地図上をタップして中心点を設定できる
- 現在地を5秒おきに取得する
- 中心点と現在地の距離を計算する
- 距離がしきい値以上になったら画面上に「しきい値を超えました」と表示する
- ATOM Liteへの通信は行わない

### 4.3 モータ動作テストモード

- 地図と現在地取得は使用しない
- BLE接続を行う
- 画面上のボタンから以下を実行できる
  - 巻き取り
  - ゆるめ
  - 停止
- 各ボタン押下時にATOM LiteへBLEコマンドを送信する

## 5. Webアプリ画面仕様

### 5.1 共通表示

以下を表示する。

- 現在のモード
- BLE接続状態
- 現在地の緯度経度
- 中心点の緯度経度
- 現在距離
- しきい値距離
- 連続しきい値超過回数
- 収納状態
- エラーメッセージ
- 最後に送信したBLEコマンド

### 5.2 地図表示

- Leafletで地図を表示する
- OpenStreetMapのタイルを利用する
- 中心点をマーカーで表示する
- 現在地をマーカーで表示する
- 中心点からしきい値距離の円を表示する
- 地図をタップすると中心点を更新する
- 「現在地を中心点にする」ボタンを用意する

### 5.3 設定項目

以下の設定を画面上で変更できるようにする。

- しきい値距離
  - 単位はm
  - 初期値は2000
  - 想定調整範囲は1000〜3000m程度
- 位置取得間隔
  - 単位はms
  - 初期値は5000
- 連続超過判定回数
  - 初期値は3
- 巻き取り時間
  - 単位はms
  - 初期値は1500
- ゆるめ時間
  - 単位はms
  - 初期値は800

### 5.4 操作ボタン

以下のボタンを用意する。

- BLE接続
- BLE切断
- 巻き取り
- ゆるめ
- 停止
- 状態リセット
- 現在地を中心点にする

## 6. 距離判定仕様

### 6.1 距離計算

中心点と現在地の距離はHaversine式で計算する。

### 6.2 判定

現在距離がしきい値距離以上の場合、しきい値超過とする。

GPSの一時的なブレによる誤作動を防ぐため、1回の超過では自動収納しない。

以下の条件をすべて満たした場合のみ、自動収納する。

- 本番モードである
- BLE接続済みである
- 中心点が設定済みである
- 現在地が取得済みである
- 収納済み状態ではない
- 現在距離がしきい値距離以上である
- 連続超過回数が設定値以上である

自動収納が実行された場合、収納済み状態へ遷移する。

しきい値未満の位置情報を取得した場合、連続超過回数は0に戻す。

### 6.3 状態

収納状態は以下を持つ。

- READY
  - 未収納
  - 自動収納可能
- RETRACTED
  - 収納済み
  - 自動収納不可
- ERROR
  - エラー発生

状態リセットボタンを押すと、READYへ戻す。

## 7. BLE通信仕様

### 7.1 デバイス名

ATOM LiteのBLEデバイス名は以下とする。

- EarController

### 7.2 GATT

独自Service UUIDとCharacteristic UUIDを定義する。

以下のUUIDを使用する。

- SERVICE_UUID: 7b15f8d0-7f5b-4c4b-9a5f-7f0f2c2c0001
- COMMAND_CHAR_UUID: 7b15f8d0-7f5b-4c4b-9a5f-7f0f2c2c0002

### 7.3 コマンド形式

WebアプリからATOM LiteへUTF-8文字列を書き込む。

スマホ側からモータ速度は指定しない。速度はATOM Lite側の固定値を使用する。

コマンド形式は以下とする。

- RETRACT:<durationMs>
- RELEASE:<durationMs>
- STOP
- PING

例:

- RETRACT:1500
- RELEASE:800
- STOP
- PING

### 7.4 コマンド意味

- RETRACT
  - 巻き取り方向にモータを回す
- RELEASE
  - ゆるめ方向にモータを回す
- STOP
  - モータを即時停止する
- PING
  - 接続確認用

### 7.5 バリデーション

ATOM Lite側では受信したコマンドを検証する。

- durationMsが未指定、不正、0以下の場合は実行しない
- durationMsが最大駆動時間を超える場合は最大駆動時間に丸める
- 未知のコマンドは無視する
- 新しいコマンドを受け取った場合は、現在のモータ動作を停止してから新しい動作を開始する

## 8. ATOM Lite側仕様

### 8.1 ピン設定

DRV8833との接続は以下とする。

- DRV8833 AIN1: ATOM Lite G19
- DRV8833 AIN2: ATOM Lite G33
- DRV8833 STBY: ATOM Lite G22
- DRV8833 GND: ATOM Lite側GNDと共通化する
- モータ電源GNDもATOM Lite側GNDと共通化する

### 8.2 モータ方向

以下のように制御する。

巻き取り方向:

- STBY: HIGH
- AIN1: PWM出力
- AIN2: LOW

ゆるめ方向:

- STBY: HIGH
- AIN1: LOW
- AIN2: PWM出力

停止:

- AIN1: LOW
- AIN2: LOW
- STBY: LOW

実機で回転方向が逆だった場合は、AIN1とAIN2の制御を入れ替えるか、モータ配線を入れ替える。

### 8.3 定数

ATOM Lite側には以下の定数を定義する。

- MAX_DRIVE_DURATION_MS = 3000
- DEFAULT_PWM = 180
- BLE_DEVICE_NAME = EarController
- PIN_AIN1 = 19
- PIN_AIN2 = 33
- PIN_STBY = 22

### 8.4 モータ制御関数

以下の関数を実装する。

- retract(durationMs)
- releaseTape(durationMs)
- stopMotor()

retract(durationMs):

- durationMsを検証する
- durationMsがMAX_DRIVE_DURATION_MSを超える場合はMAX_DRIVE_DURATION_MSに丸める
- 現在のモータ動作を停止する
- 巻き取り方向にモータを回す
- 停止予定時刻をmillis()で記録する

releaseTape(durationMs):

- durationMsを検証する
- durationMsがMAX_DRIVE_DURATION_MSを超える場合はMAX_DRIVE_DURATION_MSに丸める
- 現在のモータ動作を停止する
- ゆるめ方向にモータを回す
- 停止予定時刻をmillis()で記録する

stopMotor():

- AIN1をLOWにする
- AIN2をLOWにする
- STBYをLOWにする
- モータ動作中フラグをfalseにする

### 8.5 安全停止

- 起動時は必ずstopMotor()を実行する
- BLE切断時はstopMotor()を実行する
- STOP受信時はstopMotor()を実行する
- durationMs経過後は必ずstopMotor()を実行する
- durationMsはMAX_DRIVE_DURATION_MSを超えないようにする

### 8.6 非ブロッキング実装

delay()で長時間ブロックしない。

millis()を使って停止予定時刻を管理し、loop()内で停止判定する。

理由:

- STOPコマンドをすぐ受け付けられるようにするため
- BLE処理を妨げないため
- BLE切断時の停止処理を確実にするため

## 9. Webアプリ実装詳細

### 9.1 推奨ディレクトリ構成

以下の構成を目安にする。

- src/App.tsx
- src/main.tsx
- src/components/MapView.tsx
- src/components/ModeSelector.tsx
- src/components/SettingsPanel.tsx
- src/components/StatusPanel.tsx
- src/components/MotorControlPanel.tsx
- src/hooks/useGeolocation.ts
- src/hooks/useBluetoothMotor.ts
- src/hooks/useDistanceJudge.ts
- src/hooks/useLocalStorage.ts
- src/utils/distance.ts
- src/utils/bluetooth.ts
- src/utils/command.ts
- src/types/index.ts

### 9.2 useGeolocation

以下を実装する。

- 現在地を管理する
- 5秒おきに現在地を取得する
- getCurrentPositionをsetIntervalで呼び出す
- enableHighAccuracyはtrueにする
- timeoutを設定する
- エラーを状態として返す
- コンポーネントのアンマウント時にintervalを解除する

### 9.3 useBluetoothMotor

以下を提供する。

- connect()
- disconnect()
- sendCommand(command)
- retract(durationMs)
- releaseTape(durationMs)
- stop()
- isConnected
- error
- lastCommand

BLE接続時は、デバイス名 EarController を優先してフィルタする。

### 9.4 useDistanceJudge

以下を提供する。

- 現在距離
- しきい値超過中か
- 連続超過回数
- 自動収納すべきか

### 9.5 localStorage

以下をlocalStorageに保存する。

- 中心点
- しきい値距離
- 位置取得間隔
- 連続超過判定回数
- 巻き取り時間
- ゆるめ時間
- 最後に選択したモード

収納状態は安全のためlocalStorageに永続化しない。

ページを再読み込みした場合はREADYに戻す。

## 10. エラー表示

以下のエラーを表示する。

- 位置情報が許可されていない
- 現在地を取得できない
- BLEがこのブラウザで利用できない
- BLE接続に失敗した
- BLE未接続のためコマンド送信できない
- 中心点が未設定
- 設定値が不正
- ATOM Lite側から応答がない

## 11. 実装上の注意

- Android Chromeでの利用を前提にする
- Web BluetoothはHTTPSまたはlocalhostでのみ使用する
- Geolocation APIもHTTPSまたはlocalhostで使用する
- サーバ側にデータ保存しない
- 自動収納コマンドは1回だけ送る
- 収納済み状態からの復帰にはユーザー操作を必須にする
- モータ駆動時間はスマホ側から送る
- モータ速度はATOM Lite側の固定値にする
- ATOM Lite側でも最大駆動時間を設ける
- モータ制御は非ブロッキングで実装する
- STOPはいつでも有効にする
- コード、UI、コメント、BLEデバイス名、READMEに特定の商標名を含めない

## 12. 初期値

Webアプリ側の初期値は以下とする。

- しきい値距離: 2000m
- 位置取得間隔: 5000ms
- 連続超過判定回数: 3
- 巻き取り時間: 1500ms
- ゆるめ時間: 800ms

ATOM Lite側の初期値は以下とする。

- 最大駆動時間: 3000ms
- PWM値: 180
- BLEデバイス名: EarController

## 13. Codexへの作業指示

以下を実装してください。

### 13.1 Webアプリ

React + TypeScript + Viteで、耳収納装置の制御用Webアプリを実装してください。

必須機能:

- Leaflet + OpenStreetMapによる地図表示
- 地図タップによる中心点設定
- 現在地取得
- 現在地を中心点にする機能
- 中心点と現在地の距離計算
- しきい値距離の設定
- 5秒おきの位置情報取得
- 連続しきい値超過判定
- BLE接続
- BLEコマンド送信
- 本番モード
- 距離判定テストモード
- モータ動作テストモード
- 巻き取りボタン
- ゆるめボタン
- 停止ボタン
- 状態リセットボタン
- エラー表示
- 接続状態表示

### 13.2 ATOM Lite

Arduino IDEで書き込めるATOM Lite用コードを実装してください。

必須機能:

- BLE GATTサーバーとして動作
- BLEデバイス名は EarController
- SERVICE_UUID は 7b15f8d0-7f5b-4c4b-9a5f-7f0f2c2c0001
- COMMAND_CHAR_UUID は 7b15f8d0-7f5b-4c4b-9a5f-7f0f2c2c0002
- RETRACT:<durationMs> を受信したら巻き取り方向にモータを回す
- RELEASE:<durationMs> を受信したらゆるめ方向にモータを回す
- STOP を受信したら即時停止する
- PING を受信したら必要に応じて無視してよい
- モータ制御ピンは G19, G33, G22 を使用する
- モータ速度は固定PWM値180を使用する
- 最大駆動時間は3000msとする
- millis()による非ブロッキング停止を実装する
- 起動時、BLE切断時、STOP受信時、駆動時間経過時に必ずモータを停止する

### 13.3 成果物

以下を作成してください。

- Webアプリ一式
- ATOM Lite用Arduinoスケッチ
- README
- 動作確認手順
- BLE通信仕様の説明
- 配線説明

READMEにも特定の商標名を含めないでください。