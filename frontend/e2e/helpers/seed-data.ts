/** Constants matching backend/app/seed.py */

export const USERS = {
  alice: { username: 'alice', displayName: 'Alice Chen' },
  bob: { username: 'bob', displayName: 'Bob Martinez' },
  carol: { username: 'carol', displayName: 'Carol Kim' },
  dave: { username: 'dave', displayName: 'Dave Okonkwo' },
} as const;

export const QUEUE = {
  name: 'Housemates',
  description: 'Shared queue for our household tasks and favors',
} as const;

export const TICKETS = [
  { title: "Read 'Designing Data-Intensive Applications' Ch. 5", assignee: 'bob', assigner: 'alice', status: 'Open' },
  { title: 'Pick up dry cleaning', assignee: 'alice', assigner: 'carol', status: 'Open' },
  { title: "Review Carol's slide deck for Thursday", assignee: 'dave', assigner: 'carol', status: 'In Progress' },
  { title: 'Fix the leaky kitchen faucet', assignee: 'bob', assigner: 'dave', status: 'Blocked' },
  { title: 'URGENT: Airport pickup tomorrow 6am', assignee: 'carol', assigner: 'alice', status: 'Open' },
  { title: 'Compile monthly expense report', assignee: 'alice', assigner: 'dave', status: 'Completed' },
  { title: 'Plan group dinner for Saturday', assignee: 'carol', assigner: 'bob', status: 'In Progress' },
  { title: 'Set up new dev environment', assignee: 'dave', assigner: 'alice', status: 'Cancelled' },
] as const;
