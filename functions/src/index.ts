// The Cloud Functions for Firebase SDK to
// create Cloud Functions and setup triggers.
import functions = require("firebase-functions");

// The Firebase Admin SDK to access Firestore.
import admin = require("firebase-admin");
admin.initializeApp();

// Take the text parameter passed to this HTTP endpoint and insert it into
// Firestore under the path /messages/:documentId/original
exports.addMessage = functions.https.onRequest(async (req: any, res: any) => {
  // Grab the text parameter.
  const original = req.query.text;
  // Push the new message into Firestore using the Firebase Admin SDK.
  const writeResult = await admin.firestore().collection("messages")
      .add({original: original});
  // Send back a message that we've successfully written the message
  res.json({result: `Message with ID: ${writeResult.id} added.`});
});

// Listens for new messages added to
// /messages/:documentId/original and creates an
// uppercase version of the message to
// /messages/:documentId/uppercase
exports.makeUppercase = functions.firestore
    .document("/messages/{documentId}")
    .onCreate((snap: any, context: any) => {
    // Grab the current value of what was written to Firestore.
      const original = snap.data().original;

      // Access the parameter `{documentId}` with `context.params`
      functions.logger.log("Uppercasing", context.params.documentId, original);

      const uppercase = original.toUpperCase();

      // You must return a Promise when performing
      // asynchronous tasks inside a Functions such as
      // writing to Firestore.
      // Setting an 'uppercase' field in Firestore document returns a Promise.
      return snap.ref.set({uppercase}, {merge: true});
    });


exports.sendNotification = functions.firestore
    .document("/events/{documentId}")
    .onCreate(async (snap: any, context: any) => {
      // Access the parameter `{documentId}` with `context.params`
      const eventData = snap.data();
      const ensinoId = eventData.ensinoId;
      const cursoId = eventData.courseId;
      const semesterId = eventData.semesterId;

      // Access the parameter `{documentId}` with `context.params`
      functions.logger.log("Uppercasing", context.params.documentId, eventData);
      functions.logger.log("context", context.params);
      functions.logger.log("original", eventData);

      await admin.firestore().collection("notifications")
          .add({
            notificationTitle: eventData.description,
            startDate: eventData.startDate,
            endDate: eventData.finalDate});

      const payload = {
        notification: {
          title: "Novo evento marcado",
          body: `${eventData.description} às ${eventData.startDate}`,
        },
      };

      return admin.messaging().sendToTopic("notifications", payload)
          .then(function(response: admin.messaging.MessagingTopicResponse) {
            const notificationSent = true;
            snap.ref.set({notificationSent}, {merge: true});
            console.log("Notification sent successfully:", response);
          })
          .catch(function(error: any) {
            console.log("Notification sent failed:", error);
          });
    });
