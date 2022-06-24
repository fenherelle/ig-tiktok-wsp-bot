const axios = require("axios");
const apiUrl = "https://www.tiktok.com/node/share/video"
const userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/99.0.4844.84 Safari/537.36'

const getUrlParts = (url) => {
    const urlParts = url.split("/")
    return { user: urlParts[3], videoCode: urlParts[5].replace(/\?.*/g, "$'") }
}

const getVideoData = async (url) => {
    try {
        const response = await axios.get(url);
        const fullUrl = response.request.res.responseUrl;
        const formattedUrl = getUrlParts(fullUrl);

        const propsUrl = `${apiUrl}/${formattedUrl.user}/${formattedUrl.videoCode}`
        const propsUrlResponse = await axios.get(propsUrl, {
            headers: {
                'User-Agent': userAgent,
                referer: 'https://www.tiktok.com/',
                cookie: 'tt_webid_v2=689854141086886123'
            }
        });

        const videoUrl = propsUrlResponse.data.itemInfo.itemStruct.video.playAddr;
        const videoCaption = propsUrlResponse.data.itemInfo.itemStruct.desc;
        return { videoUrl: videoUrl, videoCaption: videoCaption, fullUrl: fullUrl }
    } catch (e) {
        console.log("There was an error processing the video URL:", e);
    }
}


module.exports = {
    getVideoData
}