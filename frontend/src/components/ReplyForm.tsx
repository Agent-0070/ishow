import { useState, type FormEvent, type FC } from 'react';
import { Send, X } from 'lucide-react';
import { useAddReply } from '../hooks/useComments';
import { Button } from './ui/button';
import { Textarea } from './ui/textarea';
import { useToast } from '../hooks/use-toast';

interface ReplyFormProps {
  commentId: string;
  onCancel: () => void;
  onSuccess?: () => void;
}

const ReplyForm: FC<ReplyFormProps> = ({ commentId, onCancel, onSuccess }) => {
  const [replyText, setReplyText] = useState('');
  const addReplyMutation = useAddReply();
  const { toast } = useToast();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    
    if (!replyText.trim()) {
      toast({
        title: "Reply Required",
        description: "Please enter a reply message.",
        variant: "destructive"
      });
      return;
    }

    try {
      await addReplyMutation.mutateAsync({
        commentId,
        text: replyText.trim()
      });

      toast({
        title: "Reply Added",
        description: "Your reply has been posted successfully.",
      });

      setReplyText('');
      onSuccess?.();
    } catch (error) {
      toast({
        title: "Failed to Add Reply",
        description: "There was an error posting your reply. Please try again.",
        variant: "destructive"
      });
    }
  };

  return (
    <form onSubmit={handleSubmit} className="mt-3 space-y-3">
      <Textarea
        value={replyText}
        onChange={(e) => setReplyText(e.target.value)}
        placeholder="Write your reply..."
        className="min-h-[80px] resize-none"
        disabled={addReplyMutation.isPending}
      />
      
      <div className="flex items-center justify-end space-x-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onCancel}
          disabled={addReplyMutation.isPending}
        >
          <X className="h-4 w-4 mr-1" />
          Cancel
        </Button>
        
        <Button
          type="submit"
          size="sm"
          disabled={addReplyMutation.isPending || !replyText.trim()}
        >
          <Send className="h-4 w-4 mr-1" />
          {addReplyMutation.isPending ? 'Posting...' : 'Reply'}
        </Button>
      </div>
    </form>
  );
};

export default ReplyForm;
