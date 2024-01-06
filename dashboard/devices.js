const crypto = require('crypto');
const https = require('https');

require('dotenv').config();



    const token = process.env.SWITCHBOT_TOKEN;
    const secret = process.env.SWITCHBOT_SECRET;
    const t = Date.now();
    const nonce = "requestID";
    const data = token + t + nonce;
    const signTerm = crypto.createHmac('sha256', secret)
      .update(Buffer.from(data, 'utf-8'))
      .digest();
    const sign = signTerm.toString("base64");
    //console.log(sign);

    const options = {
      hostname: 'api.switch-bot.com',
      port: 443,
      path: `/v1.1/devices`,
      method: 'GET',
      headers: {
        "Authorization": token,
        "sign": sign,
        "nonce": nonce,
        "t": t,
      },
    };

    const req = https.request(options, s => {
      //console.log(`statusCode: ${s.statusCode}`);
      s.on('data', d => {
        process.stdout.write(d);
      });
    });

    req.on('error', error => {
      console.error(error);
    });

    req.end();

