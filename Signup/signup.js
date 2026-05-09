const form = document.getElementById("registrationForm");
const submitBtn = document.getElementById("submitBtn");
const quill = new Quill("#editor", {
  theme: "snow",

  placeholder: "Suche Lernpartner...",

  modules: {
    toolbar: [
      ["bold", "italic", "underline"],
      [{ list: "ordered" }, { list: "bullet" }],
      ["link"],
    ],
  },
});

// ===== PREVIEW PHOTO =====
const uploadPhoto = document.getElementById("uploadPhoto");
const profilePreview = document.getElementById("profilePreview");

uploadPhoto.addEventListener("change", function () {
  const file = this.files[0];

  if (file) {
    profilePreview.src = URL.createObjectURL(file);
  }
});

// ===== VALIDATION EN TEMPS RÉEL =====
function checkFormValid() {
  const email = form.email.value;
  const fullname = document.getElementById("fullname").value;
  const faculty = document.getElementById("faculty").value;
  const semester = document.getElementById("semester").value;
  const about = quill.getText().trim();
  const photo = document.getElementById("uploadPhoto").files.length;

  // ===== EMAIL =====
  if (email.endsWith("@uni-wuppertal.de")) {
    document.getElementById("check-email").innerHTML = "✅ Email valide";
    document.getElementById("check-email").className = "valid";
  } else {
    document.getElementById("check-email").innerHTML = "❌ Email invalide";
    document.getElementById("check-email").className = "invalid";
  }

  // ===== FACULTY =====
  if (faculty.trim() !== "") {
    document.getElementById("check-faculty").innerHTML =
      "✅ Fakultät eingetragen";
    document.getElementById("check-faculty").className = "valid";
  } else {
    document.getElementById("check-faculty").innerHTML = "❌ Fakultät fehlt";
    document.getElementById("check-faculty").className = "invalid";
  }

  // ===== FULLNAME =====
  if (fullname.trim() !== "") {
    document.getElementById("check-fullname").innerHTML =
      "✅ Vor- Nachname hinzugefügt";
    document.getElementById("check-fullname").className = "valid";
  } else {
    document.getElementById("check-fullname").innerHTML =
      "❌ Vor- Nachname fehlt";
    document.getElementById("check-fullname").className = "invalid";
  }

  // ===== SEMESTER =====
  if (semester.trim() !== "") {
    document.getElementById("check-semester").innerHTML =
      "✅ Semester ausgewählt";
    document.getElementById("check-semester").className = "valid";
  } else {
    document.getElementById("check-semester").innerHTML = "❌ Semester fehlt";
    document.getElementById("check-semester").className = "invalid";
  }

  // ===== ABOUT =====
  if (about.trim() !== "") {
    document.getElementById("check-about").innerHTML =
      "✅ Beschreibung hinzugefügt";
    document.getElementById("check-about").className = "valid";
  } else {
    document.getElementById("check-about").innerHTML = "❌ Beschreibung fehlt";
    document.getElementById("check-about").className = "invalid";
  }

  // ===== PHOTO (OPTIONNELLE) =====
  if (photo > 0) {
    document.getElementById("check-photo").innerHTML =
      "✅ Profilbild hinzugefügt";
    document.getElementById("check-photo").className = "valid";
  } else {
    document.getElementById("check-photo").innerHTML = "➖ Profilbild optional";
    document.getElementById("check-photo").className = "neutral";
  }

  // ===== ACTIVER / BLOQUER BOUTON =====
  if (
    email.endsWith("@uni-wuppertal.de") &&
    faculty.trim() !== "" &&
    semester.trim() !== "" &&
    about.trim() !== ""
  ) {
    submitBtn.disabled = false;
  } else {
    submitBtn.disabled = true;
  }
}

// ===== SUBMIT FORM =====
form.addEventListener("submit", function (event) {
  event.preventDefault();
  alert("Profil erfolgreich gespeichert ✅");
});

// ===== ÉCOUTEURS TEMPS RÉEL =====
form.email.addEventListener("input", checkFormValid);
document.getElementById("faculty").addEventListener("input", checkFormValid);
document.getElementById("semester").addEventListener("input", checkFormValid);
quill.on("text-change", checkFormValid);
document
  .getElementById("uploadPhoto")
  .addEventListener("change", checkFormValid);
