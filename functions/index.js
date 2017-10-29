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
      // let pageID = entry.id
      // let timeOfEvent = entry.time

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
  } else {
    res.sendStatus(403)
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

  let messageText = message.text

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
  }
}

function sendHelloMessage (senderID) {
  sendTextMessage(senderID, "Hi, I'm Alertifi, your personal online deal tracker. I can track prices of the following websites:")
  sendGenericMessage(senderID)
}

function receivedPostback (event) {
  const {type} = JSON.parse(event.postback.payload)
  const senderId = event.sender.id

  // perform an action based on the type of payload received
  switch (type) {
    case 'GET_STARTED':
      sendHelloMessage(senderId)
      break
    default:
      console.error(`Unknown Postback called: ${type}`)
      break
  }
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
            title: 'Amazon UK',
            item_url: 'https://www.amazon.co.uk/',
            image_url: 'http://g-ec2.images-amazon.com/images/G/01/social/api-share/amazon_logo_500500.png',
            buttons: [{
              type: 'web_url',
              url: 'https://www.amazon.co.uk/',
              title: 'Open Web URL'
            }]
          }, {
            title: 'Ebay',
            item_url: 'https://www.ebay.co.uk/',
            image_url: 'https://static.ebayinc.com/static/assets/Uploads/Content/_resampled/FillWyIzMzciLCIxOTAiXQ/eBay-Logo-Preview10.png',
            buttons: [{
              type: 'web_url',
              url: 'https://www.ebay.co.uk/',
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
