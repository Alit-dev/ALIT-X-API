const { MongoClient } = require("mongodb");
const fuzzysort = require("fuzzysort");

// MongoDB Config
const mongoURL = "mongodb+srv://ikalaminss:uchR2FJzOGBS1flG@cluster0.lugxuhr.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0";
const dbName = "sara";
const collectionName = "sikho";

// API Metadata
const meta = {
  name: "Sara All Ans",
  description: "Fuzzy match question and return answers from MongoDB",
  method: "get",
  category: "sara",
  path: "/sara-ans?text="
};

// MongoDB connection + cache
let db, collection;
let questionMap = {};

async function connectMongo() {
  const client = new MongoClient(mongoURL);
  await client.connect();
  db = client.db(dbName);
  collection = db.collection(collectionName);
  await refreshData();
  console.log("✅ MongoDB Connected & Data Loaded");
}

async function refreshData() {
  const allData = await collection.find({}).toArray();
  questionMap = {};
  allData.forEach(doc => {
    const q = doc.question.toLowerCase();
    if (!questionMap[q]) questionMap[q] = [];
    questionMap[q].push({ teacher: doc.teacher, answers: doc.answers });
  });
  console.log("♻️ QuestionMap Refreshed");
}

connectMongo();

function removeEmojis(text) {
  return text.replace(/([\u2700-\u27BF]|[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|\uFE0F)/g, '').trim();
}

// Main Route Handler
async function onStart({ req, res }) {
  let input = (req.query.text || "").toLowerCase().trim();
  if (!input) return res.json({ error: "❌ No input provided." });

  input = removeEmojis(input);
  await refreshData();

  const allQuestions = Object.keys(questionMap).map(q => ({ q }));
  const matched = fuzzysort.go(input, allQuestions, {
    key: "q",
    threshold: -1000,
    limit: 5
  });

  if (!matched.length) return res.json({ error: "❌ No matching question found." });

  const matchedQuestion = matched[0].obj.q;
  const entries = questionMap[matchedQuestion];

  const allAnswers = [];
  for (const entry of entries) {
    allAnswers.push(...entry.answers);
  }

  if (!allAnswers.length) return res.json({ error: "❌ No answers found." });

  const selectedAnswer = allAnswers[0]; // চাইলে র‍্যান্ডম করতে পারো

  res.json({
    Allans: allAnswers
  });
}

module.exports = { meta, onStart };