const express = require('express');
const axios = require('axios');
const { exec } = require('child_process');
const path = require('path');
const app = express();
const port = 3000;

app.use(express.json());

app.use(express.static(path.join(__dirname, 'static')));

app.get('/check', async (req, res) => {
  const targetURL = req.query.url;

  if (!targetURL) {
    return res.status(400).json({ error: 'URL parameter is required.' });
  }

  try {
    const response = await axios.get(targetURL);

    if (response.status === 200) {
      res.status(200).json({ message: 'URL is reachable.' });
    } else {
      res.status(400).json({ error: `HTTP status code ${response.status}` });
    }
  } catch (error) {
    console.error(`Error: ${error.message}`);
    res.status(400).json({ error: 'URL is unreachable or timed out.' });
  }
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
