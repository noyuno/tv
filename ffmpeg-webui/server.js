const express = require('express');
const multer = require('multer');
const ffmpeg = require('fluent-ffmpeg');
const axios = require('axios');
const path = require('path');
const app = express();
const expressWs = require('express-ws')(app);
const port = 5000;
const crypto = require('crypto');
const https = require('https');
const fs = require('fs');
const  bodyParser = require('body-parser');
app.use(bodyParser.urlencoded({extended: true}))
app.use(bodyParser.json())
const util = require('node:util');
const exec = util.promisify(require('node:child_process').exec);
require('date-utils');
const async = require('async');

//const router = express.Router();
//expressWs(router);

///////////////////////////////////////////////////////////////

var processes = [];
var wsClients = [];

function updateStatus(uid, k, v) {
  for (const i in processes) {
    if (processes[i].uploadid == uid) {
      processes[i][k] = v;
      break;
    }
  }
  sendStatus();
}

function sendStatus() {
  const r = generateStatus();
  for (const c of wsClients) {
    c.send(JSON.stringify(r));
  }
}

///////////////////////////////////////////////////////////////
// storage

const tmpdir = '/mnt/hddts0-plain0/tv/tmp'
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, tmpdir);
  },
  filename: (req, file, cb) => {
    const uid = req.body.uploadid;
    console.log('uploadid:', uid); // uploadid を確認
    cb(null, `${uid}-${file.originalname}`);
  }
});
const upload = multer({ storage: storage });
//const upload = multer({dest: tmpdir});

var uploadId = 0;

///////////////////////////////////////////////////////////////

// エンコード処理のキュー（同時に1つまで実行）
const queue = async.queue((task, callback) => {
  const { uid, name, outputfname, filePath, outputFilePath, ffmpegArgs, logStream, res } = task;
  Promise.resolve()
  .then(() => {
    return new Promise((resolve, reject) => {
      const t = ffmpeg(filePath)
        .screenshots({
          count: 1,
          timestamps: [10],
          filename: `${outputfname}.png`,
          folder: path.dirname(outputFilePath),
          size: '443x?'
        })
        .on('end', () => {
          resolve(t);
        });
    });
  })
  .then(t => {
    return new Promise((resolve, reject) => {
      // ffmpegでエンコードを実行
      const f = ffmpeg(filePath);
      
      processes.push({
        uploadid: uid,
        start:  new Date().getTime(),
        name: name,
        status: '順番待ち',
        progress: 0,
        url: `/download?filename=${outputfname}`,
        thumbnail: `/download?filename=${outputfname}.png`,
        ffmpegcommand: f,
        inputsize: fs.statSync(filePath).size
      });
      
      f.input(path.join(path.dirname(outputFilePath), `${outputfname}.png`))
        .output(outputFilePath)
        .withOutputOptions(ffmpegArgs.split(' '))
        .on('start', (commandLine) => {
          logStream.write(`start: ${commandLine}\n`);
          updateStatus(uid, 'start');
          updateStatus(uid, 'start', new Date().getTime());
        })
        .on('codecData', function(data) {
          console.log('Input is ' + data.audio + ' audio ' + 'with ' + data.video + ' video')
        })
        .on('progress', function(progress) {
            //console.log('Processing: ' + progress.percent + '% done');
            updateStatus(uid, 'status', 'エンコード中');
            updateStatus(uid, 'progress', progress.percent);
        })
        .on('stderr', (stderrLine) => {
          logStream.write(`stderr: ${stderrLine}\n`);
        })
        .on('end', (stdout, stderr) => {
          logStream.write(`stderr: ${stderr}\n`)
          logStream.write(`stdout: ${stdout}\n`)

          // エンコード完了後、ダウンロードリンクを返す
          //res.send(`<a href="/download/${path.basename(outputFilePath)}">エンコードされた動画をダウンロード</a>`);
          // call_callback();
          updateStatus(uid, 'outputsize', fs.statSync(outputFilePath).size)
          updateStatus(uid, 'progress', 100);
          updateStatus(uid, 'status', '完了');
          resolve({t, f});
        })
        .on('error', (err) => {
          console.error(err);
          // res.status(500).send('エンコード中にエラーが発生しました。');
          // call_callback();
          updateStatus(uid, 'status', '失敗');
          reject(err);
        })
        .run();
        //console.log(f);

    }); //Promise
  }) // then
  .catch((error) => {
    // todo
  })
  .finally(() => {
    logStream.end(); // ログファイルを閉じる
    callback();
  });

}, 1); // 同時に1つのタスクを実行

function generateStatus() {
  const r = [];
  for (const p of processes) {
    r.push({
      uploadid: p.uploadid,
      start: p.start,
      name: p.name,
      status: p.status,
      progress: p.progress,
      url: p.url,
      thumbnail: p.thumbnail,
      inputsize: p.inputsize,
      outputsize: p.outputsize
    });
  }
  return r;
}

///////////////////////////////////////////////////////////////


async function main() {

  app.use(express.json());
  app.use(bodyParser.json());
  app.use(
    bodyParser.urlencoded({
      extended: true,
    }),
  );
  app.use(express.static(path.join(__dirname, 'static')));

  app.get('/status', async (req, res) => {
    // return ffmpeg process status
    console.log('access: /status');
    res.json(generateStatus());
  });

  app.ws('/wsstatus', (ws, req) => {
    ws.on('message', function (msg) {
      //console.log(processes);
      console.log('access: /wsstatus');
      wsClients.push(ws);
      sendStatus();
    })

  })

  app.get('/uploadid', async(req, res) => {
    console.log('access: /uploadid');
    res.json({ status: 'success', uploadid: ++uploadId });
  });

  app.post('/upload', upload.single('video'), async (req, res) => {
    const file = req.file;
    const ffmpegArgs = req.body.ffmpegargs; // 例: "-vcodec libx264"
  
    if (!file) {
      return res.status(400).send('動画ファイルがアップロードされていません。');
    }
    if (!ffmpegArgs) {
      return res.status(400).send('ffmpegArgsが指定されていません。');
    }

    // エンコード後のファイルのパスをアップロード時のファイル名に基づいて生成
    const outputFileName = `${req.body.uploadid}-${path.parse(file.originalname).name}-encoded.mp4`;
    const outputFilePath = path.join(tmpdir, outputFileName);
  
    // ログファイルのパスを設定
    const logFilePath = path.join(tmpdir, `${outputFileName}.log`);
    const logStream = fs.createWriteStream(logFilePath, { flags: 'a' });

    queue.push({
      uid: req.body.uploadid, 
      name: file.originalname, 
      outputfname: outputFileName,
      filePath: file.path, 
      outputFilePath, 
      ffmpegArgs, 
      logStream, 
      res 
    }, (err) => {
      if (err) {
        console.error('キュー処理中にエラーが発生しました。', err);
      }
    });
  
    res.json({
      status: 'success',
      output: outputFilePath
    });

  });

  
  app.get('/download', async (req, res) => {
    // download video file
    const filename = path.join(tmpdir, req.query.filename);
    res.download(filename, (err) => {
      if (err) {
        console.log(`download error: ${filename}`);
      }
    })
  });

  app.get('/stop', async (req, res) => {
    // stop ffmpeg process
    for (const f of processes) {
      if (f.status == 'エンコード中') {
        console.log(`kill #${f.uploadid} by user operation.`);
        f.ffmpegcommand.kill();
      }
    }
    res.json({
      status: 'success',
    });
  });

  
  app.get('/delete', async (req, res) => {
    // delete video file
    deleteAll(res);
    res.json({
      status: 'success',
    });
  });

  app.listen(port, () => {
    console.log(`${new Date()} Server is running on port ${port}`);
  });



  function deleteAll() {
    try {
      const dirents = fs.readdirSync(tmpdir, { encoding: 'utf8', withFileTypes: true, recursive: false });
      const files = dirents.filter(dirent => dirent.isFile()).map(({ name }) => name);
      for (const f of files) {
        if (f.endsWith('.mp4') || f.endsWith('.log') || f.endsWith('.png')) {
          console.log(`delete file: ${f}`);
          fs.unlink(path.join(tmpdir, f), (err) => {
            if (err) {
              console.error(err);
            }
          });
        }
      }
      console.log('flush processes, wsClients');
      processes = [];
      wsClients = [];
    } catch (error) {
      console.error(error);
    }

  }

  deleteAll();
}


main();
