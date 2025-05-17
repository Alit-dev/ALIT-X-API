const { MongoClient } = require("mongodb");

const meta = {
  name: "sikho",
  version: "1.0.5",
  description: "Teach the bot and return only newly taught data",
  author: "Alamin",
  method: "get",
  category: "sara",
  path: "/sikho?question=&answer=&teacher="
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
  await refreshLocalData();
}

async function refreshLocalData() {
  localData = {};
  const allData = await collection.find({}).toArray();
  allData.forEach(doc => {
    if (!localData[doc.teacher]) localData[doc.teacher] = {};
    localData[doc.teacher][doc.question] = doc.answers;
  });
}

async function onStart({ req, res }) {
  if (!collection) await connectMongo();
  await refreshLocalData();

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
    return res.status(400).json({ error: "Question & answer count mismatch" });
  }

  if (!localData[teacherName]) localData[teacherName] = {};

  let newlyLearnedQuestions = [];
  let newlyLearnedAnswers = [];

  for (let i = 0; i < questions.length; i++) {
    const q = questions[i].replace(/[^\w\s?.!]/g, "");
    const answers = answerGroups[i];

    if (!localData[teacherName][q]) {
      localData[teacherName][q] = [...answers];
      await collection.insertOne({ teacher: teacherName, question: q, answers });
      newlyLearnedQuestions.push(q);
      newlyLearnedAnswers.push(answers);
    } else {
      const existingAnswers = localData[teacherName][q];
      const newAnswers = answers.filter(ans => !existingAnswers.includes(ans));
      if (newAnswers.length > 0) {
        await collection.updateOne(
          { teacher: teacherName, question: q },
          { $addToSet: { answers: { $each: newAnswers } } }
        );
        localData[teacherName][q] = [...existingAnswers, ...newAnswers];
        newlyLearnedQuestions.push(q);
        newlyLearnedAnswers.push(newAnswers);
      }
    }
  }

  const flatAnswers = newlyLearnedAnswers.flat();

  const response = {
  operator: "Alit",
  teacher: teacherName,
  learned: newlyLearnedQuestions.length,
  learnedQuestions: Object.keys(localData[teacherName]).length,
  learnedAnser: Object.values(localData[teacherName]).flat().length,
  Question: newlyLearnedQuestions,
  Answers: newlyLearnedAnswers,
  allAnswers: flatAnswers
};
  return res.json(response);
}

module.exports = { meta, onStart };