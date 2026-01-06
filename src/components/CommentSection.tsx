'use client';

import { useState } from 'react';
import { commentApi, likeApi } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';

interface Comment {
  id: string;
  content: string;
  user: {
    id: string;
    username: string;
    avatar: string;
  };
  like_count: number;
  is_liked: boolean;
  replies?: Comment[];
  created_at: string;
}

interface CommentSectionProps {
  productId: string;
  comments: Comment[];
  onCommentAdded?: () => void;
}

export default function CommentSection({
  productId,
  comments: initialComments,
  onCommentAdded,
}: CommentSectionProps) {
  const { user } = useAuth();
  const [comments, setComments] = useState<Comment[]>(initialComments);
  const [newComment, setNewComment] = useState('');
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyContent, setReplyContent] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || loading) return;

    setLoading(true);
    try {
      await commentApi.createComment(productId, { content: newComment });
      setNewComment('');
      onCommentAdded?.();
      // Reload comments
      const updatedComments = await commentApi.getComments(productId);
      setComments(updatedComments as Comment[]);
    } catch (error) {
      console.error('Failed to add comment:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleReply = async (parentId: string) => {
    if (!replyContent.trim() || loading) return;

    setLoading(true);
    try {
      await commentApi.createComment(productId, {
        content: replyContent,
        parent_id: parentId,
      });
      setReplyContent('');
      setReplyingTo(null);
      onCommentAdded?.();
      // Reload comments
      const updatedComments = await commentApi.getComments(productId);
      setComments(updatedComments as Comment[]);
    } catch (error) {
      console.error('Failed to add reply:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLikeComment = async (commentId: string) => {
    try {
      const comment = findComment(comments, commentId);
      if (!comment) return;

      if (comment.is_liked) {
        await likeApi.unlikeComment(commentId);
        updateCommentLike(commentId, false);
      } else {
        await likeApi.likeComment(commentId);
        updateCommentLike(commentId, true);
      }
    } catch (error) {
      console.error('Failed to toggle comment like:', error);
    }
  };

  const findComment = (comments: Comment[], id: string): Comment | null => {
    for (const comment of comments) {
      if (comment.id === id) return comment;
      if (comment.replies) {
        const found = findComment(comment.replies, id);
        if (found) return found;
      }
    }
    return null;
  };

  const updateCommentLike = (commentId: string, isLiked: boolean) => {
    setComments((prev) =>
      prev.map((comment) => {
        if (comment.id === commentId) {
          return {
            ...comment,
            is_liked: isLiked,
            like_count: isLiked ? comment.like_count + 1 : comment.like_count - 1,
          };
        }
        if (comment.replies) {
          return {
            ...comment,
            replies: comment.replies.map((reply) =>
              reply.id === commentId
                ? {
                    ...reply,
                    is_liked: isLiked,
                    like_count: isLiked ? reply.like_count + 1 : reply.like_count - 1,
                  }
                : reply
            ),
          };
        }
        return comment;
      })
    );
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!confirm('Are you sure you want to delete this comment?')) return;

    try {
      await commentApi.deleteComment(commentId);
      setComments((prev) =>
        prev.filter((comment) => {
          if (comment.id === commentId) return false;
          if (comment.replies) {
            comment.replies = comment.replies.filter((reply) => reply.id !== commentId);
          }
          return true;
        })
      );
    } catch (error) {
      console.error('Failed to delete comment:', error);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h3 className="text-lg font-semibold mb-4">Comments ({comments.length})</h3>

      {/* Add Comment Form */}
      {user && (
        <form onSubmit={handleSubmitComment} className="mb-6">
          <div className="flex space-x-3">
            <img
              src={user.avatar || '/default-avatar.png'}
              alt={user.username}
              className="w-10 h-10 rounded-full"
              onError={(e) => {
                (e.target as HTMLImageElement).src = '/default-avatar.png';
              }}
            />
            <div className="flex-1">
              <textarea
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Add a comment..."
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                rows={2}
              />
              <button
                type="submit"
                disabled={loading || !newComment.trim()}
                className="mt-2 bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 disabled:opacity-50"
              >
                {loading ? 'Posting...' : 'Post'}
              </button>
            </div>
          </div>
        </form>
      )}

      {/* Comments List */}
      <div className="space-y-4">
        {comments.map((comment) => (
          <div key={comment.id} className="border-b border-gray-100 pb-4 last:border-0">
            <div className="flex space-x-3">
              <img
                src={comment.user.avatar || '/default-avatar.png'}
                alt={comment.user.username}
                className="w-10 h-10 rounded-full"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = '/default-avatar.png';
                }}
              />
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-semibold text-gray-900">
                      {comment.user.username}
                    </span>
                    <span className="text-sm text-gray-500 ml-2">
                      {new Date(comment.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  {user && user.id === comment.user.id && (
                    <button
                      onClick={() => handleDeleteComment(comment.id)}
                      className="text-red-500 hover:text-red-700 text-sm"
                    >
                      Delete
                    </button>
                  )}
                </div>
                <p className="text-gray-700 mt-1">{comment.content}</p>
                <div className="flex items-center space-x-4 mt-2">
                  <button
                    onClick={() => handleLikeComment(comment.id)}
                    className={`flex items-center space-x-1 text-sm ${
                      comment.is_liked ? 'text-red-500' : 'text-gray-500'
                    } hover:text-red-500`}
                  >
                    <svg
                      className="w-4 h-4"
                      fill={comment.is_liked ? 'currentColor' : 'none'}
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
                      />
                    </svg>
                    <span>{comment.like_count}</span>
                  </button>
                  {user && (
                    <button
                      onClick={() =>
                        setReplyingTo(replyingTo === comment.id ? null : comment.id)
                      }
                      className="text-sm text-gray-500 hover:text-gray-700"
                    >
                      Reply
                    </button>
                  )}
                </div>

                {/* Reply Form */}
                {replyingTo === comment.id && user && (
                  <div className="mt-3 ml-4">
                    <textarea
                      value={replyContent}
                      onChange={(e) => setReplyContent(e.target.value)}
                      placeholder="Write a reply..."
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none text-sm"
                      rows={2}
                    />
                    <div className="flex space-x-2 mt-2">
                      <button
                        onClick={() => handleReply(comment.id)}
                        disabled={loading || !replyContent.trim()}
                        className="bg-blue-500 text-white px-3 py-1 rounded text-sm hover:bg-blue-600 disabled:opacity-50"
                      >
                        Post Reply
                      </button>
                      <button
                        onClick={() => {
                          setReplyingTo(null);
                          setReplyContent('');
                        }}
                        className="bg-gray-200 text-gray-700 px-3 py-1 rounded text-sm hover:bg-gray-300"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}

                {/* Replies */}
                {comment.replies && comment.replies.length > 0 && (
                  <div className="mt-3 ml-4 space-y-3 border-l-2 border-gray-200 pl-4">
                    {comment.replies.map((reply) => (
                      <div key={reply.id} className="flex space-x-2">
                        <img
                          src={reply.user.avatar || '/default-avatar.png'}
                          alt={reply.user.username}
                          className="w-8 h-8 rounded-full"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = '/default-avatar.png';
                          }}
                        />
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <div>
                              <span className="font-semibold text-sm text-gray-900">
                                {reply.user.username}
                              </span>
                              <span className="text-xs text-gray-500 ml-2">
                                {new Date(reply.created_at).toLocaleDateString()}
                              </span>
                            </div>
                            {user && user.id === reply.user.id && (
                              <button
                                onClick={() => handleDeleteComment(reply.id)}
                                className="text-red-500 hover:text-red-700 text-xs"
                              >
                                Delete
                              </button>
                            )}
                          </div>
                          <p className="text-sm text-gray-700 mt-1">{reply.content}</p>
                          <button
                            onClick={() => handleLikeComment(reply.id)}
                            className={`flex items-center space-x-1 text-xs mt-1 ${
                              reply.is_liked ? 'text-red-500' : 'text-gray-500'
                            } hover:text-red-500`}
                          >
                            <svg
                              className="w-3 h-3"
                              fill={reply.is_liked ? 'currentColor' : 'none'}
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
                              />
                            </svg>
                            <span>{reply.like_count}</span>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}

        {comments.length === 0 && (
          <p className="text-center text-gray-500 py-8">No comments yet. Be the first to comment!</p>
        )}
      </div>
    </div>
  );
}



