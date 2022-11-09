const express = require("express");
const cors = require("cors");
const { MongoClient, ObjectId } = require("mongodb");
const { timeStamp } = require("./util/timeStamp");
require("dotenv").config();

const app = express();

app.use(express.json());
app.use(cors());

//server root directory
app.get("/", (req, res) => {
  res.send("Server Working");
});

// crud operations
async function run() {
  try {
    const client = new MongoClient(process.env.DB_URI);
    const database = await client.db("dentina");

    const serviceCollection = await database.collection("services");
    const reviewCollection = await database.collection("reviews");

    app.get("/service/:id", async (req, res) => {
      const id = req.params.id;
      const result = await serviceCollection.findOne({ _id: ObjectId(id) });
      res.send(result);
    });

    app.post("/addservice", async (req, res) => {
      const service = req.body;
      console.log(service);
      const result = await serviceCollection.insertOne({
        ...service,
        createdAt: timeStamp(),
      });
      console.log(result);
      res.send(result);
    });

    app.get("/review", async (req, res) => {
      const result = await reviewCollection
        .find({})
        .sort({ createdAt: -1 })
        .toArray();

      res.send(result);
    });

    app.get("/review/:id", async (req, res) => {
      const id = req.params.id;
      const result = await reviewCollection
        .find({ serviceId: ObjectId(id) })
        .sort({ createdAt: -1 })
        .toArray();
      res.send(result);
    });

    app.get("/services", async (req, res) => {
      let result = null;
      const limit = parseInt(req?.query?.limit ?? 100000000000);
      result = await serviceCollection
        .find({})
        .limit(limit)
        .sort({ createdAt: -1 })
        .toArray();

      const reviews = await reviewCollection.find().toArray();

      const collection = [];

      result.forEach((service) => {
        const rating = { ...service, rate: [] };
        reviews.forEach((review) => {
          if (service._id.toString() === review.serviceId.toString()) {
            rating.rate.push(review.rating);
          }
        });

        const avgRate =
          Math.round(
            (rating.rate.reduce((a, v) => a + v, 0) / rating.rate.length) * 2
          ) / 2;

        collection.push({
          ...rating,
          rate: avgRate ? avgRate : 0,
          totalRating: rating.rate.length,
        });
      });

      res.send(collection);
    });

    app.post("/review", async (req, res) => {
      const { serviceId, ...rest } = req.body;

      const result = await reviewCollection.insertOne({
        ...rest,
        serviceId: ObjectId(serviceId),
        createdAt: timeStamp(),
      });
      res.send(result);
    });

    app.get("/myreview", async (req, res) => {
      const getEmail = req.query.email;
      if (getEmail) {
        const result = await reviewCollection
          .find({ email: getEmail })
          .sort({ createdAt: -1 })
          .toArray();
        res.send(result);
      } else {
        res.send("Unauthorize Access");
      }
    });
  } finally {
  }
}

run();

app.listen(5000, () => {
  console.log("server listen on port 5000");
});
