// Files shaped like LinkedIn's "Get a copy of your data" export and a CRM CSV.
// messages.csv quotes every header name, as the real one does; Connections.csv
// starts with three note rows.

const H =
  '"CONVERSATION ID","CONVERSATION TITLE","FROM","SENDER PROFILE URL","TO","RECIPIENT PROFILE URLS","DATE","SUBJECT","CONTENT","FOLDER","ATTACHMENTS","IS MESSAGE DRAFT","IS CONVERSATION DRAFT"'

const row = (id: string, from: string, to: string, date: string, content: string) =>
  [id, '', from, `https://www.linkedin.com/in/${from.toLowerCase().replace(/ /g, '-')}`, to, '', date, '', `"${content.replace(/"/g, '""')}"`, 'INBOX', '', 'No', 'No'].join(',')

export const MESSAGES = [
  H,
  // Outreach, no reply
  row('c1', 'Pat Creator', 'Ana Silva', '2026-09-28 10:00:00 UTC', 'Hi Ana, saw your post on pricing.'),
  // Outreach, reply, call booked
  row('c2', 'Pat Creator', 'Ben Ode', '2026-09-20 09:00:00 UTC', 'Hi Ben, quick question about your agency.'),
  row('c2', 'Ben Ode', 'Pat Creator', '2026-09-21 12:00:00 UTC', 'Sure, happy to chat.'),
  row('c2', 'Pat Creator', 'Ben Ode', '2026-09-21 13:00:00 UTC', 'Great, here is my link: https://cal.com/pat/20min'),
  // Inbound, replied, no call
  row('c3', 'Cy Park', 'Pat Creator', '2026-10-01 08:00:00 UTC', 'Loved your post on hooks, how do you test them?'),
  row('c3', 'Pat Creator', 'Cy Park', '2026-10-01 09:30:00 UTC', 'Thanks Cy! I check the fold first, then the first comment.'),
  // Old conversation, outside a 30-day window
  row('c4', 'Pat Creator', 'Dee Old', '2026-06-01 09:00:00 UTC', 'Hello from June.'),
  row('c4', 'Dee Old', 'Pat Creator', '2026-06-02 09:00:00 UTC', 'Hi! See you on Tuesday.'),
  // Another outreach so "you" are clear: Pat is in every conversation
  row('c5', 'Pat Creator', 'Eve Ng', '2026-10-02 09:00:00 UTC', 'Hi Eve, thanks for connecting.'),
].join('\n')

export const CONNECTIONS = [
  'Notes:',
  '"When exporting your connection data, you may notice that some of the email addresses are missing."',
  '',
  'First Name,Last Name,URL,Email Address,Company,Position,Connected On',
  'Ana,Silva,https://www.linkedin.com/in/ana,,Acme,Founder,27 Sep 2026',
  'Eve,Ng,https://www.linkedin.com/in/eve,,Beta,CEO,01 Oct 2026',
  'Old,Friend,https://www.linkedin.com/in/old,,Gamma,CTO,15 Jan 2025',
].join('\n')

export const CRM = [
  'Name,Company,Stage,Created',
  'Ana Silva,Acme,Contacted,2026-09-28',
  'Ben Ode,Ode Studio,Meeting booked,2026-09-21',
  'Cy Park,Park & Co,Replied,2026-10-01',
  'Zed Lost,Nope Inc,Closed lost,2026-09-30',
].join('\n')

// 2026-10-04 12:00 UTC
export const NOW = Date.UTC(2026, 9, 4, 12)
