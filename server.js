import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import bookingRoutes from './routes/bookingRoutes.js';

dotenv.config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// ✅ ADD THIS: Root route
app.get('/', (req, res) => {
    res.json({
        message: '🚀 Seva Booking API is running!',
        version: '1.0.0',
        endpoints: {
            getAllBookings: 'GET   /api/bookings',
            createBooking: 'POST  /api/bookings/add',
            deleteBooking: 'DELETE /api/bookings/:id',
            healthCheck: 'GET   /health'
        },
        docs: 'Visit /api/bookings to see all bookings',
        timestamp: new Date().toISOString()
    });
});

// ✅ ADD THIS: Health check endpoint
app.get('/health', (req, res) => {
    res.json({
        status: 'healthy',
        server: 'Seva Booking Backend',
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
    });
});

// Routes
app.use('/api/bookings', bookingRoutes);

const PORT = process.env.PORT || 8000;
app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`📡 URL: https://seva-booking-system.onrender.com`);
});
