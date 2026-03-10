import { Configuration, PublicClientApplication } from "@azure/msal-browser";

export const msalConfig: Configuration = {
  auth: {
    clientId: process.env.AZURE_AD_CLIENT_ID!,
    authority: `https://login.microsoftonline.com/${process.env.AZURE_AD_TENANT_ID ?? "common"}`,
    redirectUri: `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/callback/azure-ad`,
  },
  cache: {
    cacheLocation: "sessionStorage",
  },
};

export const graphScopes = [
  "Mail.ReadWrite",
  "Mail.Send",
  "Calendars.ReadWrite",
  "Files.ReadWrite.All",
  "Sites.ReadWrite.All",
  "User.Read",
  "openid",
  "profile",
  "email",
];

export const loginRequest = {
  scopes: graphScopes,
};

let msalInstance: PublicClientApplication | null = null;

export function getMsalInstance(): PublicClientApplication {
  if (!msalInstance) {
    msalInstance = new PublicClientApplication(msalConfig);
  }
  return msalInstance;
}
