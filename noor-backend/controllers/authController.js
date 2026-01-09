const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const db = require('../config/db');

exports.login = async (req, res) => {
    // Check for email or identifier (which could be email or phone)
    const { email, password, identifier } = req.body;
    const loginId = identifier || email;

    if (!loginId || !password) {
        return res.status(400).json({ message: 'Email/Phone and password are required' });
    }

    try {
        // Check for default admin (Environment Variables)
        const defaultAdminEmail = process.env.ADMIN_EMAIL;
        const defaultAdminPassword = process.env.ADMIN_PASSWORD;
        const defaultAdminName = process.env.ADMIN_NAME || 'Administrator';

        if (defaultAdminEmail && defaultAdminPassword) {
            if (loginId === defaultAdminEmail && password === defaultAdminPassword) {
                const token = jwt.sign(
                    { id: 1, role: 'admin', name: defaultAdminName },
                    process.env.JWT_SECRET || 'fallback_secret',
                    { expiresIn: '8h' }
                );

                return res.json({
                    message: 'Login successful',
                    token,
                    user: {
                        id: 1,
                        name: defaultAdminName,
                        email: defaultAdminEmail,
                        role: 'admin'
                    }
                });
            }
        }

        // Check for default employee (Environment Variables) - Optional fallback
        const defaultEmployeeEmail = process.env.EMPLOYEE_EMAIL;
        const defaultEmployeePassword = process.env.EMPLOYEE_PASSWORD;

        if (defaultEmployeeEmail && defaultEmployeePassword) {
            if (loginId === defaultEmployeeEmail && password === defaultEmployeePassword) {
                // ... (Keep existing fallback logic if needed, but DB check is primary)
            }
        }

        // Check database for user check email OR phone
        const [rows] = await db.execute(
            'SELECT * FROM employees WHERE email = ? OR phone = ?',
            [loginId, loginId]
        );

        if (rows.length === 0) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        const user = rows[0];

        // Check Status
        if (user.status === 'Inactive') {
            return res.status(403).json({ message: 'Account is inactive. Please contact admin.' });
        }

        // Verify password
        let isMatch = false;
        if (user.password && user.password.startsWith('$2b$')) {
            isMatch = await bcrypt.compare(password, user.password);
        } else {
            isMatch = (password === user.password);
        }

        if (!isMatch) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        // Generate JWT with role
        const token = jwt.sign(
            { id: user.id, role: user.role, name: user.name },
            process.env.JWT_SECRET || 'fallback_secret',
            { expiresIn: '8h' }
        );

        res.json({
            message: 'Login successful',
            token,
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                phone: user.phone,
                role: user.role,
                status: user.status
            }
        });

    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};
