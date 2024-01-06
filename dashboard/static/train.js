import {sendNotifyd, message } from './common.js';

window.addEventListener('load', () => {

  const trains = [
    {
      hour: '6',
      minute:['2', '7●', '11', '14', '19●', '23', '27●', '32', '35●', '39', '42●', '48', '54●', '58']
    },
    {
      hour: '7',
      minute:['1', '4●', '7', '10', '13●', '18', '21', '24●']
    }
  ];

  function run() {
    for (let t of trains) {
      var tr = document.querySelector('#train-table tbody').insertRow();
      tr.insertCell(0).appendChild(document.createTextNode(t.hour));
      tr.insertCell(1).appendChild(document.createTextNode(t.minute.join(',　')));
    }
  }

  run();

  
});
