import React from 'react';
import {render, screen, waitFor} from '@testing-library/react-native';
import UrgentTicketsScreen from '../../screens/UrgentTicketsScreen';
import {mockUrgentResponse, mockUrgentResponseEmpty} from '../mocks/data';

// Make useFocusEffect invoke the callback immediately
const {useFocusEffect} = require('@react-navigation/native');

jest.mock('../../api/client', () => ({
  api: {
    getUrgentTickets: jest.fn(),
  },
}));

const {api} = require('../../api/client');

beforeEach(() => {
  jest.clearAllMocks();
  useFocusEffect.mockImplementation((cb: () => void) => cb());
});

describe('UrgentTicketsScreen', () => {
  it('renders overdue and due-soon sections', async () => {
    api.getUrgentTickets.mockResolvedValue(mockUrgentResponse);

    render(<UrgentTicketsScreen />);

    await waitFor(() => {
      expect(screen.getByText('OVERDUE')).toBeOnTheScreen();
    });
    expect(screen.getByText('DUE SOON')).toBeOnTheScreen();
    expect(screen.getByText('Overdue task')).toBeOnTheScreen();
    expect(screen.getByText('Due soon task')).toBeOnTheScreen();
  });

  it('shows empty state when no urgent tickets', async () => {
    api.getUrgentTickets.mockResolvedValue(mockUrgentResponseEmpty);

    render(<UrgentTicketsScreen />);

    await waitFor(() => {
      expect(screen.getByText('No urgent tickets')).toBeOnTheScreen();
    });
  });

  it('shows queue name on tickets', async () => {
    api.getUrgentTickets.mockResolvedValue(mockUrgentResponse);

    render(<UrgentTicketsScreen />);

    await waitFor(() => {
      expect(screen.getByText('Infra')).toBeOnTheScreen();
    });
    expect(screen.getByText('Frontend')).toBeOnTheScreen();
  });
});
