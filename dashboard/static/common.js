
var messageTimeout;

export function message(mode, mes) {
  document.querySelector('#message-text').innerHTML = mes;
  document.querySelector('#message-text').setAttribute('class', 'message-' + mode);
  document.querySelector('#message').setAttribute('class', 'message-' + mode);
  document.querySelector('#message').style.display = 'block';
  clearTimeout(messageTimeout);
  messageTimeout = setTimeout(() => {
    document.querySelector('#message').style.display = 'none';
  }, 1000 * 10);

  document.querySelector('#close-button').onclick = () => {
    document.querySelector('#message').style.display = 'none';
  };
};

export function sendNotifyd (mes)  {
  const req = new XMLHttpRequest();
  req.open("POST", 'http://192.168.1.33:5050');
  req.onreadystatechange = () => {
    if (req.readyState === XMLHttpRequest.DONE) {
      if ((req.status == 200)) {
        message('success', 'Discord: ' + mes);
      } else {
        message('error', 'Discordに送信できません: ' + mes);
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

var currentPage = 1;
var maxPage = 5;
var pause = false;
var pageInterval;
var pageProgress = 0;

export function setPage(p) {
  if (!pause)
    setPageInterval();
  document.querySelector('#current-page').innerHTML = `${p}/${maxPage}ページ`
  for (let a = 1 ; a <= maxPage; a++) {
    if (a == p) {
      document.querySelector("#page-" + a).style.display = 'block';
    } else {
      document.querySelector("#page-" + a).style.display = 'none';
    }
  }
}

export function nextPage() {
  currentPage++;
  if (currentPage > maxPage)
    currentPage = 1;
  setPage(currentPage);
}

export function pausePage() {
  if (pause) {
    setPageInterval();
    document.querySelector('#page-pause').style.backgroundColor = '';
  } else {
    stopPageInterval();
    document.querySelector('#page-pause').style.backgroundColor = 'rgb(190, 80, 80)';
  }
  pause = !pause;
}

document.querySelector('#current-page').addEventListener('click', ((e) => {
  nextPage();
  //setPageInterval();
}))
document.querySelector('#page-pause').addEventListener('click', ((e) => {
  pausePage();
}))

const stopPageInterval = function () {
  clearInterval(pageInterval);
  pageProgress = 0;
  document.querySelector('#current-page-progressbar').style.width = '0%'
};

const setPageInterval = function () {
  stopPageInterval();
  pageProgress = 0;
  pageInterval = setInterval(() => { 
    if (++pageProgress >= 10) {
      pageProgress = 0;
      document.querySelector('#current-page-progressbar').style.width = '0%'
      nextPage();
    } else {
      document.querySelector('#current-page-progressbar').style.width = `${pageProgress * 10}%`
    }
  }, 1000);
};


setPage(1);
setPageInterval();


setInterval(() => {
  document.querySelector("#header-datetime").innerHTML = new Date().toLocaleDateString("SV") + " " + new Date().toLocaleTimeString("SV");
}, 1000);

