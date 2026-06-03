const fs = require('fs');
const path = require('path');

const DATA_PATH = path.join(__dirname, 'storage.json');

function readStorage() {
  if (!fs.existsSync(DATA_PATH)) {
    return { products: [], orders: [], tables: [] };
  }
  const raw = fs.readFileSync(DATA_PATH, 'utf-8');
  try {
    return JSON.parse(raw);
  } catch {
    return { products: [], orders: [], tables: [] };
  }
}

function writeStorage(data) {
  fs.writeFileSync(DATA_PATH, JSON.stringify(data, null, 2));
}

function ensureCollections(data) {
  data.products ??= [];
  data.orders ??= [];
  data.tables ??= [];
  return data;
}

function nextId(items) {
  let max = 0;
  for (const it of items) {
    if (typeof it?.id === 'number' && it.id > max) max = it.id;
  }
  return max + 1;
}

module.exports = {
  DATA_PATH,
  readStorage: () => ensureCollections(readStorage()),
  writeStorage,
  nextId,
};

