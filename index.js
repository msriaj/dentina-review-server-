const express = require("express");
const cors = require("cors");
const { MongoClient, ObjectId } = require("mongodb");
const { timeStamp } = require("./util/timeStamp");

const app = express();

app.use(express.json());
app.use(cors());

//server root directory
app.get("/", (req, res) => {
  res.send("server Working");
});

// crud operations
async function run() {
  try {
    const mongouri =
      "mongodb+srv://sohel:xwivYRWJY4c4NRSc@cluster0.xj8ujnm.mongodb.net/?retryWrites=true&w=majority";

    const client = new MongoClient(mongouri);
    const database = await client.db("dentina");

    const serviceCollection = await database.collection("services");
    const reviewCollection = await database.collection("reviews");

    app.get("/services", async (req, res) => {
      let result = null;
      if (req?.query?.limit) {
        result = await serviceCollection
          .find({})
          .limit(parseInt(req.query.limit))
          .toArray();
      } else {
        result = await serviceCollection.find({}).toArray();
      }
      res.send(result);
    });

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
      const result = await reviewCollection.find({}).toArray();
      console.log(result);
      res.send(result);
    });

    app.get("/review/:id", async (req, res) => {
      const id = req.params.id;
      const result = await reviewCollection.find({ serviceId: id }).toArray();
      res.send(result);
    });

    app.post("/review", async (req, res) => {
      const review = req.body;
      const result = await reviewCollection.insertOne({
        ...review,
        createdAt: timeStamp(),
      });
      res.send(result);
    });
  } finally {
  }
}

run();

app.listen(5000, () => {
  console.log("server listen on port 5000");
});
