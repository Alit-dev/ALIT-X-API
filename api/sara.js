const { MongoClient } = require("mongodb");
const fuzzysort = require("fuzzysort");

const mongoURL = "mongodb+srv://ikalaminss:uchR2FJzOGBS1flG@cluster0.lugxuhr.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0";
const dbName = "sara";
const collectionName = "sikho";

const meta = {
  name: "Sara",
  description: "Fuzzy match question and return random answer from MongoDB",
  method: "get",
  category: "sara",
  path: "/sarachat?text="
};

let db, collection;
let questionMap = {};
let lastAnswerIndex = {};

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

async function onStart({ req, res }) {
  let input = (req.query.text || "").toLowerCase().trim();
  if (!input) return res.json({ error: "❌ No input provided." });

  input = removeEmojis(input);

  // Always refresh data before searching
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

  const totalVariants = [];
  for (const entry of entries) {
    const { teacher, answers } = entry;
    for (const ans of answers) {
      totalVariants.push({ teacher, question: matchedQuestion, answer: ans });
    }
  }

  if (totalVariants.length === 0) return res.json({ error: "❌ No answers found." });

  const key = matchedQuestion;
  const lastIndex = lastAnswerIndex[key] ?? -1;
  const nextIndex = (lastIndex + 1) % totalVariants.length;
  lastAnswerIndex[key] = nextIndex;

  const selected = totalVariants[nextIndex];
  res.json({
    teacher: selected.teacher,
    question: selected.question,
    answer: selected.answer
  });
}

module.exports = { meta, onStart };