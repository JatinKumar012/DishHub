const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const sqlite3 = require('sqlite3').verbose();

const app = express();
const port = process.env.PORT || 5000;
const dataDir = path.join(__dirname, '..', 'data');
const dbPath = path.join(dataDir, 'dishes.db');

if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const db = new sqlite3.Database(dbPath, (error) => {
  if (error) {
    console.error('Unable to open SQLite database', error);
  }
});

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
        return;
      }
      resolve(this);
    });
  });
}

function getQuery(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (error, rows) => {
      if (error) {
        reject(error);
        return;
      }
      resolve(rows);
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
    const insertStatement = db.prepare(
      'INSERT INTO dishes (dishId, dishName, imageUrl, isPublished) VALUES (?, ?, ?, ?)' 
    );
    seedDishes.forEach((dish) => {
      insertStatement.run(dish.dishId, dish.dishName, dish.imageUrl, dish.isPublished ? 1 : 0);
    });
    insertStatement.finalize();
  }
}

const clients = new Set();

function broadcastDishUpdate(dish) {
  const payload = JSON.stringify(dish);
  clients.forEach((client) => {
    client.write(`event: dish-update\ndata: ${payload}\n\n`);
  });
}

app.use(cors());
app.use(express.json());

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, message: 'DishHub API is running' });
});

app.get('/api/dishes', async (_req, res) => {
  try {
    const dishes = await getQuery('SELECT * FROM dishes ORDER BY dishName');
    res.json(dishes.map((dish) => ({ ...dish, isPublished: Boolean(dish.isPublished) })));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.patch('/api/dishes/:dishId/toggle-publish', async (req, res) => {
  try {
    const dish = await getQuery('SELECT * FROM dishes WHERE dishId = ?', [req.params.dishId]);
    if (!dish.length) {
      res.status(404).json({ error: 'Dish not found' });
      return;
    }

    const nextValue = Number(!dish[0].isPublished);
    await runQuery('UPDATE dishes SET isPublished = ? WHERE dishId = ?', [nextValue, req.params.dishId]);

    const [updatedDish] = await getQuery('SELECT * FROM dishes WHERE dishId = ?', [req.params.dishId]);
    const normalizedDish = { ...updatedDish, isPublished: Boolean(updatedDish.isPublished) };
    broadcastDishUpdate(normalizedDish);
    res.json(normalizedDish);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.patch('/api/dishes/:dishId', async (req, res) => {
  try {
    const { isPublished } = req.body;
    if (typeof isPublished !== 'boolean') {
      res.status(400).json({ error: 'isPublished must be a boolean' });
      return;
    }

    await runQuery('UPDATE dishes SET isPublished = ? WHERE dishId = ?', [isPublished ? 1 : 0, req.params.dishId]);

    const [updatedDish] = await getQuery('SELECT * FROM dishes WHERE dishId = ?', [req.params.dishId]);
    if (!updatedDish) {
      res.status(404).json({ error: 'Dish not found' });
      return;
    }

    const normalizedDish = { ...updatedDish, isPublished: Boolean(updatedDish.isPublished) };
    broadcastDishUpdate(normalizedDish);
    res.json(normalizedDish);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/events', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders?.();

  clients.add(res);
  res.write(`event: connected\ndata: ${JSON.stringify({ status: 'connected' })}\n\n`);

  req.on('close', () => {
    clients.delete(res);
  });
});

initializeDatabase().then(() => {
  app.listen(port, () => {
    console.log(`DishHub API listening on http://localhost:${port}`);
  });
}).catch((error) => {
  console.error('Database initialization failed', error);
  process.exit(1);
});
