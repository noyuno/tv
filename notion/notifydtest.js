require("dotenv").config({ path: require('find-config')('.env') });

async function main() {
  const ret = (await fetch('http://localhost:5050', {
    method: 'POST',
    body: JSON.stringify({
      token: process.env.NOTIFYD_TOKEN,
      message: 'test'
    }),
  }));
  console.log(ret);

}

main();
