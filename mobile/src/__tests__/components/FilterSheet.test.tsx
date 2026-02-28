import React from 'react';
import {render, screen, fireEvent} from '@testing-library/react-native';
import FilterSheet from '../../components/FilterSheet';
import type {TicketStatus, TicketPriority} from '../../types';

// Mock InfoButton to avoid nested modal complexity
jest.mock('../../components/InfoButton', () => {
  const {View} = require('react-native');
  const MockInfoButton = () => <View />;
  MockInfoButton.PriorityHelpContent = () => <View />;
  return {__esModule: true, default: MockInfoButton, PriorityHelpContent: () => <View />};
});

const defaultProps = {
  visible: true,
  onClose: jest.fn(),
  filters: {status: [] as TicketStatus[], priority: [] as TicketPriority[]},
  onApply: jest.fn(),
};

beforeEach(() => {
  jest.clearAllMocks();
});

describe('FilterSheet', () => {
  it('renders status and priority chips', () => {
    render(<FilterSheet {...defaultProps} />);

    // Status chips
    expect(screen.getByText('Open')).toBeOnTheScreen();
    expect(screen.getByText('In Progress')).toBeOnTheScreen();
    expect(screen.getByText('Blocked')).toBeOnTheScreen();
    expect(screen.getByText('Completed')).toBeOnTheScreen();
    expect(screen.getByText('Cancelled')).toBeOnTheScreen();

    // Priority chips
    expect(screen.getByText('SEV-1')).toBeOnTheScreen();
    expect(screen.getByText('SEV-2')).toBeOnTheScreen();
    expect(screen.getByText('SEV-3')).toBeOnTheScreen();
    expect(screen.getByText('SEV-4')).toBeOnTheScreen();
  });

  it('tapping status chip toggles it in local state then applies', () => {
    const onApply = jest.fn();
    render(<FilterSheet {...defaultProps} onApply={onApply} />);

    fireEvent.press(screen.getByText('Open'));
    fireEvent.press(screen.getByText('Apply Filters'));

    expect(onApply).toHaveBeenCalledWith(
      expect.objectContaining({status: ['OPEN']}),
    );
  });

  it('tapping priority chip toggles it then applies', () => {
    const onApply = jest.fn();
    render(<FilterSheet {...defaultProps} onApply={onApply} />);

    fireEvent.press(screen.getByText('SEV-1'));
    fireEvent.press(screen.getByText('SEV-2'));
    fireEvent.press(screen.getByText('Apply Filters'));

    expect(onApply).toHaveBeenCalledWith(
      expect.objectContaining({priority: ['SEV1', 'SEV2']}),
    );
  });

  it('Apply calls onApply with current state and onClose', () => {
    const onApply = jest.fn();
    const onClose = jest.fn();
    render(
      <FilterSheet {...defaultProps} onApply={onApply} onClose={onClose} />,
    );

    fireEvent.press(screen.getByText('Apply Filters'));

    expect(onApply).toHaveBeenCalledWith({status: [], priority: []});
    expect(onClose).toHaveBeenCalled();
  });

  it('Clear resets both to empty and calls onApply + onClose', () => {
    const onApply = jest.fn();
    const onClose = jest.fn();
    render(
      <FilterSheet
        {...defaultProps}
        filters={{status: ['OPEN'], priority: ['SEV1']}}
        onApply={onApply}
        onClose={onClose}
      />,
    );

    fireEvent.press(screen.getByText('Clear'));

    expect(onApply).toHaveBeenCalledWith({status: [], priority: []});
    expect(onClose).toHaveBeenCalled();
  });
});
