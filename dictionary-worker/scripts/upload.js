const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const dictionaryPath = path.resolve(__dirname, '../../constants/dictionary.js');
if (!fs.existsSync(dictionaryPath)) {
  console.error("Error: Could not find dictionary.js at " + dictionaryPath);
  process.exit(1);
}

const content = fs.readFileSync(dictionaryPath, 'utf8');
const arrayStartIndex = content.indexOf('[');
const arrayEndIndex = content.lastIndexOf(']');

if (arrayStartIndex === -1 || arrayEndIndex === -1) {
  console.error("Error: Could not parse array from dictionary.js");
  process.exit(1);
}

const arrayText = content.substring(arrayStartIndex, arrayEndIndex + 1);
let dictionary = [];
try {
  dictionary = JSON.parse(arrayText);
} catch (e) {
  console.error("Error: JSON parsing failed for dictionary array:", e);
  process.exit(1);
}

console.log(`Loaded ${dictionary.length} words from dictionary.js`);

const BATCH_SIZE = 10000;
const totalBatches = Math.ceil(dictionary.length / BATCH_SIZE);

const tempDir = path.resolve(__dirname, '../temp');
if (!fs.existsSync(tempDir)) {
  fs.mkdirSync(tempDir);
}

console.log("Preparing batches for bulk upload...");
for (let i = 0; i < dictionary.length; i += BATCH_SIZE) {
  const batchIndex = i / BATCH_SIZE + 1;
  const batch = dictionary.slice(i, i + BATCH_SIZE)
    .map(word => word.trim().toUpperCase())
    .filter(word => {
      if (!/^[A-Z]+$/.test(word)) return false;
      if (word.length === 1 && word !== 'A' && word !== 'I') return false;
      return true;
    })
    .map(word => ({
      key: word,
      value: "1"
    }));

  const batchFile = path.join(tempDir, `batch-${batchIndex}.json`);
  fs.writeFileSync(batchFile, JSON.stringify(batch));
}

console.log(`Created ${totalBatches} batch files.`);
console.log("\nStarting automated bulk upload of all batches...");

const wranglerConfigPath = path.resolve(__dirname, '../wrangler.jsonc');
let bindingName = "DICTIONARY_KV";

try {
  const config = JSON.parse(fs.readFileSync(wranglerConfigPath, 'utf8').replace(/\/\*[\s\S]*?\*\/|([^\\:]|^)\/\/.*$/gm, ''));
  if (config.kv_namespaces && config.kv_namespaces[0] && config.kv_namespaces[0].binding) {
    bindingName = config.kv_namespaces[0].binding;
  }
} catch (e) {
  // Ignore and use default binding name
}

for (let batchIndex = 1; batchIndex <= totalBatches; batchIndex++) {
  const batchFile = path.join(tempDir, `batch-${batchIndex}.json`);
  console.log(`Uploading batch ${batchIndex}/${totalBatches}...`);
  try {
    execSync(`npx wrangler kv bulk put --binding ${bindingName} "${batchFile}"`, { stdio: 'inherit' });
  } catch (error) {
    console.error(`Error uploading batch ${batchIndex}:`, error.message);
    console.log("Make sure you are logged in to Cloudflare ('wrangler login') and have configured your KV namespace binding.");
    process.exit(1);
  }
}

for (let batchIndex = 1; batchIndex <= totalBatches; batchIndex++) {
  const batchFile = path.join(tempDir, `batch-${batchIndex}.json`);
  if (fs.existsSync(batchFile)) fs.unlinkSync(batchFile);
}
fs.rmdirSync(tempDir);

console.log("Bulk upload finished successfully!");
