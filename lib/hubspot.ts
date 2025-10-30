/**
 * HubSpot API Integration
 * Fetches engagement activities (calls, emails, meetings, notes, tasks, SMS)
 */

const HUBSPOT_BASE_URL = 'https://api.hubapi.com';

function getApiKey(): string {
  const key = process.env.HUBSPOT_API_KEY;
  if (!key) {
    throw new Error('HubSpot API key not configured. Please set HUBSPOT_API_KEY in .env.local');
  }
  return key;
}

export interface HubSpotActivity {
  id: string;
  type: 'call' | 'email' | 'meeting' | 'note' | 'task' | 'sms';
  ownerId: string;
  ownerName?: string;
  createdAt: string;
  properties: {
    hs_timestamp?: string;
    hubspot_owner_id?: string;
    [key: string]: any;
  };
}

export interface ActivitySummary {
  date: string;
  ownerId: string;
  ownerName?: string;
  calls: number;
  emails: number;
  meetings: number;
  notes: number;
  tasks: number;
  sms: number;
  total: number;
}

/**
 * Fetch activities from HubSpot for a specific date range
 */
async function fetchHubSpotActivities(
  endpoint: string,
  startDate: Date,
  endDate: Date
): Promise<any[]> {
  const apiKey = getApiKey();

  // Use search API for date filtering
  const searchUrl = `${HUBSPOT_BASE_URL}${endpoint}/search`;

  // Convert dates to milliseconds (HubSpot uses Unix timestamps in milliseconds)
  const startTimestamp = startDate.getTime();
  const endTimestamp = endDate.getTime() + (24 * 60 * 60 * 1000); // Add 1 day to include end date

  const requestBody = {
    filterGroups: [
      {
        filters: [
          {
            propertyName: 'hs_timestamp',
            operator: 'GTE',
            value: startTimestamp.toString()
          },
          {
            propertyName: 'hs_timestamp',
            operator: 'LTE',
            value: endTimestamp.toString()
          }
        ]
      }
    ],
    properties: ['hs_timestamp', 'hubspot_owner_id', 'hs_createdate'],
    limit: 100
  };

  try {
    const response = await fetch(searchUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      console.error(`HubSpot API error response:`, errorBody);
      throw new Error(`HubSpot API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    return data.results || [];
  } catch (error) {
    console.error(`Error fetching from ${endpoint}:`, error);
    return [];
  }
}

/**
 * Get all calls within a date range
 */
export async function getHubSpotCalls(startDate: Date, endDate: Date): Promise<HubSpotActivity[]> {
  const results = await fetchHubSpotActivities('/crm/v3/objects/calls', startDate, endDate);

  return results.map((call: any) => ({
    id: call.id,
    type: 'call' as const,
    ownerId: call.properties.hubspot_owner_id,
    createdAt: call.properties.hs_timestamp || call.createdAt,
    properties: call.properties,
  }));
}

/**
 * Get all emails within a date range
 */
export async function getHubSpotEmails(startDate: Date, endDate: Date): Promise<HubSpotActivity[]> {
  const results = await fetchHubSpotActivities('/crm/v3/objects/emails', startDate, endDate);

  return results.map((email: any) => ({
    id: email.id,
    type: 'email' as const,
    ownerId: email.properties.hubspot_owner_id,
    createdAt: email.properties.hs_timestamp || email.createdAt,
    properties: email.properties,
  }));
}

/**
 * Get all meetings within a date range
 */
export async function getHubSpotMeetings(startDate: Date, endDate: Date): Promise<HubSpotActivity[]> {
  const results = await fetchHubSpotActivities('/crm/v3/objects/meetings', startDate, endDate);

  return results.map((meeting: any) => ({
    id: meeting.id,
    type: 'meeting' as const,
    ownerId: meeting.properties.hubspot_owner_id,
    createdAt: meeting.properties.hs_timestamp || meeting.createdAt,
    properties: meeting.properties,
  }));
}

/**
 * Get all notes within a date range
 */
export async function getHubSpotNotes(startDate: Date, endDate: Date): Promise<HubSpotActivity[]> {
  const results = await fetchHubSpotActivities('/crm/v3/objects/notes', startDate, endDate);

  return results.map((note: any) => ({
    id: note.id,
    type: 'note' as const,
    ownerId: note.properties.hubspot_owner_id,
    createdAt: note.properties.hs_timestamp || note.createdAt,
    properties: note.properties,
  }));
}

/**
 * Get all tasks within a date range
 */
export async function getHubSpotTasks(startDate: Date, endDate: Date): Promise<HubSpotActivity[]> {
  const results = await fetchHubSpotActivities('/crm/v3/objects/tasks', startDate, endDate);

  return results.map((task: any) => ({
    id: task.id,
    type: 'task' as const,
    ownerId: task.properties.hubspot_owner_id,
    createdAt: task.properties.hs_timestamp || task.createdAt,
    properties: task.properties,
  }));
}

/**
 * Get all SMS/communications within a date range
 */
export async function getHubSpotSMS(startDate: Date, endDate: Date): Promise<HubSpotActivity[]> {
  const results = await fetchHubSpotActivities('/crm/v3/objects/communications', startDate, endDate);

  // Filter for SMS only
  return results
    .filter((comm: any) => comm.properties.hs_communication_channel_type === 'SMS')
    .map((sms: any) => ({
      id: sms.id,
      type: 'sms' as const,
      ownerId: sms.properties.hubspot_owner_id,
      createdAt: sms.properties.hs_timestamp || sms.createdAt,
      properties: sms.properties,
    }));
}

/**
 * Get all activities for a date range
 */
export async function getAllHubSpotActivities(
  startDate: Date,
  endDate: Date
): Promise<HubSpotActivity[]> {
  const [calls, emails, meetings, notes, tasks, sms] = await Promise.all([
    getHubSpotCalls(startDate, endDate),
    getHubSpotEmails(startDate, endDate),
    getHubSpotMeetings(startDate, endDate),
    getHubSpotNotes(startDate, endDate),
    getHubSpotTasks(startDate, endDate),
    getHubSpotSMS(startDate, endDate),
  ]);

  return [...calls, ...emails, ...meetings, ...notes, ...tasks, ...sms];
}

/**
 * Aggregate activities by date and owner
 */
export function aggregateActivitiesByDateAndOwner(
  activities: HubSpotActivity[]
): ActivitySummary[] {
  const summaryMap = new Map<string, ActivitySummary>();

  activities.forEach((activity) => {
    // Skip activities without an owner ID
    if (!activity.ownerId || activity.ownerId === 'undefined') {
      return;
    }

    // Extract date from timestamp (YYYY-MM-DD)
    const date = new Date(activity.createdAt).toISOString().split('T')[0];
    const key = `${date}-${activity.ownerId}`;

    if (!summaryMap.has(key)) {
      summaryMap.set(key, {
        date,
        ownerId: activity.ownerId,
        ownerName: activity.ownerName,
        calls: 0,
        emails: 0,
        meetings: 0,
        notes: 0,
        tasks: 0,
        sms: 0,
        total: 0,
      });
    }

    const summary = summaryMap.get(key)!;

    switch (activity.type) {
      case 'call':
        summary.calls++;
        break;
      case 'email':
        summary.emails++;
        break;
      case 'meeting':
        summary.meetings++;
        break;
      case 'note':
        summary.notes++;
        break;
      case 'task':
        summary.tasks++;
        break;
      case 'sms':
        summary.sms++;
        break;
    }

    summary.total++;
  });

  return Array.from(summaryMap.values()).sort((a, b) => {
    // Sort by date desc, then by owner
    if (a.date !== b.date) {
      return b.date.localeCompare(a.date);
    }
    return a.ownerId.localeCompare(b.ownerId);
  });
}

/**
 * Get activity summary for current month
 */
export async function getCurrentMonthActivitySummary(): Promise<ActivitySummary[]> {
  const now = new Date();
  const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
  const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);

  const activities = await getAllHubSpotActivities(firstDay, lastDay);
  return aggregateActivitiesByDateAndOwner(activities);
}
