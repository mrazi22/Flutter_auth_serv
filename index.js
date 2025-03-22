const express = require('express');
const mysql = require('mysql');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);
const multer = require('multer');
const path = require('path'); 

const port = process.env.PORT || 3000;

app.use(express.json());

const db = mysql.createConnection({
    host: "localhost",
    user: "root",
    password: "",
    database: "autha"
});
db.connect(function(err) {
    if (err) {
        console.error('Error connecting to MySQL:', err);
    } else {
        console.log('Connected to MySQL database');
    }
});

const storage = multer.diskStorage({
    destination: './uploads/',
    filename: function (req, file, cb) {
        cb(null, file.fieldname + '-' + Date.now() + path.extname(file.originalname));
    }
});
const upload = multer({ storage: storage });
app.post('/register', async (req, res) => {
    const { uid, username, email, password } = req.body;

    const checkUserQuery = 'SELECT * FROM users WHERE username = ? OR email = ?';
    db.query(checkUserQuery, [username, email], async (err, result) => {
        if (err) {
            return res.status(500).json({status: 'error', message: 'Database error' });
        }

        if (result.length > 0) {
            const existingUser = result[0];
            if (existingUser.email === email) {
                return res.status(400).json({status: 'error', message: 'Email already exists' });
            } else if (existingUser.username === username) {
                return res.status(400).json({status: 'error', message: 'Username already exists' });
            }
        }

        const insertUserQuery = 'INSERT INTO users (uid, username, email, password) VALUES (?, ?, ?, ?)';
        db.query(insertUserQuery, [uid, username,email, password], (err, result) => {
            if (err) {
                return res.status(500).json({status: 'error', message: 'Error registering user' });
            }

            const getUserQuery = `SELECT * FROM users WHERE uid = ?`;
            db.query(getUserQuery, [uid], (err, userResult) => {
                if (err) {
                    return res.status(500).json({ 
                        status: 'error',
                        message: `Error fetching user data ${err}` });
                }

                if (userResult.length === 0) {
                    return res.status(404).json({ 
                        status: 'error',
                        message: 'User not found after registration' });
                }

                const user = userResult[0];
                res.status(200).json({ 
                    status: 'success',
                    message: 'User registered successfully', 
                    user: { 
                        uid: user.uid,
                        username: user.username, 
                        email: user.email,
                        password: user.password,
                        time: user.time
                    } 
                });
            });
        });
    });
});
app.post('/login', (req, res) => {
    const { email, password } = req.body;

    const checkUserQuery = 'SELECT * FROM users WHERE email = ? AND password = ?';
    db.query(checkUserQuery, [email, password], (err, result) => {
        if (err) {
            return res.status(500).json({ status: 'error', message: 'Database error' });
        }

        if (result.length === 0) {
            return res.status(401).json({ status: 'error', message: 'Invalid email or password' });
        }

        const user = result[0];
        res.status(200).json({
            status: 'success',
            message: 'Login successful',
            user: {
                uid: user.uid,
                username: user.username,
                email: user.email,
                password: user.password, // Be very cautious about sending passwords back!
                time: user.time
            }
        });
    });
});
app.post('/createProject', upload.single('image'), (req, res) => { // Use multer middleware
    const { projectName, createdOn, uid } = req.body; // use uid instead of userid
    const imagePath = req.file ? req.file.path : null;

    if (!projectName || !uid || !createdOn) { // use uid instead of userid
        return res.status(400).json({ status: 'error', message: 'Project name, date, and user ID are required' });
    }

    const insertProjectQuery = 'INSERT INTO projects (projectName, createdOn, adminUserId, imagePath) VALUES (?, ?, ?, ?)';

    db.query(insertProjectQuery, [projectName, createdOn, uid, imagePath], (err, result) => { // use uid instead of userid
        if (err) {
            console.error('Error creating project:', err);
            return res.status(500).json({ status: 'error', message: 'Error creating project' });
        }

        res.status(201).json({ status: 'success', message: 'Project created successfully' });
    });
});

app.listen(port, () => {
    console.log(`Server running on http://localhost:${port}`);
});
