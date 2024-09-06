import {sendNotifyd, message, convertBytes } from './common.js';

const ffmpegargs = '-y -movflags +faststart -map 0:v -ignore_unknown -max_muxing_queue_size 1024 -sn -preset veryfast -c:v libx264 -crf 22 -coder 1 -map 0:a -c:a copy -map 1 -c:v:1 png -disposition:v:1 attached_pic';

window.addEventListener('load', async () => {
  document.querySelector('#ffmpegargs').value = ffmpegargs;

  const addUploadRow = (uploadid, time, name, status, progress, url) => {
    const tableId = '#upload-table tbody';
    var i = 0
    for ( ; i < document.querySelector(tableId).rows.length; i++) {
      if (uploadid < document.querySelector(tableId).rows[i].getAttribute('data-uploadid')) {
        break;
      }
    }
    var tr = document.querySelector(tableId).insertRow(i);
    tr.setAttribute('data-uploadid', uploadid);

    tr.insertCell(0).appendChild(document.createTextNode(uploadid));
    tr.insertCell(1).appendChild(document.createTextNode(time));
    tr.insertCell(2).appendChild(document.createTextNode(name));


    if (status == 'アップロード中') {
      const p =document.createElement('progress');
      p.value = progress
      p.max = 100
      tr.insertCell(3).appendChild(p);
    } else {
      const s = document.createElement('span');
      s.textContent = status;
      s.setAttribute('class', 'status-' + status);
      tr.insertCell(3).appendChild(s);
    }

  };

  const addThumbnail = (p, thumbnailBase) => {
    const img = document.createElement('img');
    // img.setAttribute('class', 'thumbnail');
    img.setAttribute('src', p.thumbnail);

    const a = document.createElement('a');
    if (p.status == '完了') {
      a.setAttribute('href', p.url);
    }
    a.appendChild(img);

    const name = document.createElement('p');
    name.textContent = `#${p.uploadid}: ${p.name}`;

    var status = null;
    if (p.status == '完了') {
      status = document.createElement('p');
      status.textContent = `変換前${convertBytes(p.inputsize)}, 変換後:${convertBytes(p.outputsize)}, 圧縮率:${Math.floor((1.0 - p.outputsize / p.inputsize) * 100)}%`;
    } else if (p.status == 'エンコード中') {
      status = document.createElement('progress');
      status.max = 100;
      status.value = p.progress;
    } else {
      status = document.createElement('p');
      status.textContent = p.status;
    }
    const detail = document.createElement('div');
    detail.setAttribute('class', 'detail')
    detail.appendChild(name);
    detail.appendChild(status);
    const thumbnail = document.createElement('div');
    thumbnail.setAttribute('class', 'thumbnail');
    thumbnail.appendChild(a);
    thumbnail.appendChild(detail);
    
    thumbnailBase.appendChild(thumbnail);
  };

  async function getUploadId() {
    try {
      return (await fetch('/uploadid')
        .then((response) => response.json())
        .then((data) => {
          return data.uploadid;
        }));
    } catch(error) {
      
      console.log(error);
      message('error', error);
    }
  }


  async function upload() {
    const files =document.getElementById('fileInput').files;
    if (files.length == 0) {
      message('error', 'ファイルが選択されていません。')
      return;
    }
    for (const file of files) {

      // get uploadId
      const uploadid = (await getUploadId());
      if (uploadid == 0) {
        message('error', 'uploadidを取得できませんでした');
        return;
      }
      // create POST form
      const formData = new FormData();
      formData.append('uploadid', uploadid);
      formData.append('ffmpegargs', document.querySelector('#ffmpegargs').value);
      formData.append('video', file);

      const req = new XMLHttpRequest();
      req.open('POST', '/upload', true);

      req.upload.onprogress = function (event) {
          if (event.lengthComputable) {
              const percentComplete = (event.loaded / event.total) * 100;
              document.querySelector(`#upload-table tbody tr[data-uploadid="${uploadid}"] td:nth-child(4) progress`).value = percentComplete;
          }
      };
      req.onload = function () {
          if (req.status === 200) {
            // document.querySelector(`#upload-table tbody tr[data-uploadid="${uploadid}"] td:nth-child(4)`).innerText = '完了';
          } else {
            document.querySelector(`#upload-table tbody tr[data-uploadid="${uploadid}"] td:nth-child(4)`).innerText = '失敗';
          }
      };
      req.onreadystatechange = () => {
        if (req.readyState === XMLHttpRequest.DONE) {
          const status = req.status;
          if (status === 0 || (status >= 200 && status < 400)) {
            // リクエストが正常に終了した
            // document.querySelector(`#upload-table tbody tr[data-uploadid="${uploadid}"] td:nth-child(4)`).innerText = '成功';
          } else {
            document.querySelector(`#upload-table tbody tr[data-uploadid="${uploadid}"] td:nth-child(4)`).innerText = '失敗';
            console.log(`uploading failure, status=${status}`)
          }
        }
      };
      req.onerror = function () {
        document.querySelector(`#upload-table tbody tr[data-uploadid="${uploadid}"] td:nth-child(4)`).innerText = '失敗';
      };
      req.send(formData);
      addUploadRow(uploadid, new Date().toLocaleTimeString("SV"), file.name, 'アップロード中', 0, '-');
    }

  };

  document.querySelector('#fileInput').addEventListener('change', () => {
    upload();
  });


  const ws = new WebSocket('ws://m1:5000/wsstatus');
  ws.onmessage = (e) => {
    console.log(e.data);
    // document.querySelector('#status-table tbody').innerHTML="";
    document.querySelector('#thumbnail-top').innerHTML="";
    var count = 0;
    var thumbnailBase = null;
    for (const p of JSON.parse(e.data)) {
      //addStatusRow(p.uploadid, p.start, p.name, p.status, p.progress, p.url);
      if (count % 2 == 0) {
        thumbnailBase = document.createElement('div');
        thumbnailBase.setAttribute('class', 'thumbnail-base');
        document.querySelector('#thumbnail-top').appendChild(thumbnailBase);
      }
      addThumbnail(p, thumbnailBase);

      count++;
    }
  };
  ws.onopen = () => {
    ws.send('hello');
  };

  document.querySelector('#close-button').onclick = () => {
    document.querySelector('#message').style.display = 'none';
  };

  document.querySelector('#stop-all').onclick = () => {
    stopAll();
  };

  document.querySelector('#delete-all').onclick = () => {
    deleteAll();
  };

  async function stopAll() {
    try {
      return (await fetch('/stop')
        .then((response) => response.json())
        .then((data) => {
          message('success', 'すべて停止しました。');
          return;
        }));
    } catch(error) {
      
      console.log(error);
      message('error', error);
    }
  }

  async function deleteAll() {
    try {
      return (await fetch('/delete')
        .then((response) => response.json())
        .then((data) => {
          message('success', 'すべて削除しました。再読み込みします。');
          location.reload();
          return;
        }));
    } catch(error) {
      
      console.log(error);
      message('error', error);
    }
  }
});
