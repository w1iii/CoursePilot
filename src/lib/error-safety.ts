/** Never expose arbitrary upstream error messages to clients or persistent logs. */
export function safeErrorMessage(): string {
  return "An unexpected error occurred";
}
