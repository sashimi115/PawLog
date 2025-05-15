document.addEventListener('DOMContentLoaded', () => {
    // Get references to various DOM elements on the profile page
    const profileContainer = document.getElementById('profile-view');
    const profileEditSection = document.getElementById('profile-edit'); // Reference the edit section div
    const profilePicUpload = document.getElementById('profile-pic-upload');
    const profilePicEdit = document.getElementById('profile-pic-edit');
    const editProfileForm = document.getElementById('edit-profile-form');
    const displayUsernameElement = document.getElementById('display-username');
    const displayNameElement = document.getElementById('display-name');
    const displayBirthdayElement = document.getElementById('display-birthday');
    const displayEmailElement = document.getElementById('display-email');
    const displayContactElement = document.getElementById('display-contact');
    const displayBioElement = document.getElementById('display-bio');
    const profilePicView = document.getElementById('profile-pic-view');
    const usernameInput = document.getElementById('username');
    const nameInput = document.getElementById('name');
    const birthdayInput = document.getElementById('birthday');
    const emailInput = document.getElementById('email');
    const contactInput = document.getElementById('contact');
    const bioInput = document.getElementById('bio');

    const contactErrorElement = document.getElementById('contact-error-message');
    const notLoggedInMessage = document.getElementById("not-logged-in");
    const deleteAccountButton = document.getElementById('delete-account-button');
    const signInOutButton = document.getElementById('signInOutButton');

    // Elements for Change Password functionality
    const changePasswordSection = document.getElementById('change-password-section');
    const changePasswordForm = document.getElementById('change-password-form');
    const currentPasswordInput = document.getElementById('current-password');
    const newPasswordInput = document.getElementById('new-password');
    const confirmNewPasswordInput = document.getElementById('confirm-new-password');
    const passwordMatchError = document.getElementById('password-match-error');
    const currentPasswordError = document.getElementById('current-password-error'); // Reference for current password error

    let selectedImageURL = '';

    // Handle Sign Out
    function handleSignOut(event) {
        event.preventDefault(); // Prevent the default link behavior

        fetch('/logout', {
            method: 'POST',
        })
        .then(response => {
            if (response.ok) {
                console.log('Logged out successfully from server.');
                // Redirect to the home page or login page after successful logout
                window.location.href = 'loginpage.html'; 
            } else {
                console.error('Logout failed');
                alert('Logout failed. Please try again.'); // Provide user feedback
            }
        })
        .catch(error => {
            console.error('Error during logout:', error);
            alert('Error during logout. Please check your connection.');
        });
    }

    // Function to enable the editing form and populate it with current data
    window.enableEdit = function () {
        // Populate edit form inputs with the currently displayed values
        usernameInput.value = displayUsernameElement.textContent === 'N/A' ? '' : displayUsernameElement.textContent;
        nameInput.value = displayNameElement.textContent === 'N/A' ? '' : displayNameElement.textContent;
        birthdayInput.value = displayBirthdayElement.textContent === 'N/A' ? '' : displayBirthdayElement.textContent;
        emailInput.value = displayEmailElement.textContent === 'N/A' ? '' : displayEmailElement.textContent;
        contactInput.value = displayContactElement.textContent === 'N/A' ? '' : displayContactElement.textContent;
        bioInput.value = displayBioElement.textContent === 'N/A' ? '' : displayBioElement.textContent;

        // Show the current profile picture in the edit form preview
        profilePicEdit.src = profilePicView.src;

        // Show the edit form and hide the view form, and change password section
        profileContainer.style.display = 'none';
        profileEditSection.style.display = 'block';
        changePasswordSection.style.display = 'none'; // Hide change password section

        // Clear any previous contact error message when entering edit mode
        if (contactErrorElement) {
            contactErrorElement.textContent = '';
            contactErrorElement.style.display = 'none';
        }
    };

    // Function to show the change password form
    window.showChangePasswordForm = function () {
        // Hide other sections
        profileContainer.style.display = 'none';
        profileEditSection.style.display = 'none';
        // Show change password section
        changePasswordSection.style.display = 'block';
        // Clear form fields and errors
        changePasswordForm.reset();
        passwordMatchError.style.display = 'none';
        passwordMatchError.textContent = 'New passwords do not match.'; // Reset message
        currentPasswordError.style.display = 'none'; // Clear current password error
        currentPasswordError.textContent = '';
    };

    // Function to hide the change password form and show profile view
    window.hideChangePasswordForm = function () {
        // Hide change password section and show profile view
        changePasswordSection.style.display = 'none';
        profileContainer.style.display = 'block';
        // Clear form fields and errors when hiding
        changePasswordForm.reset();
        passwordMatchError.style.display = 'none';
        currentPasswordError.style.display = 'none';
    };

    // Function to fetch and display profile data from the server
    function fetchAndDisplayProfile() {
        // Fetch profile data using session
        fetch(`/get-profile`)
            .then(async response => { // Use async here to await response.json()
                // Check if the response was successful (status code 200-299)
                if (!response.ok) {
                    const errorData = await response.json(); // Attempt to parse error JSON
                    // Handle authentication errors specifically
                    if (response.status === 401 || response.status === 404 || errorData.error === 'Not authenticated' || errorData.error === 'User not found.') {
                         console.warn('Authentication required or user not found:', errorData.error);
                         alert('Please log in to view your profile.');
                         window.location.href = 'loginpage.html'; // Redirect to login page
                         return; // Stop execution
                    }
                    // For other non-OK responses, throw an error
                    throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
                }
                // If successful, parse the JSON response body
                return response.json();
            })
            .then(profile => {
                // Hide not logged in message and show profile container
                notLoggedInMessage.style.display = "none";
                profileContainer.style.display = "block";
                profileEditSection.style.display = "none"; // Ensure edit section is hidden initially
                changePasswordSection.style.display = "none"; // Ensure change password section is hidden initially


                // Populate the profile fields in the view mode
                displayUsernameElement.textContent = profile.username || 'N/A';
                displayNameElement.textContent = profile.name || 'N/A';
                displayBirthdayElement.textContent = profile.birthday ? profile.birthday.split('T')[0] : 'N/A';
                displayEmailElement.textContent = profile.email || 'N/A';
                displayContactElement.textContent = profile.contact || 'N/A';
                displayBioElement.textContent = profile.bio || 'N/A';
                profilePicView.src = profile.profile_picture || 'images/default-profile.jpg';

                // Pre-fill the edit form inputs with fetched data
                usernameInput.value = profile.username || '';
                nameInput.value = profile.name || '';
                birthdayInput.value = profile.birthday ? profile.birthday.split('T')[0] : '';
                emailInput.value = profile.email || '';
                contactInput.value = profile.contact || '';
                bioInput.value = profile.bio || '';
                profilePicEdit.src = profile.profile_picture || 'images/default-profile.jpg';

                // Update sign-in/out button
                if (signInOutButton) {
                    signInOutButton.textContent = 'SIGN OUT';
                    signInOutButton.href = '#'; // Prevent navigation, handle with JS
                    signInOutButton.classList.remove('sign-in-btn');
                    signInOutButton.classList.add('sign-out-btn');
                    // Add event listener for logout if not already added
                    if (!signInOutButton.dataset.listenerAttached) {
                        signInOutButton.addEventListener('click', handleSignOut);
                        signInOutButton.dataset.listenerAttached = 'true'; // Mark as attached
                    }
                }
            })
            .catch(error => {
                // Handle errors during the fetch that weren't authentication issues
                console.error('Error fetching profile:', error);
                // Show not logged in message if fetching failed for other reasons
                notLoggedInMessage.style.display = "block";
                profileContainer.style.display = "none";
                profileEditSection.style.display = "none";
                changePasswordSection.style.display = "none";


                // Update sign-in/out button to "SIGN IN"
                if (signInOutButton) {
                            signInOutButton.textContent = 'SIGN IN';
                            signInOutButton.href = 'loginpage.html'; // Link to login page
                            signInOutButton.classList.remove('sign-out-btn');
                            signInOutButton.classList.add('sign-in-btn');
                            // Remove logout listener if attached
                            if (signInOutButton.dataset.listenerAttached) {
                                signInOutButton.removeEventListener('click', handleSignOut);
                                signInOutButton.dataset.listenerAttached = '';
                            }
                        }
            });
    }

    // Event listener for profile picture upload input change
    profilePicUpload.addEventListener('change', function (event) {
        const file = event.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = function (e) {
                selectedImageURL = e.target.result; // Store the data URL
                profilePicEdit.src = selectedImageURL; // Set the preview image source
            };
            reader.readAsDataURL(file); // Read the file as a Data URL
        }
    });

    // Event listener for the edit profile form submission
    editProfileForm.addEventListener('submit', function (event) {
        event.preventDefault(); // Prevent default form submission

        // Clear any previous contact error messages
        if (contactErrorElement) {
            contactErrorElement.textContent = '';
            contactErrorElement.style.display = 'none';
        }

        const formData = new FormData(editProfileForm);
        const birthdayValue = document.getElementById('birthday').value;
        formData.set('birthday', birthdayValue);

        fetch('/save-profile', {
            method: 'POST',
            body: formData
        })
        .then(async response => {
            if (!response.ok) {
                const errorData = await response.json();
                // Handle authentication errors specifically for save profile
                if (response.status === 401 || response.status === 404 || errorData.error === 'Not authenticated' || errorData.error === 'User not found.') {
                    console.warn('Authentication required to save profile:', errorData.error);
                    alert('Your session is invalid or expired. Please log in again.');
                    window.location.href = 'loginpage.html'; // Redirect to login page
                    return; // Stop execution
                }
                throw new Error(errorData.error || errorData.message || `HTTP error! status: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            // Update the displayed profile information in view mode with the new data
            displayUsernameElement.textContent = data.updatedProfile.username || 'N/A';
            displayNameElement.textContent = data.updatedProfile.name || 'N/A';
            displayBirthdayElement.textContent = data.updatedProfile.birthday ? data.updatedProfile.birthday : 'N/A';
            displayEmailElement.textContent = data.updatedProfile.email || 'N/A';
            displayContactElement.textContent = data.updatedProfile.contact || 'N/A';
            displayBioElement.textContent = data.updatedProfile.bio || 'N/A';
            profilePicView.src = data.updatedProfile.profile_picture || 'images/default-profile.jpg';

            // Switch back to the view mode
            profileEditSection.style.display = 'none';
            profileContainer.style.display = 'block';
            alert(data.message); // Show success message
        })
        .catch(error => {
            // Handle errors during the save profile request (excluding auth errors handled above)
            console.error('Error saving profile:', error);
            // Display the error message below the contact field if it's the contact error
            if (contactErrorElement && error.message.includes('Contact number is already in use')) {
                contactErrorElement.textContent = error.message;
                contactErrorElement.style.display = 'block';
            } else {
                alert(error.message); // Show the error message to the user
            }
        });
    });

    // Event listener for the change password form submission
    changePasswordForm.addEventListener('submit', async (event) => {
        event.preventDefault();

        // Clear previous errors at the start of submission attempt
        currentPasswordError.style.display = 'none';
        passwordMatchError.style.display = 'none';
        currentPasswordError.textContent = ''; // Clear text
        passwordMatchError.textContent = ''; // Clear text


        const currentPassword = currentPasswordInput.value.trim(); // Trim whitespace
        const newPassword = newPasswordInput.value.trim();       // Trim whitespace
        const confirmNewPassword = confirmNewPasswordInput.value.trim(); // Trim whitespace

        // Client-side validation: ONLY check for empty current password
        if (!currentPassword) {
            currentPasswordError.textContent = 'Current password cannot be empty.';
            currentPasswordError.style.display = 'block';
            return; // Stop form submission
        }

        // Client-side validation for new passwords (basic checks before sending)
        // Keep these checks to prevent unnecessary server calls for obvious issues
        if (!newPassword || !confirmNewPassword) {
            passwordMatchError.textContent = 'New password and confirmation cannot be empty.';
            passwordMatchError.style.display = 'block';
            return; // Stop form submission
        }

        if (newPassword !== confirmNewPassword) {
            passwordMatchError.textContent = 'New passwords do not match.';
            passwordMatchError.style.display = 'block';
            return; // Stop form submission
        }

        // Optional: Add more robust password strength validation here client-side if desired
        // This can provide quicker feedback but server validation is essential for security
        if (newPassword.length < 6) { // Example: minimum 6 characters
            passwordMatchError.textContent = 'New password must be at least 6 characters long.';
            passwordMatchError.style.display = 'block';
            return; // Stop form submission
        }


        try {
            const response = await fetch('/change-password', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ currentPassword, newPassword }) // Send newPassword (server will validate match)
            });

            const data = await response.json();

            // Clear errors again before displaying server errors
            currentPasswordError.style.display = 'none';
            passwordMatchError.style.display = 'none';
            currentPasswordError.textContent = '';
            passwordMatchError.textContent = '';


            if (response.ok) {
                // Success
                alert(data.message); // Show success message
                // Clear form fields on success
                currentPasswordInput.value = '';
                newPasswordInput.value = '';
                confirmNewPasswordInput.value = '';
                hideChangePasswordForm(); // Assuming this function exists to hide the form
            } else {
                // Handle errors based on server response
                console.error('Server error changing password:', data.error || response.statusText);

                // --- PRIORITIZE DISPLAY OF INCORRECT CURRENT PASSWORD ERROR ---
                if (response.status === 400 && data.error === 'Incorrect current password.') {
                    currentPasswordError.textContent = data.error;
                    currentPasswordError.style.display = 'block';
                }
                // --- HANDLE AUTHENTICATION ERRORS ---
                else if (response.status === 401 || response.status === 404 || data.error === 'Not authenticated' || data.error === 'User not found.') {
                    // This case should ideally be caught by a global fetch interceptor if you have one
                    console.warn('Authentication required to change password:', data.error);
                    alert('Your session is invalid or expired. Please log in again.');
                    window.location.href = 'loginpage.html'; // Redirect to login page
                }
                // --- HANDLE OTHER 400 ERRORS (New password validation, etc.) ---
                else if (response.status === 400 && data.error) {
                    // Display other 400 errors (like password strength, empty new password from server)
                    // below the new password fields
                    passwordMatchError.textContent = data.error;
                    passwordMatchError.style.display = 'block';
                }
                // --- HANDLE OTHER SERVER ERRORS (e.g., 500 Internal Server Error) ---
                else {
                    alert(data.error || 'Failed to change password. Please try again.');
                }
            }
        } catch (error) {
            // Handle network errors or issues parsing JSON
            console.error('Error during password change fetch:', error);
            alert('An unexpected error occurred while trying to change your password. Please check your connection.');
            // Clear any potentially misleading client-side errors if a network error occurred
            currentPasswordError.style.display = 'none';
            passwordMatchError.style.display = 'none';
            currentPasswordError.textContent = '';
            passwordMatchError.textContent = '';
        }
    });

    // Event listener for the Delete Account button
    if (deleteAccountButton) {
        deleteAccountButton.addEventListener('click', async () => {
            // Show a confirmation dialog
            const confirmDelete = confirm('Are you sure you want to delete your account? This action cannot be undone.');

            if (confirmDelete) {
                try {
                    // Send a DELETE request to the server
                    const response = await fetch('/delete-user', {
                        method: 'DELETE', // Using DELETE method
                        headers: {
                            'Content-Type': 'application/json'
                            // No need to send user ID in the body, server gets it from session
                        }
                    });

                    const result = await response.json(); // Always try to parse JSON response

                    if (response.ok) {
                        // If deletion is successful
                        alert(result.message); // Show success message

                        // Clear local storage and redirect to login page
                        localStorage.removeItem('username'); // Remove stored username (if used)
                        localStorage.removeItem('profile'); // Remove stored profile (if used)
                        // Server should destroy the session, so client-side logout isn't strictly necessary
                        // but redirecting is important.
                        window.location.href = 'loginpage.html';

                    } else {
                        // If deletion failed, read the error message from the server
                        alert('Failed to delete account: ' + (result.error || 'Unknown error'));
                    }
                } catch (error) {
                    // Handle network errors or other issues during the fetch/parsing
                    console.error('Error deleting account:', error);
                    alert('An error occurred while trying to delete your account.');
                }
            }
        });
    }

    // Initial setup: Fetch and display profile data when the page loads
    // We no longer strictly need to get username from localStorage for fetching,
    // as the server uses the session. We keep the check for initial redirection
    // if the user somehow landed here without a session.
    const username = localStorage.getItem('username'); // This check is less critical now but can stay
    // The fetchAndDisplayProfile function now handles the authentication check and redirection
    fetchAndDisplayProfile();

});
