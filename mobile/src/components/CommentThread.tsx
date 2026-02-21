import React, {useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
} from 'react-native';
import type {Comment} from '../types';
import {useAuth} from '../auth/AuthContext';
import {api} from '../api/client';
import {colors, spacing, fontSize, fontWeight, borderRadius} from '../theme';

interface Props {
  ticketId: number;
  comments: Comment[];
  onRefresh: () => void;
}

export default function CommentThread({ticketId, comments, onRefresh}: Props) {
  const {user} = useAuth();
  const [newComment, setNewComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editContent, setEditContent] = useState('');

  const handleAdd = async () => {
    if (!newComment.trim() || submitting) return;
    setSubmitting(true);
    try {
      await api.addComment(ticketId, newComment.trim());
      setNewComment('');
      onRefresh();
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = async (commentId: number) => {
    if (!editContent.trim()) return;
    try {
      await api.updateComment(ticketId, commentId, editContent.trim());
      setEditingId(null);
      onRefresh();
    } catch (e: any) {
      Alert.alert('Error', e.message);
    }
  };

  const handleDelete = (commentId: number) => {
    Alert.alert('Delete Comment', 'Are you sure?', [
      {text: 'Cancel', style: 'cancel'},
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await api.deleteComment(ticketId, commentId);
            onRefresh();
          } catch (e: any) {
            Alert.alert('Error', e.message);
          }
        },
      },
    ]);
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  return (
    <View style={styles.container}>
      <Text style={styles.heading}>
        Comments ({comments.length})
      </Text>

      {comments.map(comment => (
        <View key={comment.id} style={styles.comment}>
          <View style={styles.commentHeader}>
            <View>
              <Text style={styles.author}>{comment.user.display_name}</Text>
              {comment.on_behalf_of && (
                <Text style={styles.oboText}>on behalf of {comment.on_behalf_of.display_name}</Text>
              )}
            </View>
            <Text style={styles.date}>{formatDate(comment.created_at)}</Text>
          </View>
          {editingId === comment.id ? (
            <View>
              <TextInput
                style={styles.input}
                value={editContent}
                onChangeText={setEditContent}
                multiline
              />
              <View style={styles.editActions}>
                <TouchableOpacity onPress={() => handleEdit(comment.id)}>
                  <Text style={styles.actionText}>Save</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setEditingId(null)}>
                  <Text style={[styles.actionText, {color: colors.inkMuted}]}>
                    Cancel
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <>
              <Text style={styles.content}>{comment.content}</Text>
              {user?.id === comment.user.id && (
                <View style={styles.editActions}>
                  <TouchableOpacity
                    onPress={() => {
                      setEditingId(comment.id);
                      setEditContent(comment.content);
                    }}>
                    <Text style={styles.actionText}>Edit</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => handleDelete(comment.id)}>
                    <Text style={[styles.actionText, {color: colors.sev1}]}>
                      Delete
                    </Text>
                  </TouchableOpacity>
                </View>
              )}
            </>
          )}
        </View>
      ))}

      <View style={styles.addSection}>
        <TextInput
          style={styles.input}
          value={newComment}
          onChangeText={setNewComment}
          placeholder="Add a comment..."
          placeholderTextColor={colors.stone400}
          multiline
        />
        <TouchableOpacity
          style={[styles.addButton, !newComment.trim() && styles.addButtonDisabled]}
          onPress={handleAdd}
          disabled={!newComment.trim() || submitting}>
          <Text style={styles.addButtonText}>
            {submitting ? 'Posting...' : 'Post'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
  },
  heading: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    color: colors.ink,
    marginBottom: spacing.md,
  },
  comment: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.stone200,
  },
  commentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  author: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.ink,
  },
  oboText: {
    fontSize: fontSize.xs,
    color: colors.inkMuted,
    marginTop: 1,
  },
  date: {
    fontSize: fontSize.xs,
    color: colors.inkMuted,
  },
  content: {
    fontSize: fontSize.md,
    color: colors.inkLight,
    lineHeight: 22,
  },
  editActions: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.sm,
  },
  actionText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: colors.accent,
  },
  addSection: {
    marginTop: spacing.sm,
    marginBottom: spacing.xxl,
  },
  input: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.stone200,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    fontSize: fontSize.md,
    color: colors.ink,
    minHeight: 60,
    textAlignVertical: 'top',
  },
  addButton: {
    backgroundColor: colors.accent,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  addButtonDisabled: {
    opacity: 0.5,
  },
  addButtonText: {
    color: colors.white,
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
  },
});
