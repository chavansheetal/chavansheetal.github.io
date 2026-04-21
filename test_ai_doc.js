import { analyzeDocument } from './src/services/aiDocumentService.js';

async function run() {
  const file1 = { name: "10th marks card .jpeg", size: 10000 };
  const res1 = await analyzeDocument(file1, "Current Year Fee Receipt");
  console.log("Fee Receipt test:", res1);

  const file2 = { name: "aai.jpg", size: 10000 };
  const res2 = await analyzeDocument(file2, "Previous Year Mark Sheet");
  console.log("Mark Sheet test:", res2);
}

run().catch(console.error);
