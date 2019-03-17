const Express = require("express");
const BodyParser = require("body-parser");
const MongoClient = require("mongodb").MongoClient;
const ObjectId = require("mongodb").ObjectID;
const imdb = require("./src/imdb");
const DENZEL_IMDB_ID = "nm0000243";
require('dotenv').config()



const DATABASE_NAME = "denzel";

var app = Express();

app.use(BodyParser.json());
app.use(BodyParser.urlencoded({ extended: true }));

var database, collection;

app.listen(9292, () => {
  MongoClient.connect(
    process.env.CONNECTION_URL,
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

// give all the movies scrap in imdb
app.get("/movies", (request, response) => {
  collection.find({}).toArray((error, result) => {
    if (error) {
      return response.status(500).send(error);
    }
    response.send(result);
  });
});

//fetch a random movie
app.get("/movies/fetch", (request, response) => {
  collection
    .aggregate([
      { $match: { metascore: { $gte: 70 } } },
      { $sample: { size: 1 } }
    ])
    .toArray((error, result) => {
      if (error) {
        return response.status(500).send(error);
      }
      response.send(result);
    });
});

// This endpoint accepts the following optional query string parameters:
//limit - number of movies to return (default: 5)
//metascore - filter by metascore (default: 0)

app.get("/movies/search", (request, response) => {
  console.log(request.query.limit);
  collection
    .aggregate([
      {
        $match: { metascore: { $gte: Number(request.query.metascore) } }
      },
      { $sample: { size: Number(request.query.limit) } }
    ])
    .toArray((error, result) => {
      if (error) {
        return response.status(500).send(error);
      }
      response.send(result);
    });
});
// request to find a movie by id
app.get("/movies/:id", (request, response) => {
  collection.find({ id: request.params.id }).toArray((error, result) => {
    if (error) {
      return response.status(500).send(error);
    }
    response.send(result);
  });
});

app.post("/movies/:id", (request, response) => {
  collection.updateOne(
    { id: request.params.id },
    { $set: { date: request.body.date, review: request.body.review } },
    (error, result) => {
      if (error) {
        return response.status(500).send(error);
      }
      response.send(result.result);
    }
  );
});



// graphql
//get all the libraries needed
const express = require('express');
const graphqlHTTP = require('express-graphql');
const { GraphQLSchema,
  GraphQLObjectType,
  GraphQLString,
  GraphQLInt,
  GraphQLID,
  GraphQLList,
  GraphQLDate
} = require('graphql');
const _ = require('lodash');
const movieType = require('./types.js').movieType;

//setting up the port number and express app
const port = 5000;
var app = express();

 // Define the Schema
 
 const queryType = new GraphQLObjectType({
  name: 'Query',
  fields: {
      hello: {
          type: GraphQLString,

          resolve: function () {
              return "Hello World";
          }
      },
      populate:{
        type: GraphQLString,
        resolve: async () => {
          const movies = await imdb(DENZEL_IMDB_ID);
          collection.insertMany(movies, (error, result) => {
              if(error) {
                  return response.status(500).send(error);
              }

          });
          return "done";
        }
      },

      randomMovie:{
        type: movieType,
        resolve: async () => {
                const res = await collection.aggregate([{ $match: { "metascore": {$gt:70}}}, { $sample: { size: 1 }}]).toArray()
                return res[0]
        },
      },

      findMovie:{
        type: movieType,
        args:{
          id: { type: GraphQLString }
        },
        resolve: async (source, args) => {
          let res =  await collection.findOne({id : args.id});

          return res;
        }
      },
      search:{
        type: GraphQLList(movieType),
        args:{
          limit: {type : GraphQLInt},
          metascore: {type : GraphQLInt}
        },
        resolve : async (source, args) => {
              let metascore;
              let limit;
              if(args.limit == undefined) {
                limit = 5
              } else {
                limit = args.limit;
              }
              if(args.metascore == undefined) {
                metascore = 0
              }else {
                metascore = args.metascore;
              }
              const res = await collection.aggregate([{$match:{"metascore": {$gte:Number(metascore)}}}, {$limit:Number(limit)}, {$sort:{"metascore":-1}}]).toArray()
              return res
            }
      },
      review:{
        type:GraphQLString,
        args:{
          id: {type : GraphQLString},
          date:{type : GraphQLString},
          review:{type : GraphQLString}
        },
        resolve : async (source,args) =>{
          collection.updateOne({ "id": args.id },{$set : {"date": args.date , "review": args.review}}, (error, result) => {
            if(error) {
                return response.status(500).send(error);
            }
        });
        return "done";
        }
      }

  }
});

const schema = new GraphQLSchema({ query: queryType });

app.use('/graphql', graphqlHTTP({
  schema: schema,
  graphiql: true,
}));

app.listen(port);
console.log(`GraphQL Server Running at localhost:${port}`);
