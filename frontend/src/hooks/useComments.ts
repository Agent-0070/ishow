import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { usersAPI } from '../lib/api';

export interface Reply {
  id: string;
  text: string;
  createdAt: string;
  fromUserId: string;
  fromUserName: string;
  fromUserAvatar?: string;
  parentComment: string;
}

export interface Comment {
  id: string;
  text: string;
  rating?: number;
  eventId?: string;
  eventName?: string;
  createdAt: string;
  fromUserId: string;
  fromUserName: string;
  fromUserAvatar?: string;
  replies?: Reply[];
}

export interface AddCommentData {
  comment: string;
  rating: number;
  eventId: string;
  eventName: string;
}

// Query key factory
export const commentKeys = {
  all: ['comments'] as const,
  user: (userId: string) => [...commentKeys.all, 'user', userId] as const,
};

// Hook to get user comments
export const useUserComments = (userId: string) => {
  return useQuery({
    queryKey: commentKeys.user(userId),
    queryFn: async () => {
      try {
        const response = await usersAPI.getUser(userId);
        return response.data.receivedComments || [];
      } catch (error) {
        console.error('Failed to fetch user comments:', error);
        throw error;
      }
    },
    enabled: !!userId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 2,
  });
};

// Hook to add a comment
export const useAddComment = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ userId, commentData }: { userId: string; commentData: AddCommentData }) => {
      const response = await usersAPI.addUserComment(userId, commentData);
      return response.data;
    },
    onSuccess: (newComment, { userId }) => {
      // Update the user comments cache
      queryClient.setQueryData(commentKeys.user(userId), (oldComments: Comment[] = []) => {
        return [newComment, ...oldComments];
      });

      // Invalidate related queries to ensure fresh data
      queryClient.invalidateQueries({ queryKey: commentKeys.user(userId) });

      // Also invalidate the user query to update the user's overall data
      queryClient.invalidateQueries({ queryKey: ['users', userId] });
    },
    onError: (error) => {
      console.error('Failed to add comment:', error);
    },
  });
};

// Hook to add a reply to a comment
export const useAddReply = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ commentId, text }: { commentId: string; text: string }) => {
      const response = await usersAPI.addCommentReply(commentId, { text });
      return response.data;
    },
    onSuccess: (newReply, { commentId }) => {
      // Find the user ID from the cache to update the right query
      const queryCache = queryClient.getQueryCache();
      const userQueries = queryCache.findAll({ queryKey: commentKeys.all });

      userQueries.forEach(query => {
        if (query.queryKey[1] === 'user') {
          const userId = query.queryKey[2] as string;
          queryClient.setQueryData(commentKeys.user(userId), (oldComments: Comment[] = []) => {
            return oldComments.map(comment => {
              if (comment.id === commentId) {
                return {
                  ...comment,
                  replies: [...(comment.replies || []), newReply]
                };
              }
              return comment;
            });
          });
        }
      });

      // Invalidate all user comment queries to ensure consistency
      queryClient.invalidateQueries({ queryKey: commentKeys.all });
    },
    onError: (error) => {
      console.error('Failed to add reply:', error);
    },
  });
};

// Hook to delete a comment
export const useDeleteComment = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ userId, commentId }: { userId: string; commentId: string }) => {
      const response = await usersAPI.deleteUserComment(userId, commentId);
      return response.data;
    },
      onSuccess: (_deletedComment, { userId, commentId }) => {
      // Remove the comment from the cache
      queryClient.setQueryData(commentKeys.user(userId), (oldComments: Comment[] = []) => {
        return oldComments.filter(comment => comment.id !== commentId);
      });

      // Invalidate related queries to ensure fresh data
      queryClient.invalidateQueries({ queryKey: commentKeys.user(userId) });

      // Also invalidate the user query to update the user's overall data
      queryClient.invalidateQueries({ queryKey: ['users', userId] });
    },
    onError: (error) => {
      console.error('Failed to delete comment:', error);
    },
  });
};

// Hook to get all comments (for admin purposes)
export const useAllComments = () => {
  return useQuery({
    queryKey: [...commentKeys.all, 'all'],
    queryFn: async () => {
      // This would need a backend endpoint to get all comments
      // For now, we'll return empty array
      return [];
    },
    enabled: false, // Only enable when needed
  });
};
