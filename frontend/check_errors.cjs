const puppeteer = require('puppeteer');

(async () => {
  try {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    
    page.on('console', msg => {
      if (msg.type() === 'error') {
        console.log('BROWSER EXCEPTION:', msg.text());
      }
    });

    page.on('pageerror', err => {
      console.log('UNHANDLED PAGE ERROR:', err.message);
    });

    await page.goto('http://localhost:3000', {waitUntil: 'networkidle0'});
    await browser.close();
  } catch (err) {
    console.error(err);
  }
})();
