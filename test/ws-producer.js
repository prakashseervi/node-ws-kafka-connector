const WebSocket = require('ws'),
    cfg = require('./config-test'),
    debug = require('debug')('ws-producer');



const MPS = cfg.MESSAGE_RATE || 10000;
const TOTAL_MSGS = cfg.TOTAL_MESSAGES || 1000000;
const TOPIC_COUNT = cfg.TOPICS_COUNT || 5;

process.on('uncaughtException', e => console.error(e));

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

const ws = new WebSocket(process.env.WSS_URL || cfg.WSS_URL);
let topic_created = false;

ws.on('open', async function open() {
    createTopics(ws);
})
    .on('error', e => console.error(e))
    .on('message', async function incoming(data) {
        let msg = JSON.parse(data);
        if(!topic_created && msg.refid === "0000" && msg.s === 0){
            topic_created = true;
            debug(`topics created: ${msg.p}`);
            sendPayload(ws).catch(e=> debug(e));
        }

    });

function createTopics(ws) {
    msg = {
        id: "0000",
        t: "topic",
        a: "create",
        p:[]
    };

    for(let i = 0; i < TOPIC_COUNT; i++){
        msg.p.push(`topic_${i}`);
    }

    ws.send(JSON.stringify(msg));
}

function sendPayload(ws){
    return new Promise((resolve, reject)=> {
        try{
            let now = new Date().getTime();
            let counter = 0;

            while (counter < TOTAL_MSGS) {

                if (ws.readyState > 1) {
                    debug(`WebSocket State ${ws.readyState}`);
                }

                for (let i = 0; i < MPS; i++) {
                    msg = {
                        id: counter++,
                        t: "notif",
                        a: "create",
                        p:{t:`topic_${rand(0, TOPIC_COUNT - 1)}`,m:Date.now()}
                    };

                    ws.send(JSON.stringify(msg));
                }
                console.log(`${counter} | ${new Date().getTime() - now} ms`);
                let wait_time = (now + 1000) - new Date().getTime();
                if (wait_time > 0)
                    sleep(wait_time).catch(e => console.error(e));

                now = new Date().getTime();
            }
            ws.close(1000);
            return resolve();
        } catch (e) {
            console.error(e);
            return reject(e);
        }
    });
}

function rand(min, max) {
    return Math.floor(Math.random() * (max - min + 1) + min);
}
