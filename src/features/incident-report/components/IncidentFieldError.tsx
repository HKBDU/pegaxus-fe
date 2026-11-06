export function IncidentFieldError({ message }: { message?: string }) {
  return message ? (
    <span
      data-incident-error
      role="alert"
      className="block text-xs font-medium text-red-600"
    >
      {message}
    </span>
  ) : null;
}
