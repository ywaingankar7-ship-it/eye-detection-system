export const ADMIN_EMAILS = [
  "admin@eyepower.ai",
  "admin@visionx.com",
  "harshyadav856258@gmail.com"
];

export const isEmailAdmin = (email: string | null | undefined) => {
  if (!email) return false;
  return ADMIN_EMAILS.includes(email.toLowerCase());
};
