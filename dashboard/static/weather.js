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
    req.open("GET", 'https://www.jma.go.jp/bosai/forecast/data/forecast/130000.json');
    req.onreadystatechange = () => {
      if (req.readyState === XMLHttpRequest.DONE) {
        const status = req.status;
        if ((status == 200)) {
          const data = JSON.parse(req.responseText);
          const tokyo = data[1].timeSeries[0].areas[0];
          const tokyo2 = data[1].timeSeries[1].areas[0];
          const tableId = '#weather-table tbody';
          document.querySelector(tableId).deleteRow(-1);
          var t = document.querySelector(tableId).insertRow(-1);
          for (var i = 0; i < data[1].timeSeries[0].timeDefines.length; i++) {
            const op = { month: '2-digit', day: '2-digit'};
            const formatter = new Intl.DateTimeFormat('ja-JP', op);
            const ft = formatter.format(new Date(data[1].timeSeries[0].timeDefines[i]));
            t.insertCell(i).appendChild(document.createTextNode(ft));
          }
          var tr = document.querySelector(tableId).insertRow(-1);
          for (var i = 0; i < tokyo.weatherCodes.length; i++) {
            const img = document.createElement('img');
            img.src = 'https://www.jma.go.jp/bosai/forecast/img/' + tokyo.weatherCodes[i] + '.svg'
            tr.insertCell(i).appendChild(img);
          }
          var temp = document.querySelector(tableId).insertRow(-1);
          temp.insertCell(0).appendChild(document.createTextNode(
            data[0].timeSeries[2].areas[0].temps[1] + '℃/' + data[0].timeSeries[2].areas[0].temps[0] + '℃' ));
          for (var i = 1; i < tokyo2.tempsMax.length; i++) {
            temp.insertCell(i).appendChild(document.createTextNode( tokyo2.tempsMax[i] + '℃/' + tokyo2.tempsMin[i] + '℃' ));
          }
          var pops = document.querySelector(tableId).insertRow(-1);
          pops.insertCell(0).appendChild(document.createTextNode(
            data[0].timeSeries[1].areas[0].pops + '%'));
          for (var i = 1; i < tokyo.pops.length; i++) {
            pops.insertCell(i).appendChild(document.createTextNode(tokyo.pops[i] + '%'));
          }
        } else {
          message('error', '天気予報を取得できませんでした' + req.status);
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

  getjson();
  setInterval(getjson, 60 * 60 * 1000); // 1hr
  
});
