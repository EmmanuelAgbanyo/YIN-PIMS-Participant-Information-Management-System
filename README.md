# Yin PIMS - Participant Information Management System

Yin PIMS is a comprehensive, role-based web application designed to manage participant information for events, clubs, and volunteer activities. It provides a centralized platform for administrators and users to track and manage data related to participants, events, registrations, and more.

## ✨ Features

- **Dashboard:** At-a-glance overview of key metrics and activities.
- **User Authentication:** Secure login with role-based access control (Admin, Club Manager, Staff).
- **Participant Management:** Add, edit, and view participant details.
- **Event Management:** Create and manage events.
- **Club Management:** Organize and oversee club activities.
- **Volunteer Management:** Track and manage volunteer information.
- **Registration Tracking:** Monitor event and club registrations.
- **Reporting:** Generate reports on various aspects of the system.
- **Certificate Generation:** Create and issue certificates for participants.
- **Membership Card Verification:** QR code-based verification for membership cards.
- **User Profile Management:** Users can view and update their own profiles.
- **Settings:** Administrative controls for managing users and system settings.

## 🚀 Tech Stack

- **Frontend:** React, TypeScript
- **Framework:** Vite
- **Styling:** (Likely Tailwind CSS, based on class names like `dark:bg-gray-900`)
- **Data Visualization:** Recharts
- **Backend/Database:** Firebase (Firestore)

## 📦 Getting Started

### Prerequisites

- Node.js (v18 or higher recommended)
- npm or yarn

### Installation & Setup

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/your-username/yin-pims.git
    cd yin-pims
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    ```

3.  **Set up environment variables:**

    Create a `.env.local` file in the root of the project and add your Firebase configuration and Gemini API key (if applicable).

    ```env
    VITE_FIREBASE_API_KEY="your-api-key"
    VITE_FIREBASE_AUTH_DOMAIN="your-auth-domain"
    VITE_FIREBASE_PROJECT_ID="your-project-id"
    VITE_FIREBASE_STORAGE_BUCKET="your-storage-bucket"
    VITE_FIREBASE_MESSAGING_SENDER_ID="your-sender-id"
    VITE_FIREBASE_APP_ID="your-app-id"

    GEMINI_API_KEY="your-gemini-key"
    ```
    *Note: The original `README` mentioned `GEMINI_API_KEY`. It's included here but may not be required for core functionality.*

4.  **Run the development server:**
    ```bash
    npm run dev
    ```

    The application should now be running on `http://localhost:5173` (or another port if 5173 is in use).

## 🤝 Contributing

Contributions are welcome! If you'd like to contribute, please fork the repository and create a pull request. You can also open an issue with the "bug" or "enhancement" tag.

1.  Fork the Project
2.  Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3.  Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4.  Push to the Branch (`git push origin feature/AmazingFeature`)
5.  Open a Pull Request

## 📄 License

This project is licensed under the MIT License. See the `LICENSE` file for details.