'use strict';
const fs = require('fs');
var readline = require('readline');
const { google } = require('googleapis');
const gal = require('google-auth-library');
const path = require('path');
const { GoogleAuth, JWT, OAuth2Client } = require('google-auth-library')
let admin = require('firebase-admin');
const serviceAccount = require('./credentials/app-pruebas-972aa-firebase-adminsdk-db8la-aceac291ba.json');

// firebase
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: 'https://app-pruebas-972aa.firebaseio.com',
});
var db = admin.database();
var ref = db.ref('Alerts');


///////   START PUB/SUB   ///////////
const PubSub = require('@google-cloud/pubsub');
// Your Google Cloud Platform project ID
const projectId = 'app-pruebas-972aa';

// Instantiates a client
const pubsubClient = new PubSub({
  keyFilename: path.join(__dirname, './credentials/app-pruebas-210a587e9289.json'),
});

const subscriptionName = 'projects/app-pruebas-972aa/subscriptions/mySubscription';
const timeout = 60 * 1;

// References an existing subscription
const subscription = pubsubClient.subscription(subscriptionName);


// Create an event handler to handle messages
let messageCount = 0;
const messageHandler = message => {+
  console.log(`Received message ${message.id}:`);
  console.log(`\tData: ${message.data}`);
  console.log(`\tAttributes:`);
  console.log(message.attributes);
  messageCount += 1;

  // "Ack" (acknowledge receipt of) the message
  message.ack();  

  
  // create alert in db firebase
  let json = JSON.stringify(message.data);    
  let bufferOriginal = Buffer.from(JSON.parse(json).data);

  ref.child(message.attributes.Asunto).push({
    assigned: false,    
    date: Date.now(),
    subject: bufferOriginal.toString('utf8')
  });
  

  
   // The topic name can be optionally prefixed with "/topics/".
   var topic = `/topics/${message.attributes.Asunto}`;

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




///// WATCH GMAIL API //////

// var SCOPES = ['https://www.googleapis.com/auth/gmail.readonly'];
// var TOKEN_DIR = '/credentials/';
// var TOKEN_PATH = TOKEN_DIR + 'token.json';
// console.log(TOKEN_PATH);

// // Load client secrets from a local file.
// fs.readFile('credentials/client_secret.json', function processClientSecrets(err, content) {
//   if (err) {
//     console.log('Error loading client secret file: ' + err);
//     return;
//   }
//   // Authorize a client with the loaded credentials, then call the
//   // Gmail API.
//   authorize(JSON.parse(content), gmailApi);
// });

// /**
//  * Create an OAuth2 client with the given credentials, and then execute the
//  * given callback function.
//  *
//  * @param {Object} credentials The authorization client credentials.
//  * @param {function} callback The callback to call with the authorized client.
//  */
// function authorize(credentials, callback) {
//   var clientSecret = credentials.installed.client_secret;
//   var clientId = credentials.installed.client_id;
//   var redirectUrl = credentials.installed.redirect_uris[0];
//   var auth = new googleAuth();
//   var oauth2Client = new auth.OAuth2( );

//   // Check if we have previously stored a token.
//   fs.readFile(TOKEN_PATH, function (err, token) {
//     if (err) {
//       getNewToken(oauth2Client, callback);
//     } else {
//       oauth2Client.credentials = JSON.parse(token);
//       callback(oauth2Client);
//     }
//   });
// }

// /**
//  * Get and store new token after prompting for user authorization, and then
//  * execute the given callback with the authorized OAuth2 client.
//  *
//  * @param {google.auth.OAuth2} oauth2Client The OAuth2 client to get token for.
//  * @param {getEventsCallback} callback The callback to call with the authorized
//  *     client.
//  */
// function getNewToken(oauth2Client, callback) {
//   var authUrl = oauth2Client.generateAuthUrl({
//     access_type: 'offline',
//     scope: SCOPES,
//   });
//   console.log('Authorize this app by visiting this url: ', authUrl);
//   var rl = readline.createInterface({
//     input: process.stdin,
//     output: process.stdout,
//   });
//   rl.question('Enter the code from that page here: ', function (code) {
//     rl.close();
//     oauth2Client.getToken(code, function (err, token) {
//       if (err) {
//         console.log('Error while trying to retrieve access token', err);
//         return;
//       }
//       oauth2Client.credentials = token;
//       storeToken(token);
//       callback(oauth2Client);
//     });
//   });
// }

// /**
//  * Store token to disk be used in later program executions.
//  *
//  * @param {Object} token The token to store to disk.
//  */
// function storeToken(token) {
//   try {
//     fs.mkdirSync(TOKEN_DIR);
//   } catch (err) {
//     if (err.code != 'EEXIST') {
//       throw err;
//     }
//   }
//   fs.writeFile(TOKEN_PATH, JSON.stringify(token));
//   console.log('Token stored to ' + TOKEN_PATH);

//   const clientSecret = require('./credentials/client_secret.json');
//   const oauth2Client = new google.auth.OAuth2(
//     YOUR_CLIENT_ID,
//     YOUR_CLIENT_SECRET,
//     YOUR_REDIRECT_URL
//   );

//   // set auth as a global default
//   google.options({
//     auth: oauth2Client
//   });
// };


// const plus = google.plus({
//   version: 'v1',
//   auth: 'AIzaSyDerjA3F7JQk0nvXSDXxXUqlXHbC2SbBCQ' // specify your API key here
// });

// async function main() {
//   const res = await plus.people.get({ userId: 'me' });
//   console.log(`Hello ${res.data.displayName}!`);
// };

// main().catch(console.error);



// credentials.serviceAccountKey.client_email,
// null,
// credentials.serviceAccountKey.private_key,
// ['https://www.googleapis.com/...]); 

// const SERVICE_ACCOUNT_EMAIL = '';

// fs.readFile('credentials/app-pruebas-210a587e9289.json', function processClientSecrets(err, content) {
//   if (err) {
//     console.log('Error loading client secret file: ' + err);
//     return;
//   }
//   // Authorize a client with the loaded credentials, then call the
//   // Gmail API.
//   contentJson = JSON.parse(content);
//   SERVICE_ACCOUNT_EMAIL = contentJson.client_email;
// });

// Authorize a client with the loaded credentials, then call the
// Gmail API.
// const contentJson = JSON.parse(content);  

const clientOAuth2File = require('./credentials/client_secret_271450768634-v2prf1e6uuklsdf10ec2m5nsrg09lrbe.apps.googleusercontent.com.json').installed;

const CLIENT_ID = clientOAuth2File.client_id;
const CLIENT_SECRET = clientOAuth2File.client_secret;
const REDIRECT_URL = clientOAuth2File.redirect_uris[0];

// var auth = new googleAuth();
// var oauth2= new auth.OAuth2();

listenerGmail()

async function listenerGmail() {
  // var auth = new gal.GoogleAuth();
  
  const oAuth2Client = new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET, REDIRECT_URL);
  let client;
  try{
    client = await google.auth.getClient({      
      keyFile: path.join(__dirname, 'credentials/app-pruebas-210a587e9289.json'),
      scopes: ['https://mail.google.com/', 'https://www.googleapis.com/auth/gmail.modify',
               'https://www.googleapis.com/auth/gmail.readonly', 'https://www.googleapis.com/auth/gmail.metadata']
    });
  }catch(err){
    console.log(err);
    return err;
  }
  
  return client.authorize(function (err, token) {
    if (err) {console.log(err); return err;}
    oAuth2Client.credentials = token;
  
    const gmail = google.gmail('v1');
          
    return gmail.users.messages.list({ userId: 'me', auth: oAuth2Client }, function(err, resp) {    
      if (err) {console.log(err); return err;}
      return resp;
    });
  });
}
  

    
    //   const res = await gmail.users.watch({
    //     userId: 'me',
    //     resource: {
    //       // Replace with `projects/${PROJECT_ID}/topics/${TOPIC_NAME}`
    //       topicName: 'projects/app-pruebas-972aa/topics/myTopic',
    //       labelIds: ['INBOX'],
    //     }
    //   });
    //   console.log(res);
    //   return res;
    // } catch (error) {
    //   console.log(error);
    //   return error;
    // }

// });

//   // firebase-adminsdk-db8la@app-pruebas-972aa.iam.gserviceaccount.com
//   gmail.users.watch({
//     userId: 'appPracticasGnommo@gmail.com',
//     resource: {
//       // Replace with `projects/${PROJECT_ID}/topics/${TOPIC_NAME}`
//       topicName: 'projects/app-pruebas-972aa/topics/myTopic',
//     },
//   }, function (err, response) {
//     if (err) {
//       console.log('The API returned an error: ' + err);
//       return;
//     }
//     console.log(response);
//   });

// });



