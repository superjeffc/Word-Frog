const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);

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

const wranglerJsoncPath = path.resolve(__dirname, '../wrangler.jsonc');
const wranglerTomlPath = path.resolve(__dirname, '../wrangler.toml');
let bindingName = "DICTIONARY_KV";

if (fs.existsSync(wranglerJsoncPath)) {
  try {
    const config = JSON.parse(fs.readFileSync(wranglerJsoncPath, 'utf8').replace(/\/\*[\s\S]*?\*\/|([^\\:]|^)\/\/.*$/gm, ''));
    if (config.kv_namespaces && config.kv_namespaces[0] && config.kv_namespaces[0].binding) {
      bindingName = config.kv_namespaces[0].binding;
    }
  } catch (e) {
    // Ignore and use default binding name
  }
} else if (fs.existsSync(wranglerTomlPath)) {
  try {
    const tomlContent = fs.readFileSync(wranglerTomlPath, 'utf8');
    const match = tomlContent.match(/binding\s*=\s*["']([^"']+)["']/);
    if (match && match[1]) {
      bindingName = match[1];
    }
  } catch (e) {
    // Ignore and use default binding name
  }
}

function cleanupTempFiles() {
  if (fs.existsSync(tempDir)) {
    for (let batchIndex = 1; batchIndex <= totalBatches; batchIndex++) {
      const batchFile = path.join(tempDir, `batch-${batchIndex}.json`);
      if (fs.existsSync(batchFile)) {
        try {
          fs.unlinkSync(batchFile);
        } catch (e) {
          // Ignore
        }
      }
    }
    try {
      fs.rmdirSync(tempDir);
    } catch (e) {
      // Ignore
    }
  }
}

async function uploadBatches() {
  const batchIndices = Array.from({ length: totalBatches }, (_, i) => i + 1);
  const CHUNK_SIZE = 5;

  try {
    for (let i = 0; i < batchIndices.length; i += CHUNK_SIZE) {
      const chunk = batchIndices.slice(i, i + CHUNK_SIZE);
      console.log(`Uploading batches ${chunk.join(', ')} of ${totalBatches}...`);

      await Promise.all(
        chunk.map(async (batchIndex) => {
          const batchFile = path.join(tempDir, `batch-${batchIndex}.json`);
          try {
            const { stdout, stderr } = await execPromise(`npx wrangler kv bulk put --binding ${bindingName} "${batchFile}"`);
            if (stdout) console.log(stdout.trim());
            if (stderr) console.error(stderr.trim());
          } catch (error) {
            console.error(`Error uploading batch ${batchIndex}:`, error.message);
            if (error.stdout) console.log(error.stdout.trim());
            if (error.stderr) console.error(error.stderr.trim());
            console.log("Make sure you are logged in to Cloudflare ('wrangler login') and have configured your KV namespace binding.");
            throw error;
          }
        })
      );
    }

    console.log("Bulk upload finished successfully!");
  } finally {
    cleanupTempFiles();
  }
}

uploadBatches().catch(() => {
  process.exit(1);
});
