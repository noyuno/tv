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

const tmpdir = '/mnt/hddts0-plain0/tv/tmp'

const logger = require('log4js').configure({
  appenders: {
    console: {
      type: "console",
    },
    app: {
      type: "dateFile",
      filename: path.join(tmpdir, 'server-log.txt'),
      pattern: "-yyyy-MM-dd",
      numBackups: 7,
      compress: true,
    },
  },
  categories: {
    default: {
      appenders: ["console", "app"],
      level: "info",
      enableCallStack: true,
    },
  }
}).getLogger();


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

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, tmpdir);
  },
  filename: (req, file, cb) => {
    const uid = req.body.uploadid;
    logger.debug('uploadid:', uid); // uploadid を確認
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
  .then(() => { // duration
    return new Promise((resolve, reject) => {
      try {
        ffmpeg.ffprobe(filePath, function(err, metadata) {
          //console.dir(metadata); // all metadata
          //console.log(metadata.format.duration);
          const duration = metadata.format.duration;
          logger.debug(`duration: ${duration}`);
          resolve(duration);
        });
      } catch (err) {
        logger.error('thumbnail: init error')
        logger.error(e);
        reject(e);
      }
    });
  })
  .then((duration) => { // thumbnail 
    return new Promise((resolve, reject) => {
      logger.debug('thumbnail: init')
      try {
        const thumbnailDuration = duration > 20 ? 10 : Math.floor(duration / 2);
        logger.debug(`thumbnail: video duration: ${duration}, thumbnailDuration: ${thumbnailDuration}`);
        const thumbnailFilename = path.join(path.dirname(outputFilePath), `${outputfname}.png`);
        logger.debug(`thumbnail: folder: ${path.dirname(thumbnailFilename)}`)
        const t = ffmpeg(filePath)
          .screenshots({
            count: 1,
            timestamps: [thumbnailDuration],
            filename: path.basename(thumbnailFilename),
            folder: path.dirname(thumbnailFilename),
            size: '443x?'
          })
          // .on('start', ()=> {
          //   logger.debug('thumbnail: start')
          // })
          .on('filenames', (filenames) => {
            logger.debug(`thumbnail: will generate: ${filenames.join(', ')}`)
          })
          .on('end', () => {
            logger.debug('thumbnail: end')
            resolve({duration, thumbnailFilename});
          })
          .on('error', (err) => {
            logger.error('thumbnail: error')
            logger.error(err);
            reject(err);
          })
          // .run();
        logger.debug('thumbnail: init end')
        
      } catch (e) {
        logger.error('thumbnail: init error')
        logger.error(e);
        reject(e);
      }
    });
  })
  .then(({duration, thumbnailFilename}) => { // encode
    return new Promise((resolve, reject) => {
      logger.debug('encode: init')

      const attachThumbnail = duration > 10;
      if (!attachThumbnail) {
        logger.debug(`thumbnail: duration(${duration}) < 10, skip thumbnail attachment`)
      }      
      
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
        inputsize: fs.statSync(filePath).size,
        duration: duration
      });
      

      if (attachThumbnail) {
        f.input(thumbnailFilename);
      }
      f.output(outputFilePath);
      if (attachThumbnail) {
        f.withOutputOptions((ffmpegArgs + ' -map 1 -c:v:1 png -disposition:v:1 attached_pic').split(' '))
      } else {
        f.withOutputOptions(ffmpegArgs.split(' '))
      }
      f.on('start', (commandLine) => {
        logger.debug('encode: start');
        logStream.write(`start: ${commandLine}\n`);
        updateStatus(uid, 'start');
        updateStatus(uid, 'start', new Date().getTime());
      })
      .on('codecData', function(data) {
        logger.debug('Input is ' + data.audio + ' audio ' + 'with ' + data.video + ' video')
      })
      .on('progress', function(progress) {
          //logger.trace('Processing: ' + progress.percent + '% done');
          updateStatus(uid, 'status', 'エンコード中');
          updateStatus(uid, 'progress', progress.percent);
      })
      .on('stderr', (stderrLine) => {
        logStream.write(`stderr: ${stderrLine}\n`);
      })
      .on('end', (stdout, stderr) => {
        logger.debug('encode: end');
        logStream.write(`stderr: ${stderr}\n`)
        logStream.write(`stdout: ${stdout}\n`)

        // エンコード完了後、ダウンロードリンクを返す
        //res.send(`<a href="/download/${path.basename(outputFilePath)}">エンコードされた動画をダウンロード</a>`);
        // call_callback();
        updateStatus(uid, 'outputsize', fs.statSync(outputFilePath).size)
        updateStatus(uid, 'progress', 100);
        updateStatus(uid, 'status', '完了');
        resolve({thumbnailFilename, f});
      })
      .on('error', (err) => {
        logger.error('encode: error')
        logger.error(err);
        // res.status(500).send('エンコード中にエラーが発生しました。');
        // call_callback();
        updateStatus(uid, 'status', '失敗');
        reject(err);
      })
      .run();
      //logger.trace(f);

    }); //Promise
  }) // then
  .catch((error) => {
    logger.debug('Promise error block')
    // todo
  })
  .finally(() => {
    logger.debug('Promise finally block')
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
      outputsize: p.outputsize,
      duration: p.duration
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
    logger.debug('access: /status');
    res.json(generateStatus());
  });

  app.ws('/wsstatus', (ws, req) => {
    ws.on('message', function (msg) {
      logger.debug('access: /wsstatus');
      wsClients.push(ws);
      sendStatus();
    })

  })

  app.get('/uploadid', async(req, res) => {
    logger.debug('access: /uploadid');
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
        logger.error('キュー処理中にエラーが発生しました。', err);
      }
    });
  
    res.json({
      status: 'success',
      output: outputFilePath
    });

  });

  
  app.get('/download', async (req, res) => {
    // download video file
    logger.debug(`access: /download, filename: ${req.query.filename}`);
    const filename = path.join(tmpdir, req.query.filename);
    res.download(filename, (err) => {
      if (err) {
        logger.error(`download error: ${filename}`);
      }
    })
  });

  app.get('/stop', async (req, res) => {
    // stop ffmpeg process
    logger.debug('access: /stop');
    stopAll();
    res.json({
      status: 'success',
    });
  });

  
  app.get('/delete', async (req, res) => {
    // delete video file
    logger.debug('access: /delete');
    stopAll();
    deleteAll(res);
    res.json({
      status: 'success',
    });
  });

  app.listen(port, () => {
    logger.info(`${new Date()} Server is running on port ${port}`);
  });



  function stopAll() {
    for (const f of processes) {
      if (f.status == 'エンコード中') {
        logger.debug(`kill #${f.uploadid} by user operation.`);
        f.ffmpegcommand.kill();
      }
    }
  }

  function deleteAll() {
    try {
      const dirents = fs.readdirSync(tmpdir, { encoding: 'utf8', withFileTypes: true, recursive: false });
      const files = dirents.filter(dirent => dirent.isFile()).map(({ name }) => name);
      for (const f of files) {
        if (f.endsWith('.mp4') || f.endsWith('.mov') || f.endsWith('.log') || f.endsWith('.png')) {
          logger.debug(`delete file: ${f}`);
          fs.unlink(path.join(tmpdir, f), (err) => {
            if (err) {
              logger.error(err);
            }
          });
        }
      }
      logger.debug('flush processes, wsClients');
      processes = [];
      wsClients = [];
    } catch (error) {
      logger.error(error);
    }

  }

  process.on('beforeExit', (code) => {
    logger.warn('beforeExit');
    deleteAll();
  });
  // Ctrl + C での終了を検知
  process.on("SIGINT", function () {
    logger.warn('received SIGINT signal');
    deleteAll();
    process.exit(0);
  });

  // Terminal が閉じられるのを検知
  process.on("SIGHUP", function () {
    logger.warn('received SIGHUB signal');
    deleteAll();
    process.exit(0);
  });

  //deleteAll();
}


main();
