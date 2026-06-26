import { useEffect, useState } from 'react';

function App() {
  const [dishes, setDishes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');

  const fetchDishes = async () => {
    const response = await fetch('/api/dishes');
    const data = await response.json();
    setDishes(data);
    setLoading(false);
  };

  useEffect(() => {
    fetchDishes();

    const eventSource = new EventSource('/api/events');
    eventSource.addEventListener('dish-update', (event) => {
      const update = JSON.parse(event.data);
      setDishes((current) =>
        current.map((dish) => (dish.dishId === update.dishId ? { ...dish, ...update } : dish))
      );
      setMessage(`Updated ${update.dishName}`);
    });

    const intervalId = window.setInterval(() => {
      fetchDishes();
      setMessage('Syncing latest dish data...');
    }, 3000);

    return () => {
      window.clearInterval(intervalId);
      eventSource.close();
    };
  }, []);

  const togglePublish = async (dish) => {
    setMessage('Updating status...');
    const response = await fetch(`/api/dishes?dishId=${dish.dishId}`, {
      method: 'PATCH'
    });
    if (response.ok) {
      const updatedDish = await response.json();
      setDishes((current) =>
        current.map((item) => (item.dishId === updatedDish.dishId ? updatedDish : item))
      );
      setMessage(`${updatedDish.dishName} is now ${updatedDish.isPublished ? 'published' : 'unpublished'}`);
    }
  };

  if (loading) {
    return <div className="app-shell">Loading dishes...</div>;
  }

  return (
    <div className="app-shell">
      <header className="hero">
        <div>
          <p className="eyebrow">DishHub</p>
          <h1>Manage dish visibility in real time</h1>
          <p>Toggle publishing status instantly and keep the dashboard in sync.</p>
        </div>
        <div className="status-pill">{message || 'Connected'}</div>
      </header>

      <main className="grid">
        {dishes.map((dish) => (
          <article className="card" key={dish.dishId}>
            <img src={dish.imageUrl} alt={dish.dishName} />
            <div className="card-body">
              <h2>{dish.dishName}</h2>
              <p className={`badge ${dish.isPublished ? 'published' : 'draft'}`}>
                {dish.isPublished ? 'Published' : 'Draft'}
              </p>
              <button onClick={() => togglePublish(dish)}>
                {dish.isPublished ? 'Unpublish' : 'Publish'}
              </button>
            </div>
          </article>
        ))}
      </main>
    </div>
  );
}

export default App;
