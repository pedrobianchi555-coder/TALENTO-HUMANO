import { useAuth } from "@getmocha/users-service/react";
import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router";
import { 
  Loader2, MessageSquare, Send, Plus,
  User, Megaphone
} from "lucide-react";
import type { ConversationWithMessages, EnhancedUser, Message } from "@/shared/types";
import NewConversationModal from "@/react-app/components/NewConversationModal";
import BroadcastModal from "@/react-app/components/BroadcastModal";
import WhatsAppBroadcastModal from "@/react-app/components/WhatsAppBroadcastModal";
import PollComponent from "@/react-app/components/PollComponent";
import usePermissions, { PERMISSIONS } from "@/react-app/hooks/usePermissions";

interface Poll {
  id: number;
  question: string;
  options: string[];
  votes: Record<string, number>;
  voters: Record<string, number>;
  created_at: string;
  updated_at: string;
}

export default function Chat() {
  const { user: authUser, isPending } = useAuth();
  const navigate = useNavigate();
  const { can, isHR, loading: permissionsLoading } = usePermissions();
  const [conversations, setConversations] = useState<ConversationWithMessages[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<ConversationWithMessages | null>(null);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [user, setUser] = useState<EnhancedUser | null>(null);
  const [showNewConversation, setShowNewConversation] = useState(false);
  const [showBroadcast, setShowBroadcast] = useState(false);
  const [showWhatsAppBroadcast, setShowWhatsAppBroadcast] = useState(false);
  const [polls, setPolls] = useState<Record<number, Poll>>({});
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isPending && !authUser) {
      navigate("/");
    }
  }, [authUser, isPending, navigate]);

  useEffect(() => {
    const fetchUserAndConversations = async () => {
      if (!authUser) return;

      try {
        // Get user profile first
        const userResponse = await fetch("/api/users/me");
        if (!userResponse.ok) {
          console.error("Error getting user profile:", await userResponse.text());
          setLoading(false);
          return;
        }
        
        const userData = await userResponse.json();
        setUser(userData);
        
        if (!userData.profile) {
          navigate("/profile-setup");
          return;
        }

        // Get conversations
        const conversationsResponse = await fetch("/api/chat/conversations");
        if (!conversationsResponse.ok) {
          console.error("Error getting conversations:", await conversationsResponse.text());
        } else {
          const conversationsData = await conversationsResponse.json();
          setConversations(conversationsData);
          
          // Auto-select first conversation for employees
          if (conversationsData.length > 0) {
            setSelectedConversation(conversationsData[0]);
          }
        }

        // Get polls
        const pollsResponse = await fetch("/api/chat/polls");
        if (!pollsResponse.ok) {
          console.error("Error getting polls:", await pollsResponse.text());
        } else {
          const pollsData = await pollsResponse.json();
          const pollsMap: Record<number, Poll> = {};
          pollsData.forEach((poll: Poll) => {
            pollsMap[poll.id] = poll;
          });
          setPolls(pollsMap);
        }
      } catch (error) {
        console.error("Error fetching data:", error);
        alert("Error al cargar el chat. Por favor recarga la página.");
      } finally {
        setLoading(false);
      }
    };

    fetchUserAndConversations();
  }, [authUser, navigate]);

  useEffect(() => {
    scrollToBottom();
  }, [selectedConversation?.messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || sending) return;

    const messageText = newMessage.trim();
    const tempId = Date.now();
    
    // Optimistic update: Add message to UI immediately
    if (selectedConversation && user?.profile) {
      const optimisticMessage: Message = {
        id: tempId,
        conversation_id: selectedConversation.id,
        sender_id: user.profile.id,
        text: messageText,
        is_broadcast: false,
        poll_id: undefined,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      setSelectedConversation(prev => prev ? {
        ...prev,
        messages: [...prev.messages, optimisticMessage]
      } : null);
      
      setNewMessage("");
    }

    setSending(true);
    try {
      const response = await fetch("/api/chat/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          conversation_id: selectedConversation?.id,
          text: messageText,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        console.error("Error sending message:", errorData);
        alert(`Error al enviar mensaje: ${errorData.error || 'Error desconocido'}`);
        
        // Revert optimistic update on error
        if (selectedConversation) {
          setSelectedConversation(prev => prev ? {
            ...prev,
            messages: prev.messages.filter(m => m.id !== tempId)
          } : null);
        }
        return;
      }

      // Wait a bit to ensure backend has fully processed the message
      await new Promise(resolve => setTimeout(resolve, 200));
      
      // Refresh conversations to get actual message with real ID
      const conversationsResponse = await fetch("/api/chat/conversations");
      if (conversationsResponse.ok) {
        const conversationsData = await conversationsResponse.json();
        setConversations(conversationsData);
        
        // Update selected conversation with real data
        const updatedConversation = conversationsData.find(
          (c: ConversationWithMessages) => c.id === selectedConversation?.id
        );
        if (updatedConversation) {
          setSelectedConversation(updatedConversation);
        }
      } else {
        console.error("Error refreshing conversations:", await conversationsResponse.text());
      }
    } catch (error) {
      console.error("Error sending message:", error);
      alert("Error al enviar mensaje. Por favor intenta nuevamente.");
      
      // Revert optimistic update on error
      if (selectedConversation) {
        setSelectedConversation(prev => prev ? {
          ...prev,
          messages: prev.messages.filter(m => m.id !== tempId)
        } : null);
      }
    } finally {
      setSending(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const voteOnPoll = async (pollId: number, optionIndex: number) => {
    try {
      const response = await fetch(`/api/chat/polls/${pollId}/vote`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ option_index: optionIndex }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        console.error("Error voting on poll:", errorData);
        alert(`Error al votar: ${errorData.error || 'Error desconocido'}`);
        return;
      }

      // Refresh polls
      const pollsResponse = await fetch("/api/chat/polls");
      if (pollsResponse.ok) {
        const pollsData = await pollsResponse.json();
        const pollsMap: Record<number, Poll> = {};
        pollsData.forEach((poll: Poll) => {
          pollsMap[poll.id] = poll;
        });
        setPolls(pollsMap);
      } else {
        console.error("Error refreshing polls:", await pollsResponse.text());
      }
    } catch (error) {
      console.error("Error voting on poll:", error);
      alert("Error al votar en el sondeo. Por favor intenta nuevamente.");
    }
  };

  const createConversationWithEmployee = async (employee: any) => {
    try {
      // Check if conversation already exists
      const existingConversation = conversations.find(conv => 
        conv.other_participant?.id === employee.id
      );

      if (existingConversation) {
        // Select existing conversation
        setSelectedConversation(existingConversation);
        setShowNewConversation(false);
        return;
      }

      // Create new conversation by sending a message
      const response = await fetch("/api/chat/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          conversation_id: null,
          employee_id: employee.id,
          text: "Hola, he iniciado esta conversación para poder comunicarnos.",
        }),
      });

      if (response.ok) {
        // Wait to ensure backend has fully processed
        await new Promise(resolve => setTimeout(resolve, 300));
        
        // Refresh conversations
        const conversationsResponse = await fetch("/api/chat/conversations");
        if (conversationsResponse.ok) {
          const conversationsData = await conversationsResponse.json();
          setConversations(conversationsData);
          
          // Auto-select the newly created conversation
          const newConversation = conversationsData.find((conv: ConversationWithMessages) => 
            conv.other_participant?.id === employee.id
          );
          if (newConversation) {
            setSelectedConversation(newConversation);
          }
        }
        setShowNewConversation(false);
      }
    } catch (error) {
      console.error("Error creating conversation:", error);
      alert("Error al crear la conversación. Por favor intenta nuevamente.");
    }
  };

  const handleBroadcastSent = async () => {
    setShowBroadcast(false);
    // Refresh conversations and polls
    const [conversationsResponse, pollsResponse] = await Promise.all([
      fetch("/api/chat/conversations"),
      fetch("/api/chat/polls")
    ]);
    
    if (conversationsResponse.ok) {
      const conversationsData = await conversationsResponse.json();
      setConversations(conversationsData);
    }
    
    if (pollsResponse.ok) {
      const pollsData = await pollsResponse.json();
      const pollsMap: Record<number, Poll> = {};
      pollsData.forEach((poll: Poll) => {
        pollsMap[poll.id] = poll;
      });
      setPolls(pollsMap);
    }
  };

  if (isPending || loading || permissionsLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <div className="animate-spin">
          <Loader2 className="w-10 h-10 text-blue-600" />
        </div>
        <p className="mt-4 text-gray-600">Cargando chat...</p>
      </div>
    );
  }

  if (!user?.profile) {
    return null;
  }

  // Employee View - Single chat with HR
  if (!isHR) {
    const hrConversation = conversations[0];
    
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="bg-white border-b border-gray-200">
          <div className="px-4 sm:px-6 lg:px-8 py-6">
            <div className="max-w-7xl mx-auto">
              <h1 className="text-3xl font-bold text-gray-900 flex items-center mb-2">
                <MessageSquare className="w-8 h-8 mr-3 text-blue-600" />
                Chat con RRHH
              </h1>
              <p className="text-gray-600">
                Comunícate directamente con el equipo de Recursos Humanos
              </p>
            </div>
          </div>
        </div>

        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="bg-white rounded-xl shadow-sm border h-[600px] flex flex-col">
            {/* Messages */}
            <div className="flex-1 p-6 overflow-y-auto space-y-4">
              {hrConversation?.messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${message.sender_id === user.profile!.id ? 'justify-end' : 'justify-start'}`}
                >
                  <div className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                    message.sender_id === user.profile!.id
                      ? 'bg-blue-600 text-white'
                      : message.is_broadcast
                      ? 'bg-purple-100 text-purple-900 border border-purple-200'
                      : 'bg-gray-100 text-gray-900'
                  }`}>
                    {message.is_broadcast && (
                      <div className="text-xs font-semibold mb-1">
                        {message.poll_id ? '[SONDEO]' : '[DIFUSIÓN]'}
                      </div>
                    )}
                    <p className="text-sm">{message.text}</p>
                    {message.poll_id && polls[message.poll_id] && (
                      <div className="mt-3">
                        <PollComponent
                          poll={polls[message.poll_id]}
                          currentUserId={user.profile!.id}
                          onVote={(optionIndex) => voteOnPoll(message.poll_id!, optionIndex)}
                        />
                      </div>
                    )}
                    <div className="text-xs opacity-75 mt-1">
                      {new Date(message.created_at).toLocaleString()}
                    </div>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="border-t p-4">
              <div className="flex space-x-2">
                <textarea
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Escribe tu mensaje..."
                  className="flex-1 resize-none border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={2}
                />
                <button
                  onClick={sendMessage}
                  disabled={!newMessage.trim() || sending}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                >
                  {sending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // HR View - Multiple conversations
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200">
        <div className="px-4 sm:px-6 lg:px-8 py-6">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 flex items-center mb-2">
                  <MessageSquare className="w-8 h-8 mr-3 text-blue-600" />
                  Chat General - RRHH
                </h1>
                <p className="text-gray-600">
                  Gestiona las conversaciones con todos los empleados
                </p>
              </div>
              
              <div className="flex space-x-3">
                {can(PERMISSIONS.CHAT_INITIATE_EMPLOYEE_CHAT) && (
                  <button 
                    onClick={() => setShowNewConversation(true)}
                    className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Nueva Conversación
                  </button>
                )}
                
                {can(PERMISSIONS.CHAT_SEND_BROADCAST) && (
                  <>
                    <button 
                      onClick={() => setShowBroadcast(true)}
                      className="inline-flex items-center px-4 py-2 text-sm font-medium text-orange-700 bg-orange-100 rounded-lg hover:bg-orange-200 transition-colors"
                    >
                      <Megaphone className="w-4 h-4 mr-2" />
                      Difusión Chat
                    </button>
                    <button 
                      onClick={() => setShowWhatsAppBroadcast(true)}
                      className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 transition-colors"
                    >
                      <MessageSquare className="w-4 h-4 mr-2" />
                      WhatsApp
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[600px]">
          {/* Conversations List */}
          <div className="lg:col-span-1 bg-white rounded-xl shadow-sm border">
            <div className="p-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Conversaciones</h3>
            </div>
            <div className="overflow-y-auto h-[520px]">
              {conversations.map((conversation) => (
                <button
                  key={conversation.id}
                  onClick={() => setSelectedConversation(conversation)}
                  className={`w-full text-left p-4 border-b border-gray-100 hover:bg-gray-50 transition-colors ${
                    selectedConversation?.id === conversation.id ? 'bg-blue-50 border-blue-200' : ''
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
                      <User className="w-5 h-5 text-gray-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {conversation.other_participant 
                          ? `${conversation.other_participant.first_name} ${conversation.other_participant.last_name}`
                          : 'Usuario Desconocido'
                        }
                      </p>
                      {conversation.other_participant?.department && (
                        <p className="text-xs text-gray-500 truncate">
                          {conversation.other_participant.department}
                        </p>
                      )}
                      {conversation.last_message && (
                        <p className="text-xs text-gray-500 truncate mt-1">
                          {conversation.last_message.text}
                        </p>
                      )}
                    </div>
                  </div>
                </button>
              ))}
              
              {conversations.length === 0 && (
                <div className="text-center py-12">
                  <MessageSquare className="mx-auto h-8 w-8 text-gray-400" />
                  <p className="mt-2 text-sm text-gray-500">No hay conversaciones</p>
                </div>
              )}
            </div>
          </div>

          {/* Chat Area */}
          <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border">
            {selectedConversation ? (
              <div className="flex flex-col h-full">
                {/* Chat Header */}
                <div className="p-4 border-b border-gray-200">
                  <h3 className="text-lg font-semibold text-gray-900">
                    {selectedConversation.other_participant 
                      ? `${selectedConversation.other_participant.first_name} ${selectedConversation.other_participant.last_name}`
                      : 'Conversación'
                    }
                  </h3>
                  {selectedConversation.other_participant && (
                    <p className="text-sm text-gray-500">
                      {selectedConversation.other_participant.department} - {selectedConversation.other_participant.position}
                    </p>
                  )}
                </div>

                {/* Messages */}
                <div className="flex-1 p-4 overflow-y-auto space-y-4">
                  {selectedConversation.messages.map((message) => (
                    <div
                      key={message.id}
                      className={`flex ${message.sender_id === user.profile!.id ? 'justify-end' : 'justify-start'}`}
                    >
                      <div className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                        message.sender_id === user.profile!.id
                          ? 'bg-blue-600 text-white'
                          : message.is_broadcast
                          ? 'bg-purple-100 text-purple-900 border border-purple-200'
                          : 'bg-gray-100 text-gray-900'
                      }`}>
                        {message.is_broadcast && (
                          <div className="text-xs font-semibold mb-1">
                            {message.poll_id ? '[SONDEO]' : '[DIFUSIÓN]'}
                          </div>
                        )}
                        <p className="text-sm">{message.text}</p>
                        {message.poll_id && polls[message.poll_id] && (
                          <div className="mt-3">
                            <PollComponent
                              poll={polls[message.poll_id]}
                              currentUserId={user.profile!.id}
                              onVote={(optionIndex) => voteOnPoll(message.poll_id!, optionIndex)}
                            />
                          </div>
                        )}
                        <div className="text-xs opacity-75 mt-1">
                          {new Date(message.created_at).toLocaleString()}
                        </div>
                      </div>
                    </div>
                  ))}
                  <div ref={messagesEndRef} />
                </div>

                {/* Input */}
                <div className="border-t border-gray-200 p-4">
                  <div className="flex space-x-2">
                    <textarea
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      onKeyPress={handleKeyPress}
                      placeholder="Escribe tu respuesta..."
                      className="flex-1 resize-none border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      rows={2}
                    />
                    <button
                      onClick={sendMessage}
                      disabled={!newMessage.trim() || sending}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                    >
                      {sending ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Send className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center h-full text-gray-500">
                <div className="text-center">
                  <MessageSquare className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>Selecciona una conversación para comenzar</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* New Conversation Modal */}
      {showNewConversation && can(PERMISSIONS.CHAT_INITIATE_EMPLOYEE_CHAT) && (
        <NewConversationModal
          onClose={() => setShowNewConversation(false)}
          onSelectEmployee={createConversationWithEmployee}
        />
      )}

      {/* Broadcast Modal */}
      {showBroadcast && can(PERMISSIONS.CHAT_SEND_BROADCAST) && (
        <BroadcastModal
          onClose={() => setShowBroadcast(false)}
          onSend={async (broadcastData) => {
            try {
              const response = await fetch("/api/chat/broadcast", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(broadcastData),
              });

              if (response.ok) {
                await handleBroadcastSent();
              }
            } catch (error) {
              console.error("Error sending broadcast:", error);
            }
          }}
        />
      )}

      {/* WhatsApp Broadcast Modal */}
      {showWhatsAppBroadcast && can(PERMISSIONS.CHAT_SEND_BROADCAST) && (
        <WhatsAppBroadcastModal
          onClose={() => setShowWhatsAppBroadcast(false)}
        />
      )}
    </div>
  );
}
