require("dotenv").config({ path: require('find-config')('.env') });
const { Client } = require("@notionhq/client");
const notion = new Client({ auth: process.env.NOTION_INTEGRATION_TOKEN });
const rldbid = '1da4307f9f1349c983f38d39d7540863';
const endpoint = 'https://www.notion.so/';
//const request = require("request-promise-native");
const sleep = (time) => new Promise((resolve) => setTimeout(resolve, time));

async function notify(message) {
  const ret = (await fetch('http://localhost:5050', {
    method: 'POST',
    body: JSON.stringify({
      token: process.env.NOTIFYD_TOKEN,
      message: message
    }),
  }));
}

async function gettitle(rldbp) {
  
    //console.log(rldbp);
  /*
  const page = await notion.pages.retrieve({
    page_id: rldbp.id,
  });
  console.log('page : ');
  console.log(page);
  */

  const title = (await notion.pages.properties.retrieve({
    page_id: rldbp.id,
    property_id: 'title'
  })).results[0].title.plain_text;
  //console.log(`title : ${title}`);
  return title;
}

//////////////////////////////

async function updateProperties(rldbp) {
  const ret = (await notion.pages.update({
    page_id: rldbp.id,
    properties: {
      'EPGStation': {
        'url': `http://m1/#/recorded?keyword=` +  encodeURIComponent(`${rldbp.properties['タイトル'].title[0].plain_text}`)
      }
    }
  }));
}


////////////////////////////////////////////////////////////////////////////////////////////

// https://qiita.com/gomaoaji/items/603904e31f965d759293

const getToNgram = (text, n = 3) => {
  let ret = {};
  if (text == undefined) {
    text = '';
  }
  for (var m = 0; m < n; m++) {
    for (var i = 0; i < text.length - m; i++) {
      const c = text.substring(i, i + m + 1);
      ret[c] = ret[c] ? ret[c] + 1 : 1;
    }
  }
  return ret;
};

function getValuesSum(object) {
  return Object.values(object).reduce((prev, current) => prev + current, 0);
}

function stringngram(a, b) {
  const aGram = getToNgram(a);
  const bGram = getToNgram(b);
  const keyOfAGram = Object.keys(aGram);
  const keyOfBGram = Object.keys(bGram);
  // aGramとbGramに共通するN-gramのkeyの配列
  const abKey = keyOfAGram.filter((n) => keyOfBGram.includes(n));
  // aGramとbGramの内積(0と1の掛け算のため、小さいほうの値を足し算すれば終わる。)
  let dot = abKey.reduce(
    (prev, key) => prev + Math.min(aGram[key], bGram[key]),
    0
  );
  // 長さの積(平方根の積は積の平方根)
  const abLengthMul = Math.sqrt(getValuesSum(aGram) * getValuesSum(bGram));
  return dot / abLengthMul;
}

////////////////////////////////////////////////////////////////////////////////////////////

////////////////////////////////////////////////////////////////////////////////////////////

async function getepg(name, rldbpid, channel) {
  var next_cursor = undefined;
  var blocks = [];
  
  do {
    const ret = (await notion.blocks.children.list({
      block_id: rldbpid,
      start_cursor: next_cursor
    }));
    next_cursor = ret.next_cursor;
    blocks = blocks.concat(ret.results)
  } while (next_cursor);

  if (!blocks) {
    console.error(`getepg(): cannot retrieve blocks. name=${name}, block_id=${rldbpid}, channel=${channel}`)
    return null;
  }

  //const epg = JSON.parse(await request.get('http://m1/api/recorded?isHalfWidth=true&offset=0&limit=100&keyword=' + encodeURIComponent(name)));
  const epg = (await (await 
    fetch('http://m1/api/recorded?isHalfWidth=true&offset=0&limit=100&keyword=' + 
      encodeURIComponent(name))).json());

  //console.log(epg);
  epg.records.sort((a, b) => {
    return new Date(a.startAt).getTime() - new Date(b.startAt).getTime();
  });

  var lastid = undefined;
  var description = '';
  var rawextended = {}
  var num = 0;
  var bn = 0;


  for (var en = 0; en < epg.records.length; en++) {
    var existsid, endid, bn;
    if (en == 0) {
      [ existsid, endid, bn ] = await walkBlock(epg.records[en].id, blocks, rldbpid);
    } else {
      [ existsid, endid, bn ] = await nextBlock(epg.records[en].id, blocks, bn);
    }
    if (existsid) {
      //console.log('already exists, skipping. pblockid = ' + pblockid);
      //continue;
    } else {
      num++;
      if (lastid) {
        //console.log(`not found. creating. lastid = ${lastid}`);
        endid = lastid;
      } else {
        //console.log(`not found. creating. endid = ${endid}`);
      }
      lastid = await generate(epg.records[en], description, rawextended, channel, lastid, rldbpid, endid);
    }
    // 番組内容は、前回の内容と比較するためすべて変数に格納する。
    description = epg.records[en].description;
    rawextended = epg.records[en].rawExtended;
  }
  return num;
}

async function generate(record, description, rawextended, channel, lastid, rldbpid, endid) {
  // 番組内容　類似度判定
  var text = '番組内容: \r\n';
  //console.log(record)
  // description
  if (record.description && stringngram(description, record.description) <= 0.8) {
    text += `${record.description}\r\n\r\n`
  }
  // rawExtended
  if (record.rawExtended) { 
    for (const [key, value] of Object.entries(record.rawExtended)) {
      var append = false;
      if (rawextended && rawextended[key]) {
        const m = stringngram(rawextended[key], value);
        if (m > 0.8) {
          // match
          //console.log(`matched extended score=${m}, ${rawextended[key]} , ${value}`)
        } else {
          append = true;
        }
      } else {
        //console.log(`rawextended[${key}] not found`)
        append = true;
      }
      if (append) {
        //console.log(`append extended, ${key}: ${value}`);
        text += `${key}: ${value}\r\n`;
      }
    }
  }

  const date = new Date(record.startAt).toLocaleDateString("ja-JP", {
    year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit"
  });
  const ch = channel.find(d => { return d.id == record.channelId; });
  const cha = ch ? ch.halfWidthName : `不明(${record.channelId})`;
  //console.log(cha)
  //console.log(`cha=${cha}, record.channelId=${record.channelId}`)
  var link = '(リンクなし)';
  if (record.videoFiles && record.videoFiles[0]) {
    link = `http://m1/#/recorded/detail/${record.id}`;
  }
  //console.log(`## ${record.name} [${record.id}]\r\n  paragraph 時刻: ${date}、チャンネル: ${cha}\r\n  bookmark ${link}\r\n  paragraph ${text.replace(/^/g, '    ')}`);
  //await sleep(5000);
  lastid = (await notion.blocks.children.append({
    block_id: rldbpid,
    after: endid,
    children: [
      { 'heading_2': { 'rich_text': [{ 'text': { 'content': `${record.name} [${record.id}]` } }] } },
      { 'paragraph': { 'rich_text': [{ 'text': { 'content': `時刻: ${date}、チャンネル: ${cha}` } }] } },
      { 'paragraph': { 'rich_text': [{ 'text': { 'content': `${link}`, 'link': { 'url': `${link}` } } }] } },
      { 'paragraph': { 'rich_text': [{ 'text': { 'content': `${text}` } }] } },
    ]
  })).results[3].id;
  return lastid;
}

async function walkBlock(epgid, blocks, rldbpid) {
  var existsid = undefined;
  // 末尾
  var endid = undefined;
  // 既に存在？
  var epgstation_area = undefined;
  //console.log(`searching [${epgid}]`);
  var bn = 0;
  for ( ; bn < blocks.length; bn++) {
    //console.log(`blocks[${bn}].type=${blocks[bn].type}`);
    if (epgstation_area) {
      // in EPGStation area
      if (blocks[bn].type == 'heading_2' && blocks[bn].heading_2.rich_text.length > 0) {
        //console.log(`blocks[bn].heading_2.rich_text[0].plain_text=${blocks[bn].heading_2.rich_text[0].plain_text}`);
        if (blocks[bn].heading_2.rich_text[0].plain_text.includes(`[${epgid}]`)) {
          // already exists
          //console.log(`already exists [${epgid}]`);
          existsid = blocks[bn].id;
          break;
        }
      }
      if (blocks[bn].type == 'heading_1') {
        // EPGStation area end
        //console.log('EPGStation area end');
        break;
      }
      endid = blocks[bn].id;
    } else {
      // before EPGStation area
      if (blocks[bn].type == 'heading_1' && blocks[bn].heading_1.rich_text.length > 0 && blocks[bn].heading_1.rich_text[0].plain_text == 'EPGStation') {
        // EPGStation area start
        //console.log('EPGStation area start');
        epgstation_area = true;
        endid = blocks[bn].id;
        continue;
      }
    }
  }

  //console.log(`walkBlock() end: epgstation_area=${epgstation_area}, existsid=${existsid}, endid=${endid}, bn=${bn}`)
  if (epgstation_area == undefined) {
    //console.log(blocks.slice(-1));
    const block_id = (blocks.length == 0) ? rldbpid : blocks.slice(-1)[0].id;
    endid = (await notion.blocks.children.append({
      block_id: block_id,
      children: [{ 'heading_1': { 'rich_text': [{ 'text': { 'content': 'EPGStation' } }] } }]
    })).results[0].id;
    //console.log(`h1 EPGStation id=${endid}, (parent=${block_id})`);
  }

  return [ existsid, endid, bn++ ];
}


async function nextBlock(epgid, blocks, bn) {
  var existsid = undefined;
  // 末尾
  var endid = undefined;

  //console.log(`searching [${epgid}]`);
  for ( ; bn < blocks.length; bn++) {
    //console.log(`blocks[${bn}].type=${blocks[bn].type}`);
    if (blocks[bn].type == 'heading_1') {
      // EPGStation area end
      //console.log('EPGStation area end');
      break;
    }
    if (blocks[bn].type == 'heading_2' && blocks[bn].heading_2.rich_text.length > 0) {
      //console.log(`block.heading_2.rich_text[0].plain_text=${blocks[bn].heading_2.rich_text[0].plain_text}`);
      if (blocks[bn].heading_2.rich_text[0].plain_text.includes(`[${epgid}]`)) {
        // already exists
        //console.log(`already exists [${epgid}]`);
        existsid = blocks[bn].id;
        break;
      }
    }
    endid = blocks[bn].id;
  }

  //console.log(`nextBlock() end. existsid=${existsid}, endid=${endid}, bn=${bn}`)

  return [ existsid, endid, bn ];
}
////////////////////////////////////////////////////////////////////////////////////////////

async function main() {
  try {
    var next_cursor = undefined;
    var successtext = '';
    var failuretext = '';
    do {
      const rldb = await notion.databases.query({
        database_id: rldbid,
        start_cursor: next_cursor,
      });
      next_cursor = rldb.next_cursor;
      //console.log('rldb : ');
      //console.log(rldb);
      //const channel = JSON.parse(await request.get('http://m1/api/channels'));
      var channel = (await (await fetch('http://m1/api/channels')).json())
      channel.push(
        {'id': 400211, 'halfWidthName': 'BS11' },
        {'id': 400181, 'halfWidthName': 'BSフジ' },
        {'id': 400161, 'halfWidthName': 'BS-TBS' },
        {'id': 400141, 'halfWidthName': 'BS日テレ' },
      )
      //console.log(channel)

      for (const rldbp of rldb.results) {
        try {
          console.log(`# ${rldbp.properties['タイトル'].title[0].plain_text}`);
          (await updateProperties(rldbp));
          //(await createEpgBlock(rldbp));
          const n = (await getepg((await gettitle(rldbp)), rldbp.id, channel));
          if (n) {
            successtext += `${rldbp.properties['タイトル'].title[0].plain_text} (話数${n})\r\n`
          }
        } catch (error) {
          const f = `${rldbp.properties['タイトル'].title[0].plain_text} (${error})\r\n`;
          console.log(f);
          failuretext += f;
        }
        //(await sleep(5000));
      }
    } while (next_cursor);

    if (failuretext) {
      const t = `Notion同期中にエラー\r\n${error}\r\n同期失敗:\r\n${failuretext}`;
      console.log(t)
      notify(t);
    }
    if (successtext) {
      const t = `Notionへの同期完了\r\n${successtext}`;
      console.log(t)
      notify(t);
    }
    if (failuretext == '' && successtext == '') {
      const t = `Notionは既に同期済み`;
      console.log(t)
      notify(t);
    }
  } catch (error) {
    const t = `Notion同期中にエラー（全般）\r\n${error}`;
    console.error(t)
    console.error(error);
    try {
      notify(t);
    } catch (err2) {
      console.error(err2);
    }
  }
}

main(); 
