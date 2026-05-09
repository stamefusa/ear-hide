# EarController

EarController は、Android Chrome 上の Web アプリから BLE コマンドを送信し、ATOM Lite と DRV8833 を介して N20 モータを短時間だけ駆動するための制御アプリです。

Web アプリは地図上の中心点と現在地の距離を判定し、条件を満たした場合に自動で巻き取りコマンドを送信します。ゆるめ、停止、状態リセットは画面上のボタンから実行できます。

## リポジトリ構成

- `docs/SystemRequirements.md`: 元の仕様書
- `src/`: React + TypeScript の Web アプリ
- `firmware/EarController/EarController.ino`: ATOM Lite 用 Arduino スケッチ
- `package.json`: Web アプリの依存関係と実行スクリプト

## セットアップ

### Web アプリ

依存関係をインストールし、開発サーバーを起動します。

```sh
npm install
npm run dev
```

本番用ビルドは次のコマンドで作成できます。

```sh
npm run build
```

Web Bluetooth と位置情報取得は、HTTPS または `localhost` でのみ利用できます。スマートフォンから確認する場合は、端末から到達できる HTTPS 環境で配信してください。

### Cloudflare Workers での配信

このアプリは Cloudflare Workers の Static Assets 機能で配信できます。SPA として動作するため、`wrangler.jsonc` では `assets.not_found_handling` を `single-page-application` に設定しています。

`wrangler` はプロジェクト依存関係には含めていません。Cloudflare のビルド環境で不要な依存インストールを避けるため、必要なときだけ `npx wrangler` で実行する構成です。

Cloudflare へログイン:

```sh
npx wrangler login
```

本番デプロイ:

```sh
npm run deploy
```

Workers 環境でのローカル確認:

```sh
npm run cf:dev
```

補足:

- 日常の画面開発は `npm run dev` を使ってください。こちらは Vite の HMR が有効です。
- `npm run cf:dev` は一度 `dist/` をビルドしてから Workers の配信挙動を確認するためのコマンドです。
- `npm run deploy` は `npm run build` のあとに `npx wrangler deploy` を実行します。
- Worker 名は `wrangler.jsonc` の `name` で管理しています。必要なら変更してください。
- `workers.dev` サブドメインでも HTTPS になるため、Web Bluetooth と位置情報取得の要件を満たせます。

### Android Chrome での注意

- Web Bluetooth に対応した Android Chrome を使用します。
- 位置情報の許可を求められたら許可します。
- スマートフォン側の Bluetooth と位置情報サービスを有効にします。
- Android の設定画面で事前にペアリングする必要はありません。接続は Web アプリ内から行います。
- BLE デバイス名は `EarController` を使用します。

## Web アプリの動作モード

- 本番: 地図、中心点、現在地、距離判定、BLE 接続、自動巻き取り、手動ゆるめ、停止を使用します。
- 距離判定テスト: 地図と位置情報で距離判定だけを確認します。BLE 通信は行いません。
- モータ動作テスト: BLE 接続と手動の巻き取り、ゆるめ、停止だけを確認します。地図と位置情報は使用しません。

## BLE 通信仕様

デバイス名:

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

Web アプリは command characteristic に UTF-8 文字列を書き込みます。

```text
RETRACT:<durationMs>
RELEASE:<durationMs>
STOP
PING
```

例:

```text
RETRACT:1500
RELEASE:800
STOP
PING
```

ファームウェア側の動作:

- `RETRACT:<durationMs>`: 巻き取り方向にモータを回します。
- `RELEASE:<durationMs>`: ゆるめ方向にモータを回します。
- `STOP`: モータを即時停止します。
- `PING`: 接続確認用として受け取り、動作は行いません。
- 不正なコマンドや未知のコマンドは無視します。
- `durationMs` は正の整数のみ有効です。
- `durationMs` が `10000` ms を超える場合は `10000` ms に丸めます。
- 新しい有効な動作コマンドを受け取った場合は、現在の動作を停止してから次の動作を開始します。

## 配線

DRV8833 と ATOM Lite を次のように接続します。

| DRV8833 | ATOM Lite |
| --- | --- |
| AIN1 | G19 |
| AIN2 | G33 |
| STBY | G22 |
| GND | GND |

モータ電源の GND も ATOM Lite 側の GND と共通化してください。

実機で回転方向が逆になる場合は、ファームウェア内の AIN1/AIN2 の制御を入れ替えるか、モータ配線を入れ替えてください。

## ファームウェア書き込み

1. Arduino IDE で `firmware/EarController/EarController.ino` を開きます。
2. ESP32 のボードパッケージをインストールします。
3. ATOM Lite に対応する ESP32 ボード設定とシリアルポートを選択します。
4. スケッチをビルドしてアップロードします。
5. リセット後、BLE デバイス `EarController` が見えることを確認します。

ファームウェア定数:

| 項目 | 値 |
| --- | --- |
| 最大駆動時間 | `10000` ms |
| PWM 値 | `200` |
| AIN1 ピン | `19` |
| AIN2 ピン | `33` |
| STBY ピン | `22` |

## 安全上の注意

- 最初はモータに機構を接続せず、空転状態で確認してください。
- 機構を取り付ける前に、`STOP` で即時停止できることを確認してください。
- ファームウェアは起動時、BLE 切断時、`STOP` 受信時、駆動時間経過時にモータを停止します。
- 停止処理は `millis()` を使った非ブロッキング実装です。
- モータ用電源はモータに合ったものを使用し、GND は ATOM Lite と共通化してください。
- モータドライバとモータの定格電流を超えないようにしてください。

## 動作確認手順

### Web アプリ

1. `npm run dev` でアプリを起動します。
2. Android Chrome から HTTPS または `localhost` 経由で開きます。
3. 位置情報の利用を許可します。
4. モータ動作テストで `EarController` に BLE 接続します。
5. 巻き取り、ゆるめ、停止ボタンで `RETRACT`、`RELEASE`、`STOP` が送信されることを確認します。
6. 距離判定テストで中心点を設定し、距離としきい値表示が更新されることを確認します。
7. 本番モードで、連続しきい値超過回数に達した場合のみ自動巻き取りが 1 回実行されることを確認します。
8. 自動巻き取り後、状態リセットを押すまで再度自動巻き取りされないことを確認します。

### ファームウェア

1. スケッチを ATOM Lite に書き込みます。
2. BLE スキャナーまたは Web アプリで `EarController` が表示されることを確認します。
3. `PING` を書き込み、接続が維持されることを確認します。
4. `RETRACT:500` を書き込み、短時間だけモータが回って停止することを確認します。
5. `RELEASE:500` を書き込み、逆方向に短時間だけ回って停止することを確認します。
6. モータ動作中に `STOP` を書き込み、即時停止することを確認します。
7. `RETRACT:15000` を書き込み、動作時間が約 10 秒以内に制限されることを確認します。
8. モータ動作中に BLE を切断し、停止することを確認します。
