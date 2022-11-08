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

    app.get("/service/:id", async (req, res) => {
      const id = req.params.id;
      let result = await serviceCollection.findOne({ _id: ObjectId(id) });

      res.send(result);
    });

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
  } finally {
    console.log("hello i am working");
  }
}

run();

app.listen(5000, () => {
  console.log("server listen on port 5000");
});
