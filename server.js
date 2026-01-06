
import express from 'express';
import cors from 'cors';
import db from './db.js'; 
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';


const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;


app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public'))); 

const jsonPath = path.join(__dirname, 'public', 'product.json');


function updateJSON(products) {
  fs.writeFile(jsonPath, JSON.stringify(products, null, 2), (err) => {
    if (err) console.error('Error writing JSON:', err);
  });
}


app.get('/api/products', (req, res) => {
  db.query('SELECT * FROM products', (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(results);
  });
});


app.post('/api/products', (req, res) => {
  const { name, category, price, stock, image, productionDate, expiryDate } = req.body;

  const sql = `
    INSERT INTO products 
    (name, category, price, stock, image, productionDate, expiryDate)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `;

  db.query(sql, [name, category, price, stock, image, productionDate, expiryDate], (err, result) => {
    if (err) return res.status(500).json({ error: err.message });

    const newProduct = {
      id: result.insertId,
      name,
      category,
      price,
      stock,
      image,
      productionDate,
      expiryDate
    };

   
    fs.readFile(jsonPath, 'utf8', (err, data) => {
      let products = [];
      if (!err) {
        try { products = JSON.parse(data); } catch(e){ products = []; }
      }

      products.push(newProduct); 
      updateJSON(products);       
    });

    res.json({ message: '✅ Product added', id: result.insertId });
  });
});


app.put('/api/products/:id', (req, res) => {
  const { name, category, price, stock, image, productionDate, expiryDate } = req.body;
  const productId = req.params.id;

  const sql = `
    UPDATE products SET
    name=?, category=?, price=?, stock=?, image=?, productionDate=?, expiryDate=?
    WHERE id=?
  `;

  db.query(sql, [name, category, price, stock, image, productionDate, expiryDate, productId], (err) => {
    if (err) return res.status(500).json({ error: err.message });


    fs.readFile(jsonPath, 'utf8', (err, data) => {
      let products = [];
      if (!err) {
        try { products = JSON.parse(data); } catch(e){ products = []; }
      }

      products = products.map(p => 
        p.id == productId ? { id: Number(productId), name, category, price, stock, image, productionDate, expiryDate } : p
      );

      updateJSON(products);
    });

    res.json({ message: '✏️ Product updated' });
  });
});


app.delete('/api/products/:id', (req, res) => {
  const productId = req.params.id;

  db.query('DELETE FROM products WHERE id = ?', [productId], (err) => {
    if (err) return res.status(500).json({ error: err.message });

   
    fs.readFile(jsonPath, 'utf8', (err, data) => {
      let products = [];
      if (!err) {
        try { products = JSON.parse(data); } catch(e){ products = []; }
      }

      products = products.filter(p => p.id != productId);
      updateJSON(products);
    });

    res.json({ message: '🗑️ Product deleted' });
  });
});



app.get('/api/farmers', (req, res) => {
  db.query('SELECT * FROM farmers ORDER BY id DESC', (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(results);
  });
});


app.post('/api/farmers', (req, res) => {
  console.log('Received:', req.body); 
  const { name, farmName, email, phone, location, farmSize, specialty, description } = req.body;
  const sql = `INSERT INTO farmers (name, farmName, email, phone, location, farmSize, specialty, description) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`;
  db.query(sql, [name, farmName, email, phone, location, farmSize, specialty, description], (err, result) => {
    if (err) {
      console.error('Insert error:', err);
      return res.status(500).json({ error: err.message });
    }
    res.json({ message: '✅ Farmer added', id: result.insertId });
  });
});


app.delete('/api/farmers/:id', (req, res) => {
  const id = req.params.id;
  db.query('DELETE FROM farmers WHERE id = ?', [id], (err) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: '🗑️ Farmer deleted' });
  });
});

app.post('/api/users/register', (req, res) => {
  const { name, email, password } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ error: 'All fields are required' });
  }

  
  db.query('SELECT * FROM users WHERE email = ?', [email], (err, result) => {
    if (err) return res.status(500).json({ error: err.message });

    if (result.length > 0) {
      return res.status(400).json({ error: 'User already exists' });
    }


    db.query(
      'INSERT INTO users (name, email, password) VALUES (?, ?, ?)',
      [name, email, password],
      (err, result) => {
        if (err) return res.status(500).json({ error: err.message });

        res.status(201).json({ message: 'User registered successfully' });
      }
    );
  });
});


app.post('/api/users/login', (req, res) => {
  const { email, password } = req.body;
  const sql = 'SELECT * FROM users WHERE email = ? AND password = ?';
  db.query(sql, [email, password], (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    if (results.length === 0) return res.status(401).json({ error: 'Invalid credentials' });
    res.json({ message: '✅ Login successful', user: results[0] });
  });
});



app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});


app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
