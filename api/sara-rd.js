const { MongoClient } = require("mongodb");

const meta = {
  name: "randomQA",
  version: "1.0.0",
  description: "Fetch a random question and answer from MongoDB",
  author: "Alamin",
  method: "get",
  category: "sara",
  path: "/random-q="
};

let db, collection;
let questionMap = {};

async function connectMongo() {
  const mongoURL = "mongodb+srv://ikalaminss:uchR2FJzOGBS1flG@cluster0.lugxuhr.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0";
  const dbName = "sara";
  const collectionName = "sikho";

  const client = new MongoClient(mongoURL);
  try {
    await client.connect();
    db = client.db(dbName);
    collection = db.collection(collectionName);

    const allData = await collection.find({}).toArray();

    // Group by question
    allData.forEach(doc => {
      const q = doc.question.toLowerCase();
      if (!questionMap[q]) questionMap[q] = [];
      questionMap[q].push({ teacher: doc.teacher, answers: doc.answers });
    });

    console.log("✅ MongoDB Connected & Data Grouped.");
  } catch (err) {
    console.error("❌ MongoDB Connection Failed:", err.message);
  }
}

connectMongo();

async function onStart({ req, res }) {
  const questions = Object.keys(questionMap);
  if (questions.length === 0) {
    return res.json({ error: "No data found." });
  }

  const randomQuestion = questions[Math.floor(Math.random() * questions.length)];
  const entries = questionMap[randomQuestion];
  const randomEntry = entries[Math.floor(Math.random() * entries.length)];
  const randomAnswer = Array.isArray(randomEntry.answers)
    ? randomEntry.answers[Math.floor(Math.random() * randomEntry.answers.length)]
    : randomEntry.answers;

  return res.json({
    question: randomQuestion,
    answer: randomAnswer,
    teacher: randomEntry.teacher
  });
}

module.exports = { meta, onStart };
