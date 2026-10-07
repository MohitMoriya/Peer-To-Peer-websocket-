const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch();
  const page1 = await browser.newPage();
  
  page1.on('console', msg => console.log('PAGE 1 CONSOLE:', msg.text()));
  page1.on('pageerror', err => console.log('PAGE 1 ERROR:', err.message));

  console.log('Navigating to Home...');
  await page1.goto('http://localhost:5174/');
  
  const roomId = '123456';
  await page1.goto(`http://localhost:5174/room/${roomId}`);
  
  console.log('Page 1 is in the room. Waiting 2 seconds...');
  await new Promise(r => setTimeout(r, 2000));
  
  const page2 = await browser.newPage();
  page2.on('console', msg => console.log('PAGE 2 CONSOLE:', msg.text()));
  page2.on('pageerror', err => console.log('PAGE 2 ERROR:', err.message));

  console.log('Page 2 navigating to room...');
  await page2.goto(`http://localhost:5174/room/${roomId}`);
  
  console.log('Waiting 5 seconds for connection...');
  await new Promise(r => setTimeout(r, 5000));
  
  const html1 = await page1.content();
  const html2 = await page2.content();
  
  console.log('PAGE 1 HTML CONTAINS "Securely Connected":', html1.includes('Securely Connected'));
  console.log('PAGE 2 HTML CONTAINS "Securely Connected":', html2.includes('Securely Connected'));
  console.log('PAGE 2 HTML CONTAINS "Connecting to Peer":', html2.includes('Connecting to Peer'));
  
  await browser.close();
})();
