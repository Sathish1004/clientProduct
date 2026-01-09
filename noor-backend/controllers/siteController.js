// Site Controller - Enhanced with Phases
const db = require('../config/db');
const bcrypt = require('bcrypt'); // Added for password hashing

// Helper to Create Notification
const createNotification = async (projectId, phaseId, taskId, employeeId, type, message) => {
    try {
        console.log(`Creating notification: ${type} - ${message}`);
        await db.query(`
            INSERT INTO notifications (project_id, phase_id, task_id, employee_id, type, message, is_read, created_at)
            VALUES (?, ?, ?, ?, ?, ?, 0, NOW())
        `, [projectId, phaseId || null, taskId || null, employeeId, type, message]);
    } catch (error) {
        console.error('Error creating notification:', error);
    }
};

// Default construction phases
const DEFAULT_PHASES = [
    { name: 'Planning & Site Preparation', order_num: 1 },
    { name: 'Foundation', order_num: 2 },
    { name: 'Structure', order_num: 3 },
    { name: 'Finishing', order_num: 4 }
];

// Helper to ensure YYYY-MM-DD format for MySQL
const ensureIsoDate = (dateStr) => {
    if (!dateStr || dateStr === 'null' || dateStr === '') return null;
    // If it's already in YYYY-MM-DD format, return it
    if (/^\d{4}-\d{2}-\d{2}/.test(dateStr)) return dateStr.split('T')[0];
    // If it's in DD/MM/YYYY format, convert it
    if (dateStr.includes('/')) {
        const parts = dateStr.split('/');
        if (parts.length === 3) {
            const [d, m, y] = parts;
            return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
        }
    }
    return dateStr;
};

// Helper: Get Assignments for a Task
// Returns array of employee objects
const getTaskAssignments = async (taskId) => {
    const [assignments] = await db.query(`
        SELECT e.id, e.name, e.email, e.role
        FROM task_assignments ta
        JOIN employees e ON ta.employee_id = e.id
        WHERE ta.task_id = ?
    `, [taskId]);
    return assignments;
};

// Get all sites with phases (Admin)
exports.getAllSites = async (req, res) => {
    try {
        const [sites] = await db.query(`
            SELECT s.*, 
                   (SELECT COUNT(*) FROM phases WHERE site_id = s.id) as phase_count,
                   (SELECT COUNT(*) FROM tasks WHERE site_id = s.id) as task_count
            FROM sites s
            ORDER BY s.created_at DESC
        `);
        res.json({ sites });
    } catch (error) {
        console.error('Error fetching sites:', error);
        res.status(500).json({ message: 'Error fetching sites' });
    }
};

// Create new site with default phases and template tasks (Admin)
exports.createSite = async (req, res) => {
    try {
        const {
            name, location, startDate, endDate, duration,
            budget, clientName, clientEmail, clientPhone,
            clientCompany, city, state, country,
            assignedEmployees
        } = req.body;

        // Insert site
        const isoStartDate = ensureIsoDate(startDate);
        const isoEndDate = ensureIsoDate(endDate);

        const [result] = await db.query(
            `INSERT INTO sites (
                name, location, start_date, end_date, duration, 
                budget, client_name, client_email, client_phone, 
                client_company, city, state, country
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                name, location, isoStartDate, isoEndDate, duration || null,
                budget || 0, clientName || null, clientEmail || null, clientPhone || null,
                clientCompany || null, city || null, state || null, country || null
            ]
        );

        const siteId = result.insertId;

        // Fetch all templates
        const [templates] = await db.query('SELECT * FROM task_templates ORDER BY order_num');

        // Group templates by phase_name to create phases first
        const phaseMap = new Map(); // phase_name -> phase_id

        for (const template of templates) {
            if (!phaseMap.has(template.phase_name)) {
                const [phaseResult] = await db.query(
                    'INSERT INTO phases (site_id, name, order_num) VALUES (?, ?, ?)',
                    [siteId, template.phase_name, phaseMap.size + 1]
                );
                phaseMap.set(template.phase_name, phaseResult.insertId);
            }

            // Create task linked to phase
            await db.query(
                `INSERT INTO tasks (site_id, phase_id, name, status) 
                 VALUES (?, ?, ?, 'Not Started')`,
                [siteId, phaseMap.get(template.phase_name), template.task_name]
            );
        }

        // Assign employees to site
        if (assignedEmployees && assignedEmployees.length > 0) {
            const assignments = assignedEmployees.map(empId => [siteId, empId]);
            await db.query('INSERT INTO site_assignments (site_id, employee_id) VALUES ?', [assignments]);
        }

        res.status(201).json({
            message: 'Site created with predefined tasks',
            site: {
                id: siteId, name, location, startDate, endDate, budget,
                clientName, clientEmail, clientPhone, status: 'active'
            }
        });
    } catch (error) {
        console.error('Error creating site:', error);
        res.status(500).json({ message: 'Error creating site' });
    }
};

// Get site with phases (Admin)
exports.getSiteWithPhases = async (req, res) => {
    try {
        const { id } = req.params;

        const [sites] = await db.query('SELECT * FROM sites WHERE id = ?', [id]);
        if (sites.length === 0) {
            return res.status(404).json({ message: 'Site not found' });
        }

        const [phases] = await db.query(`
            SELECT p.*, e.name as assigned_employee_name
            FROM phases p
            LEFT JOIN employees e ON p.assigned_to = e.id
            WHERE p.site_id = ?
            ORDER BY p.order_num
        `, [id]);

        const [tasks] = await db.query(`
            SELECT t.*, 
                   e.name as employee_name, 
                   p.name as phase_name,
                   (
                       SELECT JSON_ARRAYAGG(
                           JSON_OBJECT(
                               'id', emp.id, 
                               'name', emp.name, 
                               'role', emp.role
                           )
                       )
                       FROM task_assignments ta
                       JOIN employees emp ON ta.employee_id = emp.id
                       WHERE ta.task_id = t.id
                   ) as assignments
            FROM tasks t
            LEFT JOIN employees e ON t.employee_id = e.id
            LEFT JOIN phases p ON t.phase_id = p.id
            WHERE t.site_id = ?
            ORDER BY t.created_at DESC
        `, [id]);

        res.json({ site: sites[0], phases, tasks });
    } catch (error) {
        console.error('Error fetching site:', error);
        res.status(500).json({ message: 'Error fetching site' });
    }
};

// Get phases for a site
exports.getPhases = async (req, res) => {
    try {
        const { siteId } = req.params;
        const [phases] = await db.query(
            'SELECT * FROM phases WHERE site_id = ? ORDER BY order_num', [siteId]
        );
        res.json({ phases });
    } catch (error) {
        console.error('Error fetching phases:', error);
        res.status(500).json({ message: 'Error fetching phases' });
    }
};

// Helper to re-index all phases for a site to be strictly sequential
const reindexPhases = async (siteId) => {
    const [phases] = await db.query(
        'SELECT id FROM phases WHERE site_id = ? ORDER BY order_num ASC',
        [siteId]
    );

    for (let i = 0; i < phases.length; i++) {
        await db.query('UPDATE phases SET order_num = ? WHERE id = ?', [i + 1, phases[i].id]);
    }
};

// Add custom phase with insertion logic
exports.addPhase = async (req, res) => {
    try {
        const { siteId, name, orderNum } = req.body;
        const requestedOrder = parseInt(orderNum) || 1;

        // 1. Shift existing phases
        await db.query(
            'UPDATE phases SET order_num = order_num + 1 WHERE site_id = ? AND order_num >= ?',
            [siteId, requestedOrder]
        );

        // 2. Insert new phase
        await db.query(
            'INSERT INTO phases (site_id, name, order_num) VALUES (?, ?, ?)',
            [siteId, name, requestedOrder]
        );

        // 3. Re-index to ensure continuous sequence (case where orderNum was too high)
        await reindexPhases(siteId);

        res.status(201).json({ message: 'Stage added and re-indexed' });
    } catch (error) {
        console.error('Error adding phase:', error);
        res.status(500).json({ message: 'Error adding phase' });
    }
};

// Update Phase
exports.updatePhase = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, order_num } = req.body;

        await db.query(
            'UPDATE phases SET name = ?, order_num = ? WHERE id = ?',
            [name, order_num, id]
        );

        res.json({ message: 'Phase updated successfully' });
    } catch (error) {
        console.error('Error updating phase:', error);
        res.status(500).json({ message: 'Error updating phase' });
    }
};

// Delete phase with re-indexing
exports.deletePhase = async (req, res) => {
    try {
        const { id } = req.params;
        const isAdmin = req.user.role === 'Admin' || req.user.role === 'admin';

        if (!isAdmin) {
            return res.status(403).json({ message: 'Only admin can delete phases' });
        }

        // Get site_id before deletion for re-indexing
        const [phase] = await db.query('SELECT site_id FROM phases WHERE id = ?', [id]);
        if (phase.length === 0) {
            return res.status(404).json({ message: 'Phase not found' });
        }
        const siteId = phase[0].site_id;

        // 1. Delete tasks in this phase
        await db.query('DELETE FROM tasks WHERE phase_id = ?', [id]);

        // 2. Delete the phase itself
        await db.query('DELETE FROM phases WHERE id = ?', [id]);

        // 3. Re-index remaining phases
        await reindexPhases(siteId);

        res.json({ message: 'Phase deleted and timeline re-indexed' });
    } catch (error) {
        console.error('Error deleting phase:', error);
        res.status(500).json({ message: 'Error deleting phase' });
    }
};

// Get assigned sites (Employee)
exports.getAssignedSites = async (req, res) => {
    try {
        const employeeId = req.user.id;

        const [sites] = await db.query(`
            SELECT s.*, 
                   (
                       SELECT COUNT(DISTINCT t.id) 
                       FROM tasks t 
                       JOIN task_assignments ta ON t.id = ta.task_id 
                       WHERE t.site_id = s.id AND ta.employee_id = ?
                   ) as my_tasks
            FROM sites s
            INNER JOIN site_assignments sa ON s.id = sa.site_id
            WHERE sa.employee_id = ?
            ORDER BY s.created_at DESC
        `, [employeeId, employeeId]);

        res.json({ sites });
    } catch (error) {
        console.error('Error fetching assigned sites:', error);
        res.status(500).json({ message: 'Error fetching assigned sites' });
    }
};

// Get all tasks (Admin)
exports.getAllTasks = async (req, res) => {
    try {
        const [tasks] = await db.query(`
            SELECT t.*, s.name as site_name, s.location as site_location,
                   e.name as employee_name, p.name as phase_name
            FROM tasks t
            LEFT JOIN sites s ON t.site_id = s.id
            LEFT JOIN employees e ON t.employee_id = e.id
            LEFT JOIN phases p ON t.phase_id = p.id
            ORDER BY t.created_at DESC
        `);
        res.json({ tasks });
    } catch (error) {
        console.error('Error fetching tasks:', error);
        res.status(500).json({ message: 'Error fetching tasks' });
    }
};

// Create custom task (Admin only)
exports.addTask = async (req, res) => {
    try {
        const { siteId, phaseId, name } = req.body;
        const isAdmin = req.user.role === 'Admin' || req.user.role === 'admin';

        if (!isAdmin) {
            return res.status(403).json({ message: 'Only admin can add tasks' });
        }

        const [result] = await db.query(
            'INSERT INTO tasks (site_id, phase_id, name, status) VALUES (?, ?, ?, "Not Started")',
            [siteId, phaseId, name]
        );

        res.status(201).json({ message: 'Task added successfully', taskId: result.insertId });
    } catch (error) {
        console.error('Error adding task:', error);
        res.status(500).json({ message: 'Error adding task' });
    }
};

// Update task (Admin can rename/assign, Employee updates status)
exports.updateTask = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, employeeId, startDate, dueDate, amount, status, delayReason, proofUrl, assigned_to } = req.body;

        console.log('[updateTask] Handling Assignment for Employee ID:', employeeId);
        console.log('[updateTask] Updating Task ID:', id, req.body);

        // Determine if user is Admin or Employee (Admin can change everything, Employee only status/proof)
        const isAdmin = req.user.role === 'Admin' || req.user.role === 'admin';

        if (isAdmin) {
            // RESTRICTION: Admin cannot directly set status to 'completed'
            // Tasks must go through approval workflow
            if (status && status.toLowerCase() === 'completed') {
                return res.status(403).json({
                    message: 'Admins cannot directly complete tasks. Use the approval endpoint instead.'
                });
            }

            await db.query(
                `UPDATE tasks SET 
                    name = ?, start_date = ?, 
                    due_date = ?, amount = ?, status = ?, 
                    delay_reason = ?, proof_url = ?, updated_at = NOW() 
                 WHERE id = ?`,
                [name, ensureIsoDate(startDate), ensureIsoDate(dueDate),
                    amount || 0, status, delayReason || null, proofUrl || null, id]
            );

            // Handle assignments if provided
            if (assigned_to && Array.isArray(assigned_to)) {
                // Delete existing assignments
                await db.query('DELETE FROM task_assignments WHERE task_id = ?', [id]);

                // Insert new assignments
                for (const empId of assigned_to) {
                    await db.query(
                        'INSERT INTO task_assignments (task_id, employee_id) VALUES (?, ?)',
                        [id, empId]
                    );
                }
            }
        } else {
            // Employee only updates status and feedback
            await db.query(
                'UPDATE tasks SET status = ?, delay_reason = ?, proof_url = ?, updated_at = NOW() WHERE id = ?',
                [status, delayReason || null, proofUrl || null, id]
            );

            // NOTIFICATION: Task Updated by Employee
            if (status && status.toLowerCase() === 'completed') {
                const [tData] = await db.query('SELECT phase_id, site_id, name FROM tasks WHERE id = ?', [id]);
                if (tData.length > 0) {
                    await createNotification(
                        tData[0].site_id,
                        tData[0].phase_id,
                        id,
                        employeeId || req.user.id, // Who did the action
                        'TASK_UPDATE',
                        `Task "${tData[0].name}" marked as completed by employee.`
                    );
                }
            }
        }

        // CHECK FOR PHASE COMPLETION (Logic replicated from taskController)
        const [taskData] = await db.query('SELECT phase_id FROM tasks WHERE id = ?', [id]);
        if (taskData.length > 0 && taskData[0].phase_id) {
            const phaseId = taskData[0].phase_id;
            const [incompleteTasks] = await db.query(
                'SELECT id FROM tasks WHERE phase_id = ? AND status != "completed"',
                [phaseId]
            );

            if (incompleteTasks.length === 0) {
                await db.query(
                    'UPDATE phases SET status = "waiting_for_approval", progress = 100 WHERE id = ?',
                    [phaseId]
                );
                // Add system message if not already added recently? (Simplification: just add it, duplicate msgs are better than none)
                await db.query(`
                    INSERT INTO stage_messages (phase_id, sender_id, type, content)
                    VALUES (?, NULL, 'system', 'All tasks completed. Waiting for admin approval.')
                 `, [phaseId]);

                // NOTIFICATION: Stage Completed
                const [pData] = await db.query('SELECT site_id FROM phases WHERE id = ?', [phaseId]);
                if (pData.length > 0) {
                    await createNotification(
                        pData[0].site_id,
                        phaseId,
                        null,
                        req.user.id,
                        'STAGE_COMPLETED',
                        'All tasks completed in stage. Waiting for approval.'
                    );
                }
            }
        }

        res.json({ message: 'Task updated successfully' });
    } catch (error) {
        console.error('Error updating task:', error);
        res.status(500).json({ message: 'Error updating task' });
    }
};

// Delete task (Admin only)
exports.deleteTask = async (req, res) => {
    try {
        const { id } = req.params;
        const isAdmin = req.user.role === 'Admin' || req.user.role === 'admin';

        if (!isAdmin) {
            return res.status(403).json({ message: 'Only admin can delete tasks' });
        }

        await db.query('DELETE FROM tasks WHERE id = ?', [id]);
        res.json({ message: 'Task deleted successfully' });
    } catch (error) {
        console.error('Error deleting task:', error);
        res.status(500).json({ message: 'Error deleting task' });
    }
};

// Toggle Task Assignment
exports.toggleTaskAssignment = async (req, res) => {
    try {
        const { id } = req.params; // taskId
        const { employeeId } = req.body;
        const isAdmin = req.user.role === 'Admin' || req.user.role === 'admin';

        if (!isAdmin) {
            return res.status(403).json({ message: 'Only admin can assign tasks' });
        }

        // Check if assignment exists
        const [existing] = await db.query(
            'SELECT id FROM task_assignments WHERE task_id = ? AND employee_id = ?',
            [id, employeeId]
        );

        let action = '';

        if (existing.length > 0) {
            // Remove assignment
            await db.query('DELETE FROM task_assignments WHERE id = ?', [existing[0].id]);
            action = 'removed';
        } else {
            // Add assignment
            await db.query(
                'INSERT INTO task_assignments (task_id, employee_id) VALUES (?, ?)',
                [id, employeeId]
            );
            action = 'assigned';

            // Notification
            const [taskData] = await db.query('SELECT site_id, phase_id, name FROM tasks WHERE id = ?', [id]);
            if (taskData.length > 0) {
                await createNotification(
                    taskData[0].site_id,
                    taskData[0].phase_id,
                    id,
                    employeeId,
                    'ASSIGNMENT',
                    `You have been assigned to task: "${taskData[0].name}"`
                );
            }
        }

        const assignments = await getTaskAssignments(id);
        res.json({ message: `Assignment ${action}`, assignments });

    } catch (error) {
        console.error('Error toggling assignment:', error);
        res.status(500).json({ message: 'Error updating assignment' });
    }
};

// Get assigned tasks (Employee) using task_assignments table
exports.getAssignedTasks = async (req, res) => {
    try {
        const employeeId = req.user.id;

        const [tasks] = await db.query(`
            SELECT t.*, s.name as site_name, s.location as site_location, p.name as phase_name
            FROM tasks t
            JOIN task_assignments ta ON t.id = ta.task_id
            LEFT JOIN sites s ON t.site_id = s.id
            LEFT JOIN phases p ON t.phase_id = p.id
            WHERE ta.employee_id = ?
            ORDER BY t.due_date ASC, t.created_at DESC
        `, [employeeId]);

        res.json({ tasks });
    } catch (error) {
        console.error('Error fetching assigned tasks:', error);
        res.status(500).json({ message: 'Error fetching assigned tasks' });
    }
};

// Status update functionality unified into updateTask, but keeping this for compatibility if needed
exports.updateTaskStatus = async (req, res) => {
    return exports.updateTask(req, res);
};

// Get employees list
// Get employees list
exports.getEmployees = async (req, res) => {
    try {
        const [employees] = await db.query(
            "SELECT id, name, email, phone, role, status, created_at FROM employees ORDER BY created_at DESC"
        );
        res.json({ employees });
    } catch (error) {
        console.error('Error fetching employees:', error);
        res.status(500).json({ message: 'Error fetching employees' });
    }
};

// Create Employee
// Create Employee
exports.createEmployee = async (req, res) => {
    try {
        const { name, email, password, phone, role, status } = req.body;

        // Validation - Phone is mandatory, Email is optional
        if (!name || !phone || !password || !role) {
            return res.status(400).json({ message: 'Name, Phone, Role, and Password are required' });
        }

        // Check duplicate phone
        const [phoneCheck] = await db.query('SELECT id FROM employees WHERE phone = ?', [phone]);
        if (phoneCheck.length > 0) {
            return res.status(400).json({ message: 'Employee with this phone already exists' });
        }

        // Check duplicate email (only if provided)
        if (email) {
            const [emailCheck] = await db.query('SELECT id FROM employees WHERE email = ?', [email]);
            if (emailCheck.length > 0) {
                return res.status(400).json({ message: 'Employee with this email already exists' });
            }
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Insert
        await db.query(
            'INSERT INTO employees (name, email, phone, password, role, status) VALUES (?, ?, ?, ?, ?, ?)',
            [name, email || null, phone, hashedPassword, role, status || 'Active']
        );

        res.status(201).json({ message: 'Employee created successfully' });

    } catch (error) {
        console.error('Error creating employee:', error);
        res.status(500).json({ message: 'Error creating employee' });
    }
};

// Update Employee
// Update Employee
exports.updateEmployee = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, email, password, phone, role, status } = req.body;

        if (!name || !phone || !role) {
            return res.status(400).json({ message: 'Name, Phone, and Role are required' });
        }

        // Check uniqueness for phone (excluding self)
        const [phoneCheck] = await db.query('SELECT id FROM employees WHERE phone = ? AND id != ?', [phone, id]);
        if (phoneCheck.length > 0) {
            return res.status(400).json({ message: 'Phone number already in use by another employee' });
        }

        // Check uniqueness for email (if provided, excluding self)
        if (email) {
            const [emailCheck] = await db.query('SELECT id FROM employees WHERE email = ? AND id != ?', [email, id]);
            if (emailCheck.length > 0) {
                return res.status(400).json({ message: 'Email already in use by another employee' });
            }
        }

        let query = 'UPDATE employees SET name = ?, email = ?, phone = ?, role = ?, status = ?';
        let params = [name, email || null, phone, role, status || 'Active'];

        if (password && password.trim() !== '') {
            const hashedPassword = await bcrypt.hash(password, 10);
            query += ', password = ?';
            params.push(hashedPassword);
        }

        query += ' WHERE id = ?';
        params.push(id);

        await db.query(query, params);

        res.json({ message: 'Employee updated successfully' });
    } catch (error) {
        console.error('Error updating employee:', error);
        res.status(500).json({ message: 'Error updating employee' });
    }
};

// Complete a phase (Employee)
exports.completePhase = async (req, res) => {
    try {
        const { id } = req.params; // phaseId
        const employeeId = req.user.id;

        // Verify assignment
        const [phase] = await db.query('SELECT * FROM phases WHERE id = ?', [id]);
        if (phase.length === 0) return res.status(404).json({ message: 'Phase not found' });

        if (phase[0].assigned_to !== employeeId && req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Not authorized to complete this phase' });
        }

        // Update status and completed_by
        await db.query(
            'UPDATE phases SET status = "Completed", completed_by = ?, completed_at = NOW() WHERE id = ?',
            [employeeId, id]
        );

        res.json({ message: 'Phase marked as completed' });
    } catch (error) {
        console.error('Error completing phase:', error);
        res.status(500).json({ message: 'Error completing phase' });
    }
};

// Assign employee to phase
// Assign employee to phase
exports.assignEmployeeToPhase = async (req, res) => {
    try {
        const { id } = req.params; // phaseId
        const { employeeId } = req.body;

        // 1. Assign to Phase
        await db.query('UPDATE phases SET assigned_to = ? WHERE id = ?', [employeeId, id]);

        // 2. Cascade assign to all Tasks in this Phase
        await db.query('UPDATE tasks SET employee_id = ? WHERE phase_id = ?', [employeeId, id]);

        // 3. Create Notification for the Employee
        try {
            // Get Phase and Project Names
            const [phaseRows] = await db.query(`
                SELECT p.name as phase_name, s.id as project_id, s.name as project_name 
                FROM phases p 
                JOIN sites s ON p.site_id = s.id 
                WHERE p.id = ?
            `, [id]);

            if (phaseRows.length > 0) {
                const { phase_name, project_id, project_name } = phaseRows[0];
                const notifMessage = `You have been assigned to stage: ${phase_name} in project: ${project_name}`;

                // Use 'ASSIGNMENT' type, and employeeId as the recipient (associated employee)
                await db.query(`
                    INSERT INTO notifications (project_id, phase_id, employee_id, type, message, is_read, created_at)
                    VALUES (?, ?, ?, 'ASSIGNMENT', ?, 0, NOW())
                `, [project_id, id, employeeId, notifMessage]);
            }
        } catch (notifError) {
            console.error('Error creating assignment notification:', notifError);
            // Don't fail the request if notification fails
        }

        res.json({ message: 'Employee assigned successfully to phase and its tasks' });
    } catch (error) {
        console.error('Error assigning employee:', error);
        res.status(500).json({ message: 'Error assigning employee' });
    }
};

// Delete Employee
exports.deleteEmployee = async (req, res) => {
    try {
        const { id } = req.params;

        // Check for assignments
        const [tasks] = await db.query('SELECT id FROM tasks WHERE employee_id = ?', [id]);
        if (tasks.length > 0) {
            // Nullify assignments instead of blocking? Or block?
            // Let's unassign tasks first
            await db.query('UPDATE tasks SET employee_id = NULL WHERE employee_id = ?', [id]);
        }

        // Also unassign from phases (Crucial fix)
        await db.query('UPDATE phases SET assigned_to = NULL WHERE assigned_to = ?', [id]);

        await db.query('DELETE FROM site_assignments WHERE employee_id = ?', [id]);
        await db.query('DELETE FROM employees WHERE id = ?', [id]);

        res.json({ message: 'Employee deleted successfully' });
    } catch (error) {
        console.error('Error deleting employee:', error);
        res.status(500).json({ message: 'Error deleting employee' });
    }
};

// Update site (Admin)
exports.updateSite = async (req, res) => {
    try {
        const { id } = req.params;
        const {
            name, location, startDate, endDate, duration,
            budget, clientName, clientEmail, clientPhone,
            clientCompany, city, state, country
        } = req.body;

        const isoStartDate = ensureIsoDate(startDate);
        const isoEndDate = ensureIsoDate(endDate);

        await db.query(
            `UPDATE sites SET 
                name = ?, location = ?, start_date = ?, end_date = ?, duration = ?, 
                budget = ?, client_name = ?, client_email = ?, client_phone = ?,
                client_company = ?, city = ?, state = ?, country = ?,
                updated_at = NOW() 
            WHERE id = ?`,
            [
                name, location, isoStartDate, isoEndDate, duration || null,
                budget || 0, clientName || null, clientEmail || null, clientPhone || null,
                clientCompany || null, city || null, state || null, country || null,
                id
            ]
        );

        res.json({ message: 'Site updated successfully' });
    } catch (error) {
        console.error('Error updating site:', error);
        res.status(500).json({ message: 'Error updating site' });
    }
};

// Delete site (Admin)
exports.deleteSite = async (req, res) => {
    try {
        const { id } = req.params;
        console.log(`Starting robust deletion for site ID: ${id}`);

        // Explicitly delete related data to ensure no FK constraints block us
        // 1. Delete tasks
        await db.query('DELETE FROM tasks WHERE site_id = ?', [id]);

        // 2. Delete phases
        await db.query('DELETE FROM phases WHERE site_id = ?', [id]);

        // 3. Delete assignments
        await db.query('DELETE FROM site_assignments WHERE site_id = ?', [id]);

        // 4. Delete the site itself
        const [result] = await db.query('DELETE FROM sites WHERE id = ?', [id]);

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Site not found' });
        }

        console.log(`Site ${id} and associated data deleted successfully`);
        res.json({ message: 'Site deleted successfully' });
    } catch (error) {
        res.status(500).json({
            message: 'Error deleting site',
            error: error.message
        });
    }
};

// --- Employee Dashboard APIs ---

// Get Employee Dashboard Stats
exports.getEmployeeDashboardStats = async (req, res) => {
    try {
        const employeeId = req.user.id;

        // 1. Pending/Average Progress - Fetch tasks assigned
        const [taskStats] = await db.query(`
            SELECT 
                COUNT(*) as total_tasks,
                SUM(CASE WHEN t.status = 'completed' THEN 1 ELSE 0 END) as completed_tasks,
                SUM(CASE WHEN t.status != 'completed' THEN 1 ELSE 0 END) as pending_tasks
            FROM tasks t
            JOIN task_assignments ta ON t.id = ta.task_id
            WHERE ta.employee_id = ?
        `, [employeeId]);

        // 2. Assigned Sites
        const [siteStats] = await db.query(`
            SELECT COUNT(DISTINCT site_id) as assigned_sites
            FROM site_assignments
            WHERE employee_id = ?
        `, [employeeId]);

        res.json({
            pending: taskStats[0].pending_tasks || 0,
            completed: taskStats[0].completed_tasks || 0,
            sites: siteStats[0].assigned_sites || 0
        });

    } catch (error) {
        console.error('Error fetching dashboard stats:', error);
        res.status(500).json({ message: 'Error fetching stats' });
    }
};

// Get Employee Tasks (with filters)
exports.getEmployeeTasks = async (req, res) => {
    try {
        const employeeId = req.user.id;
        // Simple fetch for now, can add status filter from query if needed
        const [tasks] = await db.query(`
            SELECT t.*, s.name as site_name, s.location as site_location, p.name as phase_name
            FROM tasks t
            LEFT JOIN sites s ON t.site_id = s.id
            LEFT JOIN phases p ON t.phase_id = p.id
            WHERE t.employee_id = ?
            ORDER BY t.created_at DESC
        `, [employeeId]);

        res.json({ tasks });
    } catch (error) {
        console.error('Error fetching employee tasks:', error);
        res.status(500).json({ message: 'Error fetching tasks' });
    }
};

// Get Employee Assigned Phases (Stages)
exports.getEmployeePhases = async (req, res) => {
    try {
        const employeeId = req.user.id;
        const [phases] = await db.query(`
            SELECT DISTINCT p.*, s.name as site_name, s.location as site_location, s.created_at as site_created_at
            FROM phases p
            JOIN tasks t ON p.id = t.phase_id
            JOIN task_assignments ta ON t.id = ta.task_id
            LEFT JOIN sites s ON p.site_id = s.id
            WHERE ta.employee_id = ?
            ORDER BY s.created_at DESC, p.order_num ASC
        `, [employeeId]);
        res.json({ phases });
    } catch (error) {
        console.error('Error fetching employee phases:', error);
        res.status(500).json({ message: 'Error fetching phases' });
    }
};

// Get Full Task Details (for Split View)
exports.getTaskDetails = async (req, res) => {
    try {
        const { taskId } = req.params;
        const employeeId = req.user.id;

        // 1. Task Basic Info
        const [tasks] = await db.query(`
            SELECT t.*, s.name as site_name, p.name as phase_name, e.name as assigned_employee_name
            FROM tasks t
            LEFT JOIN sites s ON t.site_id = s.id
            LEFT JOIN phases p ON t.phase_id = p.id
            LEFT JOIN employees e ON t.employee_id = e.id
            WHERE t.id = ?
        `, [taskId]);

        if (tasks.length === 0) {
            return res.status(404).json({ message: 'Task not found' });
        }

        const task = tasks[0];

        // Fetch assignments for this task (Multi-assignee support)
        task.assignments = await getTaskAssignments(task.id);
        // Helper string for legacy frontend support
        task.assigned_employee_name = task.assignments.map(a => a.name).join(', ');

        // 2. Task Updates (Progress history)
        const [updates] = await db.query(`
            SELECT tu.*, e.name as employee_name
            FROM task_updates tu
            LEFT JOIN employees e ON tu.employee_id = e.id
            WHERE tu.task_id = ?
            ORDER BY tu.created_at DESC
        `, [taskId]);

        // 3. Task Messages (Chat) - optional, might be fetched separately
        const [messages] = await db.query(`
            SELECT tm.*, e.name as sender_name
            FROM task_messages tm
            LEFT JOIN employees e ON tm.sender_id = e.id
            WHERE tm.task_id = ?
            ORDER BY tm.created_at ASC
        `, [taskId]);

        // 4. Todos
        const [todos] = await db.query(`
            SELECT * FROM todos WHERE task_id = ? ORDER BY created_at ASC
        `, [taskId]);

        res.json({ task, updates, messages, todos });

    } catch (error) {
        console.error('Error fetching task details:', error);
        res.status(500).json({ message: 'Error fetching task details' });
    }
};

// --- Stage Progress Features ---

// Get all details for a specific phase (Employee & Admin)
exports.getPhaseDetails = async (req, res) => {
    try {
        const { id } = req.params;

        // Phase Info
        const [phases] = await db.query(`
            SELECT p.*, e.name as assigned_employee_name, s.name as site_name, s.location as site_location
            FROM phases p
            LEFT JOIN employees e ON p.assigned_to = e.id
            LEFT JOIN sites s ON p.site_id = s.id
            WHERE p.id = ?
        `, [id]);

        if (phases.length === 0) return res.status(404).json({ message: 'Phase not found' });
        const phase = phases[0];

        // Todos
        const [todos] = await db.query('SELECT * FROM stage_todos WHERE phase_id = ? ORDER BY created_at ASC', [id]);

        // Updates
        const [updates] = await db.query(`
            SELECT u.*, e.name as employee_name 
            FROM stage_updates u
            LEFT JOIN employees e ON u.employee_id = e.id
            WHERE u.phase_id = ?
            ORDER BY u.created_at DESC
        `, [id]);

        // Messages
        const [messages] = await db.query(`
            SELECT m.*, e.name as sender_name, e.role as sender_role
            FROM stage_messages m
            LEFT JOIN employees e ON m.sender_id = e.id
            WHERE m.phase_id = ?
            ORDER BY m.created_at ASC
        `, [id]);

        // Predefined Subtasks (from tasks table) with Assignments
        const [subTasks] = await db.query(`
            SELECT t.*
            FROM tasks t
            WHERE t.phase_id = ?
            ORDER BY t.created_at ASC
        `, [id]);

        // Enrich tasks with assignments
        // Note: For 10-20 tasks, separate queries are fine given SQLite/MySQL nuances with Group Concat
        // Or we could do a JOIN and aggregate in JS. Let's do a quick enrichment loop for simplicity and robustness.
        for (const task of subTasks) {
            task.assignments = await getTaskAssignments(task.id);
            // Helper for frontend compatibility (optional, can be deprecated later)
            task.assigned_employee_name = task.assignments.map(a => a.name).join(', ');
            task.employee_id = null; // Deprecate single ID exposure to force array usage
        }

        res.json({ phase, todos, updates, messages, subTasks });

    } catch (error) {
        console.error('Error fetching phase details:', error);
        res.status(500).json({ message: 'Error fetching phase details' });
    }
};

// Add Todo to Phase
exports.addPhaseTodo = async (req, res) => {
    try {
        const { id } = req.params;
        const { content } = req.body;
        await db.query('INSERT INTO stage_todos (phase_id, content) VALUES (?, ?)', [id, content]);
        res.status(201).json({ message: 'Todo added' });
    } catch (error) {
        console.error('Error adding todo:', error);
        res.status(500).json({ message: 'Error adding todo' });
    }
};

// Toggle Todo
exports.togglePhaseTodo = async (req, res) => {
    try {
        const { todoId } = req.params;
        await db.query('UPDATE stage_todos SET is_completed = NOT is_completed WHERE id = ?', [todoId]);
        res.json({ message: 'Todo updated' });
    } catch (error) {
        console.error('Error toggling todo:', error);
        res.status(500).json({ message: 'Error toggling todo' });
    }
};

// Add Progress Update
exports.addPhaseUpdate = async (req, res) => {
    try {
        const { id } = req.params;
        const employeeId = req.user.id;
        const { progress, message, newStatus } = req.body;

        // Get previous progress
        const [rows] = await db.query('SELECT progress FROM phases WHERE id = ?', [id]);
        const prevProgress = rows[0]?.progress || 0;

        // Insert update
        await db.query(`
            INSERT INTO stage_updates (phase_id, employee_id, previous_progress, new_progress, message, status)
            VALUES (?, ?, ?, ?, ?, 'Approved')
        `, [id, employeeId, prevProgress, progress, message]);

        // NOTIFICATION: Progress Update
        const [phData] = await db.query('SELECT site_id FROM phases WHERE id = ?', [id]);
        if (phData.length > 0) {
            await createNotification(
                phData[0].site_id,
                id,
                null,
                employeeId,
                'TASK_UPDATE', // Using TASK_UPDATE for general progress updates too
                `Progress updated to ${progress}%: ${message}`
            );
        }

        // Update phase logic
        let status = 'in_progress';
        if (Number(progress) === 100) status = 'waiting_for_approval';
        if (Number(progress) === 0) status = 'pending'; // 'pending' maps to Not Started

        await db.query('UPDATE phases SET progress = ?, status = ? WHERE id = ?', [progress, status, id]);

        res.json({ message: 'Progress updated' });
    } catch (error) {
        console.error('Error adding update:', error);
        res.status(500).json({ message: 'Error adding update' });
    }
};

// Approve Phase (Admin)
exports.approvePhase = async (req, res) => {
    try {
        const { id } = req.params;
        const isAdmin = req.user.role === 'Admin' || req.user.role === 'admin';

        if (!isAdmin) {
            return res.status(403).json({ message: 'Only admin can approve phases' });
        }

        await db.query(
            'UPDATE phases SET status = "achieved", approved_by = ?, approved_at = NOW() WHERE id = ?',
            [req.user.id, id]
        );

        // Add system message
        await db.query(`
            INSERT INTO stage_messages (phase_id, sender_id, type, content)
            VALUES (?, ?, 'system', 'Work approved by admin.')
        `, [id, req.user.id]);

        res.json({ message: 'Phase approved and completed' });
    } catch (error) {
        console.error('Error approving phase:', error);
        res.status(500).json({ message: 'Error approving phase' });
    }
};

// Send Message
exports.sendPhaseMessage = async (req, res) => {
    try {
        const { id } = req.params;
        const senderId = req.user.id;
        const { type, content, mediaUrl } = req.body;

        await db.query(`
            INSERT INTO stage_messages (phase_id, sender_id, type, content, media_url)
            VALUES (?, ?, ?, ?, ?)
        `, [id, senderId, type || 'text', content, mediaUrl]);

        // NOTIFICATION: Chat Message
        // Only notify if sender is NOT admin (assuming Admin doesn't need to notify themselves, but requirement says "Employee... must notify Admin")
        // We'll check role if needed, but safe to just create it, and frontend filters "my own" notifications if needed.
        // Actually req says "Employee updates... must notify Admin". 
        // If sender is admin, we probably shouldn't create a notification for the admin.
        if (req.user.role !== 'Admin' && req.user.role !== 'admin') {
            const [phData2] = await db.query('SELECT site_id FROM phases WHERE id = ?', [id]);
            if (phData2.length > 0) {
                await createNotification(
                    phData2[0].site_id,
                    id,
                    null,
                    senderId,
                    'CHAT_UPDATE',
                    `New message: ${content ? content.substring(0, 30) + (content.length > 30 ? '...' : '') : 'Media attachment'}`
                );
            }
        }

        res.status(201).json({ message: 'Message sent' });
    } catch (error) {
        console.error('Error sending message:', error);
        res.status(500).json({ message: 'Error sending message' });
    }
};

// Get Notifications
exports.getNotifications = async (req, res) => {
    try {
        const userId = req.user.id;
        const isAdmin = req.user.role === 'Admin' || req.user.role === 'admin';
        const isEmployee = !isAdmin; // Assuming any non-admin is employee

        let query = `
            SELECT n.*, s.name as project_name, p.name as phase_name, e.name as employee_name
            FROM notifications n
            LEFT JOIN sites s ON n.project_id = s.id
            LEFT JOIN phases p ON n.phase_id = p.id
            LEFT JOIN employees e ON n.employee_id = e.id
        `;

        let params = [];

        if (isAdmin) {
            // Admin sees Task Updates, Chat Updates, Stage Completions
            query += ` WHERE n.type IN ('TASK_UPDATE', 'CHAT_UPDATE', 'STAGE_COMPLETED')`;
        } else {
            // Employee sees Assignments where they are the 'employee_id' (Recipient override)
            query += ` WHERE n.employee_id = ? AND n.type = 'ASSIGNMENT'`;
            params.push(userId);
        }

        query += ` ORDER BY n.is_read ASC, n.created_at DESC LIMIT 50`;

        const [notifications] = await db.query(query, params);

        // Count unread
        let countQuery = 'SELECT COUNT(*) as count FROM notifications WHERE is_read = 0';
        let countParams = [];

        if (isAdmin) {
            countQuery += ` AND type IN ('TASK_UPDATE', 'CHAT_UPDATE', 'STAGE_COMPLETED')`;
        } else {
            countQuery += ` AND employee_id = ? AND type = 'ASSIGNMENT'`;
            countParams.push(userId);
        }

        const [countRow] = await db.query(countQuery, countParams);
        const unreadCount = countRow[0].count;

        res.json({ notifications, unreadCount });
    } catch (error) {
        console.error('Error fetching notifications:', error);
        res.status(500).json({ message: 'Error fetching notifications' });
    }
};

// Mark Notification Read
exports.markNotificationRead = async (req, res) => {
    try {
        const { id } = req.params;
        await db.query('UPDATE notifications SET is_read = 1 WHERE id = ?', [id]);
        res.json({ message: 'Marked as read' });
    } catch (error) {
        console.error('Error marking notification read:', error);
        res.status(500).json({ message: 'Error marking notification read' });
    }
};
