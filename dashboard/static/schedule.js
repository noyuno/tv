window.addEventListener('load', () => {
  const message = (mode, mes) => {
    document.querySelector('#message-text').textContent = mes;
    document.querySelector('#message-text').setAttribute('class', 'message-' + mode);
    document.querySelector('#message').setAttribute('class', 'message-' + mode);
    document.querySelector('#message').style.display = 'block';
    setTimeout(() => {
      document.querySelector('#message').style.display = 'none';
    }, 10000);
  };

  const getjson = () => {
    const req = new XMLHttpRequest();
    req.open("GET", 'http://192.168.1.33:3000/calendar');
    req.onreadystatechange = () => {
      if (req.readyState === XMLHttpRequest.DONE) {
        const status = req.status;
        if ((status == 200)) {
          const data = JSON.parse(req.responseText);
          const icaldata = data.data;
          const jcal = ICAL.parse(icaldata);
          const rows = [];
          for (let event of jcal[2]) {
            var dtstart, summary;
            for (let item of event[1]) {
              if (item[0] == 'dtstart') dtstart = item[3];
              if (item[0] == 'summary') summary = item[3];
            }
            if (new Date(dtstart) > new Date())
              rows.push([new Date(dtstart), summary]);
          }
          rows.sort((a, b) => { return a[0] > b[0] ? 1: -1; });
          addRow(rows.slice(0,13));
        } else {
          message('error', '予定を取得できませんでした' + req.status);
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

  const addRow = (rows) => {

    for (let row of rows) {
      const tableId = '#schedule-table tbody';
      var tr = document.querySelector(tableId).insertRow();
      tr.insertCell(0).appendChild(document.createTextNode(row[0].toLocaleDateString("SV", {})));
      tr.insertCell(1).appendChild(document.createTextNode(row[1]));
    }
  };


  getjson();
  setInterval(getjson, 60 * 60 * 1000); // 1hr
  
});
