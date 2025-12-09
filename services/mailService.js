import nodemailer from "nodemailer";
import dotenv from "dotenv";

dotenv.config();

// ✅ IMPROVED: Create transporter with better configuration
export const mailTransporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
        user: process.env.MAIL_USER,
        pass: process.env.MAIL_PASS
    },
    // Additional settings for better reliability
    pool: true, // Use connection pooling
    maxConnections: 5, // Max connections in pool
    maxMessages: 100, // Max messages per connection
    rateLimit: 10, // Max messages per second
    // Timeout settings
    connectionTimeout: 10000, // 10 seconds
    greetingTimeout: 10000,
    socketTimeout: 10000
});

// ✅ IMPROVED: Email sending function with better error handling
export async function sendReminderEmail(booking) {
    try {
        // Validate booking data
        if (!booking || !booking.pooja_date) {
            console.error("❌ Invalid booking data for email");
            return { success: false, error: "Invalid booking data" };
        }

        // Get receiver emails from environment
        const receivers = process.env.RECEIVER_EMAILS;
        
        if (!receivers) {
            console.error("❌ No receiver emails configured in environment variables");
            return { success: false, error: "No receiver emails configured" };
        }

        // Split by comma and trim whitespace
        const receiverEmails = receivers.split(",").map(email => email.trim());
        
        // Validate email format (basic check)
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        const validEmails = receiverEmails.filter(email => emailRegex.test(email));
        
        if (validEmails.length === 0) {
            console.error("❌ No valid email addresses found");
            return { success: false, error: "No valid email addresses" };
        }

        // Format date for display
        const poojaDate = new Date(booking.pooja_date);
        const formattedDate = poojaDate.toLocaleDateString('en-IN', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });

        // ✅ IMPROVED: Better email template
        const mailOptions = {
            from: {
                name: "Seva Booking System",
                address: process.env.MAIL_USER
            },
            to: validEmails,
            subject: `🔔 Reminder: ${booking.seva_type} Pooja Tomorrow (${formattedDate})`,
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 10px;">
                    <div style="text-align: center; background-color: #4CAF50; color: white; padding: 15px; border-radius: 10px 10px 0 0;">
                        <h1 style="margin: 0;">🛕 Pooja Reminder</h1>
                    </div>
                    
                    <div style="padding: 20px;">
                        <h2 style="color: #333;">Reminder: ${booking.seva_type} is scheduled for tomorrow!</h2>
                        
                        <div style="background-color: #f9f9f9; padding: 15px; border-radius: 5px; margin: 20px 0;">
                            <h3 style="color: #4CAF50; margin-top: 0;">📅 Booking Details:</h3>
                            <table style="width: 100%; border-collapse: collapse;">
                                <tr>
                                    <td style="padding: 8px; border-bottom: 1px solid #ddd;"><strong>👤 Sevakartha:</strong></td>
                                    <td style="padding: 8px; border-bottom: 1px solid #ddd;">${booking.sevakartha_name}</td>
                                </tr>
                                <tr>
                                    <td style="padding: 8px; border-bottom: 1px solid #ddd;"><strong>🏢 Department:</strong></td>
                                    <td style="padding: 8px; border-bottom: 1px solid #ddd;">${booking.department}</td>
                                </tr>
                                <tr>
                                    <td style="padding: 8px; border-bottom: 1px solid #ddd;"><strong>🛕 Seva Type:</strong></td>
                                    <td style="padding: 8px; border-bottom: 1px solid #ddd;">${booking.seva_type}</td>
                                </tr>
                                <tr>
                                    <td style="padding: 8px; border-bottom: 1px solid #ddd;"><strong>📅 Date:</strong></td>
                                    <td style="padding: 8px; border-bottom: 1px solid #ddd;">${formattedDate}</td>
                                </tr>
                            </table>
                        </div>
                        
                        <div style="background-color: #e8f4fc; padding: 15px; border-radius: 5px; margin: 20px 0;">
                            <h4 style="color: #2196F3; margin-top: 0;">📋 Important Notes:</h4>
                            <ul style="margin: 10px 0; padding-left: 20px;">
                                <li>Please arrive 15 minutes before the scheduled time</li>
                                <li>Bring the required pooja materials as per the seva type</li>
                                <li>Make necessary payment arrangements with the priest</li>
                            </ul>
                        </div>
                        
                        <p style="color: #666; font-size: 14px; text-align: center;">
                            This is an automated reminder from the Seva Booking System.<br>
                            Please do not reply to this email.
                        </p>
                    </div>
                    
                    <div style="text-align: center; background-color: #f1f1f1; padding: 15px; border-radius: 0 0 10px 10px; font-size: 12px; color: #777;">
                        <p>© ${new Date().getFullYear()} Seva Booking System. Department of ISE, GSSSIETW</p>
                    </div>
                </div>
            `,
            // Plain text version for email clients that don't support HTML
            text: `
                REMINDER: ${booking.seva_type} Pooja Tomorrow (${formattedDate})
                
                Booking Details:
                - Sevakartha: ${booking.sevakartha_name}
                - Department: ${booking.department}
                - Seva Type: ${booking.seva_type}
                - Date: ${formattedDate}
                
                Important Notes:
                • Please arrive 15 minutes before the scheduled time
                • Bring the required pooja materials
                • Make necessary payment arrangements
                
                This is an automated reminder from the Seva Booking System.
            `
        };

        // Send email
        const info = await mailTransporter.sendMail(mailOptions);
        
        console.log(`✅ Email sent successfully:`, {
            messageId: info.messageId,
            to: validEmails,
            subject: mailOptions.subject,
            timestamp: new Date().toISOString()
        });
        
        return { 
            success: true, 
            messageId: info.messageId,
            sentTo: validEmails
        };
        
    } catch (error) {
        console.error("❌ Failed to send email:", error);
        
        // Handle specific errors
        if (error.code === 'EAUTH') {
            console.error("Authentication failed. Check MAIL_USER and MAIL_PASS in .env file");
        } else if (error.code === 'EENVELOPE') {
            console.error("Invalid email addresses in RECEIVER_EMAILS");
        }
        
        return { 
            success: false, 
            error: error.message,
            code: error.code
        };
    }
}

// ✅ NEW: Function to send booking confirmation email to user
export async function sendBookingConfirmation(booking) {
    try {
        // You can add user's email to booking data
        if (!booking.email) {
            console.log("⚠️ No user email provided for confirmation");
            return { success: false, error: "No user email" };
        }

        const mailOptions = {
            from: {
                name: "Seva Booking System",
                address: process.env.MAIL_USER
            },
            to: booking.email,
            subject: `✅ Booking Confirmed: ${booking.seva_type} on ${booking.pooja_date}`,
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <h1 style="color: #4CAF50;">✅ Booking Confirmed!</h1>
                    <p>Your ${booking.seva_type} has been successfully booked.</p>
                    
                    <h3>Booking Details:</h3>
                    <ul>
                        <li><strong>Sevakartha:</strong> ${booking.sevakartha_name}</li>
                        <li><strong>Department:</strong> ${booking.department}</li>
                        <li><strong>Seva Type:</strong> ${booking.seva_type}</li>
                        <li><strong>Date:</strong> ${booking.pooja_date}</li>
                        <li><strong>Booking ID:</strong> ${booking.id || booking.booking_id}</li>
                    </ul>
                    
                    <p>Thank you for booking with us!</p>
                </div>
            `
        };

        const info = await mailTransporter.sendMail(mailOptions);
        console.log(`✅ Confirmation email sent to ${booking.email}`);
        
        return { success: true, messageId: info.messageId };
        
    } catch (error) {
        console.error("❌ Failed to send confirmation email:", error);
        return { success: false, error: error.message };
    }
}

// ✅ NEW: Function to verify transporter connection
export async function verifyEmailConnection() {
    return new Promise((resolve, reject) => {
        mailTransporter.verify((error, success) => {
            if (error) {
                console.error("❌ Email connection verification failed:", error);
                reject(error);
            } else {
                console.log("✅ Email server is ready to send messages");
                resolve(success);
            }
        });
    });
}
