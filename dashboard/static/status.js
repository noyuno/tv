window.addEventListener('load', () => {

  const ping = (num, server, service, url) => {
    var ret = false;
    const req = new XMLHttpRequest();
    req.open("GET", 'http://192.168.1.33:3000/check?url=' + url);
    req.onreadystatechange = () => {
      if (req.readyState === XMLHttpRequest.DONE) {
        const status = req.status;
        if ((status == 200)) {
          addRow(num, server, service, url, 'OK');
          sendNotifyd2(num, server, service, url, true);
        } else {
          addRow(num, server, service, url, 'BAD');
          sendNotifyd2(num, server, service, url, false);
        }
      }
    };
    req.timeout = 3000;
    try {
      req.send();
    } catch (error) {
      console.log(error);
      message('error', error);
    }

  }

  const sendNotifyd = (mes) => {
    const req = new XMLHttpRequest();
    req.open("POST", 'http://192.168.1.33:5050');
    req.onreadystatechange = () => {
      if (req.readyState === XMLHttpRequest.DONE) {
        if ((req.status == 200)) {
          message('success', 'sent to discord: ' + mes);
        } else {
          message('error', 'cannot send to discord: ' + mes);
        }
      }
    };
    req.timeout = 3000;
    try {
      const data = JSON.stringify({ 'token': 'token', 'message': mes });
      console.log(data);
      req.send(data);
    } catch (error) {
      console.log(error);
      message('error', error);
    }
  };

  const noResponse = {};

  const sendNotifyd2 = (num, server, service, url, state) => {
    if (state && noResponse.hasOwnProperty(num) && noResponse[num]) {
      sendNotifyd(server + '/' + service + 'が復帰しました。 ' + url)
      noResponse[num] = 0;
    }
    if (!state && (!noResponse.hasOwnProperty(num) || !noResponse[num])) {
      sendNotifyd(server + '/' + service + 'の応答がありません。 ' + url)
      noResponse[num] = 1;
    }
  };

  const message = (mode, mes) => {
    document.querySelector('#message-text').textContent = mes;
    document.querySelector('#message-text').setAttribute('class', 'message-' + mode);
    document.querySelector('#message').setAttribute('class', 'message-' + mode);
    document.querySelector('#message').style.display = 'block';
    setTimeout(() => {
      document.querySelector('#message').style.display = 'none';
    }, 10000);
  };

  const addRow = (num, server, service, url, status) => {
    const tableId = '#status-table tbody';
    var i = 0
    for ( ; i < document.querySelector(tableId).rows.length; i++) {
      if (num < document.querySelector(tableId).rows[i].getAttribute('data-num')) {
        break;
      }
    }
    var tr = document.querySelector(tableId).insertRow(i);
    tr.setAttribute('data-num', num);
    tr.insertCell(0).appendChild(document.createTextNode(server));
    tr.insertCell(1).appendChild(document.createTextNode(service));
    tr.insertCell(2).appendChild(document.createTextNode(url));
    var s = document.createElement('span');
    s.textContent = status;
    s.setAttribute('class', 'status-' + status);
    tr.insertCell(3).appendChild(s);
  };

  const run = () => {
    document.querySelector('#status-table tbody').innerHTML="";
    ping(1, 'm1', 'epgstation', 'http://192.168.1.22');
    ping(2, 'm1', 'notifyd', 'http://192.168.1.22:5050');
    ping(3, 'nas1', 'nas', 'http://100.96.75.62:8080');
    ping(4, 'pi1', 'dashboard', 'http://192.168.1.33:3000');
    ping(5, 'pi1', 'notifyd', 'http://192.168.1.33:5050');
  };

  document.querySelector('#close-button').onclick = () => {
    document.querySelector('#message').style.display = 'none';
  };

  run();
  sendNotifyd('p1によるシステム監視を開始しました。');
  setInterval(() => {
    document.querySelector("#header-datetime").innerHTML = new Date().toLocaleDateString("SV") + " " + new Date().toLocaleTimeString("SV");
  }, 1000);
  setInterval(run, 60 * 1000);
  
});
