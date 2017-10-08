const functions = require('firebase-functions')
const got = require('got')
const cheerio = require('cheerio')

exports.bigben = functions.https.onRequest((req, res) => {
  const hours = new Date().getHours() % 12 + 1 // london is UTC + 1hr;
  res.status(200).send(
    `<!doctype html>
    <head>
      <title>Time</title>
    </head>
    <body>
      ${'BONG '.repeat(hours)}
    </body>
  </html>`
  )
})

exports.search = functions.https.onRequest((req, res) => {
  if (req.method !== 'POST') {
    return res.status(403).send('Forbidden!')
  }

  let url = req.body.url
  if (!url) {
    return res.status(400).send('Invalid request!')
  }

  got(url, {
    headers: {
      'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_12_5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/59.0.3071.115 Safari/537.36'
    }
  })
    .then(search => {
      let $ = cheerio.load(search.body)
      let area = $('li.natural')
      let offers = []

      area.each((i, el) => {
        let offer = $(el)
        let obj = {
          link: 'https://www.gumtree.com' +
          offer.find('.listing-link').attr('href'),
          name: offer.find('.listing-title').text().replace(/\n/g, ''),
          price: offer.find('.listing-price strong').text()
        }
        offers.push(obj)
      })
      return offers
    })
    .then(offers => res.status(200).send(offers))
    .catch(err => res.status(500).send(err.toString()))
})
