import { message } from './common.js';

window.addEventListener('load', () => {

  const getjson = () => {
    document.querySelector('#memo-table tbody').innerHTML="";
    const req = new XMLHttpRequest();
    req.open("GET", 'http://192.168.1.33:3000/memo');
    req.onreadystatechange = () => {
      if (req.readyState === XMLHttpRequest.DONE) {
        const status = req.status;
        if ((status == 200)) {
          const data = JSON.parse(req.responseText);
          readMemo(data.data.split('\n'));
        } else {
          message('error', 'メモを取得できませんでした' + req.status);
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

  const readMemo = (rows) => {
    var title = '';
    var content = '';

    function addRow() {
      const tableId = '#memo-table tbody';
      var tr = document.querySelector(tableId).insertRow();
      var t = document.createElement('span');
      t.innerHTML = title;
      tr.insertCell(0).appendChild(t);
      var c = document.createElement('span');
      c.innerHTML = content;
      tr.insertCell(1).appendChild(c);
      title = content = '';
    }
    for (let row of rows) {
      if (row == '') {
        if (title == '')
          continue;
        else {
          addRow();         
        }
      }
      if (title == '')
        title = row;
      else {
        if (content != '')
          content += '<br>'
        content += row;
      }
    }
    addRow();
  };


  getjson();
  setInterval(getjson, 60 * 1000);
  
});
