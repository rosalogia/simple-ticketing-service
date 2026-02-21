import React from 'react';
import {Alert} from 'react-native';
import {render, screen, fireEvent} from '@testing-library/react-native';
import MemberRow from '../../components/MemberRow';
import {mockMember, mockMember2} from '../mocks/data';

beforeEach(() => {
  jest.clearAllMocks();
});

describe('MemberRow', () => {
  it('renders member name, username, role badge', () => {
    render(
      <MemberRow
        member={mockMember2}
        currentUserRole="OWNER"
        onChangeRole={jest.fn()}
        onRemove={jest.fn()}
      />,
    );

    expect(screen.getByText('Bob Smith')).toBeOnTheScreen();
    expect(screen.getByText('@bsmith')).toBeOnTheScreen();
    expect(screen.getByText('MEMBER')).toBeOnTheScreen();
  });

  it('owner sees Remove button for non-owner members', () => {
    render(
      <MemberRow
        member={mockMember2}
        currentUserRole="OWNER"
        onChangeRole={jest.fn()}
        onRemove={jest.fn()}
      />,
    );

    expect(screen.getByText('Remove')).toBeOnTheScreen();
  });

  it('non-owner does not see Remove button', () => {
    render(
      <MemberRow
        member={mockMember2}
        currentUserRole="MEMBER"
        onChangeRole={jest.fn()}
        onRemove={jest.fn()}
      />,
    );

    expect(screen.queryByText('Remove')).toBeNull();
  });

  it('Remove button fires onRemove with userId via Alert', () => {
    const onRemove = jest.fn();
    jest.spyOn(Alert, 'alert');

    render(
      <MemberRow
        member={mockMember2}
        currentUserRole="OWNER"
        onChangeRole={jest.fn()}
        onRemove={onRemove}
      />,
    );

    fireEvent.press(screen.getByText('Remove'));

    // Alert.alert is called with confirm dialog
    expect(Alert.alert).toHaveBeenCalledWith(
      'Remove Member',
      expect.stringContaining('Bob Smith'),
      expect.any(Array),
    );

    // Simulate pressing "Remove" in the alert
    const alertButtons = (Alert.alert as jest.Mock).mock.calls[0][2];
    const removeButton = alertButtons.find(
      (b: any) => b.text === 'Remove' && b.style === 'destructive',
    );
    removeButton.onPress();

    expect(onRemove).toHaveBeenCalledWith(2);
  });
});
