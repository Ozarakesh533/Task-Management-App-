const express = require('express');
const cors    = require('cors');
require('dotenv').config();

const app = express();
app.use(cors({
  origin: '*'
}));

app.use(express.json());

app.use('/api/users',    require('./routes/users'));
app.use('/api/projects', require('./routes/projects'));
app.use('/api/tasks',    require('./routes/tasks'));

app.get('/', (req, res) => res.json({ status: 'TaskFlow API running ✅' }));

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));