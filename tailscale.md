# Tailscale

## 1. 突然NASへの応答が無くなった

1. 何らかの拍子でTailscale アカウントがログアウトされた
　（システムのアップデートなど）
2. スマホのSSH端末から以下のコマンドを実行しログイン画面を表示する。

  cd /share/CE_CACHEDEV1_DATA/.qpkg/Tailscale/
  ./tailscale up

3. コンソールに認証URLが表示されるため、アクセスしログインを行う。

