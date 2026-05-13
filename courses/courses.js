// === Sélection des éléments ===
const form = document.getElementById("addCourseForm");
const courseList = document.getElementById("courseList");
const searchInput = document.getElementById("searchInput");

let courses = JSON.parse(localStorage.getItem("courses")) || [];

// === Fonction utilitaire pour ignorer accents et majuscules ===
function normalizeText(text) {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

// === Fonction pour créer visuellement une carte de cours ===
function createCourseCard(course, index) {
  const card = document.createElement("div");
  card.className = "course-card";
  card.innerHTML = `
    <h3>${course.name}</h3>
    <small>${course.semester}</small>
    <small>${course.faculty}</small>
    <button class="delete-btn">✖</button>
    <button class="confirm-delete">Delete</button>
  `;
// === BOuton de suppression ===
  const deleteBtn = card.querySelector(".delete-btn");
  const confirmBtn = card.querySelector(".confirm-delete");

  // 1er clic : afficher le bouton de confirmation
  deleteBtn.addEventListener("click", () => {
    card.classList.add("blur");
    confirmBtn.style.display = "block";
  });

  // 2e clic : supprimer après confirmation
  confirmBtn.addEventListener("click", () => {
    if (confirm("Möchtest du diesen Kurs wirklich löschen?")) {
      courses.splice(index, 1);
      localStorage.setItem("courses", JSON.stringify(courses));
      renderCourses();
    } else {
      card.classList.remove("blur");
      confirmBtn.style.display = "none";
    }
  });

  return card;
}

// === Afficher tous les cours ===
function renderCourses() {
  courseList.innerHTML = "";
  if (courses.length === 0) {
    courseList.innerHTML = "<p>Keine Kurse hinzugefügt.</p>";
    return;
  }

  courses.forEach((course, index) => {
    courseList.appendChild(createCourseCard(course, index));
  });
}

// === Ajouter un nouveau cours ===
form.addEventListener("submit", (e) => {
  e.preventDefault();

  const newCourse = {
    name: form.courseName.value.trim(),
    semester: form.semester.value,
    faculty: form.faculty.value,
  };

  if (!newCourse.name || !newCourse.semester || !newCourse.faculty) return;

  courses.push(newCourse);
  localStorage.setItem("courses", JSON.stringify(courses));
  form.reset();
  renderCourses();
});

// === Recherche en temps réel (accent/casse ignorés) ===
searchInput.addEventListener("input", function () {
  const query = normalizeText(this.value);
  const filteredCourses = courses.filter((course) => {
    const name = normalizeText(course.name);
    const semester = normalizeText(course.semester);
    const faculty = normalizeText(course.faculty);
    return (
      name.includes(query) ||
      semester.includes(query) ||
      faculty.includes(query)
    );
  });

  renderFilteredCourses(filteredCourses);
});

// === Afficher les résultats filtrés (même design que renderCourses) ===
function renderFilteredCourses(list) {
  courseList.innerHTML = "";
  if (list.length === 0) {
    courseList.innerHTML = "<p>Keine Kurse gefunden.</p>";
    return;
  }

  list.forEach((course, index) => {
    courseList.appendChild(createCourseCard(course, index));
  });
}

// === Initialisation ===
renderCourses();
