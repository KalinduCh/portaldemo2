
import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import { google } from "googleapis";
import * as nodemailer from "nodemailer";
import type { Event, PointsEntry } from "../../types";

admin.initializeApp();

const db = admin.firestore();
const messaging = admin.messaging();

const GMAIL_EMAIL = "athugalpuraleoclub306d9@gmail.com";
const GMAIL_APP_PASSWORD = "osng xjdz lhwu movh";

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
                      <p style="margin-top: 15px;">
                          <a href="https://www.facebook.com/leoclubofathugalpura/" target="_blank" style="text-decoration: none; margin-right: 12px;">
                              <img src="https://i.postimg.cc/0QtH6Bn7/image.png" alt="Facebook" width="24" height="24">
                          </a>
                          <a href="https://www.instagram.com/athugalpuraleos/" target="_blank" style="text-decoration: none; margin-right: 12px;">
                              <img src="https://i.postimg.cc/RZLrSGkP/image.png" alt="Instagram" width="24" height="24">
                          </a>
                          <a href="https://www.youtube.com/channel/UCe23x0ATwC2rIqA5RKWuF6w" target="_blank" style="text-decoration: none; margin-right: 12px;">
                              <img src="https://i.postimg.cc/CMBWBw32/image.png" alt="YouTube" width="24" height="24">
                          </a>
                          <a href="https://www.tiktok.com/@athugalpuraleos" target="_blank" style="text-decoration: none;">
                              <img src="https://i.postimg.cc/hjJ3d05k/image.png" alt="TikTok" width="24" height="24">
                          </a>
                      </p>
                    </td>
                    <td align="right" valign="top" style="width: 70px;">
                      <img src="https://i.postimg.cc/4xDKG4TV/Navy-Blue-Minimal-Professional-Linked-In-Profile-Picture.png" alt="Leo Club Logo" width="60" style="width: 60px; height: auto; border-radius: 50%;" data-ai-hint="club logo">
                    </td>
                  </tr>
                </table>
              </div>
          </div>
        </div>
      </div>
    `;
};


/**
 * Sends a transactional email.
 */
const sendEmail = async (to: string, subject: string, htmlBody: string) => {
    const fullHtml = createEmailHtml(htmlBody);
    const mailOptions = {
        from: `"LEO CLUB OF ATHUGALPURA" <${GMAIL_EMAIL}>`,
        to,
        subject,
        html: fullHtml,
    };

    try {
        await transporter.sendMail(mailOptions);
        console.log(`Email sent to ${to} with subject: ${subject}`);
    } catch (error) {
        console.error(`Failed to send email to ${to}:`, error);
    }
};

/**
 * Sends push notifications to a list of user IDs.
 */
const sendPushToUsers = async (
  userIds: string[],
  title: string,
  body: string,
  link?: string,
) => {
  if (!userIds || userIds.length === 0) {
    console.log("No user IDs provided, skipping notification.");
    return;
  }

  const tokens: string[] = [];
  const usersSnapshot = await db.collection("users").where(
    admin.firestore.FieldPath.documentId(),
    "in",
    userIds,
  ).get();

  usersSnapshot.forEach((doc) => {
    const user = doc.data();
    if (user.fcmToken) {
      tokens.push(user.fcmToken);
    }
  });

  if (tokens.length === 0) {
    console.log("No valid FCM tokens found for the users.");
    return;
  }

  const message: admin.messaging.MulticastMessage = {
    tokens,
    notification: {
      title,
      body,
    },
    webpush: {
      fcmOptions: {
        link: link || "https://leoathugal.web.app/dashboard",
      },
      notification: {
        icon: "https://i.imgur.com/MP1YFNf.png",
      },
    },
  };

  try {
    const response = await messaging.sendEachForMulticast(message);
    console.log("Successfully sent message:", response);
    if (response.failureCount > 0) {
      console.warn("Failed to send to some tokens:", response.responses);
    }
  } catch (error) {
    console.error("Error sending message:", error);
  }
};


export const onUserStatusChange = functions.firestore
  .document("users/{userId}")
  .onUpdate(async (change, context) => {
    const before = change.before.data();
    const after = change.after.data();
    const userId = context.params.userId;

    // Set custom claims if role changes
    if (before.role !== after.role) {
      try {
        await admin.auth().setCustomUserClaims(userId, { role: after.role });
        console.log(`Custom claim 'role: ${after.role}' set for user ${userId}`);
      } catch (error) {
        console.error(`Failed to set custom claim for user ${userId}:`, error);
      }
    }

    // Check if status changed from 'pending' to 'approved'
    if (before.status === "pending" && after.status === "approved") {
      const userEmail = after.email;
      const userName = after.name || "Leo";

      // Send Push Notification
      await sendPushToUsers(
        [userId],
        "Account Approved!",
        `Welcome, ${userName}! Your account has been approved. You can now log in.`,
        "/dashboard",
      );

      // Send Email
      const subject = "Your LEO Portal Account has been Approved!";
      const htmlBody = `
        <p>Dear ${userName},</p>
        <p>Congratulations! Your membership for the LEO Portal has been approved by an administrator.</p>
        <p>You can now log in to your account to view upcoming events, track your participation, and connect with other members.</p>
        <p>Welcome to the club!</p>
        <p>Best Regards,<br>Leo Club Of Athugalpura</p>
      `;
      if (userEmail) {
        await sendEmail(userEmail, subject, htmlBody);
      }
    }
    
    // Check if status changed from 'pending' to 'rejected'
    if (before.status === "pending" && after.status === "rejected") {
        const userEmail = after.email;
        const userName = after.name || "Leo";
        
        const subject = "Update on Your LEO Portal Registration";
        const htmlBody = `
            <p>Dear ${userName},</p>
            <p>Thank you for your interest in joining the LEO Portal.</p>
            <p>After careful review, we regret to inform you that your registration could not be approved at this time. If you believe this is a mistake or wish to inquire further, please contact a club administrator.</p>
            <p>We appreciate your understanding.</p>
            <p>Best Regards,<br>Leo Club Of Athugalpura</p>
        `;
        if (userEmail) {
            await sendEmail(userEmail, subject, htmlBody);
        }

        // After sending email, delete the user document
        await db.collection("users").doc(userId).delete();
        console.log(`Rejected user ${userId} document deleted after sending email.`);
    }
  });


export const onEventCreated = functions.firestore
  .document("events/{eventId}")
  .onCreate(async (snap, context) => {
    const event = snap.data();
    const usersSnapshot = await db.collection("users")
      .where("status", "==", "approved").get();
    const userIds = usersSnapshot.docs.map((doc) => doc.id);
    await sendPushToUsers(
      userIds,
      "New Event Published!",
      `A new event has been scheduled: ${event.name}`,
      `/dashboard`,
    );
  });

export const onUserDocumentChanged = functions.firestore
  .document("users/{userId}")
  .onWrite(async (change, context) => {
    const GOOGLE_SHEET_ID = process.env.GOOGLE_SHEET_ID;
    const GOOGLE_SERVICE_ACCOUNT_EMAIL = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
    const GOOGLE_PRIVATE_KEY = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n");

    if (!GOOGLE_SHEET_ID || !GOOGLE_SERVICE_ACCOUNT_EMAIL || !GOOGLE_PRIVATE_KEY) {
      console.log("Google Sheets environment variables not set. Skipping sync.");
      return;
    }

    const auth = new google.auth.GoogleAuth({
      credentials: {
        client_email: GOOGLE_SERVICE_ACCOUNT_EMAIL,
        private_key: GOOGLE_PRIVATE_KEY,
      },
      scopes: ["https://www.googleapis.com/auth/spreadsheets"],
    });

    const sheets = google.sheets({ version: "v4", auth });
    const userId = context.params.userId;

    // If document is deleted
    if (!change.after.exists) {
      console.log(`User ${userId} deleted. Removing from Google Sheet.`);
      const response = await sheets.spreadsheets.values.get({
        spreadsheetId: GOOGLE_SHEET_ID,
        range: "Sheet1!A:A",
      });
      const rows = response.data.values;
      if (rows) {
        const rowIndex = rows.findIndex((row) => row[0] === userId);
        if (rowIndex !== -1) {
          await sheets.spreadsheets.batchUpdate({
            spreadsheetId: GOOGLE_SHEET_ID,
            requestBody: {
              requests: [{
                deleteDimension: {
                  range: {
                    sheetId: 0,
                    dimension: "ROWS",
                    startIndex: rowIndex,
                    endIndex: rowIndex + 1,
                  },
                },
              }],
            },
          });
          console.log(`Row for user ${userId} deleted from Google Sheet.`);
        }
      }
      return;
    }

    const userData = change.after.data();
    if (!userData) {
      console.log("No user data found after change.");
      return;
    }

    const values = [
      userId,
      userData.name || "",
      userData.email || "",
      userData.designation || "",
      userData.nic || "",
      userData.dateOfBirth || "",
      userData.gender || "",
      userData.mobileNumber || "",
      userData.role || "member",
      userData.status || "pending",
      new Date().toISOString(),
    ];

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: GOOGLE_SHEET_ID,
      range: "Sheet1!A:A",
    });

    const rows = response.data.values;
    let rowIndex = -1;
    if (rows) {
      rowIndex = rows.findIndex((row) => row[0] === userId);
    }

    if (rowIndex !== -1) {
      // Update existing row
      console.log(`Updating row for user ${userId} in Google Sheet.`);
      await sheets.spreadsheets.values.update({
        spreadsheetId: GOOGLE_SHEET_ID,
        range: `Sheet1!A${rowIndex + 1}`,
        valueInputOption: "USER_ENTERED",
        requestBody: { values: [values] },
      });
    } else {
      // Append new row
      console.log(`Appending new row for user ${userId} to Google Sheet.`);
      await sheets.spreadsheets.values.append({
        spreadsheetId: GOOGLE_SHEET_ID,
        range: "Sheet1!A1",
        valueInputOption: "USER_ENTERED",
        requestBody: { values: [values] },
      });
    }
  });
    

export const sendMonthlyReports = functions.pubsub.schedule("0 9 1 * *")
    .timeZone("Asia/Colombo")
    .onRun(async (context) => {
        const now = new Date();
        const prevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const prevMonthName = prevMonth.toLocaleString("default", { month: "long" });
        const year = prevMonth.getFullYear();

        const startOfMonth = admin.firestore.Timestamp.fromDate(new Date(year, prevMonth.getMonth(), 1));
        const endOfMonth = admin.firestore.Timestamp.fromDate(new Date(year, prevMonth.getMonth() + 1, 0, 23, 59, 59));

        // 1. Get Admins
        const adminsSnapshot = await db.collection("users").where("role", "in", ["admin", "super_admin"]).get();
        const adminEmails = adminsSnapshot.docs.map((doc) => doc.data().email).filter(Boolean);

        if (adminEmails.length === 0) {
            console.log("No admins found to send reports to.");
            return;
        }

        // 2. Get Finance Data
        const transactionsSnapshot = await db.collection("transactions")
            .where("date", ">=", startOfMonth)
            .where("date", "<=", endOfMonth).get();
        
        let totalIncome = 0;
        let totalExpenses = 0;
        transactionsSnapshot.forEach((doc) => {
            const t = doc.data();
            if (t.type === "income") totalIncome += t.amount;
            else totalExpenses += t.amount;
        });

        // 3. Get Attendance Data
        const attendanceSnapshot = await db.collection("attendance")
            .where("timestamp", ">=", startOfMonth)
            .where("timestamp", "<=", endOfMonth).get();
        const attendanceCount = attendanceSnapshot.size;

        // 4. Construct and Send Email
        const subject = `LEO Portal Monthly Report: ${prevMonthName} ${year}`;
        const htmlBody = `
            <h2>Monthly Summary: ${prevMonthName} ${year}</h2>
            <p>Here is your automated monthly summary from the LEO Portal.</p>
            
            <h3>Financial Overview</h3>
            <ul>
                <li>Total Income: <strong>LKR ${totalIncome.toFixed(2)}</strong></li>
                <li>Total Expenses: <strong>LKR ${totalExpenses.toFixed(2)}</strong></li>
                <li>Net Balance: <strong>LKR ${(totalIncome - totalExpenses).toFixed(2)}</strong></li>
            </ul>

            <h3>Activity Overview</h3>
            <ul>
                <li>Total Attendance Records Logged: <strong>${attendanceCount}</strong></li>
            </ul>
            
            <p>For a more detailed breakdown, please visit the Reports section in the LEO Portal.</p>
            <p>Best Regards,<br>LEO Portal Automation</p>
        `;

        for (const email of adminEmails) {
            await sendEmail(email, subject, htmlBody);
        }
        
        console.log(`Monthly reports sent to ${adminEmails.length} admins.`);
    });


export const sendFeeReminders = functions.pubsub.schedule("0 9 * * 1") // Every Monday at 9 AM
    .timeZone("Asia/Colombo")
    .onRun(async (context) => {
        const usersSnapshot = await db.collection("users")
            .where("status", "==", "approved")
            .where("membershipFeeStatus", "==", "pending").get();

        if (usersSnapshot.empty) {
            console.log("No users with pending fees. No reminders sent.");
            return;
        }

        const userIds = usersSnapshot.docs.map((doc) => doc.id);

        console.log(`Sending fee reminders to ${userIds.length} user(s).`);

        await sendPushToUsers(
            userIds,
            "Membership Fee Reminder",
            "This is a friendly reminder that your annual membership fee is pending. Please contact the treasurer to complete your payment.",
            "/profile"
        );
    });

export const onAttendanceCreated = functions.firestore
  .document("attendance/{attendanceId}")
  .onCreate(async (snap, context) => {
    const attendanceRecord = snap.data();

    // Ensure it's a member attendance and not a visitor
    if (attendanceRecord.attendanceType !== "member" || !attendanceRecord.userId) {
      console.log(`Skipping points allocation for non-member or visitor attendance: ${snap.id}`);
      return;
    }
    
    // TEMPORARILY DISABLED: The points feature is being refactored.
    console.log("Points allocation is temporarily disabled. Skipping.");
    return;

    /*
    const { eventId, userId } = attendanceRecord;

    // 1. Fetch Event Details
    const eventRef = db.collection("events").doc(eventId);
    const eventSnap = await eventRef.get();

    if (!eventSnap.exists) {
      console.error(`Event ${eventId} not found for attendance record ${snap.id}.`);
      return;
    }
    const eventData = eventSnap.data() as Event;
    
    // 2. Check if the event has points assigned
    if (!eventData.points || eventData.points <= 0) {
      console.log(`Event ${eventId} has no participation points assigned. Skipping.`);
      return;
    }

    // 3. Fetch User Details
    const userRef = db.collection("users").doc(userId);
    const userSnap = await userRef.get();
    if (!userSnap.exists) {
        console.error(`User ${userId} not found for attendance record ${snap.id}.`);
        return;
    }
    const userData = userSnap.data();
    if (!userData) return;

    // 4. Create Points Entry
    const pointsEntry: Omit<PointsEntry, "id" | "createdAt"> = {
        userId: userId,
        userName: userData.name || "Unknown User",
        date: attendanceRecord.timestamp.toDate().toISOString(),
        description: `Attended: ${eventData.name}`,
        points: eventData.points,
        category: "participation",
        projectName: eventData.name, // Use event name as project name
        addedBy: "system", // Mark as automated
        eventId: eventId,
    };

    try {
        await db.collection("pointsEntries").add({
            ...pointsEntry,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            date: attendanceRecord.timestamp, // Use the attendance timestamp for the points date
        });
        console.log(`Successfully awarded ${eventData.points} points to user ${userId} for event ${eventId}.`);
    } catch (error) {
        console.error(`Failed to create points entry for user ${userId} and event ${eventId}:`, error);
    }
    */
  });

// New function to send birthday wishes
export const sendBirthdayWishes = functions.pubsub.schedule("0 9 * * *")
  .timeZone("Asia/Colombo") // Runs at 9:00 AM every day
  .onRun(async (context) => {
    const today = new Date();
    const todayMonth = today.getMonth() + 1; // getMonth() is 0-indexed
    const todayDay = today.getDate();

    // ID for today's task run to prevent duplicate runs
    const taskDateId = `${today.getFullYear()}-${todayMonth}-${todayDay}`;
    const taskRef = db.collection('dailyTasks').doc(`birthday-check-${taskDateId}`);
    const taskSnap = await taskRef.get();

    if (taskSnap.exists) {
        console.log(`Birthday wishes for ${taskDateId} already sent. Exiting.`);
        return;
    }

    const usersSnapshot = await db.collection("users").where("status", "==", "approved").get();
    
    if (usersSnapshot.empty) {
        console.log("No approved users found. Skipping birthday check.");
        await taskRef.set({ completedAt: admin.firestore.FieldValue.serverTimestamp() });
        return;
    }

    const birthdayUsers: string[] = [];
    usersSnapshot.forEach((doc) => {
        const user = doc.data();
        if (user.dateOfBirth) {
            // Assuming dateOfBirth is stored as 'YYYY-MM-DD'
            const dob = new Date(user.dateOfBirth);
            const birthMonth = dob.getMonth() + 1;
            const birthDay = dob.getDate();
            
            if (birthMonth === todayMonth && birthDay === todayDay) {
                birthdayUsers.push(doc.id);
            }
        }
    });

    if (birthdayUsers.length > 0) {
        console.log(`Found ${birthdayUsers.length} user(s) with birthdays today. Sending wishes...`);
        for (const userId of birthdayUsers) {
            const user = usersSnapshot.docs.find(d => d.id === userId)?.data();
            if (user) {
                await sendPushToUsers(
                    [userId],
                    `Happy Birthday, ${user.name}!`,
                    "Wishing you a fantastic day from the Leo Club of Athugalpura!",
                    "/profile"
                );
            }
        }
    } else {
        console.log("No birthdays today.");
    }
    
    // Mark the task as complete for today
    await taskRef.set({ completedAt: admin.firestore.FieldValue.serverTimestamp(), birthdaysFound: birthdayUsers.length });
});


// New function to send event reminders
export const sendEventReminders = functions.pubsub.schedule("0 8 * * *") // Runs at 8:00 AM every day
    .timeZone("Asia/Colombo")
    .onRun(async (context) => {
        const now = new Date();
        now.setHours(0, 0, 0, 0); // Start of today

        const twoDaysFromNowStart = new Date(now);
        twoDaysFromNowStart.setDate(now.getDate() + 2);
        const twoDaysFromNowEnd = new Date(twoDaysFromNowStart);
        twoDaysFromNowEnd.setHours(23, 59, 59, 999);

        const todayEnd = new Date(now);
        todayEnd.setHours(23, 59, 59, 999);

        const usersSnapshot = await db.collection("users").where("status", "==", "approved").get();
        if (usersSnapshot.empty) {
            console.log("No approved users found. Skipping event reminders.");
            return;
        }
        const allUserIds = usersSnapshot.docs.map(doc => doc.id);

        // Reminder for events in 2 days
        const twoDayReminderQuery = db.collection('events')
            .where('startDate', '>=', admin.firestore.Timestamp.fromDate(twoDaysFromNowStart))
            .where('startDate', '<=', admin.firestore.Timestamp.fromDate(twoDaysFromNowEnd))
            .where('reminderSent', '==', false); // Assuming we add a field to track this

        const twoDayEvents = await twoDayReminderQuery.get();
        for (const doc of twoDayEvents.docs) {
            const event = doc.data() as Event;
            console.log(`Sending 2-day reminder for event: ${event.name}`);
            await sendPushToUsers(
                allUserIds,
                `Reminder: ${event.name} in 2 Days!`,
                `Just a heads-up that this event is coming up soon. We hope to see you there!`,
                `/dashboard`
            );
        }

        // Reminder for events happening today
        const todayReminderQuery = db.collection('events')
            .where('startDate', '>=', admin.firestore.Timestamp.fromDate(now))
            .where('startDate', '<=', admin.firestore.Timestamp.fromDate(todayEnd));

        const todayEvents = await todayReminderQuery.get();
        for (const doc of todayEvents.docs) {
            const event = doc.data() as Event;
            console.log(`Sending same-day reminder for event: ${event.name}`);
            await sendPushToUsers(
                allUserIds,
                `Reminder: ${event.name} is Today!`,
                `This event is happening today. Don't miss out!`,
                `/dashboard`
            );
        }

        console.log(`Checked for event reminders. Found ${twoDayEvents.size} for 2-day reminders and ${todayEvents.size} for same-day reminders.`);
    });
    
