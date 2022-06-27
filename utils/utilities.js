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

const removeExtraSpaces = (text) => {
    return text.replace(/\s+/g, ' ').trim();
}

const generateVideoTitle = (caption) => {
    let sanitizedCaption = `${removeExtraSpaces((caption.split('\n').join(' ').replace(/[+]|•|'/gi, '')))}`
    if (sanitizedCaption.length > 100) return sanitizedCaption.substring(0, 100); // Youtube limits the video title to 100 characters
    return sanitizedCaption;
}

module.exports = {
    checkUrl,
    extractUrl,
    generateVideoTitle
}
