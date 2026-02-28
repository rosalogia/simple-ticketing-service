import React from 'react';
import {render, screen, fireEvent, waitFor} from '@testing-library/react-native';
import UrgentHeaderButton from '../../components/UrgentHeaderButton';
import {mockUrgentResponse, mockUrgentResponseEmpty} from '../mocks/data';
import {mockNavigate} from '../setup';

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

describe('UrgentHeaderButton', () => {
  it('shows badge when urgent tickets exist', async () => {
    api.getUrgentTickets.mockResolvedValue(mockUrgentResponse);

    render(<UrgentHeaderButton />);

    await waitFor(() => {
      expect(screen.getByTestId('urgent-header-badge')).toBeOnTheScreen();
    });
    expect(screen.getByText('2')).toBeOnTheScreen(); // 1 overdue + 1 due soon
  });

  it('hides badge when no urgent tickets', async () => {
    api.getUrgentTickets.mockResolvedValue(mockUrgentResponseEmpty);

    render(<UrgentHeaderButton />);

    await waitFor(() => {
      expect(api.getUrgentTickets).toHaveBeenCalled();
    });
    expect(screen.queryByTestId('urgent-header-badge')).not.toBeOnTheScreen();
  });

  it('navigates to UrgentTickets on press', async () => {
    api.getUrgentTickets.mockResolvedValue(mockUrgentResponse);

    render(<UrgentHeaderButton />);

    await waitFor(() => {
      expect(screen.getByTestId('urgent-header-badge')).toBeOnTheScreen();
    });

    fireEvent.press(screen.getByTestId('urgent-header-button'));
    expect(mockNavigate).toHaveBeenCalledWith('UrgentTickets');
  });
});
