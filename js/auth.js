function simpleHash(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return hash.toString();
}

function login(event) {
  event.preventDefault();
  const username = document.getElementById("name").value.trim();
  const password = document.getElementById("password").value;

  if (!username || !password) {
    alert("Please enter username and password.");
    return;
  }

  const userHash = simpleHash(username + ":" + password);

  localStorage.setItem("userHash", userHash);
  localStorage.setItem("studentName", username);
  localStorage.setItem("userPassword", password);

  window.location.href = "dashboard.html";
}

document.addEventListener("DOMContentLoaded", () => {
  const loginForm = document.querySelector("form");
  if (loginForm) {
    loginForm.addEventListener("submit", login);
  }
});
