const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { verifyToken, isAdmin } = require('../middleware/authMiddleware');

router.get('/dashboard-stats', verifyToken, isAdmin, adminController.getDashboardStats);

module.exports = router;
