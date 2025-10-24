export interface TimezoneInfo {
  timezone: string;
  currentDateTime: string;
  currentDate: string;
  currentTime: string;
}

export function getTimezoneInfo(): TimezoneInfo {
  const now = new Date();
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  
  const dateTimeFormatter = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
    weekday: 'long'
  });
  
  const dateFormatter = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'long'
  });
  
  const timeFormatter = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  });
  
  return {
    timezone,
    currentDateTime: dateTimeFormatter.format(now),
    currentDate: dateFormatter.format(now),
    currentTime: timeFormatter.format(now)
  };
}
