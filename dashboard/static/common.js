
/*window.addEventHandler('load', () => {
  var screen = 0;
  var screens = ['status-block', 'weather-block' ];
  const nextScreen = () => {
    document.querySelector('#' + screens[screen]).style.display = 'none';

  };
});
*/

export function message(mode, mes) {
  document.querySelector('#message-text').innerHTML = mes;
  document.querySelector('#message-text').setAttribute('class', 'message-' + mode);
  document.querySelector('#message').setAttribute('class', 'message-' + mode);
  document.querySelector('#message').style.display = 'block';
  setTimeout(() => {
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

var currentPage = 1;
var maxPage = 4;
var changedSelf = 0;
var pause = false;

export function setPage(p) {
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
    pause = false;
    document.querySelector('#page-pause').style.backgroundColor = '';
  } else {
    pause = true;
    document.querySelector('#page-pause').style.backgroundColor = 'red';
  }
}

document.querySelector('#current-page').addEventListener('click', ((e) => {
  changedSelf = 1;
  nextPage();
}))
document.querySelector('#page-pause').addEventListener('click', ((e) => {
  pausePage();
}))

setInterval(() => { 
  if (changedSelf == 1) {
    changedSelf = 0;
    return;
  }
  if (pause)
    return;
  nextPage();
}, 1000 * 10);
setPage(1);


setInterval(() => {
  document.querySelector("#header-datetime").innerHTML = new Date().toLocaleDateString("SV") + " " + new Date().toLocaleTimeString("SV");
}, 1000);

