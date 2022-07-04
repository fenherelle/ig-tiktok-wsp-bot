const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const videoSchema = new Schema({
    title: {
        type: String,
        required: true
    },
    youtubeLink: {
        type: String,
        required: true
    },
    originalLink: {
        type: String,
        required: true
    },
    uploader: {
        type: String,
        required: true
    },
    status: {
        type: String,
        required: true
    },


}, { timestamps: true });

const Video = mongoose.model('Video', videoSchema);

module.exports = Video;