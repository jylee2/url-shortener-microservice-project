console.log(`================================`);
require('dotenv').config();
const express = require('express');
// Body Parser, otherwise body will be undefined
const bodyParser = require("body-parser");
// Mongoose for mongodb
const mongoose = require("mongoose");
const cors = require('cors');
// Accessing dns module to later check if url is valid
const dns = require('dns');
// Remove "https://" to get hostname only
const urlparser = require("url");
const app = express();

// Basic Configuration
const port = process.env.PORT || 3000;
// Connect to database
mongoose.connect(process.env.DB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
});
// Check if database configuration is ok
// 2 = connecting
console.log(`Check database configuration: ${mongoose.connection.readyState}`);
// Everything in Mongoose starts with a Schema
const Schema = mongoose.Schema;
// Each schema maps to a MongoDB collection & defines the shape of the documents within that collection
const urlSchema = new Schema({
  originalUrl: {type: String, required: true},
  shortUrl: { type: Number }
});
// Compile schema into a Model
const UrlModel = mongoose.model("UrlModel", urlSchema);

// Include this, otherwise Couldn't Reach Your Repl
app.listen(port, () => {
  console.log(`Listening on port ${port}`);
});

// Use body-parser to Parse POST Requests
// express() app
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cors());
// Enable use of style.css in /public
app.use('/public', express.static(`${process.cwd()}/public`));
// Load index.html
app.get('/', (req, res) => {
  res.sendFile(`${process.cwd()}/views/index.html`);
});

// Initial short_url = 1
const initialNum = 1;
// shortUrlNum needs to be incremented later
let shortUrlNum = initialNum;

// Get Data from POST Request
app.post("/api/shorturl/new", (request, response) => {
  // <input name="url"/>
  const inputUrl = request.body["url"];
  console.log(`inputUrl: ${inputUrl}`);
  // Remove the "https://"
  const urlHostname = urlparser.parse(inputUrl).hostname;
  console.log(`Remove the "https://" from url: ${urlHostname}`);

  // Check if url is valid
  const checkIfUrlValid = dns.lookup(urlHostname, (error, address, family) => {
    // If url is not valid, then error
    if(error){
      console.log(`checkIfUrlValid error: ${error}`);
    }
    // If url is valid, then proceed
    else {
      // If address = null is true, then IP address is not valid, then error
      console.log(`address = null? : ${address === null}`);
      if(address === null) {
        response.json({ error: 'invalid url' });
        // stop further execution in this callback, otherwise Error 
        return;
      }
      // Else if false, then IP address is valid, then proceed
      else {
        // Should be false
        console.log(`address = null? : ${address === null}`);

        // Incremented shortUrlNum
        // Count number of documents
        UrlModel.countDocuments({}, (error, count) => {
          if (error){
            return console.log(`countNumDocs error: ${error}`);
          } else {
            console.log("Count: ", count); // Count = 1
            // If there is at least 1 document
            if(count > 0) {
              // Increment shortUrlNum
              shortUrlNum = count + 1;
              console.log(`shortUrlNum: ${shortUrlNum}`);
            }
          }
        });

        // Check if the original url already exists in the database
        // Find shortUrl using the input originalUrl
        const findUrl = inputUrl;
        UrlModel.findOne({originalUrl: findUrl}, (error, data) => {
          if(error){
            return console.log(`findOne error: ${error}`);
          } else {
            // If original url does NOT exist
            if(!data){
              // Save url into mongodb
              const urlRecord = new UrlModel({
                originalUrl: inputUrl,
                shortUrl: shortUrlNum
              });
              urlRecord.save((error, data) => {
                if(error){
                  return console.log(`Save error: ${error}`);
                } else {
                  // Handle data in the request
                  response.json({
                    original_url: data["originalUrl"],
                    short_url: data["shortUrl"]
                  })
                }
              })
            }
            // Else if this is a new database entry
            else {
              console.log("original url already exists in the database");
              const tempOriUrl = data["originalUrl"];
              console.log(`Original URL: ${tempOriUrl}`);
              const tempShortUrl = data["shortUrl"];
              console.log(`Short URL: ${tempShortUrl}`);
              // Handle data in the request
              response.json({
                original_url: tempOriUrl,
                short_url: tempShortUrl
              })

            }
          }
        });
      }
      // IP address
      console.log(`address: ${address}`);
      // If 4, means IPv4
      console.log(`family: ${family}`);
    }      
  });
});

// Get query parameter input from the client
// Redirect shortUrl to original url
app.get("/api/shorturl/:asd", (request, response) => {
  // Get the :asd input, user can type whatever after shorturl/
  const theShortUrl = request.params["asd"];
  // Find the original url based on the :asd input which is the shortUrl
  UrlModel.findOne({shortUrl: theShortUrl}, (error, data) => {
    // If it cannot be found in the database
    if(!data){
      response.json({ error: 'invalid url' });
    }
    // Else redirect to the original URL
    else {
      response.redirect(data["originalUrl"]);
    }
  })
});

//module.exports = app;