
# 🚀 Deployment Guide: Firebase Functions & Push Notifications

To activate the task assignment triggers and other automated notifications, you must deploy the backend functions to your Firebase project.

## 1. Prerequisites
- Ensure you have the [Firebase CLI](https://firebase.google.com/docs/cli) installed: `npm install -g firebase-tools`
- Log in to your account: `firebase login`
- Link your project (if not already): `firebase use --add`

## 2. Configure Secrets
The backend functions require your Gmail credentials to send emails. You can set these using Firebase Secrets (recommended) or an environment file.

### Option A: Firebase Secrets (Recommended)
Run these commands in your terminal:
```bash
firebase functions:secrets:set GMAIL_EMAIL
firebase functions:secrets:set GMAIL_APP_PASSWORD
```

### Option B: .env file
I have created a `functions/.env` file in the project. Ensure it contains:
```text
GMAIL_EMAIL=your-club-email@gmail.com
GMAIL_APP_PASSWORD=your-16-digit-app-password
```

## 3. Deploy Functions
Run the following command from the project root:
```bash
firebase deploy --only functions
```

## 4. Verification
Once deployed, you can verify the status in the [Firebase Console](https://console.firebase.google.com/):
1. Go to **Build > Functions**.
2. You should see `onUserStatusChange`, `onEventCreated`, `onTaskCreated`, and `onTaskUpdated` listed.
3. Check the **Logs** tab if notifications aren't appearing as expected.

---
© 2026 Leo Club of Athugalpura.
