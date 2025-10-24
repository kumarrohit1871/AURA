export interface TimezoneInfo {
  timezone: string;
}

export function getTimezoneInfo(): TimezoneInfo {
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  
  return {
    timezone
  };
}
