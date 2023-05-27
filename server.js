const http = require('http');
const fs = require('fs');
const url = require('url');
const { send } = require('process');
/* ============================ SERVER DATA ============================ */
let artists = JSON.parse(fs.readFileSync('./seeds/artists.json'));
let albums = JSON.parse(fs.readFileSync('./seeds/albums.json'));
let songs = JSON.parse(fs.readFileSync('./seeds/songs.json'));

let nextArtistId = 2;
let nextAlbumId = 2;
let nextSongId = 2;

// returns an artistId for a new artist
function getNewArtistId() {
  const newArtistId = nextArtistId;
  nextArtistId++;
  return newArtistId;
}

// returns an albumId for a new album
function getNewAlbumId() {
  const newAlbumId = nextAlbumId;
  nextAlbumId++;
  return newAlbumId;
}

// returns an songId for a new song
function getNewSongId() {
  const newSongId = nextSongId;
  nextSongId++;
  return newSongId;
}

/* ======================= PROCESS SERVER REQUESTS ======================= */
const server = http.createServer((req, res) => {
  console.log(`${req.method} ${req.url}`);

  // assemble the request body
  let reqBody = "";
  req.on("data", (data) => {
    reqBody += data;
  });

  req.on("end", () => { // finished assembling the entire request body
    // Parsing the body of the request depending on the "Content-Type" header
    if (reqBody) {
      switch (req.headers['content-type']) {
        case "application/json":
          req.body = JSON.parse(reqBody);
          break;
        case "application/x-www-form-urlencoded":
          req.body = reqBody
            .split("&")
            .map((keyValuePair) => keyValuePair.split("="))
            .map(([key, value]) => [key, value.replace(/\+/g, " ")])
            .map(([key, value]) => [key, decodeURIComponent(value)])
            .reduce((acc, [key, value]) => {
              acc[key] = value;
              return acc;
            }, {});
          break;
        default:
          break;
      }
      console.log(req.body);
    }

    /* ========================== ROUTE HANDLERS ========================== */
    // Your code here
    const parsedUrl = url.parse(req.url); // This will parse the URL from the request
    const path = parsedUrl.pathname.split('/').filter(element => element !== '');
    const method = req.method;
    const sendResponse = (res, statusCode, body) => { // response form for each method
      res.statusCode = statusCode;
      res.setHeader('Content-Type', 'application/json');
      res.write(JSON.stringify(body));
      res.end();
    }
    
   
    //artists
    if (path[0] === 'artists') { // URL: /artists

      // GET all artists
      if (method === 'GET' && !path[1] && !path[2]) {
        return sendResponse(res, 200, artists)
      }

      // POST an artist
      if (method === 'POST' && !path[1] && !path[2]) { // if the method is a POST
        if (!req.body.name) { 
          return sendResponse(res, 400, { message: "Artist name is required" })
        }
        const newArtistId = getNewArtistId() //create a new artist id
        const newArtist = { // create a new artist object
          artistId: newArtistId,
          name: req.body.name
        };
        artists[newArtistId] = newArtist; // add the new artist to the database
        return sendResponse(res, 201, newArtist)
      }
      
      if (path[1]) { // URL: artists/:artistId
        
        const artistId = Number(path[1]); //turn the artist id into a number to be used 
        let getArtistById = (artistId) => artists[artistId] //find the artist in the json file by its id
        const artist = getArtistById(artistId); //set the current artist found to be used for this code
        
        if (!artist) {
          return sendResponse(res, 404, { message: "Artist not found" })
        };

        // GET a specific artist's details based on artistId
        if (method === 'GET' && !path[2]){
          if (isNaN(artistId)) {
            return sendResponse(res, 400, { message: "Artist ID should be a number" })
          };
          return sendResponse(res, 200, artist)
        }
        
        // PUT Edit a specified artist by artistId
        if (method === 'PUT' && !path[2]) { 
          const newArtistDetails = req.body;
          if (!newArtistDetails.name) {
            return sendResponse(res, 400, { message: "Artist name must be provided" })
          }
          artist.name = newArtistDetails.name;
          return sendResponse(res, 200, artist)
        }

        // DELETE a specified artist by artistId
        if (method === 'DELETE') {
          delete artists[artistId];
          return sendResponse(res, 200, { message: "Artist successfully deleted" })
        }

        if (path[2] === 'albums') { // URL: artists/:artistId/albums
          
          // GET all albums of a specific artist based on artistId
          if (method === 'GET' && !path[3]) {
            let albumsByArtist = Object.values(albums).filter(album => album.artistId === artistId);
            return sendResponse(res, 200, albumsByArtist)
          }

          // POST an album to a specific artist based on artistId
          if (method === 'POST' && !path[3]) {
            if (!req.body.name) {
              return sendResponse(res, 400, { message: "Album name is required" });
            }
            const newAlbumId = getNewAlbumId();
            const newAlbum = {
              albumId: newAlbumId,
              name: req.body.name,
              artistId: artistId
            };
            albums[newAlbumId] = newAlbum;
            return sendResponse(res, 201, newAlbum);
          }
        } // end of (path[2] === 'albums)

        if (path[2] === 'songs') { // URL: /artist/:artistId/songs
         
          // GET all songs of a specific artist based on artistId
          if (method ==='GET' && !path[3]) {
            let albumsByArtist = Object.values(albums).filter(album => album.artistId === artistId);
            let songsByArtist = [];
            albumsByArtist.forEach(album => {
              Object.values(songs).forEach(song => {
                if (song.albumId === album.albumId) {
                  songsByArtist.push(song)
                }
              })
            })
            return sendResponse(res, 200, songsByArtist);
          }
        }

      }

    } // end of (path[0] === 'artists') 

    //albums
    if (path[0] === 'albums') { // URL: albums/:albumId
      const albumId = Number(path[1]);
      const album = albums[albumId];
  
      if (!album) {
          return sendResponse(res, 404, { message: "Album not found" });
      }
      
      // GET a specific album's details based on albumId
      if (method === 'GET' && !path[2]) {
          const artist = artists[album.artistId];
          const songsInAlbum = Object.values(songs).filter(song => song.albumId === albumId);
          const albumDetails = {
              ...album,
              artist,
              songs: songsInAlbum
          };
          return sendResponse(res, 200, albumDetails);
      }

      // Edit a specified album by albumId
      if (method === 'PUT' && !path[2]) {
        const updatedAlbumDetails = req.body;
        if (!updatedAlbumDetails.name) {
          return sendResponse(res, 400, { message: "Album name must be provided" });
        }
        album.name = updatedAlbumDetails.name;
        album.updatedAt = new Date().toISOString();
        return sendResponse(res, 200, album);
      }

      if (method === 'DELETE' && !path[2]) {
        delete albums[albumId];
        return sendResponse(res, 204, { message: "Album successfully deleted" })
      }

      if (path[2] === 'songs') { // URL: /albums/:albumId/songs

        // GET all songs of a specific album based on albumId
        if (method === 'GET') {
          let songsByAlbum = Object.values(songs).filter(song => song.albumId === albumId);
            return sendResponse(res, 200, songsByAlbum);
        }
        // POST Add a song to a specific album based on albumId
        if (method === 'POST') {
          if (!req.body.name || !req.body.trackNumber || !req.body.lyrics) {
            return sendResponse(res, 400, { message: "Song name, track number, and lyrics are required" });
          }
          const newSongId = getNewSongId();
          const newSong = {
            songId: newSongId,
            name: req.body.name,
            trackNumber: req.body.trackNumber,
            albumId: albumId,
            lyrics: req.body.lyrics
          };
          songs[newSongId] = newSong;
          return sendResponse(res, 201, newSong);
        }
      }
    } // end of (path[0] === 'albums')

    // trackNumbers
    if (path[0] === 'trackNumbers') { // URL: trackNumbers/:trackNumbers
      const trackNumber = Number(path[1]);
      if (isNaN(trackNumber)) { // if the trackNumber is not a number, send a 400 error response
        return sendResponse(res, 400, { message: "Track number must be a number" });
      };
      // GET all songs of a specified trackNumber
      if (method === 'GET') { 
        const trackSongs = Object.values(songs).filter(song => song.trackNumber === trackNumber); // find all songs with the given trackNumber
        return sendResponse(res, 200, trackSongs); 
      }
    } // end of (path[0] === 'trackNumbers')

    // songs
    if (path[0] === 'songs') { // URL: /songs/songId
      const songId = Number(path[1]);
      const song = songs[songId];

      // GET a specific song's details based on songId
      if (method === 'GET') {
        if (isNaN(songId)) {
          return sendResponse(res, 400, { message: "Song ID must be a number" });
        };
        if (!song) {
          return sendResponse(res, 404, { message: "Song not found" });
        };
        return sendResponse(res, 200, song)
      }

      // PUT Edit a specified song by songId
      if (method === 'PUT' && !path[2]) {
        if (req.body.name !== undefined) song.name = req.body.name;
        if (req.body.trackNumber !== undefined) song.trackNumber = req.body.trackNumber;
        if (req.body.lyrics !== undefined) song.lyrics = req.body.lyrics;
        return sendResponse(res, 200, song);
      }

      // DELETE a specified song by songId
      if (method === 'DELETE') {
        delete songs[songId];
        return sendResponse(res, 204, { message: "Song successfully Deleted" });
      }
    } // end of (path[0] === 'songs')

    res.statusCode = 404;
    res.setHeader('Content-Type', 'application/json');
    res.write("Endpoint not found");
    return res.end();
  });
});

const port = 5000;

server.listen(port, () => console.log('Server is listening on port', port));