import puppeteer from 'puppeteer';

(async () => {
  console.log('Launching browser...');
  const browser = await puppeteer.launch({ headless: true });
  
  // 1. Initiator creates a room
  console.log('Opening Initiator...');
  const initiatorPage = await browser.newPage();
  initiatorPage.on('console', msg => console.log('Initiator:', msg.text()));
  await initiatorPage.goto('http://localhost:5173', { waitUntil: 'domcontentloaded' });
  
  await initiatorPage.waitForSelector('button.btn');
  await initiatorPage.evaluate(() => {
    document.querySelectorAll('button').forEach(b => {
      if(b.textContent.includes('Create Secure Room')) b.click();
    });
  });

  // Wait for room to be created and URL to change
  await new Promise(r => setTimeout(r, 2000));
  const roomUrl = await initiatorPage.url();
  console.log('Room created at:', roomUrl);

  // 2. Receiver joins the room
  console.log('Opening Receiver...');
  const receiverPage = await browser.newPage();
  receiverPage.on('console', msg => console.log('Receiver:', msg.text()));
  await receiverPage.goto(roomUrl, { waitUntil: 'domcontentloaded' });

  // Wait for WebRTC connection
  console.log('Waiting for connection...');
  await new Promise(r => setTimeout(r, 6000));

  const isConnected = await initiatorPage.evaluate(() => {
    return document.body.innerText.includes('Securely Connected!');
  });
  console.log('Is Connected?', isConnected);

  if (isConnected) {
    // 3. Test Chat
    console.log('Testing Chat...');
    // Type in initiator
    await initiatorPage.type('.input-field', 'Hello from Initiator!');
    await initiatorPage.evaluate(() => {
        document.querySelector('.chat-input-row button').click();
    });

    await new Promise(r => setTimeout(r, 1000));

    // Check receiver
    const receiverText = await receiverPage.evaluate(() => {
        return document.querySelector('.chat-messages').innerText;
    });
    console.log('Receiver saw:', receiverText);

    if (receiverText.includes('Hello from Initiator!')) {
        console.log('✅ Chat working perfectly!');
    } else {
        console.log('❌ Chat NOT received!');
    }
  }

  await browser.close();
})();
