document.addEventListener('DOMContentLoaded', () => {
     // --- Idempotent check: Ensure this DOMContentLoaded logic runs only once ---
    if (document.body.dataset.backupDomLoadedHandled) {
        console.warn("DOMContentLoaded already handled for backup script. Skipping duplicate execution.");
        return; // Exit the listener immediately
    }
    document.body.dataset.backupDomLoadedHandled = 'true';
    console.log("Handling DOMContentLoaded for backup script.");
    // --- End Idempotent check ---


    // Get references to DOM elements
    const notLoggedInMessage = document.getElementById("not-logged-in");
    const backupContent = document.getElementById("backup-content"); // Main container for logged-in content
    const welcomeHeader = document.getElementById("welcome-header"); // Personalized welcome header
    const signInOutButton = document.getElementById('signInOutButton');
    const triggerBackupButton = document.getElementById('trigger-backup-btn'); // The backup button
    const backupStatusDiv = document.getElementById('backup-status'); // Div to show status messages


    let isLoggedIn = false; // Track login status

    // Function to handle user sign out (reused)
    function handleSignOut(event) {
        event.preventDefault(); // Prevent the default link behavior

        fetch('/logout', {
            method: 'POST',
        })
        .then(response => {
            if (response.ok) {
                console.log('Logged out successfully from server.');
                window.location.href = 'loginpage.html';
            } else {
                console.error('Logout failed');
                alert('Logout failed. Please try again.');
            }
        })
        .catch(error => {
            console.error('Error during logout:', error);
            alert('Error during logout. Please check your connection.');
        });
    }

    // Attach logout listener to the sign-out button if it exists
    if (signInOutButton) {
        // Ensure old listener is removed before adding the new one
        signInOutButton.removeEventListener('click', handleSignOut);
        signInOutButton.addEventListener('click', handleSignOut);
    }

    // Function to fetch user info and check login status
    function fetchData() {
        fetch('/get-profile')
            .then(async response => {
                console.log('Response status for /get-profile (Backup Data):', response.status);
                if (!response.ok) {
                    console.error('User not authenticated or error fetching profile.');
                    isLoggedIn = false;
                    // Update UI for not logged in state
                    if (signInOutButton) {
                        signInOutButton.textContent = 'SIGN IN';
                        signInOutButton.href = 'loginpage.html';
                        signInOutButton.classList.remove('sign-out-btn');
                        signInOutButton.classList.add('sign-in-btn');
                    }
                    // Hide logged-in content and show not logged in message
                    if (notLoggedInMessage) notLoggedInMessage.style.display = "block";
                    if (backupContent) backupContent.style.display = 'none';
                    if (welcomeHeader) welcomeHeader.style.display = "none"; // Hide welcome message
                    throw new Error('Not authenticated'); // Stop promise chain
                }
                return response.json(); // User is logged in
            })
            .then(data => {
                console.log('User info fetched successfully (Backup Data):', data);
                isLoggedIn = true;
                 // Update UI for logged in state
                if (welcomeHeader) {
                    welcomeHeader.textContent = `Hello, ${data.name}!`; // Personalized message
                    welcomeHeader.style.display = "block";
                }
                if (signInOutButton) {
                    signInOutButton.textContent = 'SIGN OUT';
                    signInOutButton.href = '#';
                    signInOutButton.classList.remove('sign-in-btn');
                    signInOutButton.classList.add('sign-out-btn');
                }
                // Hide not logged in message and show logged-in content
                if (notLoggedInMessage) notLoggedInMessage.style.display = "none";
                if (backupContent) backupContent.style.display = 'block'; // Show the main backup content
            })
            .catch(error => {
                console.error('Error fetching user info (Backup Data):', error);
                 // If fetchData fails for logged-in user, treat as not logged in
                 isLoggedIn = false;
                 if (signInOutButton) {
                     signInOutButton.textContent = 'SIGN IN';
                     signInOutButton.href = 'loginpage.html';
                     signInOutButton.classList.remove('sign-out-btn');
                     signInOutButton.classList.add('sign-in-btn');
                 }
                 if (notLoggedInMessage) notLoggedInMessage.style.display = "block";
                 if (backupContent) backupContent.style.display = 'none';
                 if (welcomeHeader) welcomeHeader.style.display = "none";
            });
    }

    // Initial check on page load
    fetchData();


    // Event listener for the Trigger Backup button
    if (triggerBackupButton) {
        triggerBackupButton.addEventListener('click', async () => {
            if (!isLoggedIn) {
                alert('You must be logged in to trigger a backup.');
                return;
            }

            // Optional: Confirm with the user before triggering
            const confirmBackup = confirm("Are you sure you want to trigger a manual data backup now?");
            if (!confirmBackup) {
                console.log("Manual backup cancelled by user.");
                return;
            }

            // Disable button and show loading status
            if(triggerBackupButton) {
                triggerBackupButton.disabled = true;
                triggerBackupButton.textContent = 'Backup in progress...';
            }
            if(backupStatusDiv) {
                backupStatusDiv.style.color = 'orange';
                backupStatusDiv.textContent = 'Initiating backup...';
            }

            try {
                const response = await fetch('/api/trigger-backup', {
                    method: 'POST', 
                    headers: {
                        'Content-Type': 'application/json'
                    }
                });

                const result = await response.json(); // Assuming your server sends a JSON response

                if (response.ok) {
                    console.log('Backup triggered successfully:', result);
                    if(backupStatusDiv) {
                        backupStatusDiv.style.color = 'green';
                        backupStatusDiv.textContent = result.message || 'Backup completed successfully!';
                    }
                    // Optional: Display details from result if your server provides them (e.g., filenames)
                    // console.log('Backup files:', result.backupFiles);
                } else {
                    console.error('Error triggering backup:', result);
                     if (response.status === 401) {
                         alert('Session expired. Please log in again.');
                         window.location.href = 'loginpage.html';
                         return; // Stop further processing
                     }
                    if(backupStatusDiv) {
                        backupStatusDiv.style.color = 'red';
                        backupStatusDiv.textContent = result.error || result.message || `Backup failed: HTTP error! status: ${response.status}`;
                    }
                     alert('Backup failed: ' + (result.error || result.message || `HTTP error! status: ${response.status}`)); // User feedback
                }

            } catch (error) {
                console.error('Error during backup fetch:', error);
                if(backupStatusDiv) {
                    backupStatusDiv.style.color = 'red';
                    backupStatusDiv.textContent = 'An error occurred while trying to trigger backup.';
                }
                alert('An unexpected error occurred. Please check your connection or server logs.');
            } finally {
                // Re-enable the button
                if(triggerBackupButton) {
                    triggerBackupButton.disabled = false;
                    triggerBackupButton.textContent = 'Trigger Backup Now';
                }
            }
        });
    } else {
         console.error("Trigger backup button #trigger-backup-btn not found.");
         if(backupStatusDiv) {
             backupStatusDiv.style.color = 'red';
             backupStatusDiv.textContent = 'Backup button element not found on the page.';
         }
    }
});