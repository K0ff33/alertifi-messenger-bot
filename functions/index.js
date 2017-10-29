const functions = require('firebase-functions')
const got = require('got')
const testFunctions = require('./test')

const FBTOKEN = functions.config().alertifi['fb-token']

const webhook = functions.https.onRequest((req, res) => {
  let data = req.body

    // Make sure this is a page subscription
  if (data.object === 'page') {
      // Iterate over each entry - there may be multiple if batched
    data.entry.forEach(function (entry) {
      let pageID = entry.id
      let timeOfEvent = entry.time

        // Iterate over each messaging event
      entry.messaging.forEach(function (event) {
        if (event.message) {
          receivedMessage(event)
        } else if (event.postback) {
          receivedPostback(event)
        } else {
          console.log('Webhook received unknown event: ', event)
        }
      })
    })

    res.sendStatus(200)
  }
})

function receivedMessage (event) {
  let senderID = event.sender.id
  let recipientID = event.recipient.id
  let timeOfMessage = event.timestamp
  let message = event.message

  console.log('Received message for user %d and page %d at %d with message:',
    senderID, recipientID, timeOfMessage)
  console.log(JSON.stringify(message))

  let messageId = message.mid

  let messageText = message.text
  let messageAttachments = message.attachments

  if (messageText) {
    // If we receive a text message, check to see if it matches a keyword
    // and send back the example. Otherwise, just echo the text we received.
    switch (messageText) {
      case 'generic':
        sendGenericMessage(senderID)
        break

      default:
        sendTextMessage(senderID, messageText)
    }
  } else if (messageAttachments) {
    sendTextMessage(senderID, 'Message with attachment received')
  }
}

function receivedPostback (event) {
  let senderID = event.sender.id
  let recipientID = event.recipient.id
  let timeOfPostback = event.timestamp

  // The 'payload' param is a developer-defined field which is set in a postback
  // button for Structured Messages.
  let payload = event.postback.payload

  console.log("Received postback for user %d and page %d with payload '%s' " +
    'at %d', senderID, recipientID, payload, timeOfPostback)

  // When a postback is called, we'll send a message back to the sender to
  // let them know it was successful
  sendTextMessage(senderID, `Postback called: ${payload}`)
}

function sendTextMessage (recipientId, messageText) {
  let messageData = {
    recipient: {
      id: recipientId
    },
    message: {
      text: messageText
    }
  }

  callSendAPI(messageData)
}

function sendGenericMessage (recipientId) {
  let messageData = {
    recipient: {
      id: recipientId
    },
    message: {
      attachment: {
        type: 'template',
        payload: {
          template_type: 'generic',
          elements: [{
            title: 'rift',
            subtitle: 'Next-generation virtual reality',
            item_url: 'https://www.oculus.com/en-us/rift/',
            image_url: 'http://multimedia.bbycastatic.ca/multimedia/products/500x500/104/10460/10460569.jpg',
            buttons: [{
              type: 'web_url',
              url: 'https://www.oculus.com/en-us/rift/',
              title: 'Open Web URL'
            }, {
              type: 'postback',
              title: 'Call Postback',
              payload: 'Payload for first bubble'
            }]
          }, {
            title: 'touch',
            subtitle: 'Your Hands, Now in VR',
            item_url: 'https://www.oculus.com/en-us/touch/',
            image_url: 'https://multimedia.bbycastatic.ca/multimedia/products/500x500/105/10509/10509398.jpg',
            buttons: [{
              type: 'web_url',
              url: 'https://www.oculus.com/en-us/touch/',
              title: 'Open Web URL'
            }, {
              type: 'postback',
              title: 'Call Postback',
              payload: 'Payload for second bubble'
            }]
          }]
        }
      }
    }
  }

  callSendAPI(messageData)
}

function callSendAPI (messageData) {
  got('https://graph.facebook.com/v2.6/me/messages', {
    query: {
      access_token: FBTOKEN
    },
    method: 'POST',
    body: messageData,
    json: true
  })
  .then((res) => {
    let recipientId = res.body.recipient_id
    let messageId = res.body.message_id

    console.log('Successfully sent generic message with id %s to recipient %s', messageId, recipientId)
  })
  .catch(e => {
    console.error('Unable to send message.')
    console.error(e)
  })
}

module.exports = {
  webhook,
  bigben: testFunctions.bigben
}
