'use strict';
const fs = require('fs');
var readline = require('readline');
const { google } = require('googleapis');
const gal = require('google-auth-library');
const path = require('path');
const { GoogleAuth, JWT, OAuth2Client} = require('google-auth-library')
let admin = require('firebase-admin');
const serviceAccount = require('./credentials/app-pruebas-972aa-firebase-adminsdk-db8la-aceac291ba.json');

// firebase
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: 'https://app-pruebas-972aa.firebaseio.com',
});
var db = admin.database();

var oauth2Client;
const gmail = google.gmail('v1');
var historyId;

///////   START PUB/SUB   ///////////
const PubSub = require('@google-cloud/pubsub');
// Your Google Cloud Platform project ID
const projectId = 'app-pruebas-972aa';

// Instantiates a client
const pubsubClient = new PubSub({
  keyFilename: path.join(__dirname, './credentials/app-pruebas-972aa-firebase-adminsdk-db8la-aceac291ba.json'),
});

const subscriptionName = 'projects/app-pruebas-972aa/subscriptions/mySubscription';
const timeout = 60 * 1;

// References an existing subscription
const subscription = pubsubClient.subscription(subscriptionName);


// Create an event handler to handle messages
let messageCount = 0;
const messageHandler = message => {  
  console.log(`Received message ${message.id}:`);
  console.log(`\tData: ${message.data}`);
  console.log(`\tAttributes:`);
  console.log(message.attributes);
  messageCount += 1;

  // "Ack" (acknowledge receipt of) the message
  message.ack();  

  // take message date

  getInfoMessage(JSON.parse(message.data).historyId, historyId).then(resolve => {    
    if(resolve) {
      sendMessageToTopic(resolve);    
    }
  }) 
  .catch(err => {
    console.log(err);
  });
}
  
  

// Create an event handler to handle errors
const errorHandler = function (error) {
  // Do something with the error
  console.error(`ERROR: ${error}`);
};

// Listen for new messages until timeout is hit
subscription.on('message', messageHandler);
console.log('Escuchando mensajes gmail');
// setTimeout(() => {
//   subscription.removeListener('message', messageHandler);
//   console.log(`${messageCount} message(s) received.`);
// }, timeout * 1000);


///////   Final PUB/SUB   ///////////

const clientOAuth2File = require('./credentials/client_secret_271450768634-v2prf1e6uuklsdf10ec2m5nsrg09lrbe.apps.googleusercontent.com.json').installed;

const CLIENT_ID = clientOAuth2File.client_id;
const CLIENT_SECRET = clientOAuth2File.client_secret;
const REDIRECT_URL = clientOAuth2File.redirect_uris[0];

// var auth = new googleAuth();
// var oauth2= new auth.OAuth2();


/////// LISTENER GMAIL /////////

listenerGmailOAuth2();

function listenerGmailOAuth2(){
 
  // If modifying these scopes, delete your previously saved credentials
  // at ~/.credentials/gmail-nodejs-quickstart.json
  var SCOPES = ['https://www.googleapis.com/auth/gmail.readonly'];
  var TOKEN_DIR ='./credentials/';
  var TOKEN_PATH = TOKEN_DIR + 'token.json';
  
  // Load client secrets from a local file.
  fs.readFile('./credentials/client_secret_271450768634-v2prf1e6uuklsdf10ec2m5nsrg09lrbe.apps.googleusercontent.com.json', function processClientSecrets(err, content) {
    if (err) {
      console.log('Error loading client secret file: ' + err);
      return;
    }
    // Authorize a client with the loaded credentials, then call the
    // Gmail API.
    authorize(JSON.parse(content), watch);
  });

  

  function authorize(credentials, callback) {
    var clientSecret = credentials.installed.client_secret;
    var clientId = credentials.installed.client_id;
    var redirectUrl = credentials.installed.redirect_uris[0];
    oauth2Client = new OAuth2Client(clientId, clientSecret, redirectUrl);

    // Check if we have previously stored a token.
    fs.readFile(TOKEN_PATH, async function(err, token) {
      if (err) {
        getNewToken(oauth2Client, callback);
      } else {                       
        if(JSON.parse(token).expiry_date <= Date.now()){
          let newToken = await oauth2Client.refreshToken(JSON.parse(token).refresh_token);          
          newToken = newToken.tokens;          
          newToken.refresh_token = JSON.parse(token).refresh_token;
          fs.writeFile(TOKEN_PATH, JSON.stringify(newToken));
          oauth2Client.credentials = newToken;                              
          callback(oauth2Client);
        } else {       
          oauth2Client.credentials = JSON.parse(token);           
          callback(oauth2Client);
        }
      }
    });
  }
  
  function getNewToken(oauth2Client, callback) {
    var authUrl = oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: SCOPES
    });
    console.log('Authorize this app by visiting this url: ', authUrl);
    var rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
    rl.question('Enter the code from that page here: ', function(code) {
      rl.close();
      oauth2Client.getToken(code, function(err, token) {
        if (err) {
          console.log('Error while trying to retrieve access token', err);
          return;
        }
        oauth2Client.credentials = token;
        storeToken(token);
        callback(oauth2Client);
      });
    });
  }
  
  function storeToken(token) {
    try {
      fs.mkdirSync(TOKEN_DIR);
    } catch (err) {
      if (err.code != 'EEXIST') {
        throw err;
      }
    }
    fs.writeFile(TOKEN_PATH, JSON.stringify(token));
    console.log('Token stored to ' + TOKEN_PATH);
  }

  async function watch(auth) {   
    try{
      const res = await gmail.users.watch({
        userId: 'me',
        auth: auth,
        resource: {
          // Replace with `projects/${PROJECT_ID}/topics/${TOPIC_NAME}`
          labelIds: ['Label_2220186959787681224'],
          topicName: `projects/app-pruebas-972aa/topics/myTopic`
        }
      });
      console.log('Watch refresh');
      console.log(res.data);
      historyId = res.data.historyId;
    }catch(err){
      console.log(err);
    }
  }  
}

async function getInfoMessage(messageHistoryId, historyId) {
  const messageId = await gmail.users.history.list({
    userId:'me',   
    auth: oauth2Client,          
    historyTypes: [
      "messageAdded"
    ],
    startHistoryId: messageHistoryId-53,
  }).then(resolve => {
    if(!resolve.data.history){
      return ;
    } 
    return resolve.data.history[0].messages[0].id
  });

  // Si peta puede ser que haga falta el catch tanto arriba como abajo  
  if (!messageId){ 
    return ;
  }

  return await gmail.users.messages.get({
    userId: "me",
    auth: oauth2Client,
    id: messageId,
    format: "metadata"
  }).then(resolve => {
    var res = Object;
    res.asunto = resolve.data.payload.headers[6].value;
    res.data = resolve.data.snippet;
    return res;
  });
}


function sendMessageToTopic(message){
  // create alert in db firebase  
  var date = new Date();
  date = date;
  var ref = db.ref(`Alerts/${message.asunto}`);
  ref.push({
    assigned: false,    
    date: Date.parse(date),
    subject: message.data
  });
  

  //SEND NOTIFICATION
  // The topic name can be optionally prefixed with "/topics/".
  var topic = `/topics/${message.asunto}`;

  // See the "Defining the message payload" section below for details
  // on how to define a message payload.
  var payload = {
    notification: {
      title: "Se requiere de un médico",
      body: `${message.data}`,
      color: 'blue',
      tag:`${message.data}`,
      click_action: 'click_action',
    },
    data:{
      priority: '10'
    }
  };

  var options = {
    priority: 'high',
    timeToLive: 1,
    collapseKey: `${message.data}`,        
  }
 
  // Send a message to devices subscribed to the provided topic.
  admin.messaging().sendToTopic(topic, payload, options)
  .then(function(response) {
    // See the MessagingTopicResponse reference documentation for the
    // contents of response.
    console.log("Successfully sent message:", response);
  })
  .catch(function(error) {
    console.log("Error sending message:", error);
  });
};


