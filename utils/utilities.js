const checkUrl = (url) => {

    const instagramUrl = 'instagram.com';
    const tiktokUrl = 'tiktok.com';
    const urlType = url.includes(instagramUrl) ? 'instagram' : url.includes(tiktokUrl) ? 'tiktok' : 'invalid'

    if (urlType == 'invalid') return { state: false, value: 'Invalid URL' }
    if (urlType == 'instagram') return { state: true, value: 'instagram' }
    if (urlType == 'tiktok') return { state: true, value: 'tiktok' }
}

const extractUrl = (message) => {
    const url = message.match(/\bhttps?:\/\/\S+/gi)
    return url.toString();
}

module.exports = {
    checkUrl,
    extractUrl
}
