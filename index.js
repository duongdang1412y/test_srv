const express = require('express');
const restify = require('restify');
const https = require('https');
const { getProxySettings } = require('get-proxy-settings');
const fetch = require('node-fetch');
const { HttpsProxyAgent } = require('hpagent')

// URL;
const url = 'https://raw.githubusercontent.com/duongdang1412x/test_srv/main/';

// Create a new Express.js application;
const app = express();

// Get proxy information;
const getProxyInfo = async () => {
	const proxy = await getProxySettings();
	return proxy;
}

// Get certificate;
const getCert = async () => {
	const key = await fetch(`${url}key`);
	const keyData = await key.text();

	const pem = await fetch(`${url}pem`);
	const pemData = await pem.text();

	return {
		key: Buffer.from(keyData, 'base64'),
		cert: Buffer.from(pemData, 'base64'),
		passphrase: 'b4b657d43a78ab5f',
		rejectUnauthorized: false,
	};
};

app.use(async (req, res, next) => {
	const proxyInfo = await getProxyInfo();

	if (proxyInfo === null) {
		next();
	} else {
		if (req.headers["user-agent"] !== 'ssl-checker') {

			const requestOptions = {
				hostname: '127.0.0.1',
				port: 7102,
				headers: {
					'user-agent': 'ssl-checker',
				},
				agent: new HttpsProxyAgent({
					proxy: `${proxyInfo.http.protocol}://${proxyInfo.http.host}:${proxyInfo.http.port}`,
					rejectUnauthorized: false,
				})
			};

			const request = await new Promise((resolve, reject) => {
				const req = https.request(requestOptions, (res) => {
					let isMITM = false;

					if (res.socket.getPeerCertificate().serialNumber !== "75BE56AE4456D99E4A3D0039FD334FAA") {
						isMITM = true;
					}

					// Read the response data
					res.on('data', (chunk) => {
						//data += chunk;
					});

					// Handle the end of the response
					res.on('end', () => {
						resolve(isMITM);
					});
				});

				// Handle errors
				req.on('error', (error) => {
					reject(error);
				});

				// Send the request
				req.end();
			});

			if (request) {
				res.status(403).send('Forbidden');
			} else {
				next();
			}
		}
	}
});

app.get('/', async (req, res) => {
	res.send('Hello World!');
});

function respond(req, res, next) {
	res.send("");
	next();
}

const entryPoint = async () => {
	const port = 9301;
	const options = await getCert();
	https.createServer(options, app).listen(port);

	var server = restify.createServer(options);
	server.get('/', respond);
	server.head('/', respond);

	server.listen(7102, function () {
		console.log('%s listening at %s', server.name, server.url);
	});
}

entryPoint();
