'use strict';

var express = require('express');
var mongo = require('mongodb');
var mongoose = require('mongoose');
var mongodb = require('mongodb');
var validUrl = require('valid-url');
var shortid = require('shortid');
shortid.characters('0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ$&');
var dns = require('dns');
var bodyParser = require('body-parser');

var cors = require('cors');

var MongoClient = mongodb.MongoClient;

var app = express();

// Basic Configuration 
var port = process.env.PORT || 3000;

/** this project needs a db !! **/ 
// mongoose.connect(process.env.MONGOLAB_URI);


app.use(cors());

/** this project needs to parse POST bodies **/
// you should mount the body-parser here
app.use(bodyParser.urlencoded({extended: false}));
app.use(bodyParser.json());

app.use('/public', express.static(process.cwd() + '/public'));

app.get('/', function(req, res){
  res.sendFile(process.cwd() + '/views/index.html');
});

  
// your first API endpoint... 
app.get("/api/hello", function (req, res) {
  res.json({greeting: 'hello API'});
});

app.get('/api/new/:url', (req,res) => {
  MongoClient.connect(process.env.MONGO_URL, (err,db) => {
    
    if (err) throw err;
    var url = req.params.url;
    dns.lookup(url, (err,response) => {
      if (err) return console.log(err);
      var dbo = db.db('short-url');
      
      dbo.collection('medium').find({},{ projection: {_id:0}}).toArray((err,result) => {
        
        if (err) res.send('Sorry, the err is' + err);
        console.log(result)
        res.send(result);
        db.close()
      })
    })
  
  
  
  })
});

app.post('/api/shorturl/new', (req,res) => {
  var check = req.body.url;
  var url = check.includes('http') ? check.slice(check.indexOf('/')+2) : check;
  MongoClient.connect(process.env.MONGO_URL, (err,db) => {
    
    if (err) throw err;
    
    dns.lookup(url, (err,response) => {
      if (err) {
        console.log(err);
        res.json( {error: "Invalid URL"} )
        db.close();
      }
      var dbo = db.db('short-url');
      
      // at this point we have confirmed that the link is a valid url, so we want to check out database if the link exists
      // if it does, return the short url code, if it doesn't create a new short-url
      // save it to the database and display the results
      
      // search the database
      dbo.collection('medium').find({ original_url:check }, {projection: {_id: 0}}).sort().toArray((err,result) => {
        if (err) throw err;
        var allLinks = result;
        console.log('The original array is ',allLinks);
        //  if value doesnt exist in database, create it and display in the response
          if (result.length !== 0){
            res.json(allLinks[0]);
          } else {
            // create a short id, and save the object in the database
            var ohkay = shortid.generate();
            var myobj = {original_url: check, short_url: ohkay};
            dbo.collection('medium').insertOne(myobj, (err,response) => {
              if (err) throw err;
              console.log('The inserted count is ',response.insertedCount);
              res.json({original_url: check, short_url: ohkay});
            });
          }
        db.close();
      });
      
    });
  
  });
});

app.get('/api/shorturl/new/:short', (req,res) => {
  var short_url = req.params.short;
  
  console.log(short_url);
  
  MongoClient.connect(process.env.MONGO_URL, (err,db) => {
    if (err) throw err;
    
    var dbo = db.db('short-url');
    
    dbo.collection('medium').find({short_url:short_url}, {projection: {_id: 0}}).toArray((er, response) => {
      if (err) throw err;
      console.log(response)
      
      if (response.length !== 0 ) res.redirect(response[0]['original_url']);
      //Use node to redirect the person to the original URL
      else res.send('Sorry, we do not have that link in our database. Try posting another link');
      
      db.close();
    });
    
  });
});


app.listen(port, function () {
  console.log('Node.js listening ...');
});
