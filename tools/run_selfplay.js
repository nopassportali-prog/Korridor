// tools/run_selfplay.js (ohne yargs)
const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

const argv = process.argv.slice(2);
let games = 100;
for (let i = 0; i < argv.length; i++) {
  if ((argv[i] === '--games' || argv[i] === '-g') && argv[i+1]) {
    games = parseInt(argv[i+1], 10) || games;
  }
}

(async ()=>{
  const browser = await puppeteer.launch({args:['--no-sandbox','--disable-setuid-sandbox']});
  const page = await browser.newPage();
  const filePath = 'file://' + path.resolve(path.join(__dirname,'..','index.html'));
  console.log('Loading', filePath);
  await page.goto(filePath, {waitUntil:'networkidle2'});
  await page.waitForFunction('typeof window.runSelfPlay === "function"');
  console.log('Starting self-play for', games, 'games');
  const result = await page.evaluate((g)=>{
    return window.runSelfPlay(g);
  }, games);
  console.log('Result:', result);
  fs.writeFileSync('selfplay-metrics.json', JSON.stringify(result, null, 2));
  await browser.close();
  process.exit(0);
})();
