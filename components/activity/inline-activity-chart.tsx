'use client';

interface InlineActivityChartProps {
  calls: number;
  emails: number;
  meetings: number;
  notes: number;
  sms: number;
}

export function InlineActivityChart({ calls, emails, meetings, notes, sms }: InlineActivityChartProps) {
  const total = calls + emails + meetings + notes + sms;

  if (total === 0) {
    return (
      <div className="flex items-center gap-2 text-xs text-gray-400">
        No activity
      </div>
    );
  }

  const callsPercent = (calls / total) * 100;
  const emailsPercent = (emails / total) * 100;
  const meetingsPercent = (meetings / total) * 100;
  const notesPercent = (notes / total) * 100;
  const smsPercent = (sms / total) * 100;

  return (
    <div className="space-y-2">
      {/* Stacked bar chart */}
      <div className="flex h-6 w-full overflow-hidden rounded-md bg-gray-100">
        {calls > 0 && (
          <div
            className="bg-purple-500 transition-all"
            style={{ width: `${callsPercent}%` }}
            title={`Calls: ${calls}`}
          />
        )}
        {emails > 0 && (
          <div
            className="bg-blue-500 transition-all"
            style={{ width: `${emailsPercent}%` }}
            title={`Emails: ${emails}`}
          />
        )}
        {meetings > 0 && (
          <div
            className="bg-green-500 transition-all"
            style={{ width: `${meetingsPercent}%` }}
            title={`Meetings: ${meetings}`}
          />
        )}
        {notes > 0 && (
          <div
            className="bg-orange-500 transition-all"
            style={{ width: `${notesPercent}%` }}
            title={`Notes: ${notes}`}
          />
        )}
        {sms > 0 && (
          <div
            className="bg-pink-500 transition-all"
            style={{ width: `${smsPercent}%` }}
            title={`SMS: ${sms}`}
          />
        )}
      </div>

      {/* Legend with counts */}
      <div className="flex flex-wrap gap-3 text-xs">
        {calls > 0 && (
          <div className="flex items-center gap-1">
            <div className="h-2 w-2 rounded-full bg-purple-500" />
            <span className="text-gray-600">Calls: {calls}</span>
          </div>
        )}
        {emails > 0 && (
          <div className="flex items-center gap-1">
            <div className="h-2 w-2 rounded-full bg-blue-500" />
            <span className="text-gray-600">Emails: {emails}</span>
          </div>
        )}
        {meetings > 0 && (
          <div className="flex items-center gap-1">
            <div className="h-2 w-2 rounded-full bg-green-500" />
            <span className="text-gray-600">Meetings: {meetings}</span>
          </div>
        )}
        {notes > 0 && (
          <div className="flex items-center gap-1">
            <div className="h-2 w-2 rounded-full bg-orange-500" />
            <span className="text-gray-600">Notes: {notes}</span>
          </div>
        )}
        {sms > 0 && (
          <div className="flex items-center gap-1">
            <div className="h-2 w-2 rounded-full bg-pink-500" />
            <span className="text-gray-600">SMS: {sms}</span>
          </div>
        )}
      </div>
    </div>
  );
}
