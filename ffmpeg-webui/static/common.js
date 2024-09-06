
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
  req.open("POST", 'http://' + hostp1 + ':5050');
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

export function convertBytes(bytes) {
  const useBinaryUnits = false, decimals = 0 ;

  if (decimals < 0) {
    throw new Error(`Invalid decimals ${decimals}`);
  }

  const base = useBinaryUnits ? 1024 : 1000;
  const units = useBinaryUnits
    ? ["Bytes", "KiB", "MiB", "GiB", "TiB", "PiB", "EiB", "ZiB", "YiB"]
    : ["Bytes", "KB", "MB", "GB", "TB", "PB", "EB", "ZB", "YB"];

  const i = Math.floor(Math.log(bytes) / Math.log(base));

  return `${(bytes / Math.pow(base, i)).toFixed(decimals)} ${units[i]}`;
}