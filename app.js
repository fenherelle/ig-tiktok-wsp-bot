const qrcode = require("qrcode-terminal");
const { Client, LocalAuth, MessageMedia } = require("whatsapp-web.js");
const utilities = require("./utils/utilities.js");

const fs = require("fs");
const path = require("path");
const http = require("http");
const https = require("https");

const igApi = require('./api/instagram.js');
const tiktokApi = require('./api/tiktok.js');
const youtubeApi = require('./api/youtube.js');

const conf = require('./conf/conf.json');

const QUOTA_EXCEEDED_ERROR = 'quotaExceeded';

const client = new Client({
    authStrategy: new LocalAuth()
});

var instagramCookie = null;
//var youtubeAccountStatus = null;

/* Create the temp folder */
fs.mkdir(path.join(__dirname, conf.downloadFolderName), (err) => {
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
        console.log(`Couldn't connect to insgram. Exiting ...`);
        process.exit(0);
    }
    /* Saves an ig cookie. We need this cookie later to download the videos */
    instagramCookie = igApi.getCookie();

    /* Youtube */
    youtubeClientSecret = await youtubeApi.checkClientSecret();

    if (!youtubeClientSecret) {
        console.log(`Couldn't read youtube secret file. Exiting ...`);
        process.exit(0);
    }

    /* TikTok */
}

const instagramToYoutube = async (url, uploader, instagramCookie, receiver) => {
    try {
        const videoData = await igApi.getPostLink(url, instagramCookie);
        const videoURL = videoData.link;
        const videoTitle = `${utilities.generateVideoTitle(videoData.caption)}`;

        const video = await download(
            videoURL,
            `${conf.downloadFolderName}\\${videoTitle}.mp4`
        );

        let media = await MessageMedia.fromFilePath(path.join(__dirname, 'media', 'uploading.jpg'));
        client.sendMessage(receiver, media, { caption: `Video procesado.\nSubiendo a youtube.` });
        //client.sendMessage(receiver, `Video procesado.\n Subiendo a youtube`);

        if (video.mime == "video/mp4" && video.size > 0) {
            const uploadedVideoData = await youtubeApi.uploadVideo(
                videoTitle,
                `Original video url: ${url}, Uploaded on ${new Date()} by ${uploader}`,
                `${conf.downloadFolderName}\\${videoTitle}.mp4`)

            if (uploadedVideoData === QUOTA_EXCEEDED_ERROR) {
                let media = await MessageMedia.fromFilePath(path.join(__dirname, 'media', 'quota.jpg'));
                client.sendMessage(receiver, media, { caption: `La cuota diaria de la api de youtube ha sido sobrepasada. No puedo subir el video ahora \u{1F614}` });
                return;
            }

            const videoId = uploadedVideoData.id;
            await youtubeApi.addVideoToPlaylist(conf.youtubePlaylistID, videoId)
            let media = await MessageMedia.fromFilePath(path.join(__dirname, 'media', 'uploaded.jpg'));
            client.sendMessage(receiver, media, { caption: `Video subido.\nLink: https://www.youtube.com/watch?v=${videoId}` });
        }
    }
    catch (e) {
        console.log("There was an error: ", e);
    }
}

const tiktokToYoutube = async (url, uploader, receiver) => {
    try {
        const videoData = await tiktokApi.getVideoData(url);
        const videoURL = videoData.videoUrl;
        const videoTitle = `${utilities.generateVideoTitle(videoData.caption)}`;

        const video = await download(
            videoURL,
            `${conf.downloadFolderName}\\${videoTitle}.mp4`
        );

        client.sendMessage(receiver, 'Video Descargado. Subiendo a youtube ...');

        if (video.mime == "video/mp4" && video.size > 0) {
            const uploadedVideoData = await youtubeApi.uploadVideo(
                videoTitle,
                `Original video url: ${videoData.fullUrl}, Uploaded on ${new Date()} by ${uploader}`,
                `${conf.downloadFolderName}\\${videoTitle}.mp4`)

            if (uploadedVideoData === QUOTA_EXCEEDED_ERROR) {
                let media = await MessageMedia.fromFilePath(path.join(__dirname, 'media', 'quota.jpg'));
                client.sendMessage(receiver, media, { caption: `La cuota diaria de la api de youtube ha sido sobrepasada. No puedo subir el video ahora \u{1F614}` });
                return;
            }

            const videoId = uploadedVideoData.id;
            await youtubeApi.addVideoToPlaylist(conf.youtubePlaylistID, videoId)
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
                let media = await MessageMedia.fromFilePath(path.join(__dirname, 'media', 'error.jpg'));
                client.sendMessage(message.from, media, { caption: `Hola ${sender.pushname}, ingresaste una URL inválida. Por favor intentalo nuevamente.` });
                return;
            }
            if (urlType.state == true && urlType.value == 'instagram') {
                let media = await MessageMedia.fromFilePath(path.join(__dirname, 'media', 'processing.jpg'));
                client.sendMessage(message.from, media, { caption: `Hola ${sender.pushname}, veo ingresaste un video de instagram. Déjame procesarlo.` });
                //client.sendMessage(message.from, 'Procesando ...');
                await instagramToYoutube(utilities.extractUrl(message.body), sender.pushname, instagramCookie, message.from)

                return;
            }
            if (urlType.state == true && urlType.value == 'tiktok') {
                let media = await MessageMedia.fromFilePath(path.join(__dirname, 'media', 'processing.jpg'));
                client.sendMessage(message.from, media, { caption: `Hola ${sender.pushname}, veo ingresaste un video de tiktok. Déjame procesarlo.` });
                await tiktokToYoutube(utilities.extractUrl(message.body), sender.pushname, message.from)
                return;
            }
        }
        let media = await MessageMedia.fromFilePath(path.join(__dirname, 'media', 'error.jpg'));
        client.sendMessage(message.from, media, { caption: `Hola ${sender.pushname}, debes ingresar una URL. Por favor intentalo nuevamente.` });
    });
}

process.on('SIGINT', async () => {
    console.log('(SIGINT) Shutting down...');
    await this.client.destroy();
    console.log('client destroyed');
    process.exit(0);
});

wspBot();
