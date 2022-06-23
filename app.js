/* WSP Bot*/
const qrcode = require("qrcode-terminal");
const { Client, LocalAuth } = require("whatsapp-web.js");
const utilities = require("./utils/utilities.js");

const fs = require("fs");
const path = require("path");
const http = require("http");
const https = require("https");

const igApi = require('./api/instagram.js');
const youtubeApi = require('./api/youtube.js');

const DOWNLOAD_FOLDER = "download";
const YOUTUBE_SAVING_PLAYLIST_ID = 'PLYdk9WQIfahi4UOvFnt_ZrtpHTy2Wpsxc'

const client = new Client({
    authStrategy: new LocalAuth()
});

var instagramCookie = null;
var youtubeAccountStatus = null;

/* Create the temp folder */
fs.mkdir(path.join(__dirname, DOWNLOAD_FOLDER), (err) => {
    if (err) {
        if (err.code === "EEXIST") {
            return
        } else {
            return console.error(err);
        }
    }
});

const setApis = async () => {
    /* Instagram */
    if (await igApi.connect() == false) {
        process.exit(0);
    }
    /* Saves an ig cookie. We need this cookie later to download the videos */
    instagramCookie = igApi.getCookie();

    /* Youtube */
    youtubeClientSecret = await youtubeApi.checkClientSecret();

    if (!youtubeClientSecret) {
        process.exit(0);
    }

    /* TikTok */
}

const instagramToYoutube = async (url, uploader, instagramCookie, receiver) => {
    try {
        const videoData = await igApi.getPostLink(url, instagramCookie);
        const videoURL = videoData.link;
        const videoCaption = `[${uploader}] ${videoData.caption}`;

        const video = await download(
            videoURL,
            `${DOWNLOAD_FOLDER}\\${videoCaption}.mp4`
        );

        client.sendMessage(receiver, 'Video Descargado. Subiendo a youtube ...');

        if (video.mime == "video/mp4" && video.size > 0) {
            const uploadedVideoData = await youtubeApi.uploadVideo(
                videoCaption,
                `Original video url: ${url}, Uploaded on ${new Date()} by ${uploader}`,
                `${DOWNLOAD_FOLDER}\\${videoCaption}.mp4`)


            const videoId = uploadedVideoData.id;
            const addedToPlaylistVideo = await youtubeApi.addVideoToPlaylist(YOUTUBE_SAVING_PLAYLIST_ID, videoId)
            client.sendMessage(receiver, `Video subido. Link: https://www.youtube.com/watch?v=${videoId}`);
        }
    }
    catch (e) {
        console.log("There was an error: ", e);
    }
}

const download = async (url, filePath) => {
    const proto = !url.charAt(4).localeCompare("s") ? https : http;

    return new Promise((resolve, reject) => {
        const file = fs.createWriteStream(filePath);
        let fileInfo = null;

        const request = proto.get(url, (response) => {
            if (response.statusCode !== 200) {
                reject(new Error(`Failed to get '${url}' (${response.statusCode})`));
                return;
            }

            fileInfo = {
                mime: response.headers["content-type"],
                size: parseInt(response.headers["content-length"], 10),
            };

            response.pipe(file);
        });

        // The destination stream is ended by the time it's called
        file.on("finish", () => resolve(fileInfo));

        request.on("error", (err) => {
            fs.unlink(filePath, () => reject(err));
        });

        file.on("error", (err) => {
            fs.unlink(filePath, () => reject(err));
        });

        request.end();
    });
}

const wspBot = async () => {
    await setApis();
    client.initialize();

    client.on("qr", (qr) => {
        qrcode.generate(qr, { small: true });
    });

    client.on("authenticated", () => {
        console.log("AUTHENTICATED");
    });

    client.on("ready", () => {
        console.log("Client is ready!");
    });

    client.on("message", async (message) => {
        var sender = await message.getContact();
        if (message.body.includes('http')) {
            const urlType = utilities.checkUrl(message.body)
            if (urlType.state == false) {
                client.sendMessage(message.from, 'Invalid URL');
                return;
            }
            if (urlType.state == true && urlType.value == 'instagram') {
                client.sendMessage(message.from, `Hola ${sender.pushname}, ingresaste un video de instagram.`);
                client.sendMessage(message.from, 'Procesando ...');
                await instagramToYoutube(utilities.extractUrl(message.body), sender.pushname, instagramCookie, message.from)

                return;
            }
            if (urlType.state == true && urlType.value == 'tiktok') {
                client.sendMessage(message.from, 'you just send a tiktok URL');
                return;
            }
        }
        /*  if (message.body === "hello") {
             message.reply("Hiiiii");
         } */
    });
}

process.on('SIGINT', async () => {
    console.log('(SIGINT) Shutting down...');
    await this.client.destroy();
    console.log('client destroyed');
    process.exit(0);
});

wspBot();