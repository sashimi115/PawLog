document.getElementById('signup-form').addEventListener('submit', async function(event) {
  event.preventDefault(); // Prevent the default form submission

  // Get input values
  const username = document.getElementById('username').value;
  const email = document.getElementById('email').value;
  const password = document.getElementById('password').value;

  // Get error message elements
  const usernameErrorElement = document.getElementById('username-error');
  const emailErrorElement = document.getElementById('email-error');
  const passwordErrorElement = document.getElementById('password-error'); // Assuming you added this

  // Clear previous error messages and hide them
  usernameErrorElement.textContent = '';
  usernameErrorElement.style.display = 'none';
  emailErrorElement.textContent = '';
  emailErrorElement.style.display = 'none';
  if (passwordErrorElement) { // Check if the password error element exists
      passwordErrorElement.textContent = '';
      passwordErrorElement.style.display = 'none';
  }


  const data = { username, email, password };

  try {
      // Send signup request to the server
      const response = await fetch('/signup', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data)
      });

      // Parse the JSON response
      const result = await response.json();

      if (result.success) {
          // If signup is successful, redirect to login page
          alert('Signup successful! Please log in.'); // Optional success message
          window.location.href = 'loginpage.html';
      } else {
          // If signup failed, display the specific error message from the server
          if (result.message) {
              // Check the message content to determine where to display the error
              if (result.message.includes('Username already exists')) {
                  usernameErrorElement.textContent = result.message;
                  usernameErrorElement.style.display = 'block';
              } else if (result.message.includes('Email address is already in use')) {
                  emailErrorElement.textContent = result.message;
                  emailErrorElement.style.display = 'block';
              } else {
                  // Handle other potential error messages from the server
                  alert('Signup failed: ' + result.message);
              }
          } else {
              // Fallback for unexpected error response format
              alert('Signup failed with an unknown error.');
          }
      }
  } catch (error) {
      // Handle network errors or other issues during the fetch request
      console.error('Error during signup fetch:', error);
      alert('An error occurred during signup. Please try again.');
  }
});
  