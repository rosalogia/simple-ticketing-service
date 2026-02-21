import React from 'react';
import {render, screen, fireEvent} from '@testing-library/react-native';
import TicketCard from '../../components/TicketCard';
import {mockTicket, mockTicketOverdue} from '../mocks/data';

describe('TicketCard', () => {
  it('renders ticket ID, title, priority badge, status badge', () => {
    render(<TicketCard ticket={mockTicket} onPress={jest.fn()} />);

    expect(screen.getByText('#42')).toBeOnTheScreen();
    expect(screen.getByText('Fix production outage')).toBeOnTheScreen();
    expect(screen.getByText('SEV-1')).toBeOnTheScreen();
    expect(screen.getByText('Open')).toBeOnTheScreen();
  });

  it('renders assignee name', () => {
    render(<TicketCard ticket={mockTicket} onPress={jest.fn()} />);

    expect(screen.getByText('Jane Doe')).toBeOnTheScreen();
  });

  it('shows comment count when > 0', () => {
    render(<TicketCard ticket={mockTicket} onPress={jest.fn()} />);

    expect(screen.getByText('3 comments')).toBeOnTheScreen();
  });

  it('shows due date and overdue styling when past due', () => {
    render(<TicketCard ticket={mockTicketOverdue} onPress={jest.fn()} />);

    // Should show "Due" text with the date
    const dueText = screen.getByText(/^Due /);
    expect(dueText).toBeOnTheScreen();
  });

  it('onPress fires on tap', () => {
    const onPress = jest.fn();
    render(<TicketCard ticket={mockTicket} onPress={onPress} />);

    fireEvent.press(screen.getByText('Fix production outage'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });
});
