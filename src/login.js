const baseURL   = process.env['BASE_URL'],
      username  = process.env['NEOPETS_USERNAME'],
      password  = process.env['NEOPETS_PASSWORD'],
      dataDir   = process.env['DATA_DIRECTORY'];

const puppeteer = require('puppeteer-extra'),
      StealthPlugin = require('puppeteer-extra-plugin-stealth'),
      AdblockerPlugin = require('puppeteer-extra-plugin-adblocker');

puppeteer.use(StealthPlugin())
puppeteer.use(AdblockerPlugin())

const TYPE_DELAY_MILLI = 300;

const sequence = (...fns) => {
  return fns.reduce((promise, fn) => {
    return promise.then(result => fn().then(Array.prototype.concat.bind(result)));
  }, Promise.resolve([]))
};

const goToPage = (page) => (pageAddr) => page.goto(pageAddr)

const loginSequence = async (browserPage) => {
  console.log(`Navigating to login.`)
  await goToPage(browserPage)(`${baseURL}/login`);

  const loginForm = await browserPage.$('#login');
  console.log(`Checking expected form element... ${loginForm ? 'success' : 'failed'}`);
  if (!loginForm) {
    throw 'Expected form element #login was not found';
  }

  console.log('Starting login sequence.')
  return sequence(
    () => loginForm.$('input[name="username"]').then(i => i.type(username, {delay: TYPE_DELAY_MILLI})),
    () => loginForm.$('input[name="password"]').then(i => i.type(password, {delay: TYPE_DELAY_MILLI})),
    () => browserPage.click('.welcomeLoginButton')
  )
  .then(console.log.bind(console, 'Finished.'))
  .catch(console.error.bind(console))
};

const withTimeout = (fn, timeout, cb) => {
  let wait = fn.call();
  Promise.race([
    wait,
    new Promise((_, reject) => {
      setTimeout(reject.bind(null, 'Timeout exceeded.'), timeout * 1000);
    })
  ])
  .finally(cb)
};

(async () =>
{
  const browser = await puppeteer.launch({headless: false, defaultViewport: null});
  const page = await browser.newPage();

  page.on('response', async (response) => {
    let status       = response.status(),
        url          = response.url(),
        targetURL    = `${baseURL}/login.phtml`
        targetStatus = 302;

    console.log(`Received ${status} from ${url.slice(0, 50)}...`);

    if (url === targetURL && status === targetStatus) {
      console.log(`Target URL reached, checking cookies...`);
      let setCookieHeader = response.headers()['set-cookie'] || '';
      // TODO: Save to DATA_DIR
      console.log({setCookieHeader});
      browser.close()
    }
  });

  withTimeout(loginSequence.bind(null, page), 60, () => browser.close()); // in seconds
})();
