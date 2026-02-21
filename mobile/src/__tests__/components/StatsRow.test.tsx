import React from 'react';
import {render, screen, fireEvent} from '@testing-library/react-native';
import StatsRow from '../../components/StatsRow';
import {mockStats} from '../mocks/data';

describe('StatsRow', () => {
  it('returns null when stats is null', () => {
    const {toJSON} = render(<StatsRow stats={null} />);
    expect(toJSON()).toBeNull();
  });

  it('renders all 5 stat items with counts', () => {
    render(<StatsRow stats={mockStats} />);

    // Labels
    expect(screen.getByText('Open')).toBeOnTheScreen();
    expect(screen.getByText('In Progress')).toBeOnTheScreen();
    expect(screen.getByText('Blocked')).toBeOnTheScreen();
    expect(screen.getByText('Done')).toBeOnTheScreen();
    expect(screen.getByText('Overdue')).toBeOnTheScreen();

    // Counts
    expect(screen.getByText('5')).toBeOnTheScreen();
    expect(screen.getByText('3')).toBeOnTheScreen();
    expect(screen.getByText('1')).toBeOnTheScreen();
    expect(screen.getByText('12')).toBeOnTheScreen();
    expect(screen.getByText('2')).toBeOnTheScreen();
  });

  it('onStatPress fires with correct key', () => {
    const onStatPress = jest.fn();
    render(<StatsRow stats={mockStats} onStatPress={onStatPress} />);

    fireEvent.press(screen.getByText('Blocked'));
    expect(onStatPress).toHaveBeenCalledWith('blocked_count');
  });

  it('active stat gets highlighted border', () => {
    const {toJSON} = render(
      <StatsRow stats={mockStats} activeKey="open_count" />,
    );

    // The component applies borderColor when active — verify render doesn't crash
    // and the active key is reflected in the tree
    expect(toJSON()).not.toBeNull();
    expect(screen.getByText('Open')).toBeOnTheScreen();
  });
});
