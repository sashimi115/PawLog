const express = require('express');
const mysql = require('mysql');
const bodyParser = require('body-parser');
const bcrypt = require('bcrypt');
const cors = require('cors');
const path = require('path');
const multer = require('multer');
const cookieParser = require('cookie-parser');
const session = require('express-session');
const fs = require('fs');
const { stringify } = require('csv-stringify');
const router = express.Router(); 
const { execFile } = require('child_process');

const app = express();
const port = 3000;
const SERVER_BACKUP_SCRIPT_PATH = path.join(__dirname, 'backup.js');

// Middleware
app.use(cors()); // Consider configuring CORS more restrictively in production
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(express.json()); // For parsing application/json
app.use(express.urlencoded({ extended: true })); // For parsing application/x-www-form-urlencoded
app.use(router);
 

// Session configuration
app.use(session({
    secret: 'your-secret-key', // **IMPORTANT: Replace with a strong, random secret**
    resave: false, // Set to false to prevent saving session if not modified
    saveUninitialized: false, // Set to false to prevent creating sessions for unauthenticated users
    cookie: {
        httpOnly: true, // Recommended for security
        secure: false, // Set to true in production with HTTPS
        maxAge: 24 * 60 * 60 * 1000, // Session expiration (e.g., 24 hours)
    },
}));

// Serve static files (HTML, CSS, JS)
app.use(express.static(path.join(__dirname, 'public')));
// Serve uploaded files
// Ensure this path matches where Multer saves files within the 'public' directory
app.use('/uploads', express.static(path.join(__dirname, 'public/uploads')));


// Database connection setup
const db = mysql.createConnection({
     host: process.env.DB_HOST, // Access the value of the DB_HOST environment variable
    user: process.env.DB_USER, // Access the value of the DB_USER environment variable
    password: process.env.DB_PASSWORD, // Access the value of the DB_PASSWORD environment variable
    database: process.env.DB_NAME // Access the value of the DB_NAME environment variable
});

db.connect(err => {
    if (err) {
        console.error('Error connecting to the database:', err);
        return;
    }
    console.log('Database connected!');
});

// Multer setup for profile pictures
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadPath = path.join(__dirname, 'public/uploads/profiles/');
        fs.mkdirSync(uploadPath, { recursive: true }); // Create directory if it doesn't exist
        cb(null, uploadPath);
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + '-' + file.originalname);
    }
});
const upload = multer({ storage: storage }); // Use 'storage' for profile pictures

// Multer setup for pet images
const petImageStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadPath = path.join(__dirname, 'public/uploads/pets/'); // Store pet images in a separate folder
        fs.mkdirSync(uploadPath, { recursive: true }); // Create directory if it doesn't exist
        cb(null, uploadPath);
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + '-' + file.originalname);
    }
});
const uploadPetImage = multer({ storage: petImageStorage }); // Use 'petImageStorage' for pet images


// --- Authentication Endpoints ---

// Login endpoint
app.post('/login', (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({ error: 'Username and password are required' });
    }

    // Query the database to find the user by username
    const query = 'SELECT * FROM users WHERE username = ?';
    db.query(query, [username], (err, results) => {
        if (err) {
            console.error('MySQL Error during login:', err);
            return res.status(500).json({ success: false, message: 'Server error during login' });
        }

        if (results.length === 0) {
            console.log('Login failed: Username not found for', username);
            return res.json({ success: false, message: 'Username not found' });
        }

        const user = results[0];
        // Compare the provided password with the hashed password in the database
        bcrypt.compare(password, user.password, (err, isMatch) => {
            if (err) {
                console.error('Bcrypt compare error:', err);
                return res.status(500).json({ success: false, message: 'Error validating password' });
            }

            if (isMatch) {
                // Passwords match, create a session
                req.session.userId = user.id;
                req.session.username = user.username;
                console.log('Login successful for', username);
                res.json({
                    success: true,
                    message: 'Login successful',
                    username: user.username,
                    profile: user // Consider sending less sensitive data here
                });
            } else {
                console.log('Login failed: Incorrect password for', username);
                res.json({ success: false, message: 'Incorrect password' });
            }
        });
    });
});

// Signup endpoint
app.post('/signup', async (req, res) => {
    const { username, email, password } = req.body; // Include other fields from your form

    // Basic validation (adjust based on required fields in your signup form)
    if (!username || !email || !password) {
         return res.status(400).json({ success: false, message: 'All fields are required' });
    }

    // Check if username, email, or contact already exists
    const checkQuery = 'SELECT id, username, email FROM users WHERE username = ? OR email = ?';
    db.query(checkQuery, [username, email], async (checkErr, checkResults) => {
        if (checkErr) {
            console.error('MySQL Error during signup check:', checkErr);
            return res.status(500).json({ success: false, message: 'Database error during signup check' });
        }

        if (checkResults.length > 0) {
            // Check which field specifically exists
            if (checkResults.some(row => row.username === username)) {
                 console.log('Signup failed: Username already exists:', username);
                return res.status(400).json({ success: false, message: 'Username already exists.' });
            }
            if (checkResults.some(row => row.email === email)) {
                 console.log('Signup failed: Email already exists:', email);
                return res.status(400).json({ success: false, message: 'Email address is already in use.' });
            }
        }

        // If no duplicates, hash password and insert user
        try {
            const hashedPassword = await bcrypt.hash(password, 10); // Hash the password

            const insertQuery = 'INSERT INTO users (username, email, password) VALUES (?, ?, ?)';
            db.query(insertQuery, [username, email, hashedPassword], (insertErr, result) => {
                if (insertErr) {
                    console.error('MySQL Error during user insertion:', insertErr);
                    // Check for specific duplicate entry errors if needed
                    return res.status(500).json({ success: false, message: 'Database error during signup' });
                }
                console.log('User created successfully:', username);
                res.status(201).json({ success: true, message: 'User created successfully!' });
            });
        } catch (hashError) {
            console.error('Bcrypt hashing error:', hashError);
            res.status(500).json({ success: false, message: 'Error processing password' });
        }
    });
});

// Logout endpoint
app.post('/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            console.error('Error destroying session during logout:', err);
            return res.status(500).json({ error: 'Logout failed' });
        }
        console.log('User logged out');
        // Clear the session cookie on the client side as well
        res.clearCookie('connect.sid'); // Replace 'connect.sid' with your session cookie name if different
        res.status(200).json({ message: 'Logout successful' });
    });
});


// --- Profile Endpoints ---

// Get user profile endpoint (requires authentication check)
app.get('/get-profile', (req, res) => {
    console.log('GET /get-profile endpoint reached.');
    if (!req.session.userId) {
        console.log('Attempted to fetch profile without authentication');
        return res.status(401).json({ error: 'Not authenticated' });
    }

    const userId = req.session.userId;

    const query = 'SELECT id, username, name, birthday, email, contact, bio, profile_picture FROM users WHERE id = ?';
    db.query(query, [userId], (err, results) => {
        if (err) {
            console.error('Database error fetching profile:', err);
            return res.status(500).json({ error: 'Internal server error' });
        }

        if (results.length > 0) {
            // Format birthday before sending to client if it's not null
            if (results[0].birthday) {
                // Ensure birthday is sent as a string inYYYY-MM-DD format
                results[0].birthday = new Date(results[0].birthday).toISOString().split('T')[0];
            }
            return res.status(200).json(results[0]);
        } else {
            // This case should ideally not happen if userId is in session but user is not in DB
            console.error('User ID in session but not found in DB:', userId);
            return res.status(404).json({ error: 'Profile not found for logged-in user' });
        }
    });
});

// Save/Update profile endpoint (requires authentication check)
app.post('/save-profile', upload.single('profile_picture'), (req, res) => {
    if (!req.session.userId) {
        console.log('Attempted to save profile without authentication');
        return res.status(401).json({ error: 'Not authenticated' });
    }

    const userId = req.session.userId;
    const { username, name, birthday, email, contact, bio } = req.body;
    // The uploaded file path is relative to the 'public' directory for serving
    const profilePicturePath = req.file ? `/uploads/profiles/${req.file.filename}` : null; // Get the path if a new file was uploaded

    console.log('Saving profile for user ID:', userId);
    console.log('Received data:', req.body);
    console.log('Uploaded profile picture path:', profilePicturePath); // Log the uploaded path

    // --- Start: Check for duplicate contact number ---
    if (contact !== undefined && contact !== null && contact !== '') { // Only check if contact is provided and not empty
        const checkContactQuery = 'SELECT id FROM users WHERE contact = ? AND id != ?';
        db.query(checkContactQuery, [contact, userId], (checkErr, checkResults) => {
            if (checkErr) {
                console.error('MySQL Error during contact check:', checkErr);
                return res.status(500).json({ error: 'Database error during contact check' });
            }

            if (checkResults.length > 0) {
                console.log('Contact number already exists for another user:', contact);
                // If a file was uploaded, delete it as the update failed
                if (profilePicturePath) {
                    fs.unlink(path.join(__dirname, 'public', profilePicturePath), (unlinkErr) => {
                        if (unlinkErr) console.error('Error deleting uploaded file:', unlinkErr);
                    });
                }
                return res.status(400).json({ error: 'Contact number is already in use.' }); // Send specific error message
            }

            // If contact is unique or not provided, proceed with profile update
            updateProfile(userId, username, name, birthday, email, contact, bio, profilePicturePath, res);
        });
    } else {
        // If contact is not provided or empty, proceed with profile update without checking
        updateProfile(userId, username, name, birthday, email, contact, bio, profilePicturePath, res);
    }
    // --- End: Check for duplicate contact number ---
});

// Helper function to perform the actual profile update
function updateProfile(userId, username, name, birthday, email, contact, bio, profilePicturePath, res) {
    // Build the update query dynamically based on provided fields
    let updateQuery = 'UPDATE users SET';
    const updateValues = [];
    const updateFields = [];

    // Only add fields to update if they are provided in the request body
    if (username !== undefined) { updateFields.push('username = ?'); updateValues.push(username); }
    if (name !== undefined) { updateFields.push('name = ?'); updateValues.push(name); }
    if (birthday !== undefined) { updateFields.push('birthday = ?'); updateValues.push(birthday); }
    if (email !== undefined) { updateFields.push('email = ?'); updateValues.push(email); }
    if (contact !== undefined) { updateFields.push('contact = ?'); updateValues.push(contact); }
    if (bio !== undefined) { updateFields.push('bio = ?'); updateValues.push(bio); }

    // Handle profile picture update separately using COALESCE
    let profilePictureUpdate = '';
    if (profilePicturePath !== null) {
        profilePictureUpdate = 'profile_picture = COALESCE(?, profile_picture)';
        updateValues.push(profilePicturePath);
    }

    // Combine update fields
    let combinedUpdateFields = updateFields.join(', ');
    if (profilePictureUpdate) {
        if (combinedUpdateFields) {
            combinedUpdateFields += ', ' + profilePictureUpdate;
        } else {
            combinedUpdateFields = profilePictureUpdate;
        }
    }


    if (!combinedUpdateFields) {
        // No fields to update
        // If a new file was uploaded, delete it as there was no update
        if (profilePicturePath) {
            fs.unlink(path.join(__dirname, 'public', profilePicturePath), (unlinkErr) => {
                if (unlinkErr) console.error('Error deleting uploaded file:', unlinkErr);
            });
        }
        return res.status(200).json({ message: 'No fields provided for update' }); // Indicate no changes were made
    }

    updateQuery += ' ' + combinedUpdateFields + ' WHERE id = ?';
    updateValues.push(userId); // Add the user ID for the WHERE clause

    console.log('SQL Query for update:', updateQuery);
    console.log('SQL Values for update:', updateValues);


    db.query(updateQuery, updateValues, (err, result) => {
        if (err) {
            console.error('MySQL Error during profile update:', err);
            // If a file was uploaded, delete it as the update failed
            if (profilePicturePath) {
                fs.unlink(path.join(__dirname, 'public', profilePicturePath), (unlinkErr) => {
                    if (unlinkErr) console.error('Error deleting uploaded file:', unlinkErr);
                });
            }
            return res.status(500).json({ error: 'Database error during update' });
        }

        // Check if any rows were updated
        if (result.affectedRows === 0) {
            console.log('No rows updated for user ID:', userId, '. Check if user exists or data is identical.');
            // If a new file was uploaded, delete it as there was no update
            if (profilePicturePath) {
                fs.unlink(path.join(__dirname, 'public', profilePicturePath), (unlinkErr) => {
                    if (unlinkErr) console.error('Error deleting uploaded file:', unlinkErr);
                });
            }
            // This could happen if no data changed, or if the user ID was somehow invalid (though authentication should prevent this)
            return res.status(200).json({ message: 'No changes detected.' }); // Indicate no changes were made
        }

        console.log('Profile update result:', result);

        // Fetch the updated profile details to send back to the client
        db.query('SELECT id, username, name, birthday, email, contact, bio, profile_picture FROM users WHERE id = ?', [userId], (err, updatedResults) => {
            if (err) {
                console.error('MySQL Error fetching updated profile after save:', err);
                return res.status(500).json({ error: 'Database error fetching updated profile details' });
            }

            if (updatedResults.length > 0) {
                const fullyUpdatedProfile = updatedResults[0];
                console.log('Fetched updated profile for response:', fullyUpdatedProfile);

                // Format birthday before sending back if it's not null
                if (fullyUpdatedProfile.birthday) {
                    fullyUpdatedProfile.birthday = new Date(fullyUpdatedProfile.birthday).toISOString().split('T')[0];
                }

                res.status(200).json({
                    message: 'Profile updated successfully!',
                    updatedProfile: fullyUpdatedProfile
                });
            } else {
                // This case should ideally not happen if the update was successful and user exists
                console.error('Could not refetch updated profile for user ID after save:', userId);
                res.status(500).json({ error: 'Profile updated but could not retrieve updated details.' });
            }
        });
    });
}

// New: Change password endpoint
app.post('/change-password', (req, res) => {
    console.log('POST /change-password endpoint reached.');
    // Check if user is authenticated via session
    if (!req.session.userId) {
        console.log('Attempted to change password without authentication');
        return res.status(401).json({ error: 'Not authenticated' });
    }

    const userId = req.session.userId;
    const { currentPassword, newPassword } = req.body;

    // Basic server-side validation
    if (!currentPassword || !newPassword) {
        console.log('Missing current or new password in change password request');
        return res.status(400).json({ error: 'Current password and new password are required.' });
    }

    // Optional: Add new password strength validation here, mirroring client-side logic
    if (newPassword.length < 6) { // Example: minimum 6 characters
         console.log('New password too short for user ID:', userId);
        return res.status(400).json({ error: 'New password must be at least 6 characters long.' });
    }

    // Fetch the user's current hashed password from the database
    const query = 'SELECT password FROM users WHERE id = ?';
    db.query(query, [userId], (err, results) => {
        if (err) {
            console.error('Database error fetching user password for change:', err);
            return res.status(500).json({ error: 'Internal server error.' });
        }

        if (results.length === 0) {
            // This case should ideally not happen if session.userId is valid
            // It indicates a potential data inconsistency or session issue
            console.error('User not found for ID in session during password change:', userId);
             // Destroy the potentially invalid session
            req.session.destroy(sessionErr => {
                 if (sessionErr) console.error('Error destroying session after user not found during password change:', sessionErr);
                 res.status(404).json({ error: 'User not found.' }); // Return 404
            });
            return; // Stop further execution
        }

        const hashedPassword = results[0].password;

        // Compare the provided current password with the stored hashed password
        bcrypt.compare(currentPassword, hashedPassword, (compareErr, isMatch) => {
            if (compareErr) {
                console.error('Bcrypt compare error during password change:', compareErr);
                return res.status(500).json({ error: 'Internal server error during password comparison.' });
            }

            if (!isMatch) {
                 console.log('Incorrect current password provided for user ID:', userId);
                return res.status(400).json({ error: 'Incorrect current password.' }); // Return 400 for incorrect password
            }

            // Hash the new password
            bcrypt.hash(newPassword, 10, (hashErr, newHashedPassword) => {
                if (hashErr) {
                    console.error('Bcrypt hash error during password change:', hashErr);
                    return res.status(500).json({ error: 'Internal server error during password hashing.' });
                }

                // Update the user's password in the database
                const updateQuery = 'UPDATE users SET password = ? WHERE id = ?';
                db.query(updateQuery, [newHashedPassword, userId], (updateErr, updateResult) => {
                    if (updateErr) {
                        console.error('Database error updating password:', updateErr);
                        return res.status(500).json({ error: 'Internal server error updating password.' });
                    }

                    if (updateResult.affectedRows === 0) {
                        console.warn('Password update attempted but no rows affected for user ID:', userId);
                        // This might happen if the user was deleted between fetching and updating,
                        // though the previous check should prevent this.
                        return res.status(500).json({ error: 'Failed to update password.' });
                    }

                    console.log('Password successfully changed for user ID:', userId);
                    res.status(200).json({ message: 'Password changed successfully!' });
                });
            });
        });
    });
});

// Delete user account endpoint (requires authentication check)
app.delete('/delete-user', (req, res) => {
    console.log('DELETE /delete-user endpoint reached.');
    // Check if the user is logged in
    if (!req.session.userId) {
        console.log('Attempted to delete user without authentication');
        return res.status(401).json({ error: 'Not authenticated' });
    }

    const userIdToDelete = req.session.userId;

    console.log('Attempting to delete user ID:', userIdToDelete);

    // Start a transaction to ensure all related data is deleted or none is
    db.beginTransaction(err => {
        if (err) {
             console.error('Error starting transaction for user deletion:', err);
            return res.status(500).json({ error: 'Database error during deletion process.' });
        }

        // Step 1: Get paths of files to delete (profile picture, pet images)
        let filesToDelete = [];
        const getFilesQuery = `
            SELECT profile_picture FROM users WHERE id = ?
            UNION ALL
            SELECT image_path FROM pets WHERE user_id = ?
        `;
        db.query(getFilesQuery, [userIdToDelete, userIdToDelete], (getFilesErr, fileResults) => {
            if (getFilesErr) {
                console.error('MySQL Error getting file paths for deletion:', getFilesErr);
                return db.rollback(() => {
                    res.status(500).json({ error: 'Database error preparing for file deletion.' });
                });
            }

            // Collect valid file paths (excluding default images and nulls)
            filesToDelete = fileResults
                .map(row => row.profile_picture || row.image_path) // Get the path from either column
                .filter(filePath =>
                    filePath && // Not null or empty
                    filePath !== '/images/default-profile.jpg' && // Not default profile pic
                    filePath !== '/images/default-pet.png' // Not default pet pic
                );

            console.log('Files to attempt deleting:', filesToDelete);

            // Step 2: Delete vaccination records associated with the user's pets
             const deleteVaccinationsQuery = 'DELETE vr FROM vaccination_records vr JOIN pets p ON vr.pet_id = p.id WHERE p.user_id = ?';
             db.query(deleteVaccinationsQuery, [userIdToDelete], (deleteVaccinationsErr, vaccinationsResult) => {
                 if (deleteVaccinationsErr) {
                     console.error('MySQL Error deleting user vaccinations:', deleteVaccinationsErr);
                     return db.rollback(() => {
                         res.status(500).json({ error: 'Database error deleting associated vaccination records.' });
                     });
                 }
                 console.log(`Deleted ${vaccinationsResult.affectedRows} vaccination records for user ID: ${userIdToDelete}`);

                 // Step 3: Delete pets associated with the user
                 const deletePetsQuery = 'DELETE FROM pets WHERE user_id = ?';
                 db.query(deletePetsQuery, [userIdToDelete], (deletePetsErr, petsResult) => {
                     if (deletePetsErr) {
                         console.error('MySQL Error deleting user pets:', deletePetsErr);
                         return db.rollback(() => {
                             res.status(500).json({ error: 'Database error deleting associated pets.' });
                         });
                     }

                     console.log(`Deleted ${petsResult.affectedRows} pets for user ID: ${userIdToDelete}`);

                     // Step 4: Delete the user from the users table
                     const deleteUserQuery = 'DELETE FROM users WHERE id = ?';
                     db.query(deleteUserQuery, [userIdToDelete], (deleteUserErr, userResult) => {
                         if (deleteUserErr) {
                             console.error('MySQL Error deleting user:', deleteUserErr);
                             return db.rollback(() => {
                                 res.status(500).json({ error: 'Database error deleting user account.' });
                             });
                         }

                         if (userResult.affectedRows === 0) {
                             console.log('User not found for deletion with ID:', userIdToDelete);
                             return db.rollback(() => {
                                 res.status(404).json({ error: 'User account not found.' });
                             });
                         }

                         // If all database operations were successful, commit the transaction
                         db.commit(commitErr => {
                             if (commitErr) {
                                 console.error('Error committing transaction for user deletion:', commitErr);
                                 // Attempt to rollback, but the deletion might be partially done
                                 return db.rollback(() => {
                                     res.status(500).json({ error: 'Database error completing deletion.' });
                                 });
                             }

                             console.log('User and associated data deleted successfully for user ID:', userIdToDelete);

                             // Step 5: Delete the actual files from the file system (after successful DB commit)
                             filesToDelete.forEach(filePath => {
                                 const fullPath = path.join(__dirname, 'public', filePath);
                                 fs.unlink(fullPath, (unlinkErr) => {
                                     if (unlinkErr) {
                                         // Log the error but don't fail the request
                                         console.error(`Error deleting file ${fullPath}:`, unlinkErr);
                                     } else {
                                         console.log(`Deleted file: ${fullPath}`);
                                     }
                                 });
                             });


                             // Destroy the user's session after successful deletion
                             req.session.destroy((sessionErr) => {
                                 if (sessionErr) {
                                     console.error('Error destroying session after user deletion:', sessionErr);
                                     // Still return success for deletion even if session destruction fails
                                     res.status(200).json({ message: 'Account deleted successfully, but there was an issue clearing the session.' });
                                 } else {
                                     res.status(200).json({ message: 'Account deleted successfully!' });
                                 }
                             });
                         });
                     });
                 });
             });
        });
    });
});


// --- Pet Endpoints ---

// Get user's pets endpoint (requires authentication check)
app.get('/get-user-pets', (req, res) => {
    console.log('GET /get-user-pets endpoint reached.');
    if (!req.session.userId) {
        console.log('Attempted to fetch user pets without authentication');
        return res.status(401).json({ error: 'Not authenticated' });
    }
    const userId = req.session.userId;
    // *** MODIFIED QUERY: ADDED birthdate ***
    const query = 'SELECT id, name, type, breed, sex, birthdate, about, image_path FROM pets WHERE user_id = ?';
    db.query(query, [userId], (err, results) => {
        if (err) {
            console.error('Database error fetching pets:', err);
            return res.status(500).json({ error: 'Internal server error' });
        }
        console.log(`Fetched ${results.length} pets for user ID: ${userId}`);
        return res.status(200).json(results);
    });
});

// Add new pet endpoint (requires authentication check)
// Assuming this route uses multer middleware 'uploadPetImage.single('petImage')'
app.post('/add-pet', uploadPetImage.single('petImage'), (req, res) => {
    console.log('POST /add-pet endpoint reached.');
    if (!req.session.userId) { //check for the user.Id
        console.log('Attempted to add pet without authentication');
        // If a file was uploaded, delete it as the pet cannot be added without auth
        if (req.file) {
             fs.unlink(path.join(__dirname, 'public/uploads/pets/', req.file.filename), (unlinkErr) => {
                 if (unlinkErr) console.error('Error deleting uploaded file after auth failure:', unlinkErr);
             });
        }
        return res.status(401).json({ error: 'Not authenticated' });
    }

    const userId = req.session.userId;
    // *** MODIFIED: ADDED birthdate to destructuring ***
    const { name, type, breed, sex, birthdate, about } = req.body;
    // The uploaded file path is relative to the 'public' directory for serving
    const imagePath = req.file ? `/uploads/pets/${req.file.filename}` : null;

    console.log(`Attempting to add pet for user ID: ${userId}`);
    console.log('Received pet data:', req.body);
    console.log('Uploaded file:', req.file);


    // Basic validation
    if (!name || !type || !sex) {
        // If a file was uploaded, delete it as the pet cannot be added due to missing fields
        if (imagePath) {
             fs.unlink(path.join(__dirname, 'public', imagePath), (unlinkErr) => {
                 if (unlinkErr) console.error('Error deleting uploaded file:', unlinkErr);
             });
        }
        return res.status(400).json({ error: 'Name, Type, and Sex are required for a pet' });
    }

    const query = `
     INSERT INTO pets (user_id, name, type, breed, sex, birthdate, about, image_path) -- *** MODIFIED: ADDED birthdate column ***
     VALUES (?, ?, ?, ?, ?, ?, ?, ?) -- *** MODIFIED: ADDED placeholder ***
    `;
    // *** MODIFIED: ADDED birthdate value ***
    const values = [
        userId,
        name,
        type,
        breed || null, // Use null if breed is empty
        sex,
        birthdate || null, // Use null if birthdate is empty
        about || null, // Use null if about is empty
        imagePath
    ];

     console.log('SQL Values for adding pet:', values);

    db.query(query, values, (err, result) => {
        if (err) {
            console.error('MySQL Insert Error:', err);
             // If a file was uploaded, delete it as the pet cannot be added due to DB error
            if (imagePath) {
                 fs.unlink(path.join(__dirname, 'public', imagePath), (unlinkErr) => {
                     if (unlinkErr) console.error('Error deleting uploaded file:', unlinkErr);
                 });
            }
            return res.status(500).json({ error: 'Error saving pet details' });
        }
        console.log(`New pet added for user ${req.session.username}: ${name}, Pet ID: ${result.insertId}`);
        res.status(200).json({ message: 'Pet details saved successfully!', petId: result.insertId });
    });
});

// Get details for a specific pet (requires authentication check)
app.get('/get-pet-details/:petId', (req, res) => {
    console.log('GET /get-pet-details/:petId endpoint reached.');
    if (!req.session.userId) {
        console.log('Attempted to fetch pet details without authentication');
        return res.status(401).json({ error: 'Not authenticated' });
    }

    const petId = req.params.petId;
    const userId = req.session.userId;

    console.log('Fetching details for pet ID:', petId, 'by user ID:', userId);

    // *** MODIFIED QUERY: ADDED birthdate ***
    const query = 'SELECT id, name, type, breed, sex, birthdate, about, image_path FROM pets WHERE id = ? AND user_id = ?';
    db.query(query, [petId, userId], (err, results) => {
        if (err) {
            console.error('Error fetching pet details:', err);
            return res.status(500).json({ error: 'Database error' });
        }

        if (results.length > 0) {
            console.log('Pet details found for ID:', petId);
            res.json(results[0]); // Return the single pet object
        } else {
            console.log('Pet', petId, 'not found for user', userId);
            res.status(404).json({ error: 'Pet not found or does not belong to user' });
        }
    });
});

// Update pet endpoint (requires authentication check)
// Assuming this route uses multer middleware 'uploadPetImage.single('petImage')'
// Note: When using FormData with PUT, some frameworks/servers might not parse the body correctly.
// It's often easier to send JSON for data and handle file uploads separately,
// or configure your server/middleware specifically for PUT multipart/form-data.
// This code assumes req.body contains text fields and req.file contains the uploaded file if present.
app.put('/update-pet/:petId', uploadPetImage.single('petImage'), (req, res) => {
    console.log('PUT /update-pet/:petId endpoint reached.');
    if (!req.session.userId) {
        console.log('Attempted to update pet without authentication');
         // If a file was uploaded, delete it as the update cannot be done without auth
        if (req.file) {
             fs.unlink(path.join(__dirname, 'public/uploads/pets/', req.file.filename), (unlinkErr) => {
                 if (unlinkErr) console.error('Error deleting uploaded file after auth failure:', unlinkErr);
             });
        }
        return res.status(401).json({ error: 'Not authenticated' });
    }

    const petId = req.params.petId;
    const userId = req.session.userId;
    // *** MODIFIED: ADDED birthdate to destructuring ***
    const { name, type, breed, sex, birthdate, about } = req.body;
    // The uploaded file path is relative to the 'public' directory for serving
    const uploadedImagePath = req.file ? `/uploads/pets/${req.file.filename}` : null; // Use null if no new file

    console.log('Attempting to update pet ID:', petId, 'for user ID:', userId);
    console.log('Received data:', req.body);
    console.log('Uploaded image path:', uploadedImagePath);

    // First, check if the pet belongs to the user and get its old image path
    const checkOwnershipQuery = 'SELECT id, image_path FROM pets WHERE id = ? AND user_id = ?';
    db.query(checkOwnershipQuery, [petId, userId], (err, results) => {
        if (err) {
            console.error('Database error checking pet ownership for update:', err);
             // If a new file was uploaded, delete it as the update failed
            if (uploadedImagePath) {
                 fs.unlink(path.join(__dirname, 'public', uploadedImagePath), (unlinkErr) => {
                     if (unlinkErr) console.error('Error deleting uploaded file:', unlinkErr);
                 });
            }
            return res.status(500).json({ error: 'Internal server error' });
        }

        if (results.length === 0) {
             // If a new file was uploaded, delete it as the pet was not found/unauthorized
            if (uploadedImagePath) {
                 fs.unlink(path.join(__dirname, 'public', uploadedImagePath), (unlinkErr) => {
                     if (unlinkErr) console.error('Error deleting uploaded file:', unlinkErr);
                 });
            }
            console.log('Pet not found or unauthorized for update:', petId, userId);
            return res.status(404).json({ error: 'Pet not found or unauthorized' });
        }

        const oldImagePath = results[0].image_path; // Get the old image path

        // Build the update query dynamically
        let updateQuery = 'UPDATE pets SET';
        const updateValues = [];
        const updateFields = [];

        // Check if fields are present in the request body before adding to update
        if (name !== undefined) { updateFields.push('name = ?'); updateValues.push(name); }
        if (type !== undefined) { updateFields.push('type = ?'); updateValues.push(type); }
        if (breed !== undefined) { updateFields.push('breed = ?'); updateValues.push(breed || null); } // Use null if empty
        if (sex !== undefined) { updateFields.push('sex = ?'); updateValues.push(sex); }
        // *** MODIFIED: ADDED birthdate update field ***
        if (birthdate !== undefined) { updateFields.push('birthdate = ?'); updateValues.push(birthdate || null); } // Use null if empty
        // *** END MODIFIED ***
        if (about !== undefined) { updateFields.push('about = ?'); updateValues.push(about || null); } // Use null if empty


        // Handle image path update separately
        if (uploadedImagePath !== null) { // Check if a new image was uploaded
             updateFields.push('image_path = ?');
             updateValues.push(uploadedImagePath);
        }

        let combinedUpdateFields = updateFields.join(', ');


        if (!combinedUpdateFields) {
            // No fields to update
             // If a new file was uploaded, delete it as there was no update
            if (uploadedImagePath) {
                 fs.unlink(path.join(__dirname, 'public', uploadedImagePath), (unlinkErr) => {
                     if (unlinkErr) console.error('Error deleting uploaded file:', unlinkErr);
                 });
            }
            console.log('No update fields provided for pet ID:', petId);
            return res.status(200).json({ message: 'No changes detected.' }); // Indicate no changes were made
        }


        updateQuery += ' ' + combinedUpdateFields + ' WHERE id = ? AND user_id = ?';
        updateValues.push(petId, userId); // Add pet ID and user ID for the WHERE clause

        console.log('SQL Query for pet update:', updateQuery);
        console.log('SQL Values for pet update:', updateValues);

        db.query(updateQuery, updateValues, (err, result) => {
            if (err) {
                console.error('MySQL Error during pet update:', err);
                 // If a new file was uploaded, delete it as the update failed
                if (uploadedImagePath) {
                     fs.unlink(path.join(__dirname, 'public', uploadedImagePath), (unlinkErr) => {
                         if (unlinkErr) console.error('Error deleting uploaded file:', unlinkErr);
                     });
                }
                return res.status(500).json({ error: 'Error saving pet details' });
            }

            if (result.affectedRows === 0) {
                console.log('No rows updated for pet ID:', petId, 'by user ID:', userId);
                 // If a new file was uploaded, delete it as there was no update
                if (uploadedImagePath) {
                     fs.unlink(path.join(__dirname, 'public', uploadedImagePath), (unlinkErr) => {
                         if (unlinkErr) console.error('Error deleting uploaded file:', unlinkErr);
                     });
                }
                 // This should ideally not happen if the ownership check passed and there were changes
                return res.status(404).json({ error: 'Pet not found or no changes detected' });
            }

            console.log(`Pet updated: ID ${petId}, Affected Rows: ${result.affectedRows}`);

            // If update was successful AND a new image was uploaded AND there was an old image (and it wasn't a default image), delete the old one
            if (uploadedImagePath && oldImagePath && oldImagePath !== '/images/default-pet.png') {
                 const fullPath = path.join(__dirname, 'public', oldImagePath); // Assuming image_path is relative to public dir
                 fs.unlink(fullPath, (unlinkErr) => {
                     if (unlinkErr) console.error('Error deleting old pet image:', unlinkErr);
                 });
            }

            // Fetch the updated pet data to return to the frontend
            db.query(
                 // *** MODIFIED QUERY: ADDED birthdate ***
                'SELECT id, name, type, breed, sex, birthdate, about, image_path FROM pets WHERE id = ? AND user_id = ?',
                [petId, userId],
                (err, updatedResults) => {
                    if (err) {
                        console.error('MySQL Error fetching updated pet after update:', err);
                        return res.status(500).json({ message: 'Pet updated, but could not retrieve updated details.', petId });
                    }

                    if (updatedResults.length > 0) {
                        const fullyUpdatedPet = updatedResults[0];
                        console.log('Fetched updated pet for response:', fullyUpdatedPet);

                        res.status(200).json({
                            message: 'Pet details updated successfully!',
                            updatedPet: fullyUpdatedPet // Return the full updated pet object
                        });
                    } else {
                        console.error('Could not refetch updated pet ID:', petId, 'for user ID:', userId);
                        res.status(500).json({ message: 'Pet updated, but could not find updated details.', petId });
                    }
                }
            );
        });
    });
});

// Route to delete a specific pet (requires authentication check)
app.delete('/delete-pet/:petId', (req, res) => {
    console.log('DELETE /delete-pet/:petId endpoint reached.');
    // Check if the user is logged in
    if (!req.session.userId) {
        console.log('Attempted to delete pet without authentication');
        return res.status(401).json({ error: 'Not authenticated' });
    }

    const petIdToDelete = req.params.petId; // Get the pet ID from the URL parameters
    const userId = req.session.userId; // Get the logged-in user's ID from the session

    console.log(`Attempting to delete pet ID: ${petIdToDelete} for user ID: ${userId}`);

    // Start a transaction for pet deletion to include vaccinations, feeding logs, vet visits, and image
    db.beginTransaction(err => {
        if (err) {
             console.error('Error starting transaction for pet deletion:', err);
            return res.status(500).json({ error: 'Database error during deletion process.' });
        }

        // Step 1: Get the image path of the pet
        const getImagePathQuery = 'SELECT image_path FROM pets WHERE id = ? AND user_id = ?';
        db.query(getImagePathQuery, [petIdToDelete, userId], (getImageErr, imageResults) => {
            if (getImageErr) {
                 console.error('MySQL Error getting pet image path for deletion:', getImageErr);
                 return db.rollback(() => {
                     res.status(500).json({ error: 'Database error preparing for file deletion.' });
                 });
            }

            if (imageResults.length === 0) {
                 console.log(`Pet ID: ${petIdToDelete} not found or does not belong to user ID: ${userId}`);
                 return db.rollback(() => {
                     res.status(404).json({ error: 'Pet not found or does not belong to you.' });
                 });
            }

            const imagePathToDelete = imageResults[0].image_path;

            // Step 2: Delete vaccination records associated with the pet
             const deleteVaccinationsQuery = 'DELETE FROM vaccination_records WHERE pet_id = ?';
             db.query(deleteVaccinationsQuery, [petIdToDelete], (deleteVaccinationsErr, vaccinationsResult) => {
                 if (deleteVaccinationsErr) {
                      console.error('MySQL Error deleting pet vaccinations:', deleteVaccinationsErr);
                      return db.rollback(() => {
                          res.status(500).json({ error: 'Database error deleting associated vaccination records.' });
                      });
                 }
                 console.log(`Deleted ${vaccinationsResult.affectedRows} vaccination records for pet ID: ${petIdToDelete}`);

                 // Step 3: Delete feeding logs associated with the pet
                  const deleteFeedingLogsQuery = 'DELETE FROM feeding_logs WHERE pet_id = ?';
                  db.query(deleteFeedingLogsQuery, [petIdToDelete], (deleteFeedingLogsErr, feedingLogsResult) => {
                      if (deleteFeedingLogsErr) {
                           console.error('MySQL Error deleting pet feeding logs:', deleteFeedingLogsErr);
                           return db.rollback(() => {
                               res.status(500).json({ error: 'Database error deleting associated feeding logs.' });
                           });
                      }
                      console.log(`Deleted ${feedingLogsResult.affectedRows} feeding logs for pet ID: ${petIdToDelete}`);

                      // Step 4: Delete vet visit records associated with the pet
                       const deleteVetVisitsQuery = 'DELETE FROM vet_visits WHERE pet_id = ?';
                       db.query(deleteVetVisitsQuery, [petIdToDelete], (deleteVetVisitsErr, vetVisitsResult) => {
                           if (deleteVetVisitsErr) {
                                console.error('MySQL Error deleting pet vet visits:', deleteVetVisitsErr);
                                return db.rollback(() => {
                                    res.status(500).json({ error: 'Database error deleting associated vet visit records.' });
                                });
                           }
                           console.log(`Deleted ${vetVisitsResult.affectedRows} vet visit records for pet ID: ${petIdToDelete}`);


                           // Step 5: Delete the pet from the pets table
                            const deletePetQuery = 'DELETE FROM pets WHERE id = ? AND user_id = ?';
                            db.query(deletePetQuery, [petIdToDelete, userId], (deletePetErr, petResult) => {
                                if (deletePetErr) {
                                     console.error('MySQL Error deleting pet:', deletePetErr);
                                     return db.rollback(() => {
                                         res.status(500).json({ error: 'Database error during pet deletion.' });
                                     });
                                }

                                if (petResult.affectedRows === 0) {
                                    // This case should ideally not happen if the ownership check passed
                                     console.log(`Pet ID: ${petIdToDelete} not found after ownership check.`);
                                     return db.rollback(() => {
                                         res.status(404).json({ error: 'Pet not found after ownership check.' });
                                     });
                                }

                                // If all database operations were successful, commit the transaction
                                 db.commit(commitErr => {
                                     if (commitErr) {
                                          console.error('Error committing transaction for pet deletion:', commitErr);
                                          // Attempt to rollback, but the deletion might be partially done
                                          return db.rollback(() => {
                                              res.status(500).json({ error: 'Database error completing deletion.' });
                                          });
                                     }

                                     console.log(`Pet ID: ${petIdToDelete} and associated data deleted successfully.`);

                                     // Step 6: Delete the actual image file from the file system (after successful DB commit)
                                     if (imagePathToDelete && imagePathToDelete !== '/images/default-pet.png') {
                                          const fullPath = path.join(__dirname, 'public', imagePathToDelete);
                                           fs.unlink(fullPath, (unlinkErr) => {
                                               if (unlinkErr) {
                                                   // Log the error but don't fail the request
                                                    console.error(`Error deleting pet image file ${fullPath}:`, unlinkErr);
                                               } else {
                                                    console.log(`Deleted pet image file: ${fullPath}`);
                                               }
                                           });
                                     }

                                     res.status(200).json({ message: 'Pet deleted successfully!' });
                                });
                            });
                       });
                  });
             });
        });
    });
});

// --- Vaccination Endpoints ---

// Get vaccination records for a specific pet (requires authentication check)
app.get('/get-pet-vaccinations/:petId', (req, res) => {
    console.log('GET /get-pet-vaccinations/:petId endpoint reached.');
    if (!req.session.userId) {
        console.log('Attempted to fetch vaccination records without authentication');
        return res.status(401).json({ error: 'Not authenticated' });
    }

    const userId = req.session.userId;
    const petId = req.params.petId;

    console.log(`Workspaceing vaccination records for pet ID: ${petId} by user ID: ${userId}`);

    // First, verify that the pet belongs to the logged-in user
    const checkOwnershipQuery = 'SELECT id FROM pets WHERE id = ? AND user_id = ?';
    db.query(checkOwnershipQuery, [petId, userId], (err, petResults) => {
        if (err) {
            console.error('Database error checking pet ownership for vaccinations:', err);
            return res.status(500).json({ error: 'Internal server error' });
        }

        if (petResults.length === 0) {
            console.log(`Pet ID: ${petId} not found or unauthorized for user ID: ${userId}`);
            return res.status(404).json({ error: 'Pet not found or unauthorized' });
        }

        // Fetch vaccination records for the pet
        // Query correctly includes vet_in_charge based on your previous code
        const query = `
            SELECT
                id,
                pet_id,
                vaccine_name,
                date_administered,
                next_due_date,
                vet_clinic,
                vet_in_charge
            FROM
                vaccination_records
            WHERE
                pet_id = ?
            ORDER BY date_administered DESC`;
        db.query(query, [petId], (err, results) => {
            if (err) {
                console.error('Database error fetching vaccination records:', err);
                return res.status(500).json({ error: 'Internal server error' });
            }
            console.log(`Workspaceed ${results.length} vaccination records for pet ID: ${petId}`);
            // console.log('Fetched records data:', results); // <-- UNCOMMENT TO LOG FETCHED DATA
            return res.status(200).json(results);
        });
    });
});

// Add new vaccination record (requires authentication check)
app.post('/add-vaccination', (req, res) => {
    console.log('POST /add-vaccination endpoint reached.');
    if (!req.session.userId) {
        console.log('Attempted to add vaccination without authentication');
        return res.status(401).json({ error: 'Not authenticated' });
    }

    const userId = req.session.userId;
    // *** CORRECTION: ADDED vet_in_charge TO DESTRUCTURING ***
    const { pet_id, vaccine_name, date_administered, next_due_date, vet_clinic, vet_in_charge } = req.body;

    console.log(`Attempting to add vaccination for pet ID: ${pet_id} by user ID: ${userId}`);
    console.log('Received vaccination data:', req.body);

    // Basic validation
    if (!pet_id || !vaccine_name || !date_administered) {
        return res.status(400).json({ error: 'Pet ID, Vaccine Name, and Date Administered are required' });
    }

    // Verify that the pet belongs to the logged-in user before adding a record
    const checkOwnershipQuery = 'SELECT id FROM pets WHERE id = ? AND user_id = ?';
    db.query(checkOwnershipQuery, [pet_id, userId], (err, petResults) => {
        if (err) {
            console.error('Database error checking pet ownership for adding vaccination:', err);
            return res.status(500).json({ error: 'Internal server error' });
        }

        if (petResults.length === 0) {
            console.log(`Pet ID: ${pet_id} not found or unauthorized for user ID: ${userId}`);
            return res.status(404).json({ error: 'Pet not found or unauthorized' });
        }

        // Insert the new vaccination record
        const query = 'INSERT INTO vaccination_records (pet_id, vaccine_name, date_administered, next_due_date, vet_clinic, vet_in_charge) VALUES (?, ?, ?, ?, ?, ?)';
        // Use null for optional fields if they are empty strings or undefined
        const values = [
            pet_id,
            vaccine_name,
            date_administered,
            next_due_date || null,
            vet_clinic || null,
            vet_in_charge || null
        ];

        console.log('SQL Values for adding vaccination:', values);

        db.query(query, values, (err, result) => {
            if (err) {
                console.error('Database error adding vaccination record:', err);
                // More specific error check? E.g., if it's a column not found error?
                // if (err.code === 'ER_BAD_FIELD_ERROR') { ... }
                return res.status(500).json({ error: 'Failed to add vaccination record due to database error' }); // More descriptive error
            }
            console.log(`New vaccination record added for pet ID ${pet_id}, Record ID: ${result.insertId}`);
            return res.status(201).json({ message: 'Vaccination record added successfully', recordId: result.insertId });
        });
    });
});

// Update vaccination record (requires authentication check)
app.put('/update-vaccination/:recordId', (req, res) => {
    console.log('PUT /update-vaccination/:recordId endpoint reached.');
    if (!req.session.userId) {
        console.log('Attempted to update vaccination record without authentication');
        return res.status(401).json({ error: 'Not authenticated' });
    }

    const userId = req.session.userId;
    const recordId = req.params.recordId;
     // *** CORRECTION: ADDED vet_in_charge TO DESTRUCTURING ***
    const { vaccine_name, date_administered, next_due_date, vet_clinic, vet_in_charge } = req.body;

    console.log(`Attempting to update vaccination record ID: ${recordId} by user ID: ${userId}`);
    console.log('Received update data:', req.body);

    // Basic validation
    if (!vaccine_name || !date_administered) {
        return res.status(400).json({ error: 'Vaccine Name and Date Administered are required' });
    }

    // Verify that the vaccination record exists and belongs to a pet owned by the logged-in user
    const checkOwnershipQuery = 'SELECT vr.id, vr.pet_id FROM vaccination_records vr JOIN pets p ON vr.pet_id = p.id WHERE vr.id = ? AND p.user_id = ?';
    db.query(checkOwnershipQuery, [recordId, userId], (err, results) => {
        if (err) {
            console.error('Database error checking vaccination record ownership for update:', err);
            return res.status(500).json({ error: 'Internal server error' });
        }

        if (results.length === 0) {
            console.log(`Vaccination record ID: ${recordId} not found or unauthorized for user ID: ${userId}`);
            return res.status(404).json({ error: 'Vaccination record not found or unauthorized' });
        }

        // Update the vaccination record
         // *** CORRECTION: ADDED vet_in_charge TO SET CLAUSE AND PLACEHOLDER ***
        const query = `
            UPDATE vaccination_records
            SET
                vaccine_name = ?,
                date_administered = ?,
                next_due_date = ?,
                vet_clinic = ?,
                vet_in_charge = ? 
            WHERE
                id = ?`;
         // Use null for optional fields if they are empty strings or undefined
         // *** CORRECTION: ADDED vet_in_charge VALUE TO ARRAY ***
        const values = [
            vaccine_name,
            date_administered,
            next_due_date || null,
            vet_clinic || null,
            vet_in_charge || null, 
            recordId // recordId is the last parameter for the WHERE clause
        ];

        console.log('SQL Values for updating vaccination:', values);

        db.query(query, values, (err, result) => {
            if (err) {
                console.error('Database error updating vaccination record:', err);
                 // More specific error check? E.g., if it's a column not found error?
                // if (err.code === 'ER_BAD_FIELD_ERROR') { ... }
                return res.status(500).json({ error: 'Failed to update vaccination record due to database error' }); // More descriptive error
            }

             if (result.affectedRows === 0) {
                 // This might happen if the record was found but no fields were actually changed,
                 // or if the record was somehow deleted between the ownership check and the update query.
                 // Given the ownership check passed, this is likely 'no fields changed'.
                 console.log(`Vaccination record ID: ${recordId} found but no changes detected.`);
                 return res.status(200).json({ message: 'No changes detected.' });
             }

            console.log(`Vaccination record updated: ID ${recordId}, Affected Rows: ${result.affectedRows}`); // Log affected rows
            return res.status(200).json({ message: 'Vaccination record updated successfully' });
        });
    });
});

// Delete vaccination record - This route does NOT need changes for the new field
app.delete('/delete-vaccination/:recordId', (req, res) => {
    console.log('DELETE /delete-vaccination/:recordId endpoint reached.');
    if (!req.session.userId) {
        console.log('Attempted to delete vaccination record without authentication');
        return res.status(401).json({ error: 'Not authenticated' });
    }

    const userId = req.session.userId;
    const recordId = req.params.recordId;

    console.log(`Attempting to delete vaccination record ID: ${recordId} by user ID: ${userId}`);

    // Verify that the vaccination record exists and belongs to a pet owned by the logged-in user
    const checkOwnershipQuery = 'SELECT vr.id FROM vaccination_records vr JOIN pets p ON vr.pet_id = p.id WHERE vr.id = ? AND p.user_id = ?';
    db.query(checkOwnershipQuery, [recordId, userId], (err, results) => {
        if (err) {
            console.error('Database error checking vaccination record ownership for deletion:', err);
            return res.status(500).json({ error: 'Internal server error' });
        }

        if (results.length === 0) {
            console.log(`Vaccination record ID: ${recordId} not found or unauthorized for user ID: ${userId}`);
            return res.status(404).json({ error: 'Vaccination record not found or unauthorized' });
        }

        // Delete the vaccination record
        const query = 'DELETE FROM vaccination_records WHERE id = ?';
        db.query(query, [recordId], (err, result) => {
            if (err) {
                console.error('Database error deleting vaccination record:', err);
                return res.status(500).json({ error: 'Failed to delete vaccination record' });
            }

            if (result.affectedRows > 0) {
                console.log(`Vaccination record deleted: ID ${recordId}`);
                return res.status(200).json({ message: 'Vaccination record deleted successfully' });
            } else {
                 // This case should ideally not happen if the ownership check passed
                 console.log(`Vaccination record ID: ${recordId} not found after ownership check.`);
                return res.status(404).json({ error: 'Vaccination record not found after ownership check' });
            }
        });
    });
});

// --- Feeding Log Routes ---

// Get feeding logs for a specific pet (requires authentication and pet ownership check)
app.get('/get-pet-feedinglogs/:petId', (req, res) => {
    console.log('GET /get-pet-feedinglogs/:petId endpoint reached.');
    if (!req.session.userId) {
        console.log('Attempted to fetch feeding logs without authentication');
        return res.status(401).json({ error: 'Not authenticated' });
    }

    const userId = req.session.userId;
    const petId = req.params.petId;

    console.log(`Fetching feeding logs for pet ID: ${petId} by user ID: ${userId}`);

    // First, verify that the pet belongs to the logged-in user
    const checkOwnershipQuery = 'SELECT id FROM pets WHERE id = ? AND user_id = ?';
    db.query(checkOwnershipQuery, [petId, userId], (err, petResults) => {
        if (err) {
            console.error('Database error checking pet ownership for feeding logs:', err);
            return res.status(500).json({ error: 'Internal server error' });
        }

        if (petResults.length === 0) {
            console.log(`Pet ID: ${petId} not found or unauthorized for user ID: ${userId}`);
            return res.status(404).json({ error: 'Pet not found or unauthorized' });
        }

        // Fetch feeding logs for the pet
        // Select all relevant columns
        const query = `
            SELECT
                id,
                pet_id,
                feeding_time,
                food_type,
                amount,
                notes,
                created_at,
                updated_at
            FROM
                feeding_logs
            WHERE
                pet_id = ?
            ORDER BY feeding_time DESC`;
        db.query(query, [petId], (err, results) => {
            if (err) {
                console.error('Database error fetching feeding logs:', err);
                return res.status(500).json({ error: 'Internal server error' });
            }
            console.log(`Fetched ${results.length} feeding logs for pet ID: ${petId}`);
            return res.status(200).json(results);
        });
    });
});

// Add new feeding log (requires authentication and pet ownership check)
app.post('/add-feedinglog', (req, res) => {
    console.log('POST /add-feedinglog endpoint reached.');
    if (!req.session.userId) {
        console.log('Attempted to add feeding log without authentication');
        return res.status(401).json({ error: 'Not authenticated' });
    }

    const userId = req.session.userId;
    const { pet_id, feeding_time, food_type, amount, notes } = req.body;

    console.log(`Attempting to add feeding log for pet ID: ${pet_id} by user ID: ${userId}`);
    console.log('Received feeding log data:', req.body);

    // Basic validation
    if (!pet_id || !feeding_time || !food_type) {
        return res.status(400).json({ error: 'Pet ID, Feeding Date & Time, and Food Type are required' });
    }

    // Verify that the pet belongs to the logged-in user before adding a log
    const checkOwnershipQuery = 'SELECT id FROM pets WHERE id = ? AND user_id = ?';
    db.query(checkOwnershipQuery, [pet_id, userId], (err, petResults) => {
        if (err) {
            console.error('Database error checking pet ownership for adding feeding log:', err);
            return res.status(500).json({ error: 'Internal server error' });
        }

        if (petResults.length === 0) {
            console.log(`Pet ID: ${pet_id} not found or unauthorized for user ID: ${userId}`);
            return res.status(404).json({ error: 'Pet not found or unauthorized' });
        }

        // Insert the new feeding log record
        const query = 'INSERT INTO feeding_logs (pet_id, feeding_time, food_type, amount, notes) VALUES (?, ?, ?, ?, ?)';
        // Use null for optional fields if they are empty strings or undefined
        const values = [
            pet_id,
            feeding_time, // DATETIME format from frontend should work directly
            food_type,
            amount || null,
            notes || null
        ];

        console.log('SQL Values for adding feeding log:', values);

        db.query(query, values, (err, result) => {
            if (err) {
                console.error('Database error adding feeding log record:', err);
                return res.status(500).json({ error: 'Failed to add feeding log record' });
            }
            console.log(`New feeding log record added for pet ID ${pet_id}, Log ID: ${result.insertId}`);
            return res.status(201).json({ message: 'Feeding log record added successfully', logId: result.insertId });
        });
    });
});

// Update feeding log record (requires authentication and log/pet ownership check)
app.put('/update-feedinglog/:logId', (req, res) => {
    console.log('PUT /update-feedinglog/:logId endpoint reached.');
    if (!req.session.userId) {
        console.log('Attempted to update feeding log record without authentication');
        return res.status(401).json({ error: 'Not authenticated' });
    }

    const userId = req.session.userId;
    const logId = req.params.logId;
    const { pet_id, feeding_time, food_type, amount, notes } = req.body; // pet_id is included in body for verification

    console.log(`Attempting to update feeding log record ID: ${logId} by user ID: ${userId}`);
    console.log('Received update data:', req.body);

    // Basic validation
    if (!pet_id || !feeding_time || !food_type) { // pet_id is crucial for ownership check
        return res.status(400).json({ error: 'Pet ID, Feeding Date & Time, and Food Type are required' });
    }

    // Verify that the feeding log exists and belongs to a pet owned by the logged-in user
    // Join feeding_logs -> pets and check log ID and user ID
    const checkOwnershipQuery = 'SELECT fl.id FROM feeding_logs fl JOIN pets p ON fl.pet_id = p.id WHERE fl.id = ? AND p.user_id = ? AND fl.pet_id = ?';
    db.query(checkOwnershipQuery, [logId, userId, pet_id], (err, results) => {
        if (err) {
            console.error('Database error checking feeding log ownership for update:', err);
            return res.status(500).json({ error: 'Internal server error' });
        }

        if (results.length === 0) {
            console.log(`Feeding log ID: ${logId} not found or unauthorized for user ID: ${userId} and pet ID: ${pet_id}`);
            return res.status(404).json({ error: 'Feeding log not found or unauthorized' });
        }

        // Update the feeding log record
        const query = `
            UPDATE feeding_logs
            SET
                feeding_time = ?,
                food_type = ?,
                amount = ?,
                notes = ?
            WHERE
                id = ?`;
        // Use null for optional fields if they are empty strings or undefined
        const values = [
            feeding_time,
            food_type,
            amount || null,
            notes || null,
            logId // logId is the last parameter for the WHERE clause
        ];

        console.log('SQL Values for updating feeding log:', values);

        db.query(query, values, (err, result) => {
            if (err) {
                console.error('Database error updating feeding log record:', err);
                return res.status(500).json({ error: 'Failed to update feeding log record' });
            }

             if (result.affectedRows === 0) {
                 console.log(`Feeding log ID: ${logId} found but no changes detected.`);
                 return res.status(200).json({ message: 'No changes detected.' });
             }

            console.log(`Feeding log record updated: ID ${logId}, Affected Rows: ${result.affectedRows}`);
            return res.status(200).json({ message: 'Feeding log record updated successfully' });
        });
    });
});

// Delete feeding log record (requires authentication and log/pet ownership check)
app.delete('/delete-feedinglog/:logId', (req, res) => {
    console.log('DELETE /delete-feedinglog/:logId endpoint reached.');
    if (!req.session.userId) {
        console.log('Attempted to delete feeding log record without authentication');
        return res.status(401).json({ error: 'Not authenticated' });
    }

    const userId = req.session.userId;
    const logId = req.params.logId;
    // Note: pet_id is NOT in the URL, but we can get it from the log record itself
    // or require it in the body if preferred, but checking ownership via join is safer.

    console.log(`Attempting to delete feeding log record ID: ${logId} by user ID: ${userId}`);

    // Verify that the feeding log exists and belongs to a pet owned by the logged-in user
    // Join feeding_logs -> pets and check log ID and user ID
    const checkOwnershipQuery = 'SELECT fl.id, fl.pet_id FROM feeding_logs fl JOIN pets p ON fl.pet_id = p.id WHERE fl.id = ? AND p.user_id = ?';
     db.query(checkOwnershipQuery, [logId, userId], (err, results) => {
        if (err) {
            console.error('Database error checking feeding log ownership for deletion:', err);
            return res.status(500).json({ error: 'Internal server error' });
        }

        if (results.length === 0) {
            console.log(`Feeding log ID: ${logId} not found or unauthorized for user ID: ${userId}`);
            return res.status(404).json({ error: 'Feeding log not found or unauthorized' });
        }

        const petIdOfLog = results[0].pet_id; // Get the pet_id associated with the log

        // Delete the feeding log record
        const query = 'DELETE FROM feeding_logs WHERE id = ?';
        db.query(query, [logId], (err, result) => {
            if (err) {
                console.error('Database error deleting feeding log record:', err);
                return res.status(500).json({ error: 'Failed to delete feeding log record' });
            }

            if (result.affectedRows > 0) {
                console.log(`Feeding log record deleted: ID ${logId}`);
                // Return the petId so the frontend can refresh the correct list
                return res.status(200).json({ message: 'Feeding log record deleted successfully', petId: petIdOfLog });
            } else {
                 // This case should ideally not happen if the ownership check passed
                 console.log(`Feeding log ID: ${logId} not found after ownership check.`);
                return res.status(404).json({ error: 'Feeding log not found after ownership check' });
            }
        });
    });
});

// --- Vet Visit Routes ---

// Get vet visit records for a specific pet (requires authentication and pet ownership check)
app.get('/get-pet-vetvisits/:petId', (req, res) => {
    console.log('GET /get-pet-vetvisits/:petId endpoint reached.');
    if (!req.session.userId) {
        console.log('Attempted to fetch vet visit records without authentication');
        return res.status(401).json({ error: 'Not authenticated' });
    }

    const userId = req.session.userId;
    const petId = req.params.petId;

    console.log(`Fetching vet visit records for pet ID: ${petId} by user ID: ${userId}`);

    // First, verify that the pet belongs to the logged-in user
    const checkOwnershipQuery = 'SELECT id FROM pets WHERE id = ? AND user_id = ?';
    db.query(checkOwnershipQuery, [petId, userId], (err, petResults) => {
        if (err) {
            console.error('Database error checking pet ownership for vet visits:', err);
            return res.status(500).json({ error: 'Internal server error' });
        }

        if (petResults.length === 0) {
            console.log(`Pet ID: ${petId} not found or unauthorized for user ID: ${userId}`);
            return res.status(404).json({ error: 'Pet not found or unauthorized' });
        }

        // Fetch vet visit records for the pet
        // Select all relevant columns
        const query = `
            SELECT
                id,
                pet_id,
                visit_date,
                clinic_name,
                vet_name,
                reason,
                notes,
                created_at,
                updated_at
            FROM
                vet_visits
            WHERE
                pet_id = ?
            ORDER BY visit_date DESC`;
        db.query(query, [petId], (err, results) => {
            if (err) {
                console.error('Database error fetching vet visit records:', err);
                return res.status(500).json({ error: 'Internal server error' });
            }
            console.log(`Fetched ${results.length} vet visit records for pet ID: ${petId}`);
            return res.status(200).json(results);
        });
    });
});

// Add new vet visit record (requires authentication and pet ownership check)
app.post('/add-vetvisit', (req, res) => {
    console.log('POST /add-vetvisit endpoint reached.');
    if (!req.session.userId) {
        console.log('Attempted to add vet visit record without authentication');
        return res.status(401).json({ error: 'Not authenticated' });
    }

    const userId = req.session.userId;
    const { pet_id, visit_date, clinic_name, vet_name, reason, notes } = req.body;

    console.log(`Attempting to add vet visit record for pet ID: ${pet_id} by user ID: ${userId}`);
    console.log('Received vet visit data:', req.body);

    // Basic validation
    if (!pet_id || !visit_date) { // Visit date is required
        return res.status(400).json({ error: 'Pet ID and Visit Date are required' });
    }

    // Verify that the pet belongs to the logged-in user before adding a record
    const checkOwnershipQuery = 'SELECT id FROM pets WHERE id = ? AND user_id = ?';
    db.query(checkOwnershipQuery, [pet_id, userId], (err, petResults) => {
        if (err) {
            console.error('Database error checking pet ownership for adding vet visit:', err);
            return res.status(500).json({ error: 'Internal server error' });
        }

        if (petResults.length === 0) {
            console.log(`Pet ID: ${pet_id} not found or unauthorized for user ID: ${userId}`);
            return res.status(404).json({ error: 'Pet not found or unauthorized' });
        }

        // Insert the new vet visit record
        const query = 'INSERT INTO vet_visits (pet_id, visit_date, clinic_name, vet_name, reason, notes) VALUES (?, ?, ?, ?, ?, ?)';
        // Use null for optional fields if they are empty strings or undefined
        const values = [
            pet_id,
            visit_date, // DATE format from frontend should work directly
            clinic_name || null,
            vet_name || null,
            reason || null,
            notes || null
        ];

        console.log('SQL Values for adding vet visit:', values);

        db.query(query, values, (err, result) => {
            if (err) {
                console.error('Database error adding vet visit record:', err);
                return res.status(500).json({ error: 'Failed to add vet visit record' });
            }
            console.log(`New vet visit record added for pet ID ${pet_id}, Visit ID: ${result.insertId}`);
            return res.status(201).json({ message: 'Vet visit record added successfully', visitId: result.insertId });
        });
    });
});

// Update vet visit record (requires authentication and record/pet ownership check)
app.put('/update-vetvisit/:visitId', (req, res) => {
    console.log('PUT /update-vetvisit/:visitId endpoint reached.');
    if (!req.session.userId) {
        console.log('Attempted to update vet visit record without authentication');
        return res.status(401).json({ error: 'Not authenticated' });
    }

    const userId = req.session.userId;
    const visitId = req.params.visitId;
    const { pet_id, visit_date, clinic_name, vet_name, reason, notes } = req.body; // pet_id is included in body for verification

    console.log(`Attempting to update vet visit record ID: ${visitId} by user ID: ${userId}`);
    console.log('Received update data:', req.body);

    // Basic validation
    if (!pet_id || !visit_date) { // pet_id and visit_date are crucial
        return res.status(400).json({ error: 'Pet ID and Visit Date are required' });
    }

    // Verify that the vet visit record exists and belongs to a pet owned by the logged-in user
    // Join vet_visits -> pets and check visit ID and user ID
    const checkOwnershipQuery = 'SELECT vv.id FROM vet_visits vv JOIN pets p ON vv.pet_id = p.id WHERE vv.id = ? AND p.user_id = ? AND vv.pet_id = ?';
    db.query(checkOwnershipQuery, [visitId, userId, pet_id], (err, results) => {
        if (err) {
            console.error('Database error checking vet visit ownership for update:', err);
            return res.status(500).json({ error: 'Internal server error' });
        }

        if (results.length === 0) {
            console.log(`Vet visit record ID: ${visitId} not found or unauthorized for user ID: ${userId} and pet ID: ${pet_id}`);
            return res.status(404).json({ error: 'Vet visit record not found or unauthorized' });
        }

        // Update the vet visit record
        const query = `
            UPDATE vet_visits
            SET
                visit_date = ?,
                clinic_name = ?,
                vet_name = ?,
                reason = ?,
                notes = ?
            WHERE
                id = ?`;
        // Use null for optional fields if they are empty strings or undefined
        const values = [
            visit_date,
            clinic_name || null,
            vet_name || null,
            reason || null,
            notes || null,
            visitId // visitId is the last parameter for the WHERE clause
        ];

        console.log('SQL Values for updating vet visit:', values);

        db.query(query, values, (err, result) => {
            if (err) {
                console.error('Database error updating vet visit record:', err);
                return res.status(500).json({ error: 'Failed to update vet visit record' });
            }

             if (result.affectedRows === 0) {
                 console.log(`Vet visit record ID: ${visitId} found but no changes detected.`);
                 return res.status(200).json({ message: 'No changes detected.' });
             }

            console.log(`Vet visit record updated: ID ${visitId}, Affected Rows: ${result.affectedRows}`);
            return res.status(200).json({ message: 'Vet visit record updated successfully' });
        });
    });
});

// Delete vet visit record (requires authentication and record/pet ownership check)
app.delete('/delete-vetvisit/:visitId', (req, res) => {
    console.log('DELETE /delete-vetvisit/:visitId endpoint reached.');
    if (!req.session.userId) {
        console.log('Attempted to delete vet visit record without authentication');
        return res.status(401).json({ error: 'Not authenticated' });
    }

    const userId = req.session.userId;
    const visitId = req.params.visitId;

    console.log(`Attempting to delete vet visit record ID: ${visitId} by user ID: ${userId}`);

    // Verify that the vet visit record exists and belongs to a pet owned by the logged-in user
    // Join vet_visits -> pets and check visit ID and user ID
    const checkOwnershipQuery = 'SELECT vv.id, vv.pet_id FROM vet_visits vv JOIN pets p ON vv.pet_id = p.id WHERE vv.id = ? AND p.user_id = ?';
     db.query(checkOwnershipQuery, [visitId, userId], (err, results) => {
        if (err) {
            console.error('Database error checking vet visit ownership for deletion:', err);
            return res.status(500).json({ error: 'Internal server error' });
        }

        if (results.length === 0) {
            console.log(`Vet visit record ID: ${visitId} not found or unauthorized for user ID: ${userId}`);
            return res.status(404).json({ error: 'Vet visit record not found or unauthorized' });
        }

        const petIdOfVisit = results[0].pet_id; // Get the pet_id associated with the visit

        // Delete the vet visit record
        const query = 'DELETE FROM vet_visits WHERE id = ?';
        db.query(query, [visitId], (err, result) => {
            if (err) {
                console.error('Database error deleting vet visit record:', err);
                return res.status(500).json({ error: 'Failed to delete vet visit record' });
            }

            if (result.affectedRows > 0) {
                console.log(`Vet visit record deleted: ID ${visitId}`);
                // Return the petId so the frontend can refresh the correct list
                return res.status(200).json({ message: 'Vet visit record deleted successfully', petId: petIdOfVisit });
            } else {
                 // This case should ideally not happen if the ownership check passed
                 console.log(`Vet visit record ID: ${visitId} not found after ownership check.`);
                return res.status(404).json({ error: 'Vet visit record not found after ownership check' });
            }
        });
    });
});

// --- Export Data Route ---

// Route to handle data export requests
app.post('/export-data', async (req, res) => {
    console.log('POST /export-data endpoint reached.');
    if (!req.session.userId) {
        console.log('Attempted to export data without authentication');
        return res.status(401).json({ error: 'Not authenticated' });
    }

    const userId = req.session.userId;
    const { dataTypes, format } = req.body; // Get selected data types and format from the request body

    console.log(`Export request from user ID: ${userId}`);
    console.log('Selected data types:', dataTypes);
    console.log('Selected format:', format);

    // Basic validation
    if (!dataTypes || !Array.isArray(dataTypes) || dataTypes.length === 0) {
        return res.status(400).json({ error: 'No data types selected for export.' });
    }

    // Note: For simplicity, we are generating CSV regardless of 'excel' option,
    // as Excel can open CSV files. True XLSX generation requires a different library.
    if (format !== 'csv' && format !== 'excel') {
        return res.status(400).json({ error: 'Invalid export format selected.' });
    }

    // Set response headers for file download
    const filename = `pawlog_export_${new Date().toISOString().split('T')[0]}.csv`;
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    const stringifier = stringify({ bom: true }); // bom: true for UTF-8 compatibility in Excel
    stringifier.pipe(res); // Pipe the stringifier output directly to the response

    try {
        // Fetch data for all selected types in parallel
        const fetchDataPromises = dataTypes.map(dataType => {
            let query = '';
            let sectionTitle = '';
            let columns = {};

            switch (dataType) {
                case 'profile':
                    sectionTitle = 'User Profile';
                    query = 'SELECT id, username, name, email, contact, birthday, bio, created_at FROM users WHERE id = ?';
                    columns = {
                        id: 'User ID',
                        username: 'Username',
                        name: 'Name',
                        email: 'Email',
                        contact: 'Contact',
                        birthday: 'Birthday',
                        bio: 'Bio',
                        created_at: 'Created At'
                    };
                    // Return a promise that resolves with the data and its metadata
                    return new Promise((resolve, reject) => {
                        db.query(query, [userId], (err, results) => {
                            if (err) reject(err);
                            else {
                                // Format date for readability before resolving
                                const formattedData = results.map(user => ({
                                    id: user.id,
                                    username: user.username,
                                    name: user.name,      
                                    email: user.email,   
                                    contact: user.contact ? `${user.contact}` : '',
                                    birthday: user.birthday ? `${new Date(user.created_at).toLocaleDateString()}` : '',                        
                                    bio: user.bio,
                                    created_at: user.created_at ? `${new Date(user.created_at).toLocaleDateString()}` : ''
                                }));
                                resolve({ dataType, sectionTitle, columns, data: formattedData });
                            }
                        });
                    });

                case 'pets':
                    sectionTitle = 'Pet Details';
                    query = 'SELECT id, name, type, breed, sex, birthdate, about, created_at FROM pets WHERE user_id = ?';
                     columns = {
                        id: 'Pet ID',
                        name: 'Name',
                        type: 'Type',
                        breed: 'Breed',
                        sex: 'Sex',
                        birthdate: 'Birthdate',
                        about: 'About',
                        created_at: 'Created At'
                    };
                    return new Promise((resolve, reject) => {
                        db.query(query, [userId], (err, results) => {
                            if (err) reject(err);
                             else {
                                 // Format date for readability and prefix with single quote for Excel
                                 const formattedData = results.map(pet => ({
                                     id: pet.id,
                                     name: pet.name,
                                     type: pet.type,
                                     breed: pet.breed,
                                     sex: pet.sex,                                     
                                     birthdate: pet.birthdate ? `${new Date(pet.birthdate).toLocaleDateString()}` : '',
                                     about: pet.about,                                     
                                     created_at: pet.created_at ? `${new Date(pet.created_at).toLocaleDateString()}` : ''
                                 }));
                                 resolve({ dataType, sectionTitle, columns, data: formattedData });
                             }
                        });
                    });

                case 'vaccinations':
                    sectionTitle = 'Vaccination Records';
                    query = `
                        SELECT
                            vr.id,
                            p.name AS pet_name, -- Join with pets to get pet name
                            vr.vaccine_name,
                            vr.date_administered,
                            vr.next_due_date, 
                            vr.vet_clinic, 
                            vr.vet_in_charge, 
                            vr.created_at
                        FROM
                            vaccination_records vr
                        JOIN
                            pets p ON vr.pet_id = p.id
                        WHERE
                            p.user_id = ?
                        ORDER BY vr.date_administered DESC`; // Order by date
                     columns = {
                        id: 'Record ID',
                        pet_name: 'Pet Name',
                        vaccine_name: 'Vaccine Name',
                        date_administered: 'Date Adminstered',
                        next_due_date: 'Next Due Date',
                        vet_clinic: 'Vet Clinic',
                        vet_in_charge: 'Vet In-Charge', // Added column header
                        created_at: 'Created At'
                    };
                    return new Promise((resolve, reject) => {
                        db.query(query, [userId], (err, results) => {
                            if (err) reject(err);
                            else {
                                // Format date for readability and prefix with single quote for Excel
                                const formattedData = results.map(record => ({
                                    id: record.id,
                                    pet_name: record.pet_name,
                                    vaccine_name: record.vaccine_name,                                    
                                    date_administered: record.date_administered ? `${new Date(record.date_administered).toLocaleDateString()}` : '',                                    
                                    next_due_date: record.next_due_date ? `${new Date(record.next_due_date).toLocaleDateString()}` : '',
                                    vet_clinic: record.vet_clinic,
                                    vet_in_charge: record.vet_in_charge,                                 
                                    created_at: record.created_at ? `${new Date(record.created_at).toLocaleDateString()}` : ''
                                }));
                                resolve({ dataType, sectionTitle, columns, data: formattedData });
                            }
                        });
                    });

                case 'feedinglogs':
                    sectionTitle = 'Feeding Logs';
                    query = `
                        SELECT
                            fl.id,
                            p.name AS pet_name, -- Join with pets
                            fl.feeding_time,
                            fl.food_type,
                            fl.amount,
                            fl.notes,
                            fl.created_at
                        FROM
                            feeding_logs fl
                        JOIN
                            pets p ON fl.pet_id = p.id
                        WHERE
                            p.user_id = ?
                        ORDER BY fl.feeding_time DESC`; // Order by time
                     columns = {
                        id: 'Log ID',
                        pet_name: 'Pet Name',
                        feeding_time: 'Feeding Time',
                        food_type: 'Food Type',
                        amount: 'Amount',
                        notes: 'Notes',
                        created_at: 'Created At'
                    };
                    return new Promise((resolve, reject) => {
                        db.query(query, [userId], (err, results) => {
                            if (err) reject(err);
                             else {
                                 // Format date/time for readability and prefix with single quote for Excel
                                 const formattedData = results.map(log => ({
                                     id: log.id,
                                     pet_name: log.pet_name,
                                     feeding_time: log.feeding_time ? `${new Date(log.feeding_time).toLocaleString()}` : '',
                                     food_type: log.food_type,
                                     amount: log.amount,
                                     notes: log.notes,                                     
                                     created_at: log.created_at ? `${new Date(log.created_at).toLocaleDateString()}` : ''
                                 }));
                                 resolve({ dataType, sectionTitle, columns, data: formattedData });
                             }
                        });
                    });

                case 'vetvisits':
                    sectionTitle = 'Vet Visit Information';
                    query = `
                        SELECT
                            vv.id,
                            p.name AS pet_name, -- Join with pets
                            vv.visit_date,
                            vv.clinic_name,
                            vv.vet_name,
                            vv.reason,
                            vv.notes,
                            vv.created_at
                        FROM
                            vet_visits vv
                        JOIN
                            pets p ON vv.pet_id = p.id
                        WHERE
                            p.user_id = ?
                        ORDER BY vv.visit_date DESC`; // Order by date
                     columns = {
                        id: 'Visit ID',
                        pet_name: 'Pet Name',
                        visit_date: 'Visit Date',
                        clinic_name: 'Clinic Name',
                        vet_name: 'Vet Name',
                        reason: 'Reason',
                        notes: 'Notes',
                        created_at: 'Created At'
                    };
                    return new Promise((resolve, reject) => {
                        db.query(query, [userId], (err, results) => {
                            if (err) reject(err);
                            else {
                                // Format date for readability and prefix with single quote for Excel
                                const formattedData = results.map(visit => ({
                                    id: visit.id,
                                    pet_name: visit.pet_name,                                    
                                    visit_date: visit.visit_date ? `${new Date(visit.visit_date).toLocaleDateString()}` : '',
                                    clinic_name: visit.clinic_name,
                                    vet_name: visit.vet_name,
                                    reason: visit.reason,
                                    notes: visit.notes,                                    
                                    created_at: visit.created_at ? `${new Date(visit.created_at).toLocaleDateString()}` : ''
                                }));
                                resolve({ dataType, sectionTitle, columns, data: formattedData });
                            }
                        });
                    });

                default:
                    console.warn(`Unknown data type requested for export: ${dataType}. Skipping.`);
                    return Promise.resolve(null); // Resolve with null for unknown types
            }
        }).filter(promise => promise !== null); // Filter out null promises for unknown types

        // Wait for all promises to resolve
        const results = await Promise.all(fetchDataPromises);


        // Write data to the CSV stream in the order the data types were requested
        for (const result of results) {
            // Skip if the promise resolved to null (unknown data type)
            if (!result) continue;

            const { dataType, sectionTitle, columns, data } = result;

            // Write section title and data if data is available and columns are defined
            if (data.length > 0 && Object.keys(columns).length > 0) {
                // Write a blank line and then the section title
                stringifier.write(['']);
                stringifier.write([`${sectionTitle} Data:`]);
                stringifier.write(['']); // Blank line after title

                // Manually write the header row based on column values
                stringifier.write(Object.values(columns));

                // Write data rows as arrays of values
                data.forEach(row => {
                    // Map the object values to an array based on the order of keys in the columns object
                    const rowValues = Object.keys(columns).map(key => row[key] !== undefined ? row[key] : '');
                    stringifier.write(rowValues);
                });

                stringifier.write(['']); // Add a blank line after each section
            } else if (data.length === 0 && Object.keys(columns).length > 0) {
                // Write a message indicating no data for this type
                 stringifier.write(['']);
                 stringifier.write([`${sectionTitle} Data: No records found.`]);
                 stringifier.write(['']);
            }
            // No need for the other else blocks as unknown types are filtered out and
            // cases with data but no columns defined should be handled by the switch
        }

        // End the stringifier stream
        stringifier.end();

        console.log('Export data generation complete.');

    } catch (error) {
        console.error('Error during data export process:', error);
        // If an error occurs during streaming, the response might be incomplete.
        // It's tricky to send an error response after piping has started.
        // A robust solution might involve buffering or a dedicated library.
        // For simplicity, we'll just log the error server-side.
        // The frontend might receive an incomplete file or a connection error.
        if (!res.headersSent) {
             res.status(500).json({ error: 'Failed to export data due to a server error.' });
        } else {
             console.error('Headers already sent, cannot send error response.');
             // If headers were sent, the client might receive a truncated file.
             // We can try to destroy the stream to signal an error, but it might not always work.
             stringifier.destroy(error);
        }
    }
});

router.post('/api/trigger-backup', (req, res) => {
    console.log('Received request to trigger manual backup.');

    // Execute the server-side backup script
    // execFile is generally preferred over exec for running a specific file
    execFile(process.execPath, [SERVER_BACKUP_SCRIPT_PATH], (error, stdout, stderr) => {

        if (error) {
            console.error(`Error executing backup script: ${error}`);
            console.error(`Backup script stderr: ${stderr}`);
            // Send an error response to the client
            return res.status(500).json({
                error: 'Failed to trigger backup script execution.',
                details: stderr || error.message
            });
        }

        // Log script output
        if (stdout) {
            console.log(`Backup script stdout:\n${stdout}`);
        }
        if (stderr) {
             // Note: Some tools like mysqldump might output warnings to stderr even on success
             console.warn(`Backup script stderr:\n${stderr}`);
        }


        console.log('Backup script executed successfully.');
        // Send a success response to the client
        res.status(200).json({
            message: 'Backup triggered successfully!',
            stdout: stdout, // Optionally include stdout in the response
            stderr: stderr  // Optionally include stderr in the response (be cautious with sensitive info)
        });
    });
});

// Start the server
app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});
