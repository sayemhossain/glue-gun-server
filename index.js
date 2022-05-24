const express = require("express");
const app = express();
const cors = require("cors");
require("dotenv").config();
const port = process.env.PORT || 5000;
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const jwt = require("jsonwebtoken");

// this is midlewiere
app.use(cors());
app.use(express.json());

//this is from mongodb
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.lzsdt.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverApi: ServerApiVersion.v1,
});

// this function for jwt
function verifyJWT(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).send({ message: "Unauthorized access" });
  }
  const token = authHeader.split(" ")[1];
  // verify a token symmetric
  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, function (err, decoded) {
    if (err) {
      return res.status(403).send({ message: "Forbidden access" });
    }
    req.decoded = decoded;
    next();
  });
}
async function run() {
  try {
    await client.connect();
    console.log("Database connected");

    const toolCollection = client.db("glue_gun").collection("tools");
    const orderCollection = client.db("glue_gun").collection("orders");
    const userCollection = client.db("glue_gun").collection("user");

    // finding all tools from database
    app.get("/tools", async (req, res) => {
      const query = {};
      const cursor = toolCollection.find(query);
      const tools = await cursor.toArray();
      res.send(tools);
    });

    //find one using id from database
    app.get("/tools/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: ObjectId(id) };
      const tool = await toolCollection.findOne(query);
      res.send(tool);
    });

    // get all the oder form database using email query
    app.get("/order", async (req, res) => {
      const user = req.query.user;
      const query = { user: user };
      const orders = await orderCollection.find(query).toArray();
      return res.send(orders);
    });
    // add a new order
    app.post("/order", async (req, res) => {
      const order = req.body;
      const result = await orderCollection.insertOne(order);
      res.send(result);
    });

    //update quantity after a order
    app.put("/tools/:id", async (req, res) => {
      const id = req.params.id;
      const updatedQuantity = req.body;
      const query = { _id: ObjectId(id) };
      const options = { upsert: true };

      const updatedDoc = {
        $set: {
          available_quantity: updatedQuantity.newQuantity,
        },
      };
      const result = await toolCollection.updateOne(query, updatedDoc, options);
      res.send(result);
    });

    // this is for user collection
    app.put("/user/:email", async (req, res) => {
      const email = req.params.email;
      const user = req.body;
      const filter = { email: email };
      const options = { upsert: true };
      const updateDoc = {
        $set: user,
      };
      const result = await userCollection.updateOne(filter, updateDoc, options);
      // emplementing jwt
      const token = jwt.sign(
        { email: email },
        process.env.ACCESS_TOKEN_SECRET,
        { expiresIn: "1h" }
      );
      res.send({ result, token });
    });

    // this is for delete order
    app.delete("/order/:orderId", async (req, res) => {
      const orderId = req.params.orderId;
      const filter = { orderId: orderId };
      const result = await orderCollection.deleteOne(filter);
      res.send(result);
    });
  } finally {
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("Hello from Glue gun!");
});

app.listen(port, () => {
  console.log(`Glue gun is listening on port ${port}`);
});
