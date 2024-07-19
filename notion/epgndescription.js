require("dotenv").config({ path: require('find-config')('.env') });
const { Client } = require("@notionhq/client");
const notion = new Client({ auth: process.env.NOTION_INTEGRATION_TOKEN });
const rldbid = '1da4307f9f1349c983f38d39d7540863';
const endpoint = 'https://www.notion.so/';
const request = require("request-promise-native");
const sleep = (time) => new Promise((resolve) => setTimeout(resolve, time));

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

//////////////////////////////

async function createEpgBlock(rldbp) {
  var epgblockid = undefined;

  const blocks_children = (await notion.blocks.children.list({
    block_id: rldbp.id
  })).results;
  //console.log('blocks.children : ');
  //console.log(blocks_children);
  
  for (const block of blocks_children) {
    //console.log(block.heading_1)
    if (block.type == 'heading_1' && block.heading_1.rich_text.length > 0 && block.heading_1.rich_text[0].plain_text == 'EPGStation') {
      epgblockid = block.id;
      break;
    }
  }

  if (epgblockid) {
    //console.log('epgblockid found : ' + epgblockid);
  } else {
    //console.log('epgblockid not found.');
    epgblockid = (await notion.blocks.children.append({
      block_id: rldbp.id,
      children: [ { 'heading_1': { 'rich_text': [ { 'text': { 'content': 'EPGStation' } } ] } } ]
    })).results[0].id;
    //console.log('epgblockid created : ' + epgblockid);
  }
  return epgblockid;
}

////////////////////////////////////////////////////////////////////////////////////////////


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
  const blocks = (await notion.blocks.children.list({
    block_id: rldbpid
  })).results;



  const epg = JSON.parse(await request.get('http://m1/api/recorded?isHalfWidth=true&offset=0&limit=100&keyword=' + encodeURIComponent(name)));
  //console.log(epg);
  epg.records.sort((a, b) => {
    return new Date(a.startAt).getTime() - new Date(b.startAt).getTime();
  });
  //console.log(epg.records);

  var lastid = undefined;
  var description = '';
  var rawextended = {}
  for (const record of epg.records) {
    var { pblockid, endid } = searchRecord(record, blocks);

    if (pblockid) {
      //console.log('already exists, skipping. pblockid = ' + pblockid);
      continue;
    }
    if (lastid) {
      //console.log(`not found. creating. lastid = ${lastid}`);
      endid = lastid;
    } else {
      //console.log(`not found. creating. endid = ${endid}`);
    }

    lastid = await generate(record, description, rawextended, channel, lastid, rldbpid, endid);

    // 番組内容は、前回の内容と比較するためすべて変数に格納する。
    description = record.description;
    rawextended = record.rawExtended;



  }
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
  console.log(`## ${record.name} [${record.id}]\r\n  paragraph 時刻: ${date}、チャンネル: ${cha}\r\n  bookmark ${link}\r\n  paragraph ${text.replace(/^/g, '    ')}`);
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

function searchRecord(record, blocks) {
  var pblockid = undefined;
  // 末尾
  var endid = undefined;
  // 既に存在？
  var epgstation_area = undefined;
  //console.log(`searching [${record.id}] (name=${record.name})`);
  for (const block of blocks) {
    //console.log(`block.type=${block.type}`);
    if (epgstation_area) {
      // in EPGStation area
      if (block.type == 'heading_2' && block.heading_2.rich_text.length > 0) {
        //console.log(`block.heading_2.rich_text[0].plain_text=${block.heading_2.rich_text[0].plain_text}`);
        if (block.heading_2.rich_text[0].plain_text.includes(`[${record.id}]`)) {
          // already exists
          //console.log(`already exists [${record.id}]`);
          pblockid = block.id;
          break;
        }
      }
      if (block.type == 'heading_1') {
        // EPGStation area end
        //lastid = block.id;
        //console.log('EPGStation area end');
        break;
      }
      endid = block.id;
    } else {
      // before EPGStation area
      if (block.type == 'heading_1' && block.heading_1.rich_text.length > 0 && block.heading_1.rich_text[0].plain_text == 'EPGStation') {
        // EPGStation area start
        //console.log('EPGStation area start');
        epgstation_area = true;
        endid = block.id;
        continue;
      }
    }
  }
  return { pblockid, endid };
}

////////////////////////////////////////////////////////////////////////////////////////////

async function main() {
  try {
    var next_cursor = undefined;
    do {
      const rldb = await notion.databases.query({
        database_id: rldbid,
        start_cursor: next_cursor,
      });
      next_cursor = rldb.next_cursor;
      //console.log('rldb : ');
      //console.log(rldb);
      const channel = JSON.parse(await request.get('http://m1/api/channels'));
      //console.log(channel)

      for (const rldbp of rldb.results) {
        console.log(`# ${rldbp.properties['タイトル'].title[0].plain_text}`);
        (await updateProperties(rldbp));
        (await createEpgBlock(rldbp));
        (await getepg((await gettitle(rldbp)), rldbp.id, channel));
        //(await sleep(5000));
      }
    } while (next_cursor);

  } catch (error) {
    console.error(error);
  }
}

main(); 
