# モバイル向けの動画トランスコードシステム

<image src="https://github.com/noyuno/tv/blob/master/transcoder/images/screenshot.png" width="300px">

モバイルの画面収録機能は、ファイルサイズが非常に大きいため、ストレージを大量に消費してしまいます。
このシステムを使ってサーバ側でトランスコードすれば、元のファイルサイズの半分程度まで圧縮できます。
ファイル形式は既定で互換性のあるH.264ですが、変更することもできます。

## 使い方

1. 動画ファイルをアップロードすると、自動でトランスコードが始まります。
2. トランスコードが完了したら、サムネイルをタップして保存するか、以下のiOSショートカットを作成しすべてのファイルを一括保存します。

<image src="https://github.com/noyuno/tv/blob/master/transcoder/images/ios-shortcut-1.png" width="300px">
<image src="https://github.com/noyuno/tv/blob/master/transcoder/images/ios-shortcut-2.png" width="300px">
<image src="https://github.com/noyuno/tv/blob/master/transcoder/images/ios-shortcut-3.png" width="300px">

## 実行方法

PM2を使って起動

    sudo pm2 start server.js --name transcoder --user USER 
