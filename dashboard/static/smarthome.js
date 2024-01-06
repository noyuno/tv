import {sendNotifyd, message } from './common.js';

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
  });

  function showhelp() {
    message('success', '1:プラグミニ turnOn<br>2:プラグミニ turnOff<br>4:帰宅<br>5:外出<br>6:就寝')
  }
    
  document.querySelector('#keyboard-help').addEventListener('click', ((e) => {
    showhelp();
  }))

});
