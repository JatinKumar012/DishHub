const fs = require('fs');
const os = require('os');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();

const dbDir = path.join(os.tmpdir(), 'dishhub-data');
const dbPath = path.join(dbDir, 'dishes.db');

if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const db = new sqlite3.Database(dbPath);

const seedDishes = [
  {
    dishId: 'dish-001',
    dishName: 'Spicy Tomato Pasta',
    imageUrl: 'https://images.unsplash.com/photo-1621996346565-e3dbc646d9a9?auto=format&fit=crop&w=800&q=80',
    isPublished: true
  },
  {
    dishId: 'dish-002',
    dishName: 'Crispy Herb Tacos',
    imageUrl: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?auto=format&fit=crop&w=800&q=80',
    isPublished: false
  },
  {
    dishId: 'dish-003',
    dishName: 'Mango Coconut Bowl',
    imageUrl: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=800&q=80',
    isPublished: true
  },
  {
    dishId: 'dish-004',
    dishName: 'Smoky Garlic Flatbread',
    imageUrl: 'https://images.unsplash.com/photo-1548366086-7f1b76106622?auto=format&fit=crop&w=800&q=80',
    isPublished: true
  }
];

function runQuery(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (error) {
      if (error) {
        reject(error);
      } else {
        resolve(this);
      }
    });
  });
}

function getQuery(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (error, rows) => {
      if (error) {
        reject(error);
      } else {
        resolve(rows);
      }
    });
  });
}

async function initializeDatabase() {
  await runQuery(`
    CREATE TABLE IF NOT EXISTS dishes (
      dishId TEXT PRIMARY KEY,
      dishName TEXT NOT NULL,
      imageUrl TEXT NOT NULL,
      isPublished INTEGER NOT NULL DEFAULT 0
    )
  `);

  const existingRows = await getQuery('SELECT COUNT(*) AS count FROM dishes');
  if (existingRows[0].count === 0) {
    const insert = db.prepare('INSERT INTO dishes (dishId, dishName, imageUrl, isPublished) VALUES (?, ?, ?, ?)');
    seedDishes.forEach((dish) => {
      insert.run(dish.dishId, dish.dishName, dish.imageUrl, dish.isPublished ? 1 : 0);
    });
    insert.finalize();
  }
}

async function getDishes() {
  const dishes = await getQuery('SELECT * FROM dishes ORDER BY dishName');
  return dishes.map((dish) => ({ ...dish, isPublished: Boolean(dish.isPublished) }));
}

async function toggleDishPublish(dishId) {
  const dish = await getQuery('SELECT * FROM dishes WHERE dishId = ?', [dishId]);
  if (!dish.length) {
    return null;
  }
  const nextValue = Number(!dish[0].isPublished);
  await runQuery('UPDATE dishes SET isPublished = ? WHERE dishId = ?', [nextValue, dishId]);
  const [updatedDish] = await getQuery('SELECT * FROM dishes WHERE dishId = ?', [dishId]);
  return { ...updatedDish, isPublished: Boolean(updatedDish.isPublished) };
}

async function setDishPublish(dishId, isPublished) {
  await runQuery('UPDATE dishes SET isPublished = ? WHERE dishId = ?', [isPublished ? 1 : 0, dishId]);
  const [updatedDish] = await getQuery('SELECT * FROM dishes WHERE dishId = ?', [dishId]);
  return { ...updatedDish, isPublished: Boolean(updatedDish.isPublished) };
}

initializeDatabase().catch((error) => console.error('DB init failed', error));

module.exports = {
  getDishes,
  toggleDishPublish,
  setDishPublish
};
