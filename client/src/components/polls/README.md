# Polls Feature - Frontend Architecture

This directory contains the complete frontend implementation for the Polls feature, built with Redux and real-time WebSocket integration.

## 🏗️ Architecture Overview

### Core Components
- **Redux Store**: Centralized state management with async thunks
- **WebSocket Manager**: Real-time updates for polls and votes
- **API Client**: HTTP operations with error handling
- **React Components**: Modular, reusable UI components

### File Structure
```
src/
├── store/slices/pollsSlice.js          # Redux store slice
├── services/
│   ├── api/pollApi.js                  # API client
│   └── websocket/PollSocketManager.js  # WebSocket manager
├── hooks/usePollSocket.js              # WebSocket hook
└── components/polls/
    ├── PollList.jsx                    # Main polls container
    ├── PollCard.jsx                    # Individual poll display
    ├── PollCreator.jsx                 # Poll creation form
    ├── VoteForm.jsx                    # Voting interface
    ├── ResultsDisplay.jsx              # Results visualization
    ├── LiveResults.jsx                 # Real-time results
    └── index.js                        # Component exports
```

## 🚀 Quick Start

### 1. Basic Usage
```jsx
import { PollList } from './components/polls';

function EventPage({ eventId }) {
  return (
    <div>
      <h1>Event Polls</h1>
      <PollList eventId={eventId} />
    </div>
  );
}
```

### 2. With Custom Styling
```jsx
import { PollList, PollCreator } from './components/polls';

function EventDashboard({ eventId, isOrganizer }) {
  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Event Polls</h1>
        {isOrganizer && <PollCreator eventId={eventId} />}
      </div>
      
      <PollList eventId={eventId} />
    </div>
  );
}
```

### 3. Manual Redux Integration
```jsx
import { useDispatch, useSelector } from 'react-redux';
import { fetchPolls, createPoll } from '../store/slices/pollsSlice';

function CustomPollsComponent({ eventId }) {
  const dispatch = useDispatch();
  const { polls, loading, errors } = useSelector(state => state.polls);

  useEffect(() => {
    dispatch(fetchPolls({ eventId }));
  }, [eventId, dispatch]);

  const handleCreatePoll = async (pollData) => {
    try {
      await dispatch(createPoll({ eventId, pollData })).unwrap();
      console.log('Poll created successfully!');
    } catch (error) {
      console.error('Failed to create poll:', error);
    }
  };

  return (
    <div>
      {loading.polls && <div>Loading polls...</div>}
      {errors.polls && <div>Error: {errors.polls}</div>}
      {/* Your custom UI */}
    </div>
  );
}
```

## 🔧 Configuration

### Environment Variables
```env
# WebSocket URL (optional, defaults to API URL)
VITE_API_URL=http://localhost:5000
```

### Redux Store Setup
The polls reducer is automatically included in the main store. No additional configuration needed.

## 📡 Real-time Features

### WebSocket Events
- `new_poll`: New poll created
- `poll_vote_update`: Vote count updated
- `poll_closed`: Poll closed by organizer

### Connection Management
- Automatic reconnection with exponential backoff
- Connection status indicators
- Graceful fallback for offline scenarios

## 🎨 Customization

### Styling
All components use Tailwind CSS classes and can be customized:

```jsx
// Custom styling example
<PollCard 
  poll={poll} 
  eventId={eventId}
  className="custom-poll-card"
  style={{ backgroundColor: '#f0f0f0' }}
/>
```

### Theme Integration
Components automatically adapt to your existing theme:

```jsx
// Dark mode support
<div className="dark:bg-gray-800 dark:text-white">
  <PollList eventId={eventId} />
</div>
```

## 🔒 Security & Permissions

### Access Control
- **Organizers**: Can create, close, and manage polls
- **Ticket Holders**: Can view and vote on polls
- **Anonymous Users**: Limited access based on poll settings

### Rate Limiting
Built-in protection against:
- Spam voting
- Excessive poll creation
- Rapid API requests

## 📊 Analytics & Results

### Real-time Updates
- Live vote counts
- Participation rates
- Anonymous vs identified votes

### Export Options
- CSV export for poll results
- JSON format for detailed analytics

## 🧪 Testing

### Unit Tests
```javascript
// Example test structure
import { render, screen } from '@testing-library/react';
import { PollList } from './components/polls';

test('renders polls list', () => {
  render(<PollList eventId="test-event" />);
  expect(screen.getByText('Event Polls')).toBeInTheDocument();
});
```

### Integration Tests
```javascript
// Test Redux integration
import { store } from '../store';
import { fetchPolls } from '../store/slices/pollsSlice';

test('fetches polls successfully', async () => {
  await store.dispatch(fetchPolls({ eventId: 'test-event' }));
  const state = store.getState();
  expect(state.polls.activePolls).toHaveLength(2);
});
```

## 🚨 Error Handling

### Common Error Scenarios
1. **Network Issues**: Automatic retry with user feedback
2. **Authentication**: Redirect to login if token expires
3. **Permission Denied**: Clear error messages for access issues
4. **Validation Errors**: Inline form validation with helpful messages

### Error Recovery
```jsx
// Error boundary example
import { ErrorBoundary } from 'react-error-boundary';

function PollsWithErrorBoundary({ eventId }) {
  return (
    <ErrorBoundary fallback={<div>Something went wrong with polls</div>}>
      <PollList eventId={eventId} />
    </ErrorBoundary>
  );
}
```

## 📱 Mobile Support

### Responsive Design
- Mobile-first approach
- Touch-friendly interactions
- Optimized for small screens

### Performance
- Lazy loading of poll results
- Optimized WebSocket connections
- Minimal re-renders with React.memo

## 🔄 State Management

### Redux State Structure
```javascript
{
  polls: {
    polls: {},           // Poll data by ID
    activePolls: [],     // Active poll IDs
    userVotes: {},       // User votes by poll ID
    pollResults: {},     // Results by poll ID
    loading: {
      polls: false,
      vote: false,
      results: false
    },
    errors: {
      polls: null,
      vote: null,
      results: null
    },
    realtime: {
      isConnected: false,
      connectionError: null
    }
  }
}
```

### Actions Available
- `fetchPolls({ eventId, status })`
- `createPoll({ eventId, pollData })`
- `submitVote({ pollId, optionIds })`
- `fetchResults({ pollId })`
- `closePoll({ pollId })`

## 🎯 Best Practices

### Performance
1. Use React.memo for expensive components
2. Implement proper loading states
3. Debounce user interactions
4. Optimize WebSocket message handling

### Accessibility
1. Proper ARIA labels
2. Keyboard navigation support
3. Screen reader compatibility
4. High contrast support

### Security
1. Validate all user inputs
2. Sanitize poll content
3. Implement proper authentication
4. Rate limit API calls

## 🐛 Troubleshooting

### Common Issues

#### WebSocket Connection Issues
```javascript
// Check connection status
const { isConnected, connectionError } = usePollSocket(eventId);
console.log('Connected:', isConnected, 'Error:', connectionError);
```

#### Redux State Issues
```javascript
// Debug Redux state
import { store } from '../store';
console.log('Current polls state:', store.getState().polls);
```

#### API Errors
```javascript
// Handle API errors
try {
  await dispatch(createPoll({ eventId, pollData })).unwrap();
} catch (error) {
  console.error('API Error:', error);
  // Handle specific error types
  if (error.status === 403) {
    // Permission denied
  } else if (error.status === 429) {
    // Rate limited
  }
}
```

## 📚 API Reference

### Poll Data Structure
```javascript
{
  poll_id: "string",
  event_id: "string",
  organizer_id: "string",
  question: "string",
  description: "string",
  poll_type: "general" | "artist_selection" | "theme_selection" | "feature_selection",
  options_json: [
    {
      id: "string",
      label: "string",
      description: "string",
      // Additional fields based on poll_type
    }
  ],
  max_votes: number,
  allow_anonymous: boolean,
  allow_vote_changes: boolean,
  closes_at: "ISO string",
  status: "draft" | "active" | "closed",
  created_at: "ISO string",
  has_voted: boolean,
  user_vote: string[] // if has_voted is true
}
```

### WebSocket Events
```javascript
// Client → Server
socket.emit('join:event', { eventId });

// Server → Client
socket.on('new_poll', (pollData) => {});
socket.on('poll_vote_update', (updateData) => {});
socket.on('poll_closed', (closeData) => {});
```

## 🤝 Contributing

### Development Setup
1. Install dependencies: `npm install`
2. Start development server: `npm run dev`
3. Run tests: `npm test`
4. Build for production: `npm run build`

### Code Style
- Use Prettier for formatting
- Follow ESLint rules
- Write meaningful commit messages
- Add tests for new features

## 📄 License

This implementation follows the same license as the main project.
