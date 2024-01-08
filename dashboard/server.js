const express = require('express');
const axios = require('axios');
const { exec } = require('child_process');
const path = require('path');
const app = express();
const port = 3000;
const crypto = require('crypto');
const https = require('https');
const fs = require('fs');
const  bodyParser = require( 'body-parser');

// switchbot
require('dotenv').config();

const touchFileSync = (fileName) => {
  try {
    const time = new Date();
    fs.utimesSync(fileName, time, time);
  } catch {
    fs.closeSync(fs.openSync(fileName, 'w'));
  }
};
const memoFile = './data/memo.txt'
touchFileSync(memoFile)

function switchBotCredential(postBodyLength = 0) {
  const token = process.env.SWITCHBOT_TOKEN;
  const secret = process.env.SWITCHBOT_SECRET;
  const t = Date.now();
  const nonce = "requestID";
  const data = token + t + nonce;
  const signTerm = crypto.createHmac('sha256', secret)
    .update(Buffer.from(data, 'utf-8'))
    .digest();
  const sign = signTerm.toString("base64");

  if (postBodyLength == 0) {
    return {
      hostname: 'api.switch-bot.com',
      port: 443,
      path: '',
      method: 'GET',
      headers: {
        "Authorization": token,
        "sign": sign,
        "nonce": nonce,
        "t": t,
      },
    };
  } else {
    return {
      hostname: 'api.switch-bot.com',
      port: 443,
      path: '',
      method: 'POST',
      headers: {
        "Authorization": token,
        "sign": sign,
        "nonce": nonce,
        "t": t,
        'Content-Type': 'application/json',
        'Content-Length': postBodyLength,
      },
    };
  }
}

function switchBotDevices() {
  return new Promise(function (resolve, reject) {

    const options = switchBotCredential();
    options.path = `/v1.1/devices`;
    const req = https.request(options, s => {
      s.on('data', d => {
        const ret = JSON.parse(d);
        resolve(ret);
      });
    });
    req.on('error', error => {
      console.error(error);
      reject(error);
    });
    req.end();
  });
};

var sbDevices;

function switchBotScenes() {
  return new Promise(function (resolve, reject) {
    const options = switchBotCredential();
    options.path = `/v1.1/scenes`;
    const req = https.request(options, s => {
      s.on('data', d => {
        const ret = JSON.parse(d);
        resolve(ret);
      });
    });
    req.on('error', error => {
      console.error(error);
      reject(error);
    });
    req.end();
  });
};

var sbScenes;

function findDevice(name) {
  for(let a of sbDevices['body']['deviceList']) {
    if (a['deviceName'] == name) {
      return a['deviceId'];
    }
  }
  return '';
}

function findScene(name) {
  for(let a of sbScenes['body']) {
    if (a['sceneName'] == name) {
      return a['sceneId'];
    }
  }
  return '';
}

async function main() {

  sbDevices = await switchBotDevices();
  sbScenes = await switchBotScenes();
  //console.log(sbDevices);
  //console.log(sbScenes);

  app.use(express.json());
  app.use(bodyParser.json());
  app.use(
    bodyParser.urlencoded({
      extended: true,
    }),
  );
  app.use(express.static(path.join(__dirname, 'static')));

  app.get('/check', async (req, res) => {
    const targetURL = req.query.url;

    if (!targetURL) {
      return res.status(400).json({ error: 'URL parameter is required.' });
    }

    try {
      const response = await axios.get(targetURL);

      if (response.status === 200) {
        res.status(200).json({ message: 'URL is reachable.' });
      } else {
        res.status(400).json({ error: `HTTP status code ${response.status}` });
      }
    } catch (error) {
      console.error(`Error: ${error.message}`);
      res.status(400).json({ error: 'URL is unreachable or timed out.' });
    }
  });


  app.get('/switchbot-command', async (req, res) => {
    if (!req.query.deviceName || !req.query.command) {
      return res.status(400).json({ error: 'Parameter missing.' });
    }

    try {

      var body = JSON.stringify({});
      var options;
      if (req.query.command =='scene') {
        // get scene id
        const id = findScene(req.query.deviceName)
        if (id == '') {
          res.status(400).json({ error: 'id not found' });
          return;
        }
        options = switchBotCredential(body.length);
        options.path = `/v1.1/scenes/${id}/execute`
      } else {
        body = JSON.stringify({
          "command": req.query.command,
          "parameter": "default",
          "commandType": "command"
        });
        // get device id
        const id = findDevice(req.query.deviceName)
        if (id == '') {
          res.status(400).json({ error: 'id not found' });
          return;
        }
        options = switchBotCredential(body.length);
        options.path = `/v1.1/devices/${id}/commands`
      }
      const q = https.request(options, s => {
        s.on('data', d => {
          //process.stdout.write(d);
        });
        if (s.statusCode === 200) {
          res.status(200).json({ message: 'command success' });
        } else {
          res.status(400).json({ error: `API status code ${s.status}` });
        }
      });

      q.on('error', error => {
        console.error(error);
        res.status(400).json({ error: `API status code ${s.status}` });
      });

      q.write(body);
      q.end();

    } catch (error) {
      console.error(`Error: ${error.message}`);
      res.status(400).json({ error: 'API error' });
    }

  });

  app.get('/switchbot-status', async (req, res) => {
    if (!req.query.deviceName) {
      return res.status(400).json({ error: 'Parameter missing.' });
    }
    try {
      // get device id
      const id = findDevice(req.query.deviceName)
      if (id == '') {
        res.status(400).json({ error: 'id not found' });
        return;
      }
      const options = switchBotCredential();
      options.path = `/v1.1/devices/${id}/status`
      
      const q = https.request(options, s => {
        s.on('data', d => {
          if (s.statusCode === 200) {
            res.status(200).json(JSON.parse(d));
          } else {
            res.status(400).json({ error: `API status code ${s.status}` });
          }
          //process.stdout.write(d);
        });
      });
      q.on('error', error => {
        console.error(error);
      });
      //q.write();
      q.end();
    } catch (error) {
      console.error(`Error: ${error.message}`);
      res.status(400).json({ error: 'API error' });
    }

  });

  app.get('/calendar', async (req, res) => {
    const targetURL = process.env.ICAL_URL;

    if (!targetURL) {
      return res.status(400).json({ error: 'URL parameter is required.' });
    }

    try {
      const response = await axios.get(targetURL);

      if (response.status === 200) {
        res.status(200).json({ message: 'success', data: response.data});
      } else {
        res.status(400).json({ error: `HTTP status code ${response.status}` });
      }
    } catch (error) {
      console.error(`Error: ${error.message}`);
      res.status(400).json({ error: 'URL is unreachable or timed out.' });
    }

  });

  app.get('/memo', async (req, res) => {
    return res.status(200).json({ message: 'success', data: String(fs.readFileSync(memoFile))});
  });

  app.post('/memo', async (req, res) => {
    const j = JSON.parse(JSON.stringify(req.body));
    fs.writeFileSync(memoFile, j.data)
    return res.status(200).json({message: 'success'});
  });

  app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
  });

}
main();
