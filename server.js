import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import bookingRoutes from './routes/bookingRoutes.js';

dotenv.config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// ✅ Root route
app.get('/', (req, res) => {
    res.json({
        message: '🚀 Seva Booking API is running!',
        version: '1.0.0',
        endpoints: {
            getAllBookings: 'GET   /api/bookings',
            createBooking: 'POST  /api/bookings/add',
            deleteBooking: 'DELETE /api/bookings/:id',
            healthCheck: 'GET   /health',
            debug: 'GET   /debug/db'  // Added debug endpoint
        },
        timestamp: new Date().toISOString()
    });
});

// ✅ Health check
app.get('/health', (req, res) => {
    res.json({
        status: 'healthy',
        server: 'Seva Booking Backend',
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
    });
});

// ✅ DEBUG: Test database connection
app.get('/debug/db', async (req, res) => {
    try {
        // Try to import db
        const poolModule = await import('./db.js');
        const pool = poolModule.default;
        
        // Test connection
        const [rows] = await pool.query('SELECT 1 as test');
        
        res.json({
            success: true,
            database: 'connected',
            test_result: rows,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('❌ Database debug error:', error);
        res.json({
            success: false,
            database: 'error',
            error: error.message,
            code: error.code,
            timestamp: new Date().toISOString()
        });
    }
});

// ✅ DEBUG: Test if bookingRoutes is loaded
app.get('/debug/routes', (req, res) => {
    try {
        // Check if bookingRoutes exists
        const routes = {
            bookingRoutes: typeof bookingRoutes,
            hasRouter: bookingRoutes && typeof bookingRoutes === 'function'
        };
        
        res.json({
            success: true,
            routes: routes,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        res.json({
            success: false,
            error: error.message
        });
    }
});

// Routes
app.use('/api/bookings', bookingRoutes);

const PORT = process.env.PORT || 8000;
app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`📡 URL: https://seva-booking-system.onrender.com`);
    console.log(`🔍 Debug endpoints:`);
    console.log(`   - https://seva-booking-system.onrender.com/debug/db`);
    console.log(`   - https://seva-booking-system.onrender.com/debug/routes`);
});
