// GET all bookings - UPDATED to match your table structure
router.get("/", async (req, res) => {
    try {
        console.log("📊 Fetching bookings from bookings table...");
        
        // Fetch with correct column names
        const [rows] = await pool.query(`
            SELECT 
                id,
                sevakartha_name,
                department,
                seva_type,
                pooja_date,
                day,
                month,
                year,
                status,
                created_at
            FROM bookings 
            ORDER BY pooja_date ASC
        `);
        
        console.log(`✅ Found ${rows.length} bookings`);
        
        // Format dates properly
        const formatted = rows.map(item => {
            // Convert pooja_date to string format
            let poojaDateStr = null;
            if (item.pooja_date) {
                if (item.pooja_date instanceof Date) {
                    poojaDateStr = item.pooja_date.toISOString().split("T")[0];
                } else if (typeof item.pooja_date === 'string') {
                    poojaDateStr = item.pooja_date.split('T')[0];
                }
            }
            
            return {
                id: item.id,
                sevakartha_name: item.sevakartha_name,
                department: item.department,
                seva_type: item.seva_type,
                pooja_date: poojaDateStr,
                day: item.day,
                month: item.month,
                year: item.year,
                status: item.status || 'booked',
                created_at: item.created_at
            };
        });

        res.json({
            success: true,
            count: formatted.length,
            bookings: formatted,
            timestamp: new Date().toISOString()
        });
        
    } catch (err) {
        console.error("❌ Database Fetch Error:", err);
        console.error("❌ SQL Error:", err.sql);
        console.error("❌ Error details:", err.message);
        
        res.status(500).json({ 
            success: false,
            message: "Failed to load bookings",
            error: err.message,
            code: err.code
        });
    }
});
