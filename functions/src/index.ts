import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import * as nodemailer from "nodemailer";
import * as webPush from "web-push";
import { google } from "googleapis";

admin.initializeApp();

const db = admin.firestore();

// VAPID Configuration for Standard Web Push (iOS 16.4+ Compatible)
const VAPID_PUBLIC_KEY = "BIc9bH71DzSMqmg3pBlve0gm14FLcVAh4EacFVw4Ovg4uEd3k11ETlLIimkEinqQgObmFoOLWdKb4ZKCN1Nn-oM";
const VAPID_PRIVATE_KEY = "BBszIDGEDxUIu89QjvAH3Ocep5ifNG39cH8aII8yf8CZ_84N2l8hkVbcLuIzEMfz-aRP4REm_ly4hbOCpah2bbw";

webPush.setVapidDetails(
    "mailto:athugalpuraleoclub306d9@gmail.com",
    VAPID_PUBLIC_KEY,
    VAPID_PRIVATE_KEY
);

// Email Configuration
const GMAIL_EMAIL = process.env.GMAIL_EMAIL || "athugalpuraleoclub306d9@gmail.com";
const GMAIL_APP_PASSWORD = process.env.GMAIL_APP_PASSWORD || "osng xjdz lhwu movh";

const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
        user: GMAIL_EMAIL,
        pass: GMAIL_APP_PASSWORD,
    },
});

const createEmailHtml = (bodyContent: string) => {
    return `
      <div style="font-family: 'PT Sans', Arial, sans-serif; line-height: 1.6; color: #333;">
        <div style="padding: 25px; background-color: #f9fafb;">
          <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; border: 1px solid #e5e7eb;">
              <div style="padding: 25px;">
                ${bodyContent}
              </div>
              <div style="border-top: 1px solid #e5e7eb; padding: 20px 25px; background-color: #f9fafb;">
                <table border="0" cellpadding="0" cellspacing="0" width="100%">
                  <tr>
                    <td valign="top">
                      <p style="margin: 0; font-weight: bold; font-size: 15px; color: #1e3a8a;">LEO CLUB OF ATHUGALPURA</p>
                      <p style="margin: 5px 0 0 0; font-size: 12px; color: #555555;">Leo District 306 D9 | Sri Lanka</p>
                      <p style="margin: 5px 0 0 0; font-size: 11px; color: #777777;">Leostic Year 2025/26</p>
                    </td>
                    <td align="right" valign="top" style="width: 70px;">
                      <img src="https://i.imgur.com/MP1YFNf.png" alt="Leo Club Logo" width="60" style="width: 60px; height: auto; border-radius: 50%;">
                    </td>
                  </tr>
                </table>
              </div>
          </div>
        </div>
      </div>
    `;
};

const sendEmail = async (to: string, subject: string, htmlBody: string) => {
    if (!GMAIL_EMAIL || !GMAIL_APP_PASSWORD) {
        console.error("Missing Gmail environment variables.");
        return;
    }
    const fullHtml = createEmailHtml(htmlBody);
    const mailOptions = {
        from: `"LEO CLUB OF ATHUGALPURA" <${GMAIL_EMAIL}>`,
        to,
        subject,
        html: fullHtml,
    };

    try {
        await transporter.sendMail(mailOptions);
        console.log(`Email sent to ${to}`);
    } catch (error) {
        console.error(`Failed to send email to ${to}:`, error);
    }
};

/**
 * Sends standard Web Push notifications using the web-push library.
 */
const sendWebPushToUsers = async (
  userIds: string[],
  title: string,
  body: string,
  link?: string,
) => {
  if (!userIds || userIds.length === 0) return;

  const chunks = [];
  for (let i = 0; i < userIds.length; i += 30) {
    chunks.push(userIds.slice(i, i + 30));
  }

  const payload = JSON.stringify({
    notification: {
      title,
      body,
      icon: "https://i.imgur.com/MP1YFNf.png",
      data: {
        url: link || "/dashboard"
      }
    }
  });

  for (const chunk of chunks) {
    const usersSnapshot = await db.collection("users")
      .where(admin.firestore.FieldPath.documentId(), "in", chunk)
      .get();

    const pushPromises = [];

    for (const userDoc of usersSnapshot.docs) {
      const userData = userDoc.data();
      if (userData.pushSubscription) {
        const promise = webPush.sendNotification(userData.pushSubscription, payload)
          .catch(err => {
            if (err.statusCode === 410 || err.statusCode === 404) {
              console.log(`Subscription for user ${userDoc.id} has expired. Removing...`);
              return userDoc.ref.update({ pushSubscription: admin.firestore.FieldValue.delete() });
            }
            console.error(`Error sending push to user ${userDoc.id}:`, err);
            return null;
          });
        pushPromises.push(promise);
      }
    }
    await Promise.all(pushPromises);
  }
};

// --- Triggers ---

export const onUserStatusChange = functions.firestore
  .document("users/{userId}")
  .onUpdate(async (change, context) => {
    const before = change.before.data();
    const after = change.after.data();
    const userId = context.params.userId;

    if (before.status === "pending" && after.status === "approved") {
      const userEmail = after.email;
      const userName = after.name || "Leo";

      await sendWebPushToUsers(
        [userId],
        "Account Approved!",
        `Welcome, ${userName}! Your account has been approved.`,
        "/dashboard",
      );

      const subject = "Your LEO Portal Account has been Approved!";
      const htmlBody = `<p>Dear ${userName},</p><p>Congratulations! Your membership for the LEO Portal has been approved.</p><p>Welcome to the club!</p>`;
      if (userEmail) {
        await sendEmail(userEmail, subject, htmlBody);
      }
    }

    if (before.status === "pending" && after.status === "rejected") {
        const userEmail = after.email;
        const userName = after.name || "Leo";
        const subject = "Update on Your LEO Portal Registration";
        const htmlBody = `<p>Dear ${userName},</p><p>Thank you for your interest. Unfortunately, your registration could not be approved at this time.</p>`;
        if (userEmail) await sendEmail(userEmail, subject, htmlBody);
        await db.collection("users").doc(userId).delete();
    }
  });

export const onEventCreated = functions.firestore
  .document("events/{eventId}")
  .onCreate(async (snap) => {
    const event = snap.data();
    const usersSnapshot = await db.collection("users")
      .where("status", "==", "approved").get();
    const userIds = usersSnapshot.docs.map((doc) => doc.id);
    
    await sendWebPushToUsers(
      userIds,
      "New Event Published!",
      `A new event has been scheduled: ${event.name}`,
      `/dashboard`,
    );
  });

export const onTaskCreated = functions.firestore
  .document("tasks/{taskId}")
  .onCreate(async (snap, context) => {
    const task = snap.data();
    if (task.assigneeIds && task.assigneeIds.length > 0) {
      await sendWebPushToUsers(
        task.assigneeIds,
        "New Task Assigned!",
        `You have been assigned to: ${task.title}`,
        `/tasks/${context.params.taskId}`
      );
    }
  });

export const onTaskUpdated = functions.firestore
  .document("tasks/{taskId}")
  .onUpdate(async (change, context) => {
    const before = change.before.data();
    const after = change.after.data();
    
    const newAssignees = after.assigneeIds.filter((id: string) => !before.assigneeIds.includes(id));
    
    if (newAssignees.length > 0) {
      await sendWebPushToUsers(
        newAssignees,
        "New Task Assigned!",
        `You have been assigned to: ${after.title}`,
        `/tasks/${context.params.taskId}`
      );
    }
  });

// --- Scheduled Tasks ---

export const sendBirthdayWishes = functions.pubsub.schedule("0 9 * * *")
  .timeZone("Asia/Colombo")
  .onRun(async () => {
    const today = new Date();
    const monthDay = `${(today.getMonth() + 1).toString().padStart(2, '0')}-${today.getDate().toString().padStart(2, '0')}`;
    
    const usersSnapshot = await db.collection("users").where("status", "==", "approved").get();
    
    const birthdayUserIds = usersSnapshot.docs
      .filter(doc => doc.data().dateOfBirth && doc.data().dateOfBirth.endsWith(monthDay))
      .map(doc => doc.id);

    if (birthdayUserIds.length > 0) {
      await sendWebPushToUsers(
        birthdayUserIds,
        "Happy Birthday!",
        "Wishing you a fantastic day from the Leo Club of Athugalpura! 🎉",
        "/profile"
      );
    }
  });

export const sendMonthlyReports = functions.pubsub.schedule("0 9 1 * *")
    .timeZone("Asia/Colombo")
    .onRun(async () => {
        const adminsSnapshot = await db.collection("users").where("role", "in", ["admin", "super_admin"]).get();
        const adminEmails = adminsSnapshot.docs.map(doc => doc.data().email).filter(Boolean);

        for (const email of adminEmails) {
            await sendEmail(email, "Monthly Portal Report Ready", "<p>Your monthly summary report is now available in the portal dashboard.</p>");
        }
    });

export const onUserDocumentChanged = functions.firestore
  .document("users/{userId}")
  .onWrite(async (change, context) => {
    const GOOGLE_SHEET_ID = process.env.GOOGLE_SHEET_ID;
    const GOOGLE_SERVICE_ACCOUNT_EMAIL = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
    const GOOGLE_PRIVATE_KEY = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n");

    if (!GOOGLE_SHEET_ID || !GOOGLE_SERVICE_ACCOUNT_EMAIL || !GOOGLE_PRIVATE_KEY) return;

    const auth = new google.auth.GoogleAuth({
      credentials: { client_email: GOOGLE_SERVICE_ACCOUNT_EMAIL, private_key: GOOGLE_PRIVATE_KEY },
      scopes: ["https://www.googleapis.com/auth/spreadsheets"],
    });

    const sheets = google.sheets({ version: "v4", auth });
    const userId = context.params.userId;

    if (!change.after.exists) return;

    const userData = change.after.data();
    if (!userData) return;

    const values = [userId, userData.name || "", userData.email || "", userData.role || "member", new Date().toISOString()];

    await sheets.spreadsheets.values.append({
      spreadsheetId: GOOGLE_SHEET_ID,
      range: "Sheet1!A1",
      valueInputOption: "USER_ENTERED",
      requestBody: { values: [values] },
    });
  });