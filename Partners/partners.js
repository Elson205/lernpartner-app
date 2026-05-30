const searchForm = document.getElementById("partnerSearchForm");
const searchInput = document.getElementById("partnerSearchInput");
const partnersList = document.getElementById("partnersList");
const suggestionsList = document.getElementById("suggestionsList");

// Données fictives pour tester la page
const users = [
  {
    id: 1,
    name: "Anna Müller",
    photo: "user-placeholder.jpg",
    faculty: "Informatik",
    semester: "4",
    about:
      "Ich suche Lernpartner für Statistik 2. Ich helfe gerne bei Grundlagen und Übungen.",
    courses: ["Statistik 2", "Mathematik A", "Java"],
  },
  {
    id: 2,
    name: "Janile Shönser",
    photo: "user-placeholder.jpg",
    faculty: "Wirtschaftswissenschaft",
    semester: "4",
    about:
      "Suche Lernpartner für den Statistik-Kurs und gemeinsame Prüfungsvorbereitung.",
    courses: ["Statistik 2", "Marktforschung", "BWL Grundlagen"],
  },
  {
    id: 3,
    name: "Elias Gettere",
    photo: "user-placeholder.jpg",
    faculty: "Informatik",
    semester: "6",
    about:
      "Ich lerne gerne in kleinen Gruppen und kann bei Programmierung unterstützen.",
    courses: ["Java", "Algorithmen und Datenstrukturen", "Statistik 2"],
  },
  {
    id: 4,
    name: "Amira Müller",
    photo: "user-placeholder.jpg",
    faculty: "Mathematik",
    semester: "2",
    about:
      "Ich suche jemanden zum regelmäßigen Lernen und gegenseitigen Erklären.",
    courses: ["Lineare Algebra", "Mathematik A", "Stochastik"],
  },
  {
    id: 5,
    name: "Paul Schneider",
    photo: "user-placeholder.jpg",
    faculty: "Elektrotechnik",
    semester: "5",
    about:
      "Lerne am liebsten mit Karteikarten und alten Klausuren.",
    courses: ["Automatisierungstechnik", "Java", "Statistik 2"],
  },
  {
    id: 6,
    name: "Laura Becker",
    photo: "user-placeholder.jpg",
    faculty: "Wirtschaftswissenschaft",
    semester: "3",
    about:
      "Ich suche Austausch für Marktforschung und Statistik.",
    courses: ["Marktforschung", "Statistik 2", "Marketing"],
  },
];

// Exemple : cours de l'utilisateur connecté
// Plus tard, tu peux utiliser les cours enregistrés depuis courses.js avec localStorage.
const myCourses = JSON.parse(localStorage.getItem("courses")) || [];

function normalizeText(text) {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function getCommonCourses(userCourses, searchedCourse) {
  const query = normalizeText(searchedCourse);

  return userCourses.filter((course) => normalizeText(course).includes(query));
}

function createPartnerCard(user, commonCourses) {
  const card = document.createElement("article");
  card.className = "partner-card";

  card.innerHTML = `
    <div class="partner-header">
      <img class="partner-photo" src="${user.photo}" alt="Profilbild von ${user.name}" />

      <div>
        <h3 class="partner-name">${user.name}</h3>
        <div class="partner-meta">
          <div>${user.faculty}</div>
          <div>Semester: ${user.semester}</div>
        </div>
      </div>
    </div>

    <div class="partner-section">
      <strong>Gemeinsame Kurse:</strong>
      ${commonCourses.join(", ")}
    </div>

    <div class="partner-section partner-about">
      <strong>Über mich</strong>
      ${user.about}
    </div>

    <div class="partner-actions">
      <button class="profile-btn" data-user-id="${user.id}">Profil ansehen</button>
      <button class="request-btn" data-user-id="${user.id}">Anfrage senden</button>
    </div>
  `;

  const profileBtn = card.querySelector(".profile-btn");
  const requestBtn = card.querySelector(".request-btn");

  profileBtn.addEventListener("click", () => {
    showProfile(user);
  });

  requestBtn.addEventListener("click", () => {
    sendRequest(user);
  });

  return card;
}

function renderPartners(results) {
  partnersList.innerHTML = "";

  if (results.length === 0) {
    partnersList.innerHTML =
      '<p class="empty-message">Keine passenden Lernpartner gefunden.</p>';
    return;
  }

  results.forEach((result) => {
    const card = createPartnerCard(result.user, result.commonCourses);
    partnersList.appendChild(card);
  });
}

function searchPartners(query) {
  const normalizedQuery = normalizeText(query);

  if (!normalizedQuery) {
    renderPartners([]);
    return;
  }

  const results = users
    .map((user) => {
      const commonCourses = user.courses.filter((course) =>
        normalizeText(course).includes(normalizedQuery)
      );

      return {
        user,
        commonCourses,
      };
    })
    .filter((result) => result.commonCourses.length > 0);

  renderPartners(results);
}

function showProfile(user) {
  alert(
    `Profil von ${user.name}\n\n` +
      `Fachbereich: ${user.faculty}\n` +
      `Semester: ${user.semester}\n` +
      `Kurse: ${user.courses.join(", ")}\n\n` +
      `Über mich:\n${user.about}`
  );
}

function sendRequest(user) {
  alert(`Anfrage an ${user.name} wurde gesendet ✅`);
}

searchForm.addEventListener("submit", (event) => {
  event.preventDefault();
  searchPartners(searchInput.value);
});

searchInput.addEventListener("input", () => {
  searchPartners(searchInput.value);
});

function renderSuggestions() {
  suggestionsList.innerHTML = "";

  if (myCourses.length === 0) {
    suggestionsList.innerHTML =
      '<p class="empty-message">Noch keine Kurse hinzugefügt.</p>';
    return;
  }

  myCourses.forEach((course) => {
    const item = document.createElement("div");
    item.className = "suggestion-item";
    item.innerHTML = `
      <strong>Gemeinsamer Kurs:</strong><br />
      ${course.name}<br />
      <small>${course.semester} - ${course.faculty}</small>
    `;

    item.addEventListener("click", () => {
      searchInput.value = course.name;
      searchPartners(course.name);
    });

    suggestionsList.appendChild(item);
  });
}


// Initialisation
renderSuggestions();

if (myCourses.length > 0) {
  searchInput.value = myCourses[0].name;
  searchPartners(myCourses[0].name);
} else {
  renderPartners([]);
}

