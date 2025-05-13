const { MongoClient } = require("mongodb");

const meta = {
  name: "sikho",
  version: "1.0.2",
  description: "Teach the bot multiple question-answer pairs for a specific teacher using '-' as separator , remove .",
  author: "Alamin",
  method: "get",
  category: "sara",
  path: "/sikho?question=.&answer=.&teacher=."
};

const mongoURL = "mongodb+srv://ikalaminss:uchR2FJzOGBS1flG@cluster0.lugxuhr.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0";
const dbName = "sara";
const collectionName = "sikho";

let db, collection;
let localData = {};

async function connectMongo() {
  const client = new MongoClient(mongoURL);
  await client.connect();
  db = client.db(dbName);
  collection = db.collection(collectionName);

  const allData = await collection.find({}).toArray();
  allData.forEach(doc => {
    if (!localData[doc.teacher]) localData[doc.teacher] = {};
    localData[doc.teacher][doc.question] = doc.answers;
  });
}

async function updateMongo() {
  await collection.deleteMany({});
  const newDocs = [];

  for (const teacher in localData) {
    for (const question in localData[teacher]) {
      newDocs.push({
        teacher,
        question,
        answers: localData[teacher][question]
      });
    }
  }

  if (newDocs.length) await collection.insertMany(newDocs);
}

async function onStart({ req, res }) {
  if (!collection) await connectMongo();

  const teacherName = req.query.teacher;
  const questionParam = req.query.question;
  const answerParam = req.query.answer;

  if (!teacherName || !questionParam || !answerParam) {
    return res.status(400).json({
      error: "Missing required query parameters: 'question', 'answer', and 'teacher'"
    });
  }

  const questions = questionParam.split("-").map(q => q.trim());
  const answerGroups = answerParam.split("-").map(ans => ans.split(",").map(a => a.trim()));

  if (questions.length !== answerGroups.length) {
    return res.status(400).json({ error: "Number of questions and answer groups must match" });
  }

  if (!localData[teacherName]) localData[teacherName] = {};
  const newAnswersForFirst = [];

  questions.forEach((q, i) => {
    const cleanQuestion = q.replace(/[^\w\s?.!]/g, "");
    const answers = answerGroups[i];

    if (!localData[teacherName][cleanQuestion]) localData[teacherName][cleanQuestion] = [];

    answers.forEach(ans => {
      if (!localData[teacherName][cleanQuestion].includes(ans)) {
        localData[teacherName][cleanQuestion].push(ans);
        if (i === 0) newAnswersForFirst.push(ans);
      }
    });
  });

  await updateMongo();

  return res.json({
    teacher: teacherName,
    learnedQuestions: questions.length,
    firstQuestion: questions[0],
    newAnswers: newAnswersForFirst,
    allAnswers: localData[teacherName][questions[0]]
  });
}

module.exports = { meta, onStart };