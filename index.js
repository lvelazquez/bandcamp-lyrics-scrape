const fs = require('fs')
const r = require('request')
const rp = require('request-promise')
const artistHandler = 'elmedio'
const cheerio = require('cheerio')
const baseUrl = `http://${artistHandler}.bandcamp.com`
const _ = require('lodash')

/*

{
  albums: [
    {title: '', year: 1999, songs: [
      {title: '', lyrics: '', time: '', order: ''}
      ...
    ]}
  ]
}

*/

const downloadImage = function (uri, filename, callback) {
  r.head(uri, function (err, res, body) {
    console.log('content-type:', res.headers['content-type'])
    console.log('content-length:', res.headers['content-length'])

    r(uri)
      .pipe(fs.createWriteStream(filename))
      .on('close', callback)
  })
}
const getAlbumImage = async (src, title) => {
  const albumSlug = title
    .toLowerCase()
    .replace(/ /g, '-')
    .replace(/[^\w-]+/g, '')

  try {
    const imgSuccess = await downloadImage(src, `./data/images/${albumSlug}.jpg`, done=> {
      console.log('done')
    })
    if (imgSuccess) {
      return albumSlug
    } else {
      return false
    }
  } catch (err) {
    console.log(err)
  }
}
const getAlbum = async album => {
  try {
    const albumSite = await rp(`${baseUrl}${album.slug}`)
    const $ = cheerio.load(albumSite)
    const imgSrc = $('#tralbumArt > a > img').attr('src')
    const imgId = await getAlbumImage(imgSrc, album.title)
    // get image download and put into folder
    const $container = $('#trackInfo')
    const date = $('meta[itemprop=datePublished]', $container).attr('content')
    const songs = $('.track_row_view', $container)
      .map((index, $trackRow) => {
        const order = $('.track_number', $trackRow).text()
        const title = $('span[itemprop="name"]', $trackRow)
          .text()
          .trim()
        const time = $('span.time', $trackRow)
          .text()
          .trim()
        const lyrics = $(`#_lyrics_${index + 1}`)
          .text()
          .trim()
        return {
          order,
          title,
          time,
          imgId,
          lyrics: lyrics !== '' ? lyrics : false
        }
      })
      .get()

    return {
      title: album.title,
      imgSrc,
      date,
      songs
    }
  } catch (err) {
    console.log(err)
  }
}

const getAlbums = async () => {
  // get discography
  const website = await rp(`${baseUrl}/music`)
  const $ = cheerio.load(website)
  const albumData = $('.music-grid-item > a')
    .map((index, el) => {
      const title = $(el)
        .text()
        .trim()
      const year = $()
      const slug = $(el).attr('href')
      return {
        title,
        slug
      }
    })
    .get()

  const albums = await Promise.all([...albumData.map(getAlbum)])
  fs.writeFile('./data/albums.json', JSON.stringify(albums))
}
getAlbums()
