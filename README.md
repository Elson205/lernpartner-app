# BUW Study Matching Platform

## 📌 Project Description

BUW Study Matching Platform is a web application designed for students at the University of Wuppertal.  
The goal is to help students find study partners based on their courses, faculty, semester and academic interests.

Users can create a profile, add their courses, search for compatible students, send study partner requests and chat with accepted partners.

---

## 🎯 Project Goals

- Create a university profile
- Register and log in securely
- Add and manage courses
- Find students with similar courses
- Send and receive partner requests
- Create private chats after accepted requests
- Provide a modern and responsive user interface

---

## 🛠️ Technologies Used

### Frontend

- HTML5
- CSS3
- Vanilla JavaScript
- Quill.js

### Backend / Cloud Services

- Firebase Authentication
- Cloud Firestore
- Firebase Storage planned
- Firebase Hosting planned

### Tools

- Visual Studio Code
- Git
- GitHub
- Firebase Console
- Live Server

---

## ✨ Implemented Features

### ✅ Registration

Users can create a profile with:

- Full name
- University email
- Password and password confirmation
- Faculty
- Field of study
- Semester
- Personal description
- Optional profile picture

The form includes real-time validation for required fields, email format and password confirmation.

---

### ✅ Login

Firebase Authentication is used for:

- User registration
- User login
- Authentication state checking
- Protected pages

Private pages such as Courses, Partners, Requests and Chat require a logged-in user.

---

### ✅ User Profiles

User profiles are stored in Cloud Firestore.

Example structure:

```js
users/{uid}
{
  uid: "user-id",
  fullname: "Max Mustermann",
  email: "max@uni-wuppertal.de",
  photoURL: "user-placeholder.jpg",
  faculty: "Mathematik und Naturwissenschaften",
  fachbereich: "Informatik",
  semester: "3-4",
  aboutText: "I am looking for a study partner.",
  activeCourses: [],
  online: false,
  lastSeen: null,
  createdAt: Timestamp
}
```

---

### ✅ Course Management

Users can:

- Add courses
- Select semester
- Select faculty
- Search courses
- Delete courses
- Avoid duplicate courses

Courses are stored in the user profile:

```js
users/{uid}.activeCourses
```

---

### ✅ Partner Search

Users can search for study partners based on courses.

The page displays:

- Matching students
- Common courses
- Faculty
- Semester
- Profile information

Users can send a partner request from this page.

---

### ✅ Partner Requests

Requests connect the partner search with the chat system.

Request structure:

```js
partnerRequests/{requestId}
{
  senderId: "uidA",
  receiverId: "uidB",
  status: "pending",
  createdAt: Timestamp
}
```

Possible statuses:

- pending
- accepted
- rejected

When a request is accepted, a private chat is created.

---

### ✅ Private Chat

The chat is only available between accepted study partners.

Features:

- Contact list based on accepted requests
- Search contacts by name
- Real-time text messages
- Online/offline status
- Last seen display
- Responsive WhatsApp-like layout

Chat structure:

```js
chats/{chatId}
{
  participants: ["uidA", "uidB"],
  requestStatus: "confirmed",
  lastMessage: "Hallo",
  lastMessageAt: Timestamp,
  unreadCount: {
    uidA: 0,
    uidB: 2
  }
}
```

Messages:

```js
chats/{chatId}/messages/{messageId}
{
  senderId: "uidA",
  text: "Hallo!",
  createdAt: Timestamp,
  readBy: ["uidA"]
}
```

---

### ✅ Profile Picture Preview

Users can preview their profile picture during registration.

A modal preview was added so the image can be opened in a larger view, similar to WhatsApp.

---

## 📂 Project Structure

```bash
LERNPARTNER-APP/
│
├── firebase-config.js
│
├── Signup/
│   ├── sign.html
│   ├── sign.css
│   └── sign.js
│
├── Login/
│   ├── login.html
│   ├── login.css
│   └── login.js
│
├── Courses/
│   ├── courses.html
│   ├── courses.css
│   └── courses.js
│
├── Partners/
│   ├── partners.html
│   ├── partners.css
│   ├── partners.js
│   ├── requests.html
│   ├── requests.css
│   └── requests.js
│
├── Chat/
│   ├── chat.html
│   ├── chat.css
│   └── chat.js
│
├── user-placeholder.jpg
└── README.md
```

---

## 🔥 Firebase Setup

The project uses Firebase as backend service.

The file `firebase-config.js` must be placed at the root of the project.

Example:

```js
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js";

const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT.firebasestorage.app",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID"
};

export const app = initializeApp(firebaseConfig);
```

Because JavaScript files are inside subfolders, Firebase is imported like this:

```js
import { app } from "../firebase-config.js";
```

---

## 🗄️ Firestore Collections

Main collections:

```bash
users
partnerRequests
chats
```

Subcollection:

```bash
chats/{chatId}/messages
```

---

## 📦 Firebase Storage

Firebase Storage is planned for:

- Profile pictures
- Chat images
- Documents
- Audio files
- Video files

Currently, the project can still be developed with placeholder images and text messages if Storage is not activated.

---

## ▶️ Run Locally

### 1. Clone the repository

```bash
git clone <repository-link>
```

### 2. Open the project

Open the folder in Visual Studio Code.

### 3. Start Live Server

Use the Live Server extension.

Example URL:

```bash
http://127.0.0.1:5500
```

Do not open the files directly with `file://`, because Firebase module imports may not work correctly.

---

## 🧪 Testing Order

1. Configure Firebase
2. Activate Firebase Authentication
3. Create Firestore Database
4. Register a user in `Signup/sign.html`
5. Check the user in Firebase Authentication
6. Check the profile in Firestore under `users/{uid}`
7. Log in with `Login/login.html`
8. Add courses
9. Search partners
10. Send a request
11. Accept the request
12. Open the chat

---

## 🚧 Features Still in Development

- Final Firestore security rules
- Storage integration
- File upload in chat
- Message deletion
- Message editing
- Push notifications
- Dashboard page
- Dark mode
- Profile editing
- Better mobile navigation

---

## 🔮 Future Improvements

The platform could later support multiple universities.

Possible future technologies:

- Java Spring Boot backend
- PostgreSQL database
- WebSocket chat
- REST API
- Cloud object storage

---

## 📚 Skills Practiced

- HTML structure
- Responsive CSS
- JavaScript DOM manipulation
- JavaScript modules
- Form validation
- Firebase Authentication
- Cloud Firestore
- Git and GitHub workflow
- UI/UX design

---

## 👨‍💻 Author

Project developed by:

- Tetchoka Elson

---

## 📄 License

This project is currently being developed for educational and personal purposes.