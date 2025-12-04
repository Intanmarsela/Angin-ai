// app/call.tsx
import { Audio } from "expo-av";
import { useLocalSearchParams, useRouter } from "expo-router";
import * as Speech from "expo-speech";
import { useEffect, useRef, useState } from "react";
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { BACKEND_BASE_URL } from "../backend/services/config";




type Params = {
  number?: string;
};

type CallPhase = "calling" | "listening" | "processing";

export default function CallScreen() {
  const router = useRouter();
  const { number } = useLocalSearchParams<Params>();
  const displayNumber = number || "911";

  const [seconds, setSeconds] = useState(0);
  const [phase, setPhase] = useState<CallPhase>("calling");

  // Mic permission
  const [hasMicPermission, setHasMicPermission] = useState<boolean | null>(null);
  const [isRequestingPermission, setIsRequestingPermission] = useState(false);

  // Recording state
  const [isRecording, setIsRecording] = useState(false);
  const [recordingUri, setRecordingUri] = useState<string | null>(null);

  // Playback state
  const [isPlayingBack, setIsPlayingBack] = useState(false);

  // Refs for audio objects
  const recordingRef = useRef<Audio.Recording | null>(null);
  const soundRef = useRef<Audio.Sound | null>(null);

  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<any | null>(null);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  // Speaking state
  const [isSpeaking, setIsSpeaking] = useState(false);
  //store the last tts text to auto voice suggesting
  const [lastTtsText, setLastTtsText] = useState<string | null>(null);

  // ElevenLabs TTS function
async function playAnginVoice(text: string) {
  try {
    const url = `${BACKEND_BASE_URL}/speak?text=${encodeURIComponent(text)}`;
    console.log("TTS URL:", url);  
    const sound = new Audio.Sound();
    await sound.loadAsync({ uri: url });
    await sound.playAsync();
  } catch (err) {
    console.log("TTS error:", err);
    Alert.alert("Error", "Could not play voice output.");
  }
}


const stopSpeaking = () => {
  Speech.stop();
  setIsSpeaking(false);
};

  // Timer effect
  useEffect(() => {
    const interval = setInterval(() => {
      setSeconds((prev) => prev + 1);
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  // Auto-progress call phase
  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = [];

    // after 3s -> listening
    timers.push(setTimeout(() => setPhase("listening"), 3000));

    // after 8s -> processing
    timers.push(setTimeout(() => setPhase("processing"), 8000));

    return () => {
      timers.forEach(clearTimeout);
    };
  }, []);

  const formatTime = () => {
    const mins = Math.floor(seconds / 60)
      .toString()
      .padStart(2, "0");
    const secs = (seconds % 60).toString().padStart(2, "0");
    return `${mins}:${secs}`;
  };

  const handleEndCall = () => {
    router.replace("/dial");
  };

  const handleSpeaker = () => {
    console.log("Speaker toggled");
  };

  const handleInterrupt = () => {
    console.log("Interrupt pressed");
  };

  const handleHold = () => {
    console.log("Hold pressed");
  };

  // 1) Request microphone permission
  const requestMicrophonePermission = async () => {
    try {
      setIsRequestingPermission(true);
      const { status } = await Audio.requestPermissionsAsync();

      if (status === "granted") {
        setHasMicPermission(true);
      } else {
        setHasMicPermission(false);
      }
    } catch (err) {
      console.error("Error requesting mic permission", err);
      setHasMicPermission(false);
    } finally {
      setIsRequestingPermission(false);
    }
  };

  useEffect(() => {
    requestMicrophonePermission();
  }, []);

  // 2) Start recording (Start Talking)
    const handleStartTalking = async () => {
    if (hasMicPermission !== true) {
      Alert.alert(
        "Microphone blocked",
        "Please allow microphone access in Settings to record your voice."
      );
      return;
    }

    try {
      // SIMPLIFIED: no interruptionMode… keys
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
        staysActiveInBackground: false,
        shouldDuckAndroid: true,
        playThroughEarpieceAndroid: false,
      });

      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );

      recordingRef.current = recording;
      setIsRecording(true);
      setRecordingUri(null);
      setPhase("listening");
    } catch (err) {
      console.error("startRecording error", err);
      Alert.alert("Error", "Could not start recording.");
    }
  };


  // 3) Stop recording (I’m Done) and get URI
  const handleDoneTalking = async () => {
    try {
      const recording = recordingRef.current;
      if (!recording) return;

      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();
      setIsRecording(false);
      setRecordingUri(uri || null);
      recordingRef.current = null;

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        playsInSilentModeIOS: true,
      });

      console.log("Recorded file URI:", uri);
      setPhase("processing");
      
      if (uri) {
      uploadAndAnalyze(uri);
    }
      // Later: upload `uri` to your backend here.
    } catch (err) {
      console.error("stopRecording error", err);
      Alert.alert("Error", "Could not stop recording.");
    }
  };

  // 4) Local playback
  const handlePlayRecording = async () => {
    try {
      if (!recordingUri) {
        Alert.alert("No recording", "Record something first.");
        return;
      }

      if (soundRef.current) {
        await soundRef.current.unloadAsync();
        soundRef.current = null;
      }

      const { sound } = await Audio.Sound.createAsync(
        { uri: recordingUri },
        { shouldPlay: true },
        (status) => {
          if (!status.isLoaded) return;
          setIsPlayingBack(status.isPlaying ?? false);
        }
      );

      soundRef.current = sound;
      await sound.playAsync();
    } catch (err) {
      console.error("playRecording error", err);
      Alert.alert("Error", "Could not play recording.");
    }
  };

    const uploadAndAnalyze = async (uri: string) => {
    try {
      setIsAnalyzing(true);
      setAnalysis(null);
      setAnalysisError(null);

      console.log("Uploading audio to backend:", uri);

      const formData = new FormData();
      formData.append("audio", {
        uri,
        name: "recording.m4a",
        type: "audio/m4a",
      } as any);

      const response = await fetch(`${BACKEND_BASE_URL}/analyze`, {
        method: "POST",
        body: formData,
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      if (!response.ok) {
        const text = await response.text();
        console.log("Backend error body:", text);
        throw new Error(`Backend error ${response.status}`);
      }
      // wait for json response
      const json = await response.json();
      console.log("Analysis result:", json);
      setAnalysis(json);

        // store TTS text and auto-speak once
      if (json.suggested_response) {
        setLastTtsText(json.suggested_response);
        // don’t await so UI stays responsive
        playAnginVoice(json.suggested_response);
      }
    } catch (err: any) {
      console.error("uploadAndAnalyze error", err);
      setAnalysisError(err?.message ?? "Unknown error");
    } finally {
      setIsAnalyzing(false);
    }
  };


  const minutes = Math.floor(seconds / 60)
    .toString()
    .padStart(2, "0");
  const secs = (seconds % 60).toString().padStart(2, "0");

  return (
    <View style={styles.container}>
      {/* Top: TTS placeholder + number + timer */}
      <View style={styles.topSection}>
        <Text style={styles.ttsText}>Calling {displayNumber}…</Text>
        <Text style={styles.timerText}>{formatTime()}</Text>

        {/* Mic permission status */}
        {hasMicPermission === false && (
          <View style={styles.permissionBox}>
            <Text style={styles.permissionText}>
              Microphone access is blocked. Please enable it in Settings.
            </Text>
          </View>
        )}
        {hasMicPermission === null && (
          <View style={styles.permissionBox}>
            <Text style={styles.permissionText}>Checking microphone permission…</Text>
          </View>
        )}
      </View>

      {/* Middle: Call state indicators */}
      <View style={styles.stateSection}>
        <Text style={styles.stateLabel}>Call status</Text>
        <View style={styles.stateChipsRow}>
          <View
            style={[
              styles.stateChip,
              phase === "calling" && styles.stateChipActive,
            ]}
          >
            <Text
              style={[
                styles.stateChipText,
                phase === "calling" && styles.stateChipTextActive,
              ]}
            >
              Calling…
            </Text>
          </View>
          <View
            style={[
              styles.stateChip,
              phase === "listening" && styles.stateChipActive,
            ]}
          >
            <Text
              style={[
                styles.stateChipText,
                phase === "listening" && styles.stateChipTextActive,
              ]}
            >
              Listening…
            </Text>
          </View>
          <View
            style={[
              styles.stateChip,
              phase === "processing" && styles.stateChipActive,
            ]}
          >
            <Text
              style={[
                styles.stateChipText,
                phase === "processing" && styles.stateChipTextActive,
              ]}
            >
              Processing…
            </Text>
          </View>
        </View>
      </View>

      {/* Scrollable text box */}
      <View style={styles.messageContainer}>
        <Text style={styles.messageTitle}>Angin response</Text>

          <ScrollView
            style={styles.messageScroll}
            contentContainerStyle={styles.messageScrollContent}
            showsVerticalScrollIndicator={false}
          >
            {isAnalyzing && (
              <Text style={styles.messageText}>
                Analyzing your voice…{"\n\n"}
                This might take a few seconds.
              </Text>
            )}

            {!isAnalyzing && analysisError && (
              <Text style={styles.messageText}>
                Something went wrong talking to Angin’s brain:{"\n"}
                {analysisError}
              </Text>
            )}

            {!isAnalyzing && !analysisError && analysis && (
              <Text style={styles.messageText}>
                Emotion: {analysis.emotion} ({analysis.intensity}){"\n\n"}
                Topics:{" "}
                {Array.isArray(analysis.topics) ? analysis.topics.join(", ") : ""}{"\n\n"}
                Summary:{"\n"}
                {analysis.summary}{"\n\n"}
                Angin’s suggestion:{"\n"}
                {analysis.suggested_response}
              </Text>
            )}

            {!isAnalyzing && !analysisError && !analysis && (
              <Text style={styles.messageText}>
                This is where Angin’s response will appear after you talk.{"\n\n"}
                Tap “Start Talking”, share what’s on your mind, then wait for analysis.
              </Text>
            )}
          </ScrollView>


        {recordingUri && (
          <Text style={styles.uriText} numberOfLines={1}>
            File: {recordingUri}
          </Text>
        )}
      </View>

      {/* Bottom controls */}
      <View style={styles.bottomSection}>
        {/* TTS button */}
        <TouchableOpacity
          style={[
            styles.recordButton,
            {
              marginTop: 12,
              alignSelf: "center",
              width: "100%",
              opacity: !lastTtsText ? 0.4 : 1,
            },
          ]}
          disabled={!lastTtsText}
          onPress={() => {
            if (lastTtsText) {
              playAnginVoice(lastTtsText);
            }
          }}
        >
          <Text style={styles.smallButtonText}>
            Replay Angin’s voice
          </Text>
        </TouchableOpacity>

        {/* Recording button: Start Talking / I’m Done */}
        <TouchableOpacity
          style={[
            styles.recordButton,
            (hasMicPermission !== true || isRequestingPermission) &&
              styles.recordButtonDisabled,
          ]}
          disabled={hasMicPermission !== true || isRequestingPermission}
          onPress={isRecording ? handleDoneTalking : handleStartTalking}
        >
          <Text style={styles.recordButtonText}>
            {hasMicPermission !== true
              ? "Mic permission required"
              : isRecording
              ? "I’m Done"
              : "Start Talking"}
          </Text>
        </TouchableOpacity>

        {/* Row of 3 buttons */}
        <View style={styles.controlRow}>
          <TouchableOpacity style={styles.smallButton} onPress={handleSpeaker}>
            <Text style={styles.smallButtonText}>Speaker</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.smallButton} onPress={handleInterrupt}>
            <Text style={styles.smallButtonText}>Interrupt</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.smallButton} onPress={handleHold}>
            <Text style={styles.smallButtonText}>Hold</Text>
          </TouchableOpacity>
        </View>

        {/* Play last recording */}
        <TouchableOpacity
          style={[
            styles.recordButton,
            { marginHorizontal: 0, marginTop: 8 },
            !recordingUri && { opacity: 0.4 },
          ]}
          disabled={!recordingUri}
          onPress={handlePlayRecording}
        >
          <Text style={styles.smallButtonText}>
            {isPlayingBack ? "Playing…" : "Play last recording"}
          </Text>
        </TouchableOpacity>

        {/* End button */}
        <TouchableOpacity style={styles.endButton} onPress={handleEndCall}>
          <Text style={styles.endButtonText}>End</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#A9D6F1",
    paddingTop: 80,
    paddingHorizontal: 24,
    paddingBottom: 40,
    justifyContent: "space-between",
  },
  topSection: {
    alignItems: "center",
    gap: 8,
  },
  ttsText: {
    fontSize: 16,
    color: "#F5F5F5",
    opacity: 0.9,
  },
  numberText: {
    fontSize: 28,
    fontWeight: "700",
    color: "#FFDE5A",
    marginTop: 4,
  },
  timerText: {
    fontSize: 20,
    color: "#F5F5F5",
    marginTop: 8,
  },
  permissionBox: {
    marginTop: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: "rgba(0,0,0,0.25)",
  },
  permissionText: {
    color: "#F5F5F5",
    fontSize: 12,
    textAlign: "center",
  },
  stateSection: {
    alignItems: "center",
  },
  stateLabel: {
    fontSize: 14,
    color: "#F5F5F5",
    marginBottom: 12,
    opacity: 0.8,
  },
  stateChipsRow: {
    flexDirection: "row",
    gap: 8,
    flexWrap: "wrap",
    justifyContent: "center",
  },
  stateChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.3)",
    backgroundColor: "rgba(0,0,0,0.15)",
  },
  stateChipActive: {
    backgroundColor: "#FFDE5A",
    borderColor: "#FFDE5A",
  },
  stateChipText: {
    fontSize: 13,
    color: "#F5F5F5",
  },
  stateChipTextActive: {
    color: "#2C3E50",
    fontWeight: "600",
  },
  bottomSection: {
    gap: 16,
  },
  recordButton: {
    paddingVertical: 14,
    borderRadius: 999,
    backgroundColor: "#FFDE5A",
    alignItems: "center",
    justifyContent: "center",
  },
  recordButtonDisabled: {
    backgroundColor: "rgba(0,0,0,0.2)",
  },
  recordButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#2C3E50",
  },
  controlRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  smallButton: {
    flex: 1,
    marginHorizontal: 4,
    paddingVertical: 12,
    borderRadius: 999,
    backgroundColor: "rgba(0,0,0,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  smallButtonText: {
    color: "#5F5F5F",
    fontSize: 14,
    fontWeight: "500",
    paddingVertical: 12,
  
  },
  endButton: {
    marginTop: 8,
    backgroundColor: "#D90429",
    paddingVertical: 16,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 5,
    elevation: 4,
  },
  endButtonText: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "700",
  },
  messageContainer: {
    marginTop: 20,
    width: "100%",
    maxHeight: 180,
    padding: 12,
    borderRadius: 16,
    backgroundColor: "rgba(0, 0, 0, 0.2)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.3)",
  },
  messageTitle: {
    color: "#FFDE5A",
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 8,
  },
  messageScroll: {
    flexGrow: 0,
  },
  messageScrollContent: {
    paddingBottom: 8,
  },
  messageText: {
    color: "#F5F5F5",
    fontSize: 14,
    lineHeight: 20,
    opacity: 0.95,
  },
  uriText: {
    marginTop: 8,
    fontSize: 11,
    color: "#F5F5F5",
    opacity: 0.8,
  },
});
