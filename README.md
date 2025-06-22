# Echonym: Whispers from the Digital Underground

![Echonym Logo](https://media.discordapp.net/attachments/806888233422028800/1386138662739247225/raw.png?ex=6859467a&is=6857f4fa&hm=b32e245aaa3e551610c1ff1aad9008d1c753575dce84dbc1cd6e8776c528686a&=&format=webp&quality=lossless&width=788&height=788)

**Echonym** is a modern, anonymous social platform designed for security researchers, ethical hackers, and tech enthusiasts. It provides a secure space to share discoveries, discuss vulnerabilities, and engage with a community of peers without revealing personal identities.

---

## ✨ Key Features

-   **Anonymous Identity**: Automatically generated anonymous profiles with a robust recovery system. No emails, no phone numbers.
-   **Customizable Avatars**: Express your anonymous persona with a highly customizable DiceBear "Adventurer" style avatar.
-   **Echoes (Posts)**: Create, edit, and delete posts with full Markdown support.
-   **Reputation System**: Gain XP and earn badges for contributing to the community through posts, comments, and votes.
-   **Real-time Feed**: Browse a dynamic feed of echoes, sortable by Latest, Trending, and Top. Filter by tags or search for specific content.
-   **Interactive Discussions**: Engage in threaded conversations with nested comments and replies.
-   **Secure Voting**: Upvote or downvote content to influence what's trending.
-   **AI-Powered Assistance (Powered by Genkit & Gemini)**:
    -   **Post Scoring**: Get instant feedback on the clarity and safety of your drafts.
    -   **Tag Suggestions**: Automatically receive relevant tags for your content.
    -   **TL;DR Summaries**: Generate concise summaries for long posts.
-   **User Profiles & Social Graph**:
    -   View detailed user profiles with stats, reputation, and badges.
    -   Follow other users to stay updated on their activity.
-   **Real-Time Encrypted Chat**: Securely message other users one-on-one.
-   **Notifications**: Stay informed about new followers, comments, and replies.
-   **Saved & Hidden Echoes**: Curate your feed by saving important posts or hiding ones you don't want to see.

---

## 🚀 Tech Stack

This project is built with a modern, server-centric, and type-safe stack:

-   **Framework**: [Next.js](https://nextjs.org/) (App Router)
-   **UI Library**: [React](https://reactjs.org/) & [TypeScript](https://www.typescriptlang.org/)
-   **Styling**: [Tailwind CSS](https://tailwindcss.com/)
-   **UI Components**: [ShadCN UI](https://ui.shadcn.com/)
-   **Backend & Database**: [Firebase](https://firebase.google.com/) (Authentication, Firestore, Storage)
-   **AI Integration**: [Google's Genkit](https://firebase.google.com/docs/genkit) with the [Gemini API](https://ai.google.dev/docs/gemini_api_overview)
-   **Avatars**: [DiceBear API](https://www.dicebear.com/)

---

## 🛠️ Getting Started

Follow these instructions to get a local copy up and running for development and testing.

### Prerequisites

-   [Node.js](https://nodejs.org/) (v18 or later)
-   A [Firebase](https://firebase.google.com/) project.
-   A [Google AI Studio API Key](https://aistudio.google.com/app/apikey) for Genkit features.

### Installation & Setup

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/mishcoders/echonym
    cd echonym
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    ```

3.  **Set up your environment variables:**

    Create a file named `.env.local` in the root of your project and add your Firebase and Gemini API keys. You can find your Firebase configuration in your Firebase project settings.

    ```
    # .env.local

    # Firebase Configuration
    NEXT_PUBLIC_FIREBASE_API_KEY=AIza...
    NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project-id.firebaseapp.com
    NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
    NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project-id.appspot.com
    NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=...
    NEXT_PUBLIC_FIREBASE_APP_ID=1:...:web:...

    # Google Genkit (for AI features)
    GEMINI_API_KEY=AIza...
    ```

4.  **Run the development server:**
    ```bash
    npm run dev
    ```

    The application will be available at `http://localhost:3000`.

### Firebase Setup Notes

-   **Authentication**: Enable **Anonymous** sign-in in the Firebase console.
-   **Firestore**: This project uses Firestore for its database. The initial security rules are permissive for development. For a production environment, you **must** configure more restrictive rules.

---

## 🤖 Genkit AI Features

AI-powered features like post analysis and tag suggestions are handled by **Genkit**. These features are optional and will only be active if you provide a `GEMINI_API_KEY` in your `.env.local` file. If the key is missing, the app will run gracefully without AI functionality.

All Genkit flows are defined in the `src/ai/flows/` directory.

---

