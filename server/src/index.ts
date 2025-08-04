import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { fetchAndStoreContests } from './utils/fetchContests';
import contestRoutes from './routes/contestRoutes';
import authRoutes from './routes/authRoutes';
import userRoutes from './routes/userRoutes';
import profileRoutes from './routes/profileRoutes';


dotenv.config();
const app = express();

app.use(cors());
app.use(express.json());

// this will fetch contest details 
fetchAndStoreContests();
app.use('/api/contests', contestRoutes);

app.use('/api/auth', authRoutes);

app.use('/api/user', userRoutes);

app.use('/api/profile', profileRoutes);


app.get('/', (req, res) => {
  res.send('CPTrack backend is running ✅');
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});


