const form = document.getElementById("registrationForm");
const submitBtn = document.getElementById("submitBtn");

// ===== VALIDATION EN TEMPS RÉEL =====
function checkFormValid() {

    const email = form.email.value;
    const fullname =document.getElementById("fullname").value;
    const faculty = document.getElementById("faculty").value;
    const semester = document.getElementById("semester").value;
    const about = document.getElementById("about").value;
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
        document.getElementById("check-faculty").innerHTML = "✅ Fakultät eingetragen";
        document.getElementById("check-faculty").className = "valid";
    } else {
        document.getElementById("check-faculty").innerHTML = "❌ Fakultät fehlt";
        document.getElementById("check-faculty").className = "invalid";
    }

    // ===== FULLNAME =====
    if (fullname.trim() !== "") {
        document.getElementById("check-fullname").innerHTML = "✅ Vor- Nachname hinzugefügt";
        document.getElementById("check-fullname").className = "valid";
    } else {
        document.getElementById("check-fullname").innerHTML = "❌ Vor- Nachname fehlt";
        document.getElementById("check-fullname").className = "invalid"
    }

    // ===== SEMESTER =====
    if (semester.trim() !== "") {
        document.getElementById("check-semester").innerHTML = "✅ Semester ausgewählt";
        document.getElementById("check-semester").className = "valid";
    } else {
        document.getElementById("check-semester").innerHTML = "❌ Semester fehlt";
        document.getElementById("check-semester").className = "invalid";
    }

    // ===== ABOUT =====
    if (about.trim() !== "") {
        document.getElementById("check-about").innerHTML = "✅ Beschreibung hinzugefügt";
        document.getElementById("check-about").className = "valid";
    } else {
        document.getElementById("check-about").innerHTML = "❌ Beschreibung fehlt";
        document.getElementById("check-about").className = "invalid";
    }

    // ===== PHOTO (OPTIONNELLE) =====
    if (photo > 0) {
        document.getElementById("check-photo").innerHTML = "✅ Profilbild hinzugefügt";
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
document.getElementById("about").addEventListener("input", checkFormValid);
document.getElementById("uploadPhoto").addEventListener("change", checkFormValid);