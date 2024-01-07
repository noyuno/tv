import {sendNotifyd, message, nextPage, pausePage } from './common.js';

window.addEventListener('load', () => {

  const send = (deviceName, command) => {
    var ret = false;
    const req = new XMLHttpRequest();
    req.open("GET", 'http://192.168.1.33:3000/switchbot-command?deviceName=' + encodeURI(deviceName) + '&command=' + command);
    req.onreadystatechange = () => {
      if (req.readyState === XMLHttpRequest.DONE) {
        const status = req.status;
        if ((status == 200)) {
          message('success', `${deviceName} を ${command} にしました`)
        } else {
          message('error', `${deviceName} を ${command} にできませんでした (${status} ${JSON.parse(req.responseText).error})`)
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



  window.addEventListener('keydown', (event) => {
    if (event.isComposing || event.keyCode === 229)
      return;
    if (event.code == 'Digit1' || event.code == 'Numpad1')
      send('プラグミニ', 'turnOn');
    if (event.code == 'Digit2' || event.code == 'Numpad2')
      send('プラグミニ', 'turnOff');
    if (event.code == 'Digit4' || event.code == 'Numpad4')
      send('帰宅', 'scene');
    if (event.code == 'Digit5' || event.code == 'Numpad5')
      send('外出', 'scene');
    if (event.code == 'Digit6' || event.code == 'Numpad6')
      send('就寝', 'scene');
    if (event.code == 'Digit0' || event.code == 'Numpad0')
      showhelp();
    if (event.code == 'Period' || event.code == 'NumpadDecimal')
      nextPage();
    if (event.code == 'Minus' || event.code == 'NumpadSubtract')
      pausePage();
  });

  function showhelp() {
    message('success', 'ヘルプ<br><br>.:次のページ<br>-:遷移停止<br>1:プラグミニ turnOn<br>2:プラグミニ turnOff<br>4:帰宅<br>5:外出<br>6:就寝')
  }
    
  document.querySelector('#keyboard-help').addEventListener('click', ((e) => {
    showhelp();
  }))

  const status = (num, device, callback = null) => {
    var ret = false;
    const req = new XMLHttpRequest();
    req.open("GET", 'http://192.168.1.33:3000/switchbot-status?deviceName=' + device);
    req.onreadystatechange = () => {
      if (req.readyState === XMLHttpRequest.DONE) {
        addRow(num, device, JSON.parse(req.responseText));
        if (typeof callback == 'function')
          callback(JSON.parse(req.responseText));
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

  const addRow = (num, device, data) => {
    const tableId = '#smarthome-table tbody';
    var i = 0
    for ( ; i < document.querySelector(tableId).rows.length; i++) {
      if (num < document.querySelector(tableId).rows[i].getAttribute('data-num')) {
        break;
      }
    }
    var tr = document.querySelector(tableId).insertRow(i);
    tr.setAttribute('data-num', num);
    tr.insertCell(0).appendChild(document.createTextNode(device));
    var s = `電源:${data.body.power}`
    if (data.body.weight) s+= `, 消費電力:${data.body.weight}W`
    if (data.body.brightness) s+= `, 明るさ:${data.body.brightness}%`

    tr.insertCell(1).appendChild(document.createTextNode(s));
  };

  const run = (data) => {
    document.querySelector('#smarthome-table tbody').innerHTML="";
    status(1, 'シーリングライト', (data) => {
      document.querySelector('#dim').style.display = (data.body.power == 'on') ? 'none' : 'block';
    });
    status(2, 'プラグミニ');
  };

  setInterval(run, 60 * 1000);
  run();
});
