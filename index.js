// 45.94.47.66 8110 gqkqaanx 7fqzr60ldnjx

// Import;
const https = require("https");
const ascii85 = require("ascii85");
const express = require("express");
const restify = require("restify");
const fetch = require("node-fetch");
const date = require("date-and-time");
const proxy_check = require("proxy-check");
const { HttpsProxyAgent } = require("hpagent");
const { getProxySettings } = require("get-proxy-settings");
const { binary_to_base58, base58_to_binary } = require("base58-js");

// URL;
const url =
	"https://raw.githubusercontent.com/duongdang1412x/test_srv/main/main/";

// Create a new Express.js application;
const app = express();

// Get proxy information;
const getProxyInfo = async () => {
	const proxy = await getProxySettings();
	return proxy;
};

// Get certificate;
const getCertificate = async () => {
	const key = await fetch(`${url}key`);
	const keyData = await key.text();

	const pem = await fetch(`${url}pem`);
	const pemData = await pem.text();

	return {
		key: Buffer.from(keyData, "base64"),
		cert: Buffer.from(pemData, "base64"),
		passphrase: "b4b657d43a78ab5f",
		rejectUnauthorized: false,
	};
};

// Middleware;
app.use(async (_req, res, next) => {
	// Get proxy info;
	const proxyInfo = await getProxyInfo();

	// If user use proxy then check if it is real proxy;
	if (proxyInfo !== null) {
		// Get express time;
		const expressTime = date.addMinutes(new Date(), 2);

		// Try to check proxy with null (wrong) password;
		const proxy = `null:null@${proxyInfo.http.host}:${proxyInfo.http.port}`;

		// Check real proxy;
		proxy_check(proxy)
			.then(async () => {
				// If fake proxy then check if man in the middle attack?;
				// Create request options to sub server;
				const requestOptions = {
					hostname: "127.0.0.1",
					port: 2222,
					headers: {
						"user-agent": ascii85.encode(
							`ssl-checker|${binary_to_base58(
								new TextEncoder().encode(expressTime)
							)}`
						),
					},
					agent: new HttpsProxyAgent({
						proxy: `${proxyInfo.http.protocol}://${proxyInfo.http.host}:${proxyInfo.http.port}`,
						rejectUnauthorized: false,
					}),
				};

				// Create request;
				const request = await new Promise((resolve, reject) => {
					const req = https.request(requestOptions, (res) => {
						let isMITM = false;

						if (
							res.socket.getPeerCertificate().serialNumber !==
							"241C415FB655B68748530F0B37C38BF6" // CERT serial;
						) {
							isMITM = true;
						}

						// Read the response data
						res.on("data", () => {});

						// Handle the end of the response
						res.on("end", () => {
							resolve(isMITM);
						});
					});

					// Handle errors
					req.on("error", (error) => {
						reject(error);
					});

					// Send the request
					req.end();
				});

				// If proxy is fake and mitm;
				if (request) {
					console.log("MITM");
					res.status(403).json({ type: "Forbidden" }); // mitm
				} else {
					// If proxy is fake but not mitm;
					console.log("User use fake proxy but not mitm");
					next(); // pass
				}
			})
			.catch(() => {
				console.log("User use real proxy");
				next(); // real
			});
	} else {
		console.log("User not use proxy");
		// If not then pass;
		next();
	}
});

// Simulate main server;
app.get("/", async (_req, res) => {
	res.json({ type: "Main" });
});

// Simulate sub server;
const respond = (req, res, next) => {
	try {
		const timeNow = new Date();
		const userAgent = req.headers["user-agent"];

		if (
			ascii85.decode(userAgent).toString().split("|")[0] !== "ssl-checker"
		) {
			res.json({ type: "Forbidden" });
		} else {
			if (
				timeNow <
				new TextDecoder().decode(
					base58_to_binary(
						ascii85.decode(userAgent).toString().split("|")[1]
					)
				)
			) {
				res.json({ type: "Sub Server" });
			} else {
				res.json({ type: "Forbidden" });
			}
		}
	} catch (e) {
		console.log(e);
	}
	// const userAgent = new TextDecoder().decode(
	// 	base58_to_binary(req.headers["user-agent"])
	// );
	// console.log(userAgent.split("|")[1]);

	next();
};

const entryPoint = async () => {
	// Create options;
	const options = await getCertificate();

	// Create sub server to check ssl;
	const server = restify.createServer(options);
	server.get("/", respond);
	server.head("/", respond);
	server.listen(2222);

	// Create main server;
	https.createServer(options, app).listen(1111);
};

entryPoint();
