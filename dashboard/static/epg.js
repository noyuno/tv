import {sendNotifyd, message, hostm1 } from './common.js';

function toHalfWidth(str) {
  // 全角英数字を半角に変換
  if (typeof str == 'string') {
    str = str.replace(/[Ａ-Ｚａ-ｚ０-９]/g, function(s) {
      return String.fromCharCode(s.charCodeAt(0) - 0xFEE0);
    });
  }
  return str;
}

function lengthAsHalfWidth(text) {
  let len = 0;
  let width = 0
  for (const c of text) {
      const cp = c.codePointAt(0);
      if ((0x00 <= cp) && (cp < 0x7f)) {
          width = 1; // ASCII 記号/数字/アルファベット
      } else if ((0xff61 <= cp) && (cp < 0xffa0)) {
          width = 1;  // 半角カナ
      } else if (cp === 0x200d) {  // ZWJ
          width = -width;  // 合成絵文字のノリしろ
      } else if (((0xfe00 <= cp) && (cp <= 0xfe0f)) ||
                 ((0xe0100 <= cp) && (cp <= 0xe01fe))) {
          ;  // 異体字セレクタは幅0扱い
      } else if ((0x1f3fb <= cp) && (cp <= 0x1f3ff)) {
          ;  // 絵文字修飾も幅0扱い
      } else {
          width = 2;  // きっと全角
      }
      len += width;
  }
  return len;
}

function substringDisplayWidth(text, start = 0, length = 0) {
  var pos = 0;
  var wlength = 0;

  while (pos < text.length) {
    var w = lengthAsHalfWidth(text.substring(start + pos, start + pos +1));
    if (wlength + w > length) {
      return text.substring(start, (start + pos));
    }
    wlength += w;
    pos++;
  }
  return text.substring(start, length);
}

window.addEventListener('load', () => {
  const channels = {};
  const getChannel = () => {
    var ret = false;
    const req = new XMLHttpRequest();
    req.open("GET", 'http://' + hostm1 + '/api/channels');
    req.onreadystatechange = () => {
      if (req.readyState === XMLHttpRequest.DONE) {
        const status = req.status;
        if ((status == 200)) {
          const cs = JSON.parse(req.responseText);
          for (let c of cs) {
            channels[c.id] = c.name;
          }
        } else {
          message('チャンネル情報を取得できませんでした', 'error');
        }
      }
    };
    req.timeout = 5000;
    try {
      req.send();
    } catch (error) {
      console.log(error);
      message('error', error);
    }
  }

  const getEpg = (url, type, json) => {
    var ret = false;
    const req = new XMLHttpRequest();
    req.open("GET", url);
    req.onreadystatechange = () => {
      if (req.readyState === XMLHttpRequest.DONE) {
        const status = req.status;
        if ((status == 200)) {
          const records = JSON.parse(req.responseText)[json];
          if (records.length == 0) {
            var tr = document.querySelector(`#${type}-table tbody`).insertRow();
            tr.insertCell(0).appendChild(document.createTextNode('（なし）'));
          }
          for (let record of records) {
            var tr = document.querySelector(`#${type}-table tbody`).insertRow();
            const dateopt = { day: "2-digit" }
            const timeopt = { hour: "2-digit", minute: "2-digit" };
            tr.insertCell(0).appendChild(document.createTextNode(new Date(record.startAt).toLocaleDateString("SV", dateopt).substring(5) + ' ' + new Date(record.startAt).toLocaleTimeString("SV",timeopt) + '～' +  new Date(record.endAt).toLocaleTimeString("SV",timeopt)));
            tr.insertCell(1).appendChild(document.createTextNode(toHalfWidth(channels[record.channelId])));
            tr.insertCell(2).appendChild(document.createTextNode(substringDisplayWidth(record.name, 0, 46)));
          }
        } else {
          message('録画情報を取得できませんでした', 'error');
        }
      }
    };
    req.timeout = 5000;
    try {
      req.send();
    } catch (error) {
      console.log(error);
      message('error', error);
    }
  }

  const getRecording = () => {
    getEpg('http://' + hostm1 + '/api/recording?isHalfWidth=true&offset=0&limit=6', 'recording', 'records')
  }

  const getRecorded = () => {
    getEpg('http://' + hostm1 + '/api/recorded?isHalfWidth=true&offset=0&limit=4', 'recorded', 'records')
  }

  const getReserve = () => {
    getEpg('http://' + hostm1 + '/api/reserves?isHalfWidth=true&offset=0&limit=4', 'reserve', 'reserves')

  }

  const run = () => {
    document.querySelector('#recording-table tbody').innerHTML="";
    getRecording();
    document.querySelector('#recorded-table tbody').innerHTML="";
    getRecorded();
    document.querySelector('#reserve-table tbody').innerHTML="";
    getReserve();
  };

  run();

  setInterval(run, 60 * 1000);

  getChannel();
  
});
