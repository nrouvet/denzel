const Express = require("express");
const BodyParser = require("body-parser");
const MongoClient = require("mongodb").MongoClient;
const ObjectId = require("mongodb").ObjectID;
const imdb = require('./src/imdb');
const DENZEL_IMDB_ID = 'nm0000243';

const CONNECTION_URL =
  "mongodb+srv://nrouvet:Budweiser22@webaadenzel-n4nof.mongodb.net/test?retryWrites=true";
const DATABASE_NAME = "denzel";

var app = Express();

app.use(BodyParser.json());
app.use(BodyParser.urlencoded({ extended: true }));

var database, collection;

app.listen(3000, () => {
  MongoClient.connect(
    CONNECTION_URL,
    { useNewUrlParser: true },
    (error, client) => {
      if (error) {
        throw error;
      }
      database = client.db(DATABASE_NAME);
      collection = database.collection("movies");
      console.log("Connected to `" + DATABASE_NAME + "`!");
    }
  );
});

app.get("/movies/populate", async (request, response) => {
    const movies = await imdb(DENZEL_IMDB_ID);
    collection.insertMany(movies, (err, result) => {
      if (err) {
        return response.status(500).send(err);
      }
      response.send(`Total movies added : ${movies.length}`);
    });
  });
/*
app.post("/person", (request, response) => {
  collection.insert(request.body, (error, result) => {
    if (error) {
      return response.status(500).send(error);
    }
    response.send(result.result);
  });
});*/

app.get("/movies", (request, response) => {
  collection.find({}).toArray((error, result) => {
    if (error) {
      return response.status(500).send(error);
    }
    response.send(result);
  });
});
