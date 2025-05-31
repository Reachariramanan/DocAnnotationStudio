// server.cjs
const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const fs = require('fs').promises;
const path = require('path');
const app = express();
const port = 3000;

// Middleware to parse JSON bodies
app.use(express.json());

// Serve static files:
//   /images/* → high_res_images/*
//   /*        → project root (index.html, etc.)
app.use('/images', express.static(path.join(__dirname, 'high_res_images')));
app.use(express.static(__dirname));

// Connect to (or create) SQLite database
const dbPath = path.join(__dirname, 'high_res_ocr_results.db');
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error connecting to database:', err.message);
  } else {
    console.log('Connected to high_res_ocr_results.db');
    // Ensure annotation_classes table exists
    db.run(`CREATE TABLE IF NOT EXISTS annotation_classes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      color TEXT NOT NULL
    )`, (err) => {
      if (err) {
        console.error('Error creating annotation_classes table:', err.message);
      }
    });
    // Ensure ocr_results table exists (if it doesn’t)
    db.run(`CREATE TABLE IF NOT EXISTS ocr_results (
      image_location TEXT PRIMARY KEY,
      quad_boxes TEXT,
      labels TEXT
    )`, (err2) => {
      if (err2) {
        console.error('Error creating ocr_results table:', err2.message);
      }
    });
  }
});

// Endpoint → GET /api/images
// • Read every image file in high_res_images/
// • Look up matching row in ocr_results for quad_boxes & labels
// • Return JSON: [ { file: "images/xxx.jpg", annotations: [ {...}, ... ] }, … ]
app.get('/api/images', async (req, res) => {
  try {
    const imageDir = path.join(__dirname, 'high_res_images');
    let files;
    try {
      files = await fs.readdir(imageDir);
    } catch (err) {
      console.error('Error reading image directory:', err.message);
      return res.status(500).json({ error: 'Failed to read image directory' });
    }
    // Keep only jpg/png
    const imageFiles = files.filter(f => /\.(jpg|jpeg|png)$/i.test(f));

    // Fetch all OCR rows at once
    db.all('SELECT image_location, quad_boxes, labels FROM ocr_results', [], (err, rows) => {
      if (err) {
        console.error('DB query error:', err.message);
        return res.status(500).json({ error: `DB query error: ${err.message}` });
      }

      // Map each file → JSON result
      const images = imageFiles.map(file => {
        // image files sit in high_res_images/; in the DB we store "high_res_images/filename"
        const expectedDBpath = `high_res_images/${file}`;
        const dbRow = rows.find(r => r.image_location === expectedDBpath);
        let annotations = [];

        if (dbRow && dbRow.quad_boxes && dbRow.labels) {
          try {
            const quadBoxes = JSON.parse(dbRow.quad_boxes);
            const labels = JSON.parse(dbRow.labels);
            if (quadBoxes.length !== labels.length) {
              console.warn(`Mismatched quad_boxes vs labels length for ${file}`);
            }
            // Convert from 4‐point polygon to x,y,width,height
            annotations = quadBoxes.map((quad, i) => {
              const xs = quad.filter((_, idx) => idx % 2 === 0);
              const ys = quad.filter((_, idx) => idx % 2 === 1);
              const x = Math.min(...xs);
              const y = Math.min(...ys);
              const width = Math.max(...xs) - x;
              const height = Math.max(...ys) - y;
              return {
                id: `db_${i}_${file}`,
                x,
                y,
                width,
                height,
                label: labels[i] || 'No label',
                color: '#FF0000'
              };
            });
          } catch (parseErr) {
            console.error(`Error parsing JSON for ${file}:`, parseErr.message);
          }
        }

        return {
          file: `images/${file}`,    // The front-end will do `image.src = "/images/xxx"`
          annotations
        };
      });

      res.json(images);
    });

  } catch (error) {
    console.error('Server error:', error.message);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/classes  → return all classes (id,name,color)
app.get('/api/classes', (req, res) => {
  db.all('SELECT * FROM annotation_classes', [], (err, rows) => {
    if (err) {
      console.error('Error fetching classes:', err.message);
      return res.status(500).json({ error: 'Failed to fetch classes' });
    }
    res.json(rows);
  });
});

// POST /api/classes  → { name, color }  → insert into DB and return { id, name, color }
app.post('/api/classes', (req, res) => {
  const { name, color } = req.body;
  if (!name || !color) {
    return res.status(400).json({ error: 'Name and color are required' });
  }
  db.run(
    'INSERT INTO annotation_classes (name, color) VALUES (?, ?)',
    [name, color],
    function(err) {
      if (err) {
        console.error('Error saving class:', err.message);
        return res.status(500).json({ error: 'Failed to save class' });
      }
      res.json({ id: this.lastID, name, color });
    }
  );
});

// Finally, start listening:
app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});

