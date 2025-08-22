const nodemailer = require('nodemailer');

// Test email credentials and provide detailed feedback
const testEmailCredentials = async () => {
    console.log('🔍 Testing email credentials...');
    console.log(`📧 EMAIL_USER: ${process.env.EMAIL_USER ? '✅ Set' : '❌ Not set'}`);
    console.log(`🔐 EMAIL_PASS: ${process.env.EMAIL_PASS ? '✅ Set (' + process.env.EMAIL_PASS.length + ' chars)' : '❌ Not set'}`);

    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
        console.error('❌ Email credentials missing in environment variables');
        return false;
    }

    // Try multiple transporter configurations
    const configs = [
        {
            name: 'Gmail with App Password (Recommended)',
            config: {
                service: 'gmail',
                auth: {
                    user: process.env.EMAIL_USER,
                    pass: process.env.EMAIL_PASS
                }
            }
        },
        {
            name: 'Gmail SMTP Direct',
            config: {
                host: 'smtp.gmail.com',
                port: 587,
                secure: false,
                auth: {
                    user: process.env.EMAIL_USER,
                    pass: process.env.EMAIL_PASS
                },
                tls: {
                    rejectUnauthorized: false
                }
            }
        },
        {
            name: 'Gmail SMTP SSL',
            config: {
                host: 'smtp.gmail.com',
                port: 465,
                secure: true,
                auth: {
                    user: process.env.EMAIL_USER,
                    pass: process.env.EMAIL_PASS
                }
            }
        }
    ];

    for (const { name, config } of configs) {
        try {
            console.log(`🧪 Trying: ${name}`);
            const transporter = nodemailer.createTransport(config);
            await transporter.verify();
            console.log(`✅ Success with: ${name}`);
            return { success: true, config };
        } catch (error) {
            console.log(`❌ Failed with: ${name} - ${error.message}`);
        }
    }

    console.error('❌ All email configurations failed');
    console.error('💡 Solutions:');
    console.error('   1. Use Gmail App Password (not regular password)');
    console.error('   2. Enable 2-Step Verification: https://myaccount.google.com/security');
    console.error('   3. Generate App Password: https://myaccount.google.com/apppasswords');
    console.error('   4. Make sure "Less secure app access" is disabled (use App Password instead)');

    return { success: false };
};

// Create transporter with working configuration
const createTransporter = async () => {
    const testResult = await testEmailCredentials();
    if (!testResult.success) {
        throw new Error('No working email configuration found');
    }
    return nodemailer.createTransport(testResult.config);
};

const generateVerificationCode = () => {
    return Math.floor(100000 + Math.random() * 900000).toString();
};

const sendVerificationEmail = async (email, code) => {
    try {
        console.log(`📧 Attempting to send verification email to: ${email}`);

        const transporter = await createTransporter();

        const mailOptions = {
            from: {
                name: 'ChatCore',
                address: process.env.EMAIL_USER
            },
            to: email,
            subject: `Your ChatCore verification code: ${code}`,
            text: `
Welcome to ChatCore!

Your verification code is: ${code}

This code will expire in 10 minutes.

If you didn't request this code, you can safely ignore this email.

Best regards,
ChatCore Team
            `,
            html: `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>ChatCore - Email Verification</title>
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif;">
    <table width="100%" cellpadding="0" cellspacing="0" border="0">
        <tr>
            <td align="center">
                <!-- Main Email Container -->
                <table width="600" cellpadding="0" cellspacing="0" border="0" style="background-color: #ffffff; margin: 0 auto;">
                    
                    <!-- Header -->
                    <tr>
                        <td style="background-color: #10b981; padding: 40px 20px; text-align: center;">
                            <h1 style="color: #ffffff; font-size: 32px; margin: 0; font-weight: bold;">💬 ChatCore</h1>
                            <p style="color: #ffffff; font-size: 16px; margin: 10px 0 0 0;">Secure messaging for everyone</p>
                        </td>
                    </tr>
                    
                    <!-- Main Content -->
                    <tr>
                        <td style="padding: 40px 20px;">
                            <!-- Welcome -->
                            <h2 style="color: #333333; font-size: 24px; margin: 0 0 20px 0; text-align: center;">Welcome to ChatCore!</h2>
                            <p style="color: #666666; font-size: 16px; line-height: 1.5; margin: 0 0 30px 0; text-align: center;">
                                You're just one step away from joining our secure messaging platform.<br>
                                Enter the verification code below to complete your registration.
                            </p>
                            
                            <!-- Verification Code Box -->
                            <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin: 30px 0;">
                                <tr>
                                    <td style="background-color: #f0fdf4; border: 2px solid #10b981; padding: 30px 20px; text-align: center;">
                                        <p style="color: #10b981; font-size: 12px; font-weight: bold; margin: 0 0 15px 0; text-transform: uppercase; letter-spacing: 2px;">VERIFICATION CODE</p>
                                        <h1 style="background-color: #ffffff; color: #10b981; font-size: 36px; font-weight: bold; margin: 0; padding: 20px; letter-spacing: 4px; font-family: 'Courier New', monospace;">${code}</h1>
                                        <p style="color: #666666; font-size: 14px; margin: 15px 0 0 0;">Enter this code in the ChatCore app to verify your email</p>
                                    </td>
                                </tr>
                            </table>
                            
                            <!-- Important Information -->
                            <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin: 30px 0;">
                                <tr>
                                    <td style="background-color: #f8f9fa; padding: 20px; border-left: 4px solid #10b981;">
                                        <p style="color: #333333; font-size: 14px; font-weight: bold; margin: 0 0 5px 0;">⏰ Code expires in 10 minutes</p>
                                        <p style="color: #666666; font-size: 12px; margin: 0;">Make sure to enter the code before it expires</p>
                                    </td>
                                </tr>
                            </table>
                            
                            <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin: 15px 0;">
                                <tr>
                                    <td style="background-color: #f8f9fa; padding: 20px; border-left: 4px solid #10b981;">
                                        <p style="color: #333333; font-size: 14px; font-weight: bold; margin: 0 0 5px 0;">🔒 Keep your code private</p>
                                        <p style="color: #666666; font-size: 12px; margin: 0;">Never share this code with anyone for security reasons</p>
                                    </td>
                                </tr>
                            </table>
                            
                            <!-- CTA Button -->
                            <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin: 40px 0;">
                                <tr>
                                    <td align="center">
                                        <table cellpadding="0" cellspacing="0" border="0">
                                            <tr>
                                                <td style="background-color: #10b981; padding: 15px 30px;">
                                                    <a href="http://localhost:5173/" style="color: #ffffff; text-decoration: none; font-weight: bold; font-size: 16px;">Return to ChatCore</a>
                                                </td>
                                            </tr>
                                        </table>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                    
                    <!-- Footer -->
                    <tr>
                        <td style="background-color: #f8f9fa; padding: 20px; text-align: center; border-top: 1px solid #e5e5e5;">
                            <p style="color: #666666; font-size: 12px; margin: 0 0 5px 0;">
                                This email was sent to verify your ChatCore account.<br>
                                If you didn't request this verification, you can safely ignore this email.
                            </p>
                            <p style="color: #999999; font-size: 10px; margin: 0;">
                                © 2025 ChatCore. All rights reserved.
                            </p>
                        </td>
                    </tr>
                    
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
            `
        };

        const info = await transporter.sendMail(mailOptions);
        console.log(`✅ Email sent successfully!`);
        console.log(`📧 Message ID: ${info.messageId}`);
        console.log(`📬 Accepted: ${info.accepted.join(', ')}`);

        if (info.rejected && info.rejected.length > 0) {
            console.log(`📭 Rejected: ${info.rejected.join(', ')}`);
        }

        return true;

    } catch (error) {
        console.error('❌ Email sending failed:', error);

        // Detailed error analysis
        if (error.code === 'EAUTH') {
            console.error('🔐 Authentication Error Solutions:');
            console.error('   ❌ You are likely using your regular Gmail password');
            console.error('   ✅ You need to use a Gmail App Password instead');
            console.error('   🔗 Setup guide: https://support.google.com/accounts/answer/185833');
        } else if (error.code === 'ENOTFOUND') {
            console.error('🌐 DNS/Network Error - Check internet connection');
        } else if (error.code === 'ETIMEDOUT') {
            console.error('⏰ Connection timeout - Try again');
        } else if (error.code === 'ECONNECTION') {
            console.error('🔌 Connection refused - Check SMTP settings');
        } else {
            console.error('🔍 Unknown error:', error.message);
        }

        return false;
    }
};

module.exports = {
    generateVerificationCode,
    sendVerificationEmail,
    testEmailCredentials
};