window.onload = () => {

  const ping = (url, id) => {
    var ret = false;
    const req = new XMLHttpRequest();
    req.open("GET", url);
    req.onreadystatechange = () => {
      if (req.readyState === XMLHttpRequest.DONE) {
        const status = req.status;
        if (/*status === 0 ||*/ (status >= 200 /*&& status < 400*/)) {
          //console.log(req.responseText);
          successLabel(id);
        } else {
          failureLabel(id);
        }
      }
    };
    req.timeout = 3000;
    try {
      req.send();
    } catch (error) {
      console.log(error)
    }

  }

  const successLabel = (id) => {
    document.querySelector(id).innerHTML = '<span class="status-ok">ok</span>';
  }

  const failureLabel = (id) => {
    document.querySelector(id).innerHTML = '<span class="status-bad">bad</span>';
  }

  const run = () => {
    ping('http://192.168.1.22/#/', '#tv-status');
    ping('http://192.168.1.22:5050', '#notifyd-status');
    ping('http://100.96.75.62:80', '#nas-status');
    ping('http://192.168.1.33:5050', '#pi1-status');
  };

  run();
  setInterval(() => {
    document.querySelector("#header-datetime").innerHTML = new Date().toLocaleDateString("SV") + " " + new Date().toLocaleTimeString("SV");
  }, 1000);
  setInterval(run, 60 * 1000);
  
}