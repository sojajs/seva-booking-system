import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

// ✅ Make sure this import matches your file structure
import bookingRoutes from './routes/bookingRoutes.js';  // If file is in routes folder
// OR
import bookingRoutes from './bookingRoutes.js';  // If file is in same folder

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/bookings', bookingRoutes);

// ... rest of your code
