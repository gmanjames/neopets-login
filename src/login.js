const puppeteer = require('puppeteer-extra');

const StealthPlugin = require('puppeteer-extra-plugin-stealth')
puppeteer.use(StealthPlugin())

const TYPE_DELAY_MILLI = 300;

const sequence = (...fns) => {
    return fns.reduce((promise, fn) => {
        return promise.then(result => fn().then(Array.prototype.concat.bind(result)));
    }, Promise.resolve([]))
};

const PAGE_ADDRESSES = ((baseURL) => {
	return {
		login: `${baseURL}/login`,
		home: `${baseURL}/index.phtml`
	};
})(process.env['BASE_URL']);

const pageAddress = (pageKey) => PAGE_ADDRESSES[pageKey]

const goToPage = (page) => (pageAddr) => page.goto(pageAddr)

const loginSequence = async (browserPage) => {
	console.log(`Navigating to login.`)
	await goToPage(browserPage)(pageAddress('login'));

	const loginForm = await browserPage.$('#login');
	console.log(`Checking expected form element... ${loginForm ? 'success' : 'failed'}`);
	if (!loginForm) {
		throw 'Expected form element #login was not found';
	}

	console.log('Starting login sequence.')
	return sequence(
		() => loginForm.$('input[name="username"]').then(i => i.type(process.env['USERNAME'], {delay: TYPE_DELAY_MILLI})),
		() => loginForm.$('input[name="password"]').then(i => i.type(process.env['PASSWORD'], {delay: TYPE_DELAY_MILLI})),
		() => browserPage.click('.welcomeLoginButton')
	)
	.then(console.log.bind(console, 'Finished.'))
	.then(() => {
		return browserPage.waitForResponse((res) => {
			return /index.phtml/g.test(res.url()) && res.status() === 200
		})
	})
	.catch(console.error.bind(console))
};

(async () =>
{
	const browser = await puppeteer.launch({headless: true, defaultViewport: null});
	const page = await browser.newPage();
	try {
		const response = await loginSequence(page);
		console.log(response.request().headers());
	} catch (e) {
		console.error(e)
	} finally {
		browser.close();
	}
})();
