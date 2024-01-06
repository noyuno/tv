import {sendNotifyd, message } from './common.js';

window.addEventListener('load', () => {
  const channels = {};
  const getChannel = () => {
    var ret = false;
    const req = new XMLHttpRequest();
    req.open("GET", 'http://192.168.1.22/api/channels');
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
          for (let record of records) {
            var tr = document.querySelector(`#${type}-table tbody`).insertRow();
            const timeopt = { hour: "2-digit", minute: "2-digit" };
            tr.insertCell(0).appendChild(document.createTextNode(new Date(record.startAt).toLocaleDateString("SV").substring(5) + ' ' + new Date(record.startAt).toLocaleTimeString("SV",timeopt) + '～' +  new Date(record.endAt).toLocaleTimeString("SV",timeopt)));
            tr.insertCell(1).appendChild(document.createTextNode(channels[record.channelId]));
            tr.insertCell(2).appendChild(document.createTextNode(record.name));
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
    getEpg('http://192.168.1.22/api/recording?isHalfWidth=true&offset=0&limit=5', 'recording', 'records')
  }

  const getRecorded = () => {
    getEpg('http://192.168.1.22/api/recorded?isHalfWidth=true&offset=0&limit=3', 'recorded', 'records')
  }

  const getReserve = () => {
    getEpg('http://192.168.1.22/api/reserves?isHalfWidth=true&offset=0&limit=3', 'reserve', 'reserves')

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
