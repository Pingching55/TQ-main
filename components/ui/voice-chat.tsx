"use client";

import { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from './button';
import { Badge } from './badge';
import { Mic, MicOff, Phone, PhoneOff, Volume2, VolumeX } from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface VoiceChatProps {
  teamId: string;
  userId: string;
  userName: string;
}

interface Participant {
  id: string;
  user_id: string;
  is_muted: boolean;
  is_speaking: boolean;
  profiles?: {
    username: string;
    full_name: string;
  };
}

interface PeerConnection {
  connection: RTCPeerConnection;
  stream?: MediaStream;
}

export function VoiceChat({ teamId, userId, userName }: VoiceChatProps) {
  const [isConnected, setIsConnected] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isDeafened, setIsDeafened] = useState(false);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const localStreamRef = useRef<MediaStream | null>(null);
  const peerConnectionsRef = useRef<Map<string, PeerConnection>>(new Map());
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  const configuration: RTCConfiguration = {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
    ],
  };

  const loadParticipants = useCallback(async () => {
    if (!sessionId) return;

    try {
      const { data, error } = await supabase
        .from('voice_participants')
        .select(`
          id,
          user_id,
          is_muted,
          is_speaking,
          profiles:user_id (
            username,
            full_name
          )
        `)
        .eq('session_id', sessionId)
        .is('left_at', null);

      if (error) throw error;
      if (data) setParticipants(data);
    } catch (err) {
      console.error('Error loading participants:', err);
    }
  }, [sessionId]);

  const createOrJoinSession = async () => {
    try {
      setError(null);

      const { data: existingSession } = await supabase
        .from('voice_sessions')
        .select('id')
        .eq('team_id', teamId)
        .eq('is_active', true)
        .single();

      let currentSessionId = existingSession?.id;

      if (!currentSessionId) {
        const { data: newSession, error: sessionError } = await supabase
          .from('voice_sessions')
          .insert({ team_id: teamId, is_active: true })
          .select('id')
          .single();

        if (sessionError) throw sessionError;
        currentSessionId = newSession.id;
      }

      const { error: participantError } = await supabase
        .from('voice_participants')
        .upsert({
          session_id: currentSessionId,
          user_id: userId,
          is_muted: false,
          is_speaking: false,
        }, {
          onConflict: 'session_id,user_id'
        });

      if (participantError) throw participantError;

      setSessionId(currentSessionId);
      return currentSessionId;
    } catch (err) {
      console.error('Error creating/joining session:', err);
      setError('Failed to join voice chat');
      return null;
    }
  };

  const startLocalStream = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        }
      });

      localStreamRef.current = stream;

      audioContextRef.current = new AudioContext();
      const source = audioContextRef.current.createMediaStreamSource(stream);
      analyserRef.current = audioContextRef.current.createAnalyser();
      analyserRef.current.fftSize = 256;
      source.connect(analyserRef.current);

      detectSpeaking();

      return stream;
    } catch (err) {
      console.error('Error accessing microphone:', err);
      setError('Microphone access denied. Please allow microphone access.');
      throw err;
    }
  };

  const detectSpeaking = () => {
    if (!analyserRef.current || !sessionId) return;

    const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);

    const checkAudioLevel = async () => {
      if (!analyserRef.current || !sessionId) return;

      analyserRef.current.getByteFrequencyData(dataArray);
      const average = dataArray.reduce((a, b) => a + b) / dataArray.length;

      const isSpeaking = average > 30 && !isMuted;

      if (isSpeaking !== participants.find(p => p.user_id === userId)?.is_speaking) {
        await supabase
          .from('voice_participants')
          .update({ is_speaking: isSpeaking })
          .eq('session_id', sessionId)
          .eq('user_id', userId);
      }

      animationFrameRef.current = requestAnimationFrame(checkAudioLevel);
    };

    checkAudioLevel();
  };

  const createPeerConnection = async (targetUserId: string, isInitiator: boolean) => {
    const pc = new RTCPeerConnection(configuration);

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => {
        pc.addTrack(track, localStreamRef.current!);
      });
    }

    pc.ontrack = (event) => {
      const peerConn = peerConnectionsRef.current.get(targetUserId);
      if (peerConn) {
        peerConn.stream = event.streams[0];
        playRemoteStream(event.streams[0], targetUserId);
      }
    };

    pc.onicecandidate = async (event) => {
      if (event.candidate && sessionId) {
        await supabase
          .from('voice_signaling')
          .insert({
            session_id: sessionId,
            from_user_id: userId,
            to_user_id: targetUserId,
            signal_type: 'ice-candidate',
            signal_data: { candidate: event.candidate.toJSON() },
          });
      }
    };

    pc.onconnectionstatechange = () => {
      console.log(`Connection state with ${targetUserId}:`, pc.connectionState);
    };

    peerConnectionsRef.current.set(targetUserId, { connection: pc });

    if (isInitiator) {
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      if (sessionId) {
        await supabase
          .from('voice_signaling')
          .insert({
            session_id: sessionId,
            from_user_id: userId,
            to_user_id: targetUserId,
            signal_type: 'offer',
            signal_data: { offer: pc.localDescription },
          });
      }
    }

    return pc;
  };

  const playRemoteStream = (stream: MediaStream, userId: string) => {
    const existingAudio = document.getElementById(`audio-${userId}`) as HTMLAudioElement;
    if (existingAudio) {
      existingAudio.srcObject = stream;
      return;
    }

    const audio = document.createElement('audio');
    audio.id = `audio-${userId}`;
    audio.srcObject = stream;
    audio.autoplay = true;
    audio.volume = isDeafened ? 0 : 1;
    document.body.appendChild(audio);
  };

  const setupSignalingListeners = useCallback(async () => {
    if (!sessionId) return;

    const channel = supabase
      .channel(`voice_signaling_${sessionId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'voice_signaling',
          filter: `to_user_id=eq.${userId}`,
        },
        async (payload) => {
          const signal = payload.new;

          if (signal.signal_type === 'offer') {
            const pc = await createPeerConnection(signal.from_user_id, false);
            await pc.setRemoteDescription(new RTCSessionDescription(signal.signal_data.offer));
            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);

            await supabase
              .from('voice_signaling')
              .insert({
                session_id: sessionId,
                from_user_id: userId,
                to_user_id: signal.from_user_id,
                signal_type: 'answer',
                signal_data: { answer: pc.localDescription },
              });
          } else if (signal.signal_type === 'answer') {
            const peerConn = peerConnectionsRef.current.get(signal.from_user_id);
            if (peerConn) {
              await peerConn.connection.setRemoteDescription(
                new RTCSessionDescription(signal.signal_data.answer)
              );
            }
          } else if (signal.signal_type === 'ice-candidate') {
            const peerConn = peerConnectionsRef.current.get(signal.from_user_id);
            if (peerConn && signal.signal_data.candidate) {
              await peerConn.connection.addIceCandidate(
                new RTCIceCandidate(signal.signal_data.candidate)
              );
            }
          }
        }
      )
      .subscribe();

    const participantsChannel = supabase
      .channel(`voice_participants_${sessionId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'voice_participants',
          filter: `session_id=eq.${sessionId}`,
        },
        () => {
          loadParticipants();
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
      participantsChannel.unsubscribe();
    };
  }, [sessionId, userId, loadParticipants]);

  const connectToVoice = async () => {
    try {
      const stream = await startLocalStream();
      const session = await createOrJoinSession();

      if (!session) return;

      await loadParticipants();

      const { data: otherParticipants } = await supabase
        .from('voice_participants')
        .select('user_id')
        .eq('session_id', session)
        .neq('user_id', userId)
        .is('left_at', null);

      if (otherParticipants) {
        for (const participant of otherParticipants) {
          await createPeerConnection(participant.user_id, true);
        }
      }

      setIsConnected(true);
    } catch (err) {
      console.error('Error connecting to voice:', err);
      setError('Failed to connect to voice chat');
    }
  };

  const disconnectFromVoice = async () => {
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop());
      localStreamRef.current = null;
    }

    peerConnectionsRef.current.forEach((peerConn) => {
      peerConn.connection.close();
    });
    peerConnectionsRef.current.clear();

    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }

    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }

    document.querySelectorAll('audio[id^="audio-"]').forEach(audio => audio.remove());

    if (sessionId) {
      await supabase
        .from('voice_participants')
        .update({ left_at: new Date().toISOString() })
        .eq('session_id', sessionId)
        .eq('user_id', userId);
    }

    setIsConnected(false);
    setSessionId(null);
    setParticipants([]);
  };

  const toggleMute = async () => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsMuted(!audioTrack.enabled);

        if (sessionId) {
          await supabase
            .from('voice_participants')
            .update({ is_muted: !audioTrack.enabled })
            .eq('session_id', sessionId)
            .eq('user_id', userId);
        }
      }
    }
  };

  const toggleDeafen = () => {
    const newDeafenState = !isDeafened;
    setIsDeafened(newDeafenState);

    document.querySelectorAll('audio[id^="audio-"]').forEach((audio) => {
      (audio as HTMLAudioElement).volume = newDeafenState ? 0 : 1;
    });

    if (newDeafenState && !isMuted) {
      toggleMute();
    }
  };

  useEffect(() => {
    if (sessionId) {
      setupSignalingListeners();
    }
  }, [sessionId, setupSignalingListeners]);

  useEffect(() => {
    return () => {
      if (isConnected) {
        disconnectFromVoice();
      }
    };
  }, []);

  return (
    <div className="voice-chat-container">
      <div className="voice-chat-header">
        <h3 className="voice-chat-title">Voice Chat</h3>
        {isConnected && (
          <Badge variant="outline" className="voice-status-badge">
            🟢 Connected
          </Badge>
        )}
      </div>

      {error && (
        <div className="voice-error">
          {error}
        </div>
      )}

      <div className="voice-controls">
        {!isConnected ? (
          <Button
            onClick={connectToVoice}
            className="voice-connect-btn"
            size="lg"
          >
            <Phone className="w-4 h-4 mr-2" />
            Join Voice Chat
          </Button>
        ) : (
          <div className="voice-control-buttons">
            <Button
              onClick={toggleMute}
              variant={isMuted ? "destructive" : "secondary"}
              size="lg"
              className="voice-control-btn"
            >
              {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
            </Button>

            <Button
              onClick={toggleDeafen}
              variant={isDeafened ? "destructive" : "secondary"}
              size="lg"
              className="voice-control-btn"
            >
              {isDeafened ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
            </Button>

            <Button
              onClick={disconnectFromVoice}
              variant="destructive"
              size="lg"
              className="voice-disconnect-btn"
            >
              <PhoneOff className="w-4 h-4 mr-2" />
              Leave
            </Button>
          </div>
        )}
      </div>

      {isConnected && participants.length > 0 && (
        <div className="voice-participants-list">
          <h4 className="participants-title">In Voice ({participants.length})</h4>
          <div className="participants-grid">
            {participants.map((participant) => (
              <div key={participant.id} className="participant-item">
                <div className={`participant-avatar ${participant.is_speaking ? 'speaking' : ''}`}>
                  {(participant.profiles?.full_name || 'U')[0].toUpperCase()}
                </div>
                <div className="participant-info">
                  <span className="participant-name">
                    {participant.profiles?.full_name || participant.profiles?.username || 'User'}
                  </span>
                  {participant.is_muted && (
                    <MicOff className="w-3 h-3 text-red-500" />
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
