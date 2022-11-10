const express = require("express");
const cors = require("cors");
const { MongoClient, ObjectId } = require("mongodb");
const jwt = require("jsonwebtoken");
const { timeStamp } = require("./util/timeStamp");
require("dotenv").config();

const app = express();
const port = process.env.PORT || 8000;

app.use(express.json());
app.use(cors());

app.get("/", (req, res) => {
  res.send("Server Working");
});

// middleware
const verifyToken = (req, res, next) => {
  try {
    const authorization = req.headers.authorization;
    if (!authorization) res.status(401).send("Unauthorized request");

    const accessToken = authorization.split(" ")[1];
    const decode = jwt.verify(accessToken, process.env.JWT_SECRET_KEY);

    if (decode) {
      req.decode = decode;
      next();
    }
  } catch (error) {
    res.status(500).send(error.message);
  }
};

// crud operations
async function run() {
  try {
    const client = new MongoClient(process.env.DB_URI);
    const database = await client.db("dentina");

    //calling collections
    const serviceCollection = await database.collection("services");
    const reviewCollection = await database.collection("reviews");

    /**
     * Method: POST
     */

    // generate jwt token
    app.post("/create-token", async (req, res) => {
      const { email } = req.body;

      if (!email) return res.status(400).send("Something went wrong !");
      // create token
      const token = jwt.sign({ email }, process.env.JWT_SECRET_KEY, {
        expiresIn: "1d",
      });

      res.send({ token });
    });

    // add services
    app.post("/add-service", verifyToken, async (req, res) => {
      const service = req.body;

      if (!service)
        return res.status(400).send({ msg: "Service data is required !" });

      const result = await serviceCollection.insertOne({
        ...service,
        createdAt: timeStamp(),
      });

      res.send(result);
    });

    // add review
    app.post("/add-review", verifyToken, async (req, res) => {
      const { serviceId, ...rest } = req.body;

      const result = await reviewCollection.insertOne({
        ...rest,
        serviceId: ObjectId(serviceId),
        createdAt: timeStamp(),
      });

      res.send(result);
    });

    /**
     * Method: GET
     */
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

        const reviewObj = {
          ...rating,
          rate: avgRate ? avgRate : 0,
          totalRating: rating.rate.length,
        };

        collection.push(reviewObj);
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

      const reviewObj = {
        ...rating,
        rate: avgRate ? avgRate : 0,
        totalRating: rating.rate.length,
      };

      res.send(reviewObj);
    });

    // all reviews list
    app.get("/review", async (req, res) => {
      const result = await reviewCollection
        .find({})
        .sort({ createdAt: -1 })
        .toArray();

      res.send(result);
    });

    // single service  review
    app.get("/review/:id", async (req, res) => {
      const { id } = req.params;

      const result = await reviewCollection
        .find({ serviceId: ObjectId(id) })
        .sort({ createdAt: -1 })
        .toArray();

      res.send(result);
    });

    // single review
    app.get("/review-details/:id", async (req, res) => {
      const { id } = req.params;
      const result = await reviewCollection.findOne({ _id: ObjectId(id) });
      res.send(result);
    });

    // my reviews
    app.get("/my-review", verifyToken, async (req, res) => {
      // checking email is valid
      if (req?.decode?.email !== req.query.email) {
        res.status(401).send({ message: "Unauthorized Access" });
      }
      const getEmail = req.query.email;

      const result = await reviewCollection
        .find({ email: getEmail })
        .sort({ createdAt: -1 })
        .toArray();
      res.send(result);
    });

    /**
     * Method: PUT
     */

    // edit review
    app.put("/update-my-review", verifyToken, async (req, res) => {
      const { _id, email, serviceId, ...updateDoc } = req.body;
      if (req?.decode?.email !== email) {
        res.status(401).send({ message: "Unauthorized Access" });
      }

      const result = await reviewCollection.replaceOne(
        { _id: ObjectId(_id) },
        {
          ...updateDoc,
          serviceId: ObjectId(serviceId),
          createdAt: timeStamp(),
          email,
        }
      );
      res.send(result);
    });

    /**
     * Method: DELETE
     */

    // delete review
    app.delete("/delete-my-review", verifyToken, async (req, res) => {
      const theReview = await reviewCollection.findOne({
        _id: ObjectId(req.body.id),
      });

      // cheking this review belong to the user or not
      if (req?.decode?.email !== theReview?.email) {
        res.status(401).send({ message: "Unauthorized Access" });
      }

      const result = await reviewCollection.deleteOne({
        _id: ObjectId(req.body.id),
      });
      res.send(result);
    });
  } finally {
  }
}

run().catch((error) => console.log(error));

app.listen(port, () => {
  console.log(`server listen on port ${port}`);
});
