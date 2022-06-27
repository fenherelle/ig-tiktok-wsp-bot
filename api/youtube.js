const fs = require("fs");
const fsPromises = require('fs').promises;
var { google } = require("googleapis");
var OAuth2 = google.auth.OAuth2;

// If modifying these scopes, delete your previously saved credentials
// at ~/.credentials/youtube-nodejs-quickstart.json
var SCOPES = [
  "https://www.googleapis.com/auth/youtube",
  "https://www.googleapis.com/auth/youtube.readonly",
  "https://www.googleapis.com/auth/youtube.upload",
];

var TOKEN_DIR =
  (process.env.HOME || process.env.HOMEPATH || process.env.USERPROFILE) +
  "/.credentials/";

var TOKEN_PATH = TOKEN_DIR + "youtube-nodejs-quickstart.json";

const getNewToken = async (oauth2Client) => {
  var authUrl = oauth2Client.generateAuthUrl({
    access_type: "offline",
    scope: SCOPES,
  });
  console.log("Authorize this app by visiting this url: ", authUrl);
  var rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  rl.question("Enter the code from that page here: ", function (code) {
    rl.close();
    oauth2Client.getToken(code, function (err, token) {
      if (err) {
        console.log("Error while trying to retrieve access token", err);
        return;
      }
      oauth2Client.credentials = token;
      storeToken(token);
      return oauth2Client;
    });
  });
}

const storeToken = (token) => {
  try {
    fs.mkdirSync(TOKEN_DIR);
  } catch (err) {
    if (err.code != "EEXIST") {
      throw err;
    }
  }
  fs.writeFile(TOKEN_PATH, JSON.stringify(token), (err) => {
    if (err) throw err;
    console.log("Token stored to " + TOKEN_PATH);
  });
}
/******************************************************************************** */

const checkClientSecret = async () => {
  try {
    await fsPromises.readFile("conf/client_secret.json");
    return true;
  } catch (err) {
    console.log("Error loading youtube client secret file: " + err + " Exiting.");
    return false;
  }
}

/******************************************************************************** */

const getChannelInfo = async () => {
  try {
    const clientSecret = await fsPromises.readFile("conf/client_secret.json");
    const content = JSON.parse(clientSecret.toString());
    const auth = await authorize(content)
    const res = await channelInfo(auth);
    console.log(`Connection sucesfully established with channel: ${res[0].snippet.title}`)
    return true;
  } catch (err) {
    console.log("Error loading client secret file: " + err);
    return false;
  }
}

const channelInfo = async (auth) => {
  var service = google.youtube("v3");
  var request = await service.channels.list({
    auth: auth,
    part: "id, snippet",
    mine: true,
  });
  return request.data.items;
}

/******************************************************************************** */

const getUserPlaylists = async () => {
  try {
    const read = await fsPromises.readFile("conf/client_secret.json");
    const content = JSON.parse(read.toString());
    const auth = await authorize(content)
    const res = await checkPlaylistsFunction(auth);
    return res;
  } catch (err) {
    console.log("Error loading client secret file: " + err);
    return;
  }
}

async function checkPlaylistsFunction(auth) {
  var service = google.youtube("v3");
  var request = await service.playlists.list({
    auth: auth,
    part: "id, snippet",
    mine: true,
  });
  console.log(request.data.items);
  return request.data.items;

}

/******************************************************************************** */

const addVideoToPlaylist = async (playlistId, videoId) => {
  try {
    const read = await fsPromises.readFile("conf/client_secret.json");
    const content = JSON.parse(read.toString());
    const auth = await authorize(content)
    const res = await addToPlaylistFunction(auth, playlistId, videoId);
    return res;
  } catch (err) {
    console.log("Error loading client secret file: " + err);
    return;
  }
}

const addToPlaylistFunction = async (auth, playlistId, videoId) => {
  var service = google.youtube("v3");
  var request = await service.playlistItems.insert({
    auth: auth,
    part: "id,snippet",
    resource: {
      snippet: {
        playlistId: playlistId,
        resourceId: {
          videoId: videoId,
          kind: "youtube#video"
        }
      }
    }
  });
  return request;
}

/******************************************************************************** */

const uploadVideo = async (name, description, videoFilePath) => {
  try {
    const read = await fsPromises.readFile("conf/client_secret.json");
    const content = JSON.parse(read.toString());
    const auth = await authorize(content)
    const res = await upload(auth, name, description, videoFilePath);
    return res;
  } catch (err) {
    //if (err.includes('The request cannot be completed because you have exceeded your')) return false
    console.log("There was an error on the uploadVideo function " + err);
    return;
  }
}

/**
 * Upload the video file.
 *
 * @param {google.auth.OAuth2} auth An authorized OAuth2 client.
 */

const upload = async (auth, name, description, videoFilePath) => {

  var service = google.youtube("v3");
  try {
    var request = await service.videos.insert({
      auth: auth,
      part: "snippet,status",
      requestBody: {
        snippet: {
          title: name,
          description: description,
        },
        status: {
          privacyStatus: "unlisted", // default for now
        },
      },
      media: {
        body: fs.createReadStream(videoFilePath),
      },
    });
    return request.data;
  }
  catch (e) {
    if (e.hasOwnProperty('errors')) {
      return e.errors[0].reason
    }
    return false;
  }
}

/******************************************************************************** */

const authorize = async (credentials) => {
  var clientSecret = credentials.installed.client_secret;
  var clientId = credentials.installed.client_id;
  var redirectUrl = credentials.installed.redirect_uris[0];
  var oauth2Client = new OAuth2(clientId, clientSecret, redirectUrl);

  try {
    const read = await fsPromises.readFile(TOKEN_PATH);
    const token = JSON.parse(read.toString());
    oauth2Client.credentials = token;
    return oauth2Client;
  } catch (err) {
    const authClient = await getNewToken(oauth2Client);
    return authClient;
  }
}

/******************************************************************************** */

module.exports = {
  checkClientSecret,
  uploadVideo,
  addVideoToPlaylist,
  getUserPlaylists
};
