const { getDishes, toggleDishPublish, setDishPublish } = require('./lib/db');

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PATCH,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  try {
    if (req.method === 'GET') {
      const dishes = await getDishes();
      res.status(200).json(dishes);
      return;
    }

    if (req.method === 'PATCH') {
      const dishId = req.query.dishId || req.body?.dishId;
      if (!dishId) {
        res.status(400).json({ error: 'dishId is required' });
        return;
      }

      const body = req.body || {};
      if (typeof body.isPublished === 'boolean') {
        const updatedDish = await setDishPublish(dishId, body.isPublished);
        res.status(200).json(updatedDish);
        return;
      }

      const updatedDish = await toggleDishPublish(dishId);
      if (!updatedDish) {
        res.status(404).json({ error: 'Dish not found' });
        return;
      }
      res.status(200).json(updatedDish);
      return;
    }

    res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
