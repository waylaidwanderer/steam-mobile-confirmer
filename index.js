const crypto = require('crypto');
const request = require('request');

const SteamCommunity = require('steamcommunity');
const SteamTotp = require('steam-totp');

const loginDetails = {
    username: '',
    password: '',
    shared_secret: '',
    identity_secret: '',
    proxy: '' // optional, ip:port format
};

console.log(`Starting confirmations checker for ${loginDetails.username}...`);

//noinspection JSIgnoredPromiseFromCall
main();

async function main() {
    await startBot({
        config: loginDetails,
        community: new SteamCommunity({
            request: request.defaults({
                proxy: loginDetails.proxy ? 'http://' + loginDetails.proxy : undefined
            })
        })
    });
}

async function startBot(bot) {
    await loginBot(bot);
    //noinspection JSIgnoredPromiseFromCall
    checkIfLoggedIn(bot);
    let apiKey;
    try {
        apiKey = await getWebApiKey(bot);
    } catch (err) {
        console.log(`${getTag(bot)} [ERROR] Couldn't get API key for ${bot.config.username}.`);
        console.log(err);
    }
    console.log(`${getTag(bot)} API key: ${apiKey}`);
    bot.community.on('debug', message => {
        console.log(`${getTag(bot)} ${message}`);
    });
    bot.community.startConfirmationChecker(60 * 60 * 1000, bot.config.identity_secret);
    await sleep(15000);
    await checkConfirmations(bot);
}

async function loginBot(bot) {
    console.log(`${getTag(bot)} Logging in...`);
    try {
        await new Promise((resolve, reject) => {
            bot.community.login({
                accountName: bot.config.username,
                password: bot.config.password,
                twoFactorCode: SteamTotp.generateAuthCode(bot.config.shared_secret)
            }, err => {
                if (err) return reject(err);
                resolve();
            });
        });
        console.log(`${getTag(bot)} Logged in successfully.`);
    } catch (err) {
        console.log(`${getTag(bot)} [ERROR] Could not log in.`);
        console.log(err);
        if (err.message === 'SteamGuardMobile') {
            console.log(`${getTag(bot)} Steam Guard code expired; waiting 30s before retrying...`);
            await sleep(30 * 1000);
        } else {
            console.log(`${getTag(bot)} Waiting 1 minute before retrying...`);
            await sleep(60 * 1000);
        }
        return await loginBot(bot);
    }
}

function getWebApiKey(bot) {
    return new Promise((resolve, reject) => {
        bot.community.getWebApiKey({domain: bot.config.domain}, (err, key) => {
            if (err) return reject(err);
            resolve(key);
        });
    });
}

//noinspection InfiniteRecursionJS
async function checkConfirmations(bot) {
    bot.community.checkConfirmations();
    await sleep(15000);
    await checkConfirmations(bot);
}

//noinspection InfiniteRecursionJS
async function checkIfLoggedIn(bot) {
    try {
        const isLoggedIn = await loggedIn(bot);
        if (isLoggedIn) {
            await sleep(30 * 1000);
        } else {
            console.log(`${getTag(bot)} Session needs re-authentication!`);
            await loginBot(bot);
        }
    } catch (err) {
        console.log(`${getTag(bot)} Couldn\'t get logged in status! Steam down?`);
        console.log(err);
        await sleep(30 * 1000);
    }
    await checkIfLoggedIn(bot);
}

function loggedIn(bot) {
    return new Promise((resolve, reject) => {
        bot.community.loggedIn((err, loggedIn) => {
            if (err) return reject(err);
            resolve(loggedIn);
        });
    });
}

function getTag(bot) {
    return `[${bot.config.username}]`;
}

function sleep(wait) {
    return new Promise(resolve => setTimeout(resolve, wait));
}
