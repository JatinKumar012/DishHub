const fs = require('fs');
const os = require('os');
const path = require('path');

const dataFile = path.join(os.tmpdir(), 'dishhub-data.json');

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

function readStore() {
  if (!fs.existsSync(dataFile)) {
    fs.writeFileSync(dataFile, JSON.stringify(seedDishes, null, 2));
    return seedDishes;
  }

  const raw = fs.readFileSync(dataFile, 'utf8');
  return JSON.parse(raw);
}

function writeStore(dishes) {
  fs.writeFileSync(dataFile, JSON.stringify(dishes, null, 2));
}

function normalizeDishes(dishes) {
  return dishes.map((dish) => ({ ...dish, isPublished: Boolean(dish.isPublished) }));
}

async function getDishes() {
  return normalizeDishes(readStore().slice().sort((a, b) => a.dishName.localeCompare(b.dishName)));
}

async function toggleDishPublish(dishId) {
  const dishes = readStore();
  const dish = dishes.find((item) => item.dishId === dishId);
  if (!dish) {
    return null;
  }

  dish.isPublished = !dish.isPublished;
  writeStore(dishes);
  return { ...dish, isPublished: Boolean(dish.isPublished) };
}

async function setDishPublish(dishId, isPublished) {
  const dishes = readStore();
  const dish = dishes.find((item) => item.dishId === dishId);
  if (!dish) {
    return null;
  }

  dish.isPublished = Boolean(isPublished);
  writeStore(dishes);
  return { ...dish, isPublished: Boolean(dish.isPublished) };
}

module.exports = {
  getDishes,
  toggleDishPublish,
  setDishPublish
};
