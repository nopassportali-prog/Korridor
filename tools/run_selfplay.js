
// tools/run_selfplay.js
const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');
const argv = require('yargs').option('games', {type:'number', default:100}).argv;

(async ()=>{
  const browser = await puppeteer.launch({args:['--no-sandbox','--disable-setuid-sandbox']});
  const page = await browser.newPage();
  const filePath = 'file://' + path.resolve(path.join(__dirname,'..','index.html'));
  console.log('Loading', filePath);
  await page.goto(filePath, {waitUntil:'networkidle2'});
  await page.waitForFunction('typeof window.runSelfPlay === \"function\"');
  const games = argv.games || 100;
  console.log('Starting self-play for', games, 'games');
  const result = await page.evaluate((g)=>{
    return window.runSelfPlay(g);
  }, games);
  console.log('Result:', result);
  fs.writeFileSync('selfplay-metrics.json', JSON.stringify(result, null, 2));
  await browser.close();
  process.exit(0);
})();
