const puppeteer = require('puppeteer-extra');
const cheerio = require('cheerio');
const request = require('request-promise-native');

const StealthPlugin = require('puppeteer-extra-plugin-stealth')
puppeteer.use(StealthPlugin())

const TYPE_DELAY_MILLI = 300;

const sequence = (...fns) => {
    return fns.reduce((promise, fn) => {
        return promise.then(result => fn().then(Array.prototype.concat.bind(result)));
    }, Promise.resolve([]))
};

(async () =>
{
    const browser = await puppeteer.launch({headless: true, defaultViewport: null});
    const page = await browser.newPage();
    await page.goto(`${process.env['BASE_URL']}/login`);
    const loginForm = await page.$('#login');
    sequence(
        () => loginForm.$('input[name="username"]').then(i => i.type(process.env['USERNAME'], {delay: TYPE_DELAY_MILLI})),
        () => loginForm.$('input[name="password"]').then(i => i.type(process.env['PASSWORD'], {delay: TYPE_DELAY_MILLI})),
        () => page.click('.welcomeLoginButton')
    )
    .then(() => {
        return page.waitForResponse(response => response.url() === `${process.env['BASE_URL']}/index.phtml` && response.status() === 200);
    })
    .then((response) => {
        let headers = response.request().headers();
        request({
            method: 'GET',
            url: `${process.env['BASE_URL']}/index.phtml`,
            headers,
            gzip: true,
            transform: (body) => {
                return cheerio.load(body);
            }
        })
        .then(($) => {
            console.log(`login succeeded: ${cheerio.html($('.user')).includes(process.env['USERNAME'])}`);
        })
    })
    .catch((error) => console.error(error.message))
    .finally(() => browser.close());
})();
