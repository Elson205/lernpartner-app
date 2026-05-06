const form = document.getElementById("profileForm");
const list = document.getElementById("list");

let users = [];

form.addEventListener("submit", function(e) {
  e.preventDefault();

  const user = {
    name: document.getElementById("name").value,
    subject: document.getElementById("subject").value,
    semester: document.getElementById("semester").value,
    language: document.getElementById("language").value,
    contact: document.getElementById("contact").value,
  };

  users.push(user);
  displayUsers();
  form.reset();
});

function displayUsers() {
  list.innerHTML = "";

  users.forEach(u => {
    const div = document.createElement("div");
    div.className = "card";

    div.innerHTML = `
      <strong>${u.name}</strong>
      <p>${u.subject}</p>
      <p>${u.semester}</p>
      <p>${u.language}</p>
      <p>Contact: ${u.contact}</p>
    `;

    list.appendChild(div);
  });
}