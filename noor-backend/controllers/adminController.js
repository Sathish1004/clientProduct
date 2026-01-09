const db = require('../config/db');

exports.getDashboardStats = async (req, res) => {
    try {
        // Mock data for dashboard stats
        // In production, these would be real database queries
        const stats = {
            totalSites: 12,
            ongoingProjects: 5,
            completedProjects: 8,
            delayedTasks: 2,
            totalExpenses: 45000,
            recentActivities: [
                { id: 1, action: 'Site Survey Completed', site: 'Project Alpha', user: 'Ali Khan', time: '2 hours ago' },
                { id: 2, action: 'Material Request Approved', site: 'Project Beta', user: 'Sara Ahmed', time: '5 hours ago' },
                { id: 3, action: 'Stage Updated', site: 'Project Gamma', user: 'Rahul Singh', time: '1 day ago' }
            ],
            projectSummary: {
                pending: 3,
                inProgress: 5,
                completed: 8,
                delayed: 2
            }
        };

        // Example real queries (uncomment when database schema is ready):
        /*
        const [sites] = await db.query('SELECT COUNT(*) as count FROM sites');
        const [ongoingProjects] = await db.query('SELECT COUNT(*) as count FROM projects WHERE status = "in_progress"');
        const [completedProjects] = await db.query('SELECT COUNT(*) as count FROM projects WHERE status = "completed"');
        const [delayedTasks] = await db.query('SELECT COUNT(*) as count FROM tasks WHERE status = "delayed"');
        const [expenses] = await db.query('SELECT SUM(amount) as total FROM expenses');
        
        stats.totalSites = sites[0].count;
        stats.ongoingProjects = ongoingProjects[0].count;
        stats.completedProjects = completedProjects[0].count;
        stats.delayedTasks = delayedTasks[0].count;
        stats.totalExpenses = expenses[0].total || 0;
        */

        res.json(stats);

    } catch (error) {
        console.error('Dashboard stats error:', error);
        // Return mock data even on error for development
        res.json({
            totalSites: 12,
            ongoingProjects: 5,
            completedProjects: 8,
            delayedTasks: 2,
            totalExpenses: 45000
        });
    }
};
