const express = require("express");
const cors = require("cors");
const { MongoClient, ObjectId } = require("mongodb");
const jwt = require("jsonwebtoken");
const { timeStamp } = require("./util/timeStamp");
require("dotenv").config();

const app = express();

app.use(express.json());
app.use(cors());

//server root directory
app.get("/", (req, res) => {
  res.send("Server Working");
});

const verifyToken = (req, res, next) => {
  const authorization = req.headers.authorization;

  if (!authorization) res.status(401).send("Unauthorized request");

  const accessToken = authorization.split(" ")[1];
  jwt.verify(accessToken, process.env.JWT_SECRET_KEY, (err, decoded) => {
    if (err) {
      res.status(401).send("Unauthorized request");
    }
    req.decoded = decoded;
    next();
  });
};

// crud operations
async function run() {
  try {
    const client = new MongoClient(process.env.DB_URI);
    const database = await client.db("dentina");

    const serviceCollection = await database.collection("services");
    const reviewCollection = await database.collection("reviews");

    // all services and limit
    app.get("/services", async (req, res) => {
      let result = null;
      //checking limit
      const limit = parseInt(req?.query?.limit ?? 100000000000);
      result = await serviceCollection
        .find({})
        .limit(limit)
        .sort({ createdAt: -1 })
        .toArray();

      //get all reviews
      const reviews = await reviewCollection.find().toArray();

      const collection = [];

      //find reviews and average send theme individually
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
    //single service
    app.get("/service/:id", async (req, res) => {
      const id = req.params.id;
      const service = await serviceCollection.findOne({ _id: ObjectId(id) });

      // get reviews and
      const reviews = await reviewCollection.find().toArray();
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

      const result = {
        ...rating,
        rate: avgRate ? avgRate : 0,
        totalRating: rating.rate.length,
      };

      res.send(result);
    });
    // add services
    app.post("/addservice", async (req, res) => {
      const service = req.body;

      const result = await serviceCollection.insertOne({
        ...service,
        createdAt: timeStamp(),
      });

      res.send(result);
    });

    // all reviews list
    app.get("/review", async (req, res) => {
      const result = await reviewCollection
        .find({})
        .sort({ createdAt: -1 })
        .toArray();

      res.send(result);
    });
    // singel service  review
    app.get("/review/:id", async (req, res) => {
      const id = req.params.id;
      const result = await reviewCollection
        .find({ serviceId: ObjectId(id) })
        .sort({ createdAt: -1 })
        .toArray();
      res.send(result);
    });

    // singel service  review
    app.get("/reviewdetails/:id", async (req, res) => {
      const id = req.params.id;
      const result = await reviewCollection.findOne({ _id: ObjectId(id) });
      res.send(result);
    });

    // create review
    app.post("/review", async (req, res) => {
      const { serviceId, ...rest } = req.body;

      const result = await reviewCollection.insertOne({
        ...rest,
        serviceId: ObjectId(serviceId),
        createdAt: timeStamp(),
      });
      res.send(result);
    });

    // my reviews
    app.get("/myreview", async (req, res) => {
      const getEmail = req.query.email;

      const result = await reviewCollection
        .find({ email: getEmail })
        .sort({ createdAt: -1 })
        .toArray();
      res.send(result);
    });

    // edit review
    app.put("/myreview", async (req, res) => {
      const { _id, serviceId, ...updateDoc } = req.body;

      const result = await reviewCollection.replaceOne(
        { _id: ObjectId(_id) },
        { ...updateDoc, serviceId: ObjectId(serviceId), createdAt: timeStamp() }
      );
      res.send(result);
    });

    // delete review
    app.delete("/myreview", async (req, res) => {
      const result = await reviewCollection.deleteOne({
        _id: ObjectId(req.body.id),
      });
      res.send(result);
    });

    // generate jwt token
    app.post("/create-token", async (req, res) => {
      const { email } = req.body;

      console.log(email);
      if (!email) return res.status(400).send("Something went wrong !");
      // create token
      const token = jwt.sign({ email }, process.env.JWT_SECRET_KEY);

      res.send({ token });
    });
  } finally {
  }
}

run();

app.listen(5000, () => {
  console.log("server listen on port 5000");
});
