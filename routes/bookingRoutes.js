import express from "express";
import pool from "../db.js";

const router = express.Router();

// Debug middleware
router.use((req, res, next) => {
    console.log(`📨 ${req.method} ${req.path}`);
    next();
});

// GET all bookings
router.get("/", async (req, res) => {
    try {
        console.log("📊 Attempting to fetch bookings from database...");
        
        // Test database connection first
        const [connectionTest] = await pool.query("SELECT 1 as test");
        console.log("✅ Database connection test:", connectionTest);
        
        // Fetch bookings
        const [rows] = await pool.query("SELECT * FROM bookings ORDER BY pooja_date ASC");
        console.log(`✅ Found ${rows.length} bookings`);
        
        // Format dates
        const formatted = rows.map(item => ({
            ...item,
            pooja_date: item.pooja_date ? item.pooja_date.toISOString().split("T")[0] : null
        }));

        res.json({
            success: true,
            count: formatted.length,
            bookings: formatted,
            timestamp: new Date().toISOString()
        });
        
    } catch (err) {
        console.error("❌ Database Fetch Error:", err);
        console.error("❌ Error code:", err.code);
        console.error("❌ Error message:", err.message);
        
        // Send more detailed error
        res.status(500).json({ 
            success: false,
            message: "Failed to load bookings",
            error: err.message,
            code: err.code,
            hint: "Check if 'bookings' table exists in database"
        });
    }
});

// ADD new booking
router.post("/add", async (req, res) => {
    try {
        console.log("📝 New booking request:", req.body);
        
        const { sevakartha_name, department, seva_type, pooja_date } = req.body;

        // Validation
        if (!sevakartha_name || !department || !seva_type || !pooja_date) {
            return res.status(400).json({
                success: false,
                error: "All fields are required"
            });
        }

        // Parse date in UTC
        const poojaDateUTC = new Date(pooja_date + 'T00:00:00Z');
        
        if (isNaN(poojaDateUTC.getTime())) {
            return res.status(400).json({
                success: false,
                error: "Invalid date format. Use YYYY-MM-DD"
            });
        }

        // Get today in UTC
        const now = new Date();
        const todayUTC = new Date(Date.UTC(
            now.getUTCFullYear(),
            now.getUTCMonth(),
            now.getUTCDate()
        ));

        // Calculate 3 days before (EXACT rule)
        const requiredBookingDate = new Date(poojaDateUTC);
        requiredBookingDate.setUTCDate(poojaDateUTC.getUTCDate() - 3);

        console.log("📅 Date check:", {
            pooja_date,
            today: todayUTC.toISOString().split('T')[0],
            required: requiredBookingDate.toISOString().split('T')[0],
            isMatch: todayUTC.getTime() === requiredBookingDate.getTime()
        });

        // EXACT 3-day rule
        if (todayUTC.getTime() !== requiredBookingDate.getTime()) {
            const allowedDate = requiredBookingDate.toISOString().split('T')[0];
            return res.status(400).json({
                success: false,
                error: "❌ Booking is ONLY allowed exactly 3 days before the Pooja date",
                details: {
                    pooja_date: pooja_date,
                    today: todayUTC.toISOString().split('T')[0],
                    allowed_booking_date: allowedDate
                }
            });
        }

        // Check for existing booking
        const [existing] = await pool.query(
            "SELECT id, sevakartha_name FROM bookings WHERE pooja_date = ?",
            [pooja_date]
        );

        if (existing.length > 0) {
            return res.status(409).json({
                success: false,
                error: "❌ This date is already booked!",
                booked_by: existing[0].sevakartha_name
            });
        }

        // Insert booking
        const day = poojaDateUTC.getUTCDate();
        const month = poojaDateUTC.getUTCMonth() + 1;
        const year = poojaDateUTC.getUTCFullYear();

        const [result] = await pool.query(
            `INSERT INTO bookings 
             (sevakartha_name, department, seva_type, pooja_date, day, month, year, status, created_at) 
             VALUES (?, ?, ?, ?, ?, ?, ?, 'confirmed', UTC_TIMESTAMP())`,
            [sevakartha_name, department, seva_type, pooja_date, day, month, year]
        );

        console.log("✅ Booking saved with ID:", result.insertId);

        res.json({ 
            success: true,
            message: "✅ Seva booked successfully!",
            booking_id: result.insertId,
            booking: {
                id: result.insertId,
                sevakartha_name,
                department,
                seva_type,
                pooja_date: pooja_date,
                status: 'confirmed'
            }
        });

    } catch (err) {
        console.error("❌ Save error:", err);
        res.status(500).json({ 
            success: false,
            error: "Database error",
            details: err.message,
            code: err.code
        });
    }
});

// DELETE booking
router.delete("/:id", async (req, res) => {
    const { id } = req.params;
    console.log(`🗑️ Delete request for booking ID: ${id}`);

    try {
        const [result] = await pool.query("DELETE FROM bookings WHERE id = ?", [id]);
        
        if (result.affectedRows === 0) {
            return res.status(404).json({
                success: false,
                error: "Booking not found"
            });
        }
        
        console.log(`✅ Deleted ${result.affectedRows} booking(s)`);
        
        res.json({ 
            success: true,
            message: "✅ Booking deleted successfully",
            deleted_id: id
        });
    } catch (err) {
        console.error("❌ Delete Error:", err);
        res.status(500).json({ 
            success: false,
            error: "Failed to delete booking",
            details: err.message
        });
    }
});

// Health check for bookings route
router.get("/health", async (req, res) => {
    try {
        const [result] = await pool.query("SELECT COUNT(*) as count FROM bookings");
        res.json({
            success: true,
            database: "connected",
            table: "bookings",
            total_bookings: result[0].count,
            timestamp: new Date().toISOString()
        });
    } catch (err) {
        res.status(500).json({
            success: false,
            database: "disconnected",
            error: err.message
        });
    }
});

export default router;
