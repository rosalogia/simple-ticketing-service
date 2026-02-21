import React from 'react';
import {render, screen, fireEvent, waitFor} from '@testing-library/react-native';
import CommentThread from '../../components/CommentThread';
import {mockComment, mockComment2, mockUser} from '../mocks/data';

// Mock AuthContext
jest.mock('../../auth/AuthContext', () => ({
  useAuth: () => ({user: {id: 1, username: 'jdoe', display_name: 'Jane Doe'}}),
}));

// Mock API client
jest.mock('../../api/client', () => ({
  api: {
    addComment: jest.fn().mockResolvedValue({}),
    updateComment: jest.fn().mockResolvedValue({}),
    deleteComment: jest.fn().mockResolvedValue(undefined),
  },
}));

const {api} = require('../../api/client');

const defaultProps = {
  ticketId: 42,
  comments: [mockComment, mockComment2],
  onRefresh: jest.fn(),
};

beforeEach(() => {
  jest.clearAllMocks();
});

describe('CommentThread', () => {
  it('renders comment list with author names and content', () => {
    render(<CommentThread {...defaultProps} />);

    expect(screen.getByText('Jane Doe')).toBeOnTheScreen();
    expect(screen.getByText('Working on this now')).toBeOnTheScreen();
    expect(screen.getByText('Bob Smith')).toBeOnTheScreen();
    expect(screen.getByText('Any updates?')).toBeOnTheScreen();
  });

  it('shows heading with count', () => {
    render(<CommentThread {...defaultProps} />);

    expect(screen.getByText('Comments (2)')).toBeOnTheScreen();
  });

  it('Edit/Delete buttons only visible for current user comments', () => {
    render(<CommentThread {...defaultProps} />);

    // Current user (id=1) is mockComment author (Jane Doe)
    const editButtons = screen.getAllByText('Edit');
    const deleteButtons = screen.getAllByText('Delete');

    // Only 1 set of edit/delete buttons (for Jane's comment, not Bob's)
    expect(editButtons).toHaveLength(1);
    expect(deleteButtons).toHaveLength(1);
  });

  it('Post comment calls api.addComment and onRefresh', async () => {
    const onRefresh = jest.fn();
    render(<CommentThread {...defaultProps} onRefresh={onRefresh} />);

    const input = screen.getByPlaceholderText('Add a comment...');
    fireEvent.changeText(input, 'New comment');
    fireEvent.press(screen.getByText('Post'));

    await waitFor(() => {
      expect(api.addComment).toHaveBeenCalledWith(42, 'New comment');
      expect(onRefresh).toHaveBeenCalled();
    });
  });

  it('Post button disabled when input is empty', () => {
    render(<CommentThread {...defaultProps} />);

    const postButton = screen.getByText('Post');
    // The button should have disabled state via opacity style
    fireEvent.press(postButton);
    expect(api.addComment).not.toHaveBeenCalled();
  });

  it('Edit mode: shows input with current content, Save calls api.updateComment', async () => {
    const onRefresh = jest.fn();
    render(<CommentThread {...defaultProps} onRefresh={onRefresh} />);

    // Click Edit on current user's comment
    fireEvent.press(screen.getByText('Edit'));

    // Should show Save button
    expect(screen.getByText('Save')).toBeOnTheScreen();

    // The edit input should have the current content
    fireEvent.press(screen.getByText('Save'));

    await waitFor(() => {
      expect(api.updateComment).toHaveBeenCalledWith(
        42,
        200,
        'Working on this now',
      );
      expect(onRefresh).toHaveBeenCalled();
    });
  });
});
