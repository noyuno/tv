function makeThumbnail(file, video) {
  var fileReader = new FileReader();
  fileReader.onload = function() {
      var blob = new Blob([fileReader.result], {type: file.type});
      var url = URL.createObjectURL(blob);

      var thumbnailFrame = 0; // サムネイル取得秒指定
      var retryCount = 10; // サムネイル生成失敗許容回数
      var currentCount = 0;

      // timeupdateイベントで動画の再生を検知しています
      var timeupdate = function() {
          if (snapImage()) {
              video.removeEventListener('timeupdate', timeupdate);
              video.pause();
          }
          else if (currentCount == retryCount) {
          // サムネイル生成失敗
              console.log("make thumbnail failed");
              video.removeEventListener('timeupdate', timeupdate);
              video.pause();
          }
      }
    
      video.addEventListener('canplay', function() {
          if (video.duration > thumbnailFrame) {
              video.currentTime = thumbnailFrame; 
          }
          else {
              video.currentTime = video.duration / 2;
          }
      });
      var snapImage = function() {
          // 3.再生後、さらに新規生成した<canvas>要素で描画
          var canvas = document.createElement('canvas');
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
          canvas.getContext('2d').drawImage(video, 0, 0, canvas.width, canvas.height);
          // 4.描画後にtoDataURL()関数を利用して画像blobを取得、適宜<img>要素へ適応
          var image = canvas.toDataURL("image/png");
          var success = image.length > 100000;
          if (success) {
              var img = $(".thumbnail");
              img.attr('src', image);
              setTimeout(() => { // Safari対策
                  URL.revokeObjectURL(url);
              }, 2000);
          }
          else {
              currentCount+=1;
          }
          return success;
      }
      // 2.選択された動画を新規生成した<video>要素で再生
      video.addEventListener('timeupdate', timeupdate);
      video.preload = 'meta';
      video.src = url;
      // Safari / IE11
      video.muted = true;
      video.playsInline = true;
      video.currentTime = thumbnailFrame;
      video.play();
  }
  fileReader.readAsArrayBuffer(file);
}
