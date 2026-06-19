export const managedPasswordMinLength = 4;
export const managedPasswordMaxLength = 64;
export const managedPasswordPolicyText = `Password length must be ${managedPasswordMinLength}-${managedPasswordMaxLength}`;

export const isValidManagedPassword = (value: string) =>
  value.length >= managedPasswordMinLength && value.length <= managedPasswordMaxLength;
