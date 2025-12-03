import { useState, type FC } from 'react';
import { Star, User, Calendar, Trash2, MoreVertical, Reply, MessageCircle } from 'lucide-react';
import { useUserComments, type Comment, useDeleteComment, type Reply as ReplyType } from '../hooks/useComments';
import { useEvents } from '../contexts/EventContext';
import { Card, CardContent } from './ui/card';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { Badge } from './ui/badge';
import { Skeleton } from './ui/skeleton';
import { Button } from './ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from './ui/dropdown-menu';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from './ui/alert-dialog';
import { useToast } from '../hooks/use-toast';
import { formatDistanceToNow } from 'date-fns';
import ReplyForm from './ReplyForm';

interface CommentsListProps {
  userId: string;
  userName: string;
}

const CommentsList: FC<CommentsListProps> = ({ userId, userName }) => {
  const { data: comments = [], isLoading, error } = useUserComments(userId);
  const { currentUser } = useEvents();
  const deleteCommentMutation = useDeleteComment();
  const { toast } = useToast();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [commentToDelete, setCommentToDelete] = useState<Comment | null>(null);
  const [replyingTo, setReplyingTo] = useState<string | null>(null);

  const renderStars = (rating?: number) => {
    if (!rating) return null;
    
    return (
      <div className="flex items-center space-x-1">
        {Array.from({ length: 5 }).map((_, i) => (
          <Star
            key={i}
            className={`h-4 w-4 ${
              i < rating 
                ? 'text-yellow-400 fill-current' 
                : 'text-gray-300'
            }`}
          />
        ))}
        <span className="text-sm text-muted-foreground ml-1">
          ({rating}/5)
        </span>
      </div>
    );
  };

  const getAverageRating = () => {
    const ratingsWithValues = comments.filter((comment: { rating: any; }) => comment.rating);
    if (ratingsWithValues.length === 0) return 0;

    const sum = ratingsWithValues.reduce((acc: any, comment: { rating: any; }) => acc + (comment.rating || 0), 0);
    return Math.round((sum / ratingsWithValues.length) * 10) / 10;
  };

  const handleDeleteComment = async (comment: Comment) => {
    try {
      await deleteCommentMutation.mutateAsync({
        userId,
        commentId: comment.id
      });

      toast({
        title: "Comment Deleted",
        description: "Your comment has been successfully removed.",
      });

      setDeleteDialogOpen(false);
      setCommentToDelete(null);
    } catch (error) {
      toast({
        title: "Failed to Delete Comment",
        description: "There was an error deleting your comment. Please try again.",
        variant: "destructive"
      });
    }
  };

  const canDeleteComment = (comment: Comment) => {
    return currentUser && comment.fromUserId === currentUser.id;
  };

  const canReplyToComment = (comment: Comment) => {
    return currentUser && currentUser.id !== comment.fromUserId;
  };

  const handleReplySuccess = () => {
    setReplyingTo(null);
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Reviews & Comments</h3>
          <Skeleton className="h-6 w-20" />
        </div>
        {Array.from({ length: 3 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="p-4">
              <div className="flex items-start space-x-3">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-3/4" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">Failed to load comments</p>
      </div>
    );
  }

  const averageRating = getAverageRating();

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Reviews & Comments</h3>
        <div className="flex items-center space-x-2">
          {averageRating > 0 && (
            <>
              {renderStars(Math.round(averageRating))}
              <span className="text-sm text-muted-foreground">
                ({comments.length} review{comments.length !== 1 ? 's' : ''})
              </span>
            </>
          )}
        </div>
      </div>

      {comments.length === 0 ? (
        <Card>
          <CardContent className="p-6 text-center">
            <User className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">
              No reviews yet for {userName}
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              Reviews will appear here after events are completed
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="max-h-96 overflow-y-auto space-y-3 pr-2 comments-scroll">
          {comments.map((comment: Comment) => (
            <Card key={comment.id} className="border-l-4 border-l-primary/20">
              <CardContent className="p-4">
                <div className="flex items-start space-x-3">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={comment.fromUserAvatar || undefined} />
                    <AvatarFallback>
                      {comment.fromUserName?.charAt(0)?.toUpperCase() || 'U'}
                    </AvatarFallback>
                  </Avatar>

                  <div className="flex-1 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <span className="font-medium text-sm">
                          {comment.fromUserName}
                        </span>
                        {comment.rating && renderStars(comment.rating)}
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true })}
                        </span>
                        {canDeleteComment(comment) && (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                                <MoreVertical className="h-3 w-3" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                onClick={() => {
                                  setCommentToDelete(comment);
                                  setDeleteDialogOpen(true);
                                }}
                                className="text-destructive focus:text-destructive"
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Delete Comment
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}
                      </div>
                    </div>

                    {comment.eventName && (
                      <div className="flex items-center space-x-1">
                        <Calendar className="h-3 w-3 text-muted-foreground" />
                        <Badge variant="outline" className="text-xs">
                          {comment.eventName}
                        </Badge>
                      </div>
                    )}

                    <p className="text-sm text-foreground leading-relaxed">
                      {comment.text}
                    </p>

                    {/* Reply Button */}
                    <div className="flex items-center space-x-2 mt-2">
                      {canReplyToComment(comment) && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setReplyingTo(replyingTo === comment.id ? null : comment.id)}
                          className="h-7 px-2 text-xs"
                        >
                          <Reply className="h-3 w-3 mr-1" />
                          Reply
                        </Button>
                      )}

                      {comment.replies && comment.replies.length > 0 && (
                        <span className="text-xs text-muted-foreground flex items-center">
                          <MessageCircle className="h-3 w-3 mr-1" />
                          {comment.replies.length} {comment.replies.length === 1 ? 'reply' : 'replies'}
                        </span>
                      )}
                    </div>

                    {/* Reply Form */}
                    {replyingTo === comment.id && (
                      <ReplyForm
                        commentId={comment.id}
                        onCancel={() => setReplyingTo(null)}
                        onSuccess={handleReplySuccess}
                      />
                    )}
                  </div>
                </div>

                {/* Replies Section */}
                {comment.replies && comment.replies.length > 0 && (
                  <div className="mt-4 ml-12 space-y-3">
                    {comment.replies.map((reply: ReplyType) => (
                      <div key={reply.id} className="border-l-2 border-muted pl-4">
                        <div className="flex items-start space-x-3">
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={reply.fromUserAvatar || undefined} />
                            <AvatarFallback className="text-xs">
                              {reply.fromUserName?.charAt(0)?.toUpperCase() || 'U'}
                            </AvatarFallback>
                          </Avatar>

                          <div className="flex-1 space-y-1">
                            <div className="flex items-center justify-between">
                              <span className="font-medium text-sm">
                                {reply.fromUserName}
                              </span>
                              <span className="text-xs text-muted-foreground">
                                {formatDistanceToNow(new Date(reply.createdAt), { addSuffix: true })}
                              </span>
                            </div>

                            <p className="text-sm text-foreground leading-relaxed">
                              {reply.text}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Comment</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this comment? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => commentToDelete && handleDeleteComment(commentToDelete)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleteCommentMutation.isPending}
            >
              {deleteCommentMutation.isPending ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default CommentsList;
