/**
 * Microsoft Graph API wrapper
 * Uses the access token from the user's NextAuth session.
 */

import { Client } from "@microsoft/microsoft-graph-client";

export function getGraphClient(accessToken: string): Client {
  return Client.init({
    authProvider: (done) => done(null, accessToken),
  });
}

// ─── Email ────────────────────────────────────────────────────────────────────

export async function sendEmail(
  accessToken: string,
  to: string,
  subject: string,
  body: string
) {
  const client = getGraphClient(accessToken);
  return client.api("/me/sendMail").post({
    message: {
      subject,
      body: { contentType: "HTML", content: body },
      toRecipients: [{ emailAddress: { address: to } }],
    },
  });
}

export async function getEmailsFromContact(accessToken: string, email: string) {
  const client = getGraphClient(accessToken);
  return client
    .api("/me/messages")
    .filter(`from/emailAddress/address eq '${email}'`)
    .orderby("receivedDateTime desc")
    .top(50)
    .get();
}

export async function getEmailThread(accessToken: string, messageId: string) {
  const client = getGraphClient(accessToken);
  return client.api(`/me/messages/${messageId}`).get();
}

export async function replyToEmail(
  accessToken: string,
  messageId: string,
  comment: string
) {
  const client = getGraphClient(accessToken);
  return client.api(`/me/messages/${messageId}/reply`).post({ comment });
}

// ─── Calendar ─────────────────────────────────────────────────────────────────

export async function createMeeting(
  accessToken: string,
  subject: string,
  body: string,
  start: string,
  end: string,
  attendees: string[]
) {
  const client = getGraphClient(accessToken);
  return client.api("/me/events").post({
    subject,
    body: { contentType: "HTML", content: body },
    start: { dateTime: start, timeZone: "UTC" },
    end: { dateTime: end, timeZone: "UTC" },
    attendees: attendees.map((email) => ({
      emailAddress: { address: email },
      type: "required",
    })),
  });
}

export async function getUpcomingMeetings(
  accessToken: string,
  startDateTime: string,
  endDateTime: string
) {
  const client = getGraphClient(accessToken);
  return client
    .api("/me/calendarView")
    .query({ startDateTime, endDateTime })
    .orderby("start/dateTime")
    .get();
}

// ─── SharePoint / OneDrive ────────────────────────────────────────────────────

export async function getDefaultDriveId(accessToken: string): Promise<string> {
  const client = getGraphClient(accessToken);
  const drive = await client.api("/me/drive").get();
  return drive.id;
}

export async function createDealFolder(
  accessToken: string,
  driveId: string,
  dealName: string
) {
  const client = getGraphClient(accessToken);
  const subfolders = ["Term Sheets", "Due Diligence", "Correspondence", "Meeting Notes", "Internal Memos", "Precedent Deals"];

  // Create root deal folder under /CartaOS/
  await client
    .api(`/drives/${driveId}/root:/CartaOS:/children`)
    .post({ name: dealName, folder: {}, "@microsoft.graph.conflictBehavior": "rename" })
    .catch(() => {}); // ignore if exists

  for (const sub of subfolders) {
    await client
      .api(`/drives/${driveId}/root:/CartaOS/${dealName}:/children`)
      .post({ name: sub, folder: {}, "@microsoft.graph.conflictBehavior": "rename" })
      .catch(() => {});
  }

  return `/CartaOS/${dealName}`;
}

export async function uploadDocument(
  accessToken: string,
  driveId: string,
  path: string,
  filename: string,
  content: Buffer
) {
  const client = getGraphClient(accessToken);
  return client
    .api(`/drives/${driveId}/root:/${path}/${filename}:/content`)
    .put(content);
}

export async function listFolderContents(
  accessToken: string,
  driveId: string,
  path: string
) {
  const client = getGraphClient(accessToken);
  return client.api(`/drives/${driveId}/root:/${path}:/children`).get();
}
