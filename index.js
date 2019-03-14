const fs = require('fs')
const rp = require('request-promise')
const artistHandler = 'elmedio'
const cheerio = require('cheerio')
const baseUrl = `http://${artistHandler}.bandcamp.com`
const _ = require('lodash')
let albumCounter = 0

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
const getSongLyrics = lyricsRow => {
  if (lyricsRow.hasClass('lyricsRow')) {
    return lyricsRow.text()
  } else {
    return false
  }
}
const getAlbum = async album => {
  try {
    const albumSite = await rp(`${baseUrl}${album.slug}`)
    const $ = cheerio.load(albumSite)
    const imgSrc = $('#tralbumArt > a > img').attr('src')
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
        const lyrics = $(`#_lyrics_${index + 1}`).text()
        return { order, title, time, lyrics: lyrics !== '' ? lyrics : false }
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

async function getAlbums () {
  // get discography
  const website = await rp(`${baseUrl}/music`)
  const $ = cheerio.load(website)
  const albums = $('.music-grid-item > a')
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

  return albums.map(getAlbum)
}

const albums = getAlbums()
// write to file in memory
console.log(albums)
