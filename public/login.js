document.getElementById('login-form').addEventListener('submit', async function (event) {
      event.preventDefault(); // Prevent the default form submission
  
      const username = document.getElementById('username').value;
      const password = document.getElementById('password').value;
      // Get the error message element from the HTML
      const errorElement = document.getElementById('login-error'); // This ID should match the element in your loginpage.html
  
      // Clear any previous error messages and hide the error element
      errorElement.textContent = '';
      errorElement.style.display = 'none';
  
      try {
          // Send a POST request to the '/login' endpoint on the server
          const response = await fetch('/login', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' }, // Indicate that the request body is JSON
              body: JSON.stringify({ username, password }), // Send username and password as JSON
          });
  
          // Parse the JSON response from the server
          const data = await response.json();
  
          // Check the 'success' property in the server's response
          if (data.success) {
              // If login is successful (success is true)
              // Store user information in localStorage (consider session storage for better security)
              localStorage.setItem('username', data.username);
              localStorage.setItem('profile', JSON.stringify(data.profile)); // Storing profile data
  
              // Redirect the user to the profile page after a small delay
              setTimeout(() => window.location.href = 'profilepage.html', 50);
          } else {
              // If login failed (success is false)
              // Display the specific error message provided by the server (e.g., 'Username not found', 'Incorrect password')
              errorElement.textContent = data.message;
              errorElement.style.display = 'block'; // Make the error element visible
          }
      } catch (error) {
          // This block handles errors that occur during the fetch request itself (e.g., network issues, server not responding)
          console.error("Login error:", error);
          // Display a generic error message for unexpected issues on the page
          errorElement.textContent = "Could not connect to the server. Please try again later.";
          errorElement.style.display = 'block'; // Make the error element visible
      }
  });
  