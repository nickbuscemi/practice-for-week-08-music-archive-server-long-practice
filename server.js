const http = require('http');
const fs = require('fs');
const url = require('url');
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
    if (path[0] === 'artists') {
      
      if (method === 'GET' && !path[1] && !path[2]) {
        return sendResponse(res, 200, artists)
      }

      if (method === 'POST') { // if the method is a POST
        
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
      
      if (path[1]) { //if GET and the link has an artist id  number after artists/
        
        const artistId = Number(path[1]); //turn the artist id into a number to be used 
        let getArtistById = (artistId) => artists[artistId] //find the artist in the json file by its id
        const artist = getArtistById(artistId); //set the current artist found to be used for this code
        
        if (!artist) {
          return sendResponse(res, 404, { message: "Artist not found" })
        };

        if (method === 'GET' && !path[2]){
          
          if (isNaN(artistId)) {
            return sendResponse(res, 400, { message: "Artist ID should be a number" })
          };

          return sendResponse(res, 200, artist)
        }
        
        if (method === 'PUT') {
          
          const newArtistDetails = req.body;

          if (!newArtistDetails.name) {
            return sendResponse(res, 400, { message: "Artist name must be provided" })
          }

          artist.name = newArtistDetails.name;

          return sendResponse(res, 200, artist)
        }

        if (method === 'DELETE') {
          
          delete artists[artistId];

          return sendResponse(res, 200, { message: "Artist successfully deleted" })
        }

        if (path[2] === 'albums') {
          
          if (method === 'GET' && !path[3]) {
            let albumsByArtist = Object.values(albums).filter(album => album.artistId === artistId);
            return sendResponse(res, 200, albumsByArtist)
          }
          if (method === 'POST') {
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
        } // end of (path[2])

      } // end  of (path[1])

    } // end of (path[0]) 
    if (path[0] === 'albums') {
      const albumId = Number(path[1]);
      const album = albums[albumId];
  
      if (!album) {
          return sendResponse(res, 404, { message: "Album not found" });
      }
  
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
  }
  

    

    res.statusCode = 404;
    res.setHeader('Content-Type', 'application/json');
    res.write("Endpoint not found");
    return res.end();
  });
});

const port = 5000;

server.listen(port, () => console.log('Server is listening on port', port));