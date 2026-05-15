import { useState } from "react";
import { CheckCircle, Circle } from "lucide-react";
import type { Poll } from "@/shared/types";

interface PollComponentProps {
  poll: Poll;
  currentUserId: number;
  onVote: (optionIndex: number) => void;
}

export default function PollComponent({ poll, currentUserId, onVote }: PollComponentProps) {
  const [voting, setVoting] = useState(false);

  const currentUserVote = poll.voters[currentUserId.toString()];
  const hasVoted = currentUserVote !== undefined;
  const totalVotes = Object.values(poll.votes).reduce((sum, count) => sum + count, 0);

  const handleVote = async (optionIndex: number) => {
    if (hasVoted || voting) return;

    setVoting(true);
    try {
      await onVote(optionIndex);
    } catch (error) {
      console.error("Error voting:", error);
    } finally {
      setVoting(false);
    }
  };

  const getPercentage = (optionIndex: number): number => {
    if (totalVotes === 0) return 0;
    return Math.round((poll.votes[optionIndex.toString()] || 0) / totalVotes * 100);
  };

  const getVoteCount = (optionIndex: number): number => {
    return poll.votes[optionIndex.toString()] || 0;
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 space-y-4">
      <h4 className="font-medium text-gray-900">{poll.question}</h4>
      
      <div className="space-y-2">
        {poll.options.map((option, index) => {
          const voteCount = getVoteCount(index);
          const percentage = getPercentage(index);
          const isUserChoice = hasVoted && currentUserVote === index;
          
          return (
            <div key={index} className="relative">
              {hasVoted ? (
                // Results view
                <div className="relative">
                  <div className="flex items-center justify-between p-3 rounded-lg border border-gray-200 bg-gray-50">
                    <div className="flex items-center space-x-2">
                      {isUserChoice ? (
                        <CheckCircle className="w-5 h-5 text-green-600" />
                      ) : (
                        <Circle className="w-5 h-5 text-gray-400" />
                      )}
                      <span className={`text-sm ${isUserChoice ? 'font-medium text-green-900' : 'text-gray-700'}`}>
                        {option}
                      </span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="text-sm text-gray-600">{voteCount} voto{voteCount !== 1 ? 's' : ''}</span>
                      <span className="text-sm font-medium text-gray-900">{percentage}%</span>
                    </div>
                  </div>
                  {/* Progress bar */}
                  <div className="absolute bottom-0 left-0 h-1 bg-blue-500 rounded-b-lg transition-all duration-300"
                       style={{ width: `${percentage}%` }} />
                  {isUserChoice && (
                    <div className="absolute bottom-0 left-0 h-1 bg-green-500 rounded-b-lg transition-all duration-300"
                         style={{ width: `${percentage}%` }} />
                  )}
                </div>
              ) : (
                // Voting view
                <button
                  onClick={() => handleVote(index)}
                  disabled={voting}
                  className="w-full flex items-center space-x-2 p-3 rounded-lg border border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Circle className="w-5 h-5 text-gray-400" />
                  <span className="text-sm text-gray-700">{option}</span>
                </button>
              )}
            </div>
          );
        })}
      </div>
      
      {hasVoted && (
        <div className="text-xs text-gray-500 border-t pt-2">
          Total de votos: {totalVotes} • Tu voto ha sido registrado
        </div>
      )}
      
      {voting && (
        <div className="text-xs text-blue-600">
          Registrando voto...
        </div>
      )}
    </div>
  );
}
