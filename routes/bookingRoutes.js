import express from "express";
import pool from "../db.js";

const router = express.Router();

// GET all bookings (clean date format)
router.get("/", async (req, res) => {
    try {
        const [rows] = await pool.query("SELECT * FROM bookings ORDER BY pooja_date ASC");

        const formatted = rows.map(item => ({
            ...item,
            pooja_date: item.pooja_date.toISOString().split("T")[0] // return YYYY-MM-DD
        }));

        res.json(formatted);
    } catch (err) {
        console.error("❌ Fetch Error:", err);
        res.status(500).json({ message: "Failed to load bookings" });
    }
});

// ADD new booking - EXACT 3-day rule with UTC timezone
router.post("/add", async (req, res) => {
    try {
        const { sevakartha_name, department, seva_type, pooja_date } = req.body;

        // Validate required fields
        if (!sevakartha_name || !department || !seva_type || !pooja_date) {
            return res.status(400).json({
                error: "All fields are required"
            });
        }

        // 1. Parse pooja date in UTC
        const poojaDateUTC = new Date(pooja_date + 'T00:00:00Z');
        
        // Check if valid date
        if (isNaN(poojaDateUTC.getTime())) {
            return res.status(400).json({
                error: "Invalid date format. Use YYYY-MM-DD"
            });
        }

        // 2. Get today's date in UTC (server time)
        const now = new Date();
        const todayUTC = new Date(Date.UTC(
            now.getUTCFullYear(),
            now.getUTCMonth(),
            now.getUTCDate()
        ));

        // 3. Calculate EXACTLY 3 days before pooja date in UTC
        const requiredBookingDate = new Date(poojaDateUTC);
        requiredBookingDate.setUTCDate(poojaDateUTC.getUTCDate() - 3);

        console.log("📅 DATE DEBUG:", {
            received_pooja_date: pooja_date,
            poojaDateUTC: poojaDateUTC.toISOString(),
            todayUTC: todayUTC.toISOString(),
            requiredBookingDateUTC: requiredBookingDate.toISOString(),
            todayTimestamp: todayUTC.getTime(),
            requiredTimestamp: requiredBookingDate.getTime(),
            isMatch: todayUTC.getTime() === requiredBookingDate.getTime()
        });

        // 4. EXACT 3-day rule check
        if (todayUTC.getTime() !== requiredBookingDate.getTime()) {
            const allowedDateStr = requiredBookingDate.toISOString().split('T')[0];
            const todayStr = todayUTC.toISOString().split('T')[0];
            
            return res.status(400).json({
                error: "❌ Booking is ONLY allowed exactly 3 days before the Pooja date",
                details: {
                    pooja_date: pooja_date,
                    today: todayStr,
                    allowed_booking_date: allowedDateStr,
                    message: `For pooja on ${pooja_date}, you can only book on ${allowedDateStr}`
                },
                rule: "Book exactly 3 days before the pooja date"
            });
        }

        // 5. Check if pooja date is not in the past
        if (poojaDateUTC < todayUTC) {
            return res.status(400).json({
                error: "❌ Cannot book for past dates"
            });
        }

        // 6. Prevent duplicate booking for same date
        const [existing] = await pool.query(
            "SELECT id, sevakartha_name FROM bookings WHERE pooja_date = ?",
            [pooja_date]
        );

        if (existing.length > 0) {
            return res.status(409).json({
                error: "❌ This date is already booked!",
                booked_by: existing[0].sevakartha_name || "another user"
            });
        }

        // 7. Get date parts for calendar
        const day = poojaDateUTC.getUTCDate();
        const month = poojaDateUTC.getUTCMonth() + 1;
        const year = poojaDateUTC.getUTCFullYear();

        // 8. Insert booking into database
        const [result] = await pool.query(
            `INSERT INTO bookings 
             (sevakartha_name, department, seva_type, pooja_date, day, month, year, status, created_at) 
             VALUES (?, ?, ?, ?, ?, ?, ?, 'confirmed', UTC_TIMESTAMP())`,
            [sevakartha_name, department, seva_type, pooja_date, day, month, year]
        );

        console.log("✅ Booking saved:", {
            id: result.insertId,
            name: sevakartha_name,
            pooja_date: pooja_date
        });

        // 9. Return success response
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
                status: 'confirmed',
                booking_date: requiredBookingDate.toISOString().split('T')[0]
            }
        });

    } catch (err) {
        console.error("❌ Save error:", err);
        
        // Check for specific MySQL errors
        if (err.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({
                error: "Duplicate entry detected"
            });
        }
        
        res.status(500).json({ 
            error: "Database error occurred",
            details: err.message 
        });
    }
});

// DELETE booking
router.delete("/:id", async (req, res) => {
    const { id } = req.params;

    try {
        // Check if booking exists
        const [existing] = await pool.query(
            "SELECT id FROM bookings WHERE id = ?",
            [id]
        );

        if (existing.length === 0) {
            return res.status(404).json({
                error: "Booking not found"
            });
        }

        // Delete booking
        await pool.query("DELETE FROM bookings WHERE id = ?", [id]);
        
        console.log("🗑️ Booking deleted:", id);
        
        res.json({ 
            success: true,
            message: "✅ Booking deleted successfully" 
        });
    } catch (err) {
        console.error("❌ Delete Error:", err);
        res.status(500).json({ 
            error: "Failed to delete booking",
            details: err.message 
        });
    }
});

// GET booking by ID
router.get("/:id", async (req, res) => {
    const { id } = req.params;

    try {
        const [rows] = await pool.query(
            "SELECT * FROM bookings WHERE id = ?",
            [id]
        );

        if (rows.length === 0) {
            return res.status(404).json({
                error: "Booking not found"
            });
        }

        const booking = rows[0];
        booking.pooja_date = booking.pooja_date.toISOString().split("T")[0];
        
        res.json(booking);
    } catch (err) {
        console.error("❌ Fetch by ID Error:", err);
        res.status(500).json({ 
            error: "Failed to fetch booking" 
        });
    }
});

// Debug endpoint to check current dates
router.get("/debug/dates", (req, res) => {
    const now = new Date();
    const todayUTC = new Date(Date.UTC(
        now.getUTCFullYear(),
        now.getUTCMonth(),
        now.getUTCDate()
    ));
    
    // Example: Check for pooja 3 days from now
    const examplePoojaDate = new Date(todayUTC);
    examplePoojaDate.setUTCDate(todayUTC.getUTCDate() + 3);
    
    const allowedBookingDate = new Date(examplePoojaDate);
    allowedBookingDate.setUTCDate(examplePoojaDate.getUTCDate() - 3);
    
    res.json({
        server_time: now.toISOString(),
        utc_date: todayUTC.toISOString().split('T')[0],
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        example: {
            today: todayUTC.toISOString().split('T')[0],
            pooja_in_3_days: examplePoojaDate.toISOString().split('T')[0],
            allowed_booking_date: allowedBookingDate.toISOString().split('T')[0],
            can_book_today: todayUTC.getTime() === allowedBookingDate.getTime()
        },
        rule: "Book exactly 3 days before pooja date (using UTC timezone)"
    });
});

export default router;
