import puppeteer from 'puppeteer';
import * as fs from 'fs';

(async () => {
  const logFile = 'browser_errors.txt';
  fs.writeFileSync(logFile, '--- START LOG ---\n');

  const browser = await puppeteer.launch({ headless: "new" });
  const page = await browser.newPage();
  
  page.on('console', msg => {
    if (msg.type() === 'error') {
      fs.appendFileSync(logFile, `CONSOLE ERROR: ${msg.text()}\n`);
    }
  });

  page.on('pageerror', error => {
    fs.appendFileSync(logFile, `PAGE ERROR: ${error.message}\n${error.stack}\n`);
  });

  try {
    fs.appendFileSync(logFile, 'Navigating to login...\n');
    await page.goto('http://fefka.localhost:3000/login', { waitUntil: 'networkidle0' });
    
    // Type credentials
    await page.type('input[type="email"]', 'hod.cse@fefka.edu');
    await page.type('input[type="password"]', 'Test@1234');
    
    fs.appendFileSync(logFile, 'Clicking login button...\n');
    await page.evaluate(() => {
      const btn = Array.from(document.querySelectorAll('button')).find(el => el.textContent.includes('INITIAT') || el.textContent.includes('ACCESS DASHBOARD') || el.textContent.includes('Login'));
      if(btn) btn.click();
      else document.querySelector('form').submit();
    });

    fs.appendFileSync(logFile, 'Waiting for navigation...\n');
    await page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 8000 }).catch(e => fs.appendFileSync(logFile, `Navigation timeout: ${e.message}\n`));
    
    await new Promise(resolve => setTimeout(resolve, 3000));
    fs.appendFileSync(logFile, `Final URL: ${page.url()}\n`);
    
  } catch (err) {
    fs.appendFileSync(logFile, `SCRIPT EXCEPTION: ${err.message}\n`);
  } finally {
    await browser.close();
  }
})();
