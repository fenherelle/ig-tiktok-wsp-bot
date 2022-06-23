const axios = require("axios");
const Instagram = require('instagram-web-api')
const FileCookieStore = require('tough-cookie-filestore2');
const cookieStore = new FileCookieStore('./cookies.json');
const igCredentials = require('../conf/credentials.json');
const username = igCredentials.username;
const password = igCredentials.password;
const client = new Instagram({ username, password, cookieStore });

const igLongUrl = 'www.instagram.com';
const igShortUrl = 'instagram.com';
const userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/99.0.4844.84 Safari/537.36'

/******************************************************************************************/

const connect = async () => {
    try {
        const clientStatus = await client.login();
        if (clientStatus.hasOwnProperty('errors')) {
            console.log('There was an error connecting to instagram. Exiting.');
            return false;
        }
        console.log('Sucesfully connected with instagram.');
        return true;
    }
    catch (e) {
        console.log('There was an error connecting to instagram. Exiting.');
        return false;
    }
}

/******************************************************************************************/

const cookie = (cookieStore) => {
    try {
        const cookieObject = cookieStore.idx['instagram.com'];
        const igCookie = cookieObject['/'];
        let cookie = '';

        for (var i in igCookie) {
            for (var j in igCookie[i]) {
                if (j == "value") {
                    cookie += `${i}=${igCookie[i][j]};`
                }
            }
        }
        return cookie;
    }
    catch (e) {
        console.log('There was an error reading the instagram cookie', e);
    }
}

/******************************************************************************************/

const getCookie = () => {
    return cookie(cookieStore);
}

/******************************************************************************************/

const formatUrl = (url) => {
    var urlParts = url.split("/");

    if (urlParts[2] == igLongUrl || urlParts[2] == igShortUrl) {
        return { videoCode: urlParts[4], mediaType: urlParts[3] }
    }

    return null;
}

/******************************************************************************************/

const getPostLink = async (url, cookie) => {
    const baseUrl = "https://www.instagram.com"
    const formattedUrl = formatUrl(url)
    const graphqlUrl = `${baseUrl}/${formattedUrl.mediaType}/${formattedUrl.videoCode}/?__a=1&__d=dis`

    try {
        const response = await axios.get(graphqlUrl, { headers: { 'User-Agent': userAgent, 'Cookie': cookie } });
        let link = '';
        let caption = '';

        link = response.data.items[0].video_versions[0].url;
        caption = getCaption(response.data)

        return { link, caption }
    } catch (e) {
        console.log("There was an error processing the video URL:", e);
    }
}

/******************************************************************************************/

const getCaption = (videoData) => {
    if (videoData.items[0].caption) {
        let caption = videoData.items[0].caption.text;
        return caption.replace("\n", "");
    }
    return 'No caption'
}

/******************************************************************************************/

module.exports = {
    getCookie,
    connect,
    getPostLink

}