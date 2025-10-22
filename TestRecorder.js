/* Test with buttons to allow play, pause, start and stop audio file recording */

import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Platform, TouchableOpacity, ActivityIndicator } from 'react-native';
import {
    useAudioRecorder,
    useAudioPlayer,
    useAudioPlayerStatus,
    AudioModule,
    RecordingPresets,
    useAudioRecorderState
} from 'expo-audio';

export const TestRecorder = () => {
    const [logs, setLogs] = useState([]);
    const [audioLoaded, setAudioLoaded] = useState(false);
    const [recorderPrepared, setRecorderPrepared] = useState(false);
    const [lastRecordingUri, setRecordingUri] = useState(null);

    // Loading states for spinners
    const [showAudioPlaySpinner, setShowAudioPlaySpinner] = useState(false);
    const [isStartingRecording, setIsStartingRecording] = useState(false);
    const [isPlayingRecording, setIsPlayingRecording] = useState(false);

    // Audio playback setup
    const audioPlayer = useAudioPlayer();
    const audioStatus = useAudioPlayerStatus(audioPlayer);

    // Separate player for recording playback; only used for playing the recording.
    const recordingPlayer = useAudioPlayer();
    const recordingStatus = useAudioPlayerStatus(recordingPlayer);

    const TEST_AUDIO_URL = 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3';

    const audioRecorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
    //const recorderState = useAudioRecorderState(audioRecorder); // There is something buggy about this. audioRecorder.isRecording says true and is accurate while recorderState.isRecording is false.

    const addLog = (message, startTime) => {
        const now = Date.now();
        const duration = startTime ? now - startTime : undefined;
        const timestamp = new Date().toISOString().split('T')[1].slice(0, -1);

        setLogs(prev => [...prev, {
            timestamp,
            message,
            duration
        }]);

        console.log(`[${timestamp}] ${message}${duration ? ` (${duration}ms)` : ''}`);
    };

    useEffect(() => {
        const setup = async () => {
            if (Platform.OS === 'ios' || Platform.OS === 'android') {
                addLog('Requesting permissions...');
                const status = await AudioModule.requestRecordingPermissionsAsync();
                addLog(`Permissions: ${status.granted ? '✅' : '❌'}`);
            }
        };

        setup();
    }, []);


    const stopRecording = async () => {
        if (!audioRecorder.isRecording) {
            addLog('Not recording');
            return;
        }

        addLog('Stopping recording...');
        const startTime = Date.now();

        try {
            await audioRecorder.stop();
            addLog('Recording stopped', startTime);

            const uri = audioRecorder.uri;
            if (uri) {
                setRecordingUri(uri);
                setRecorderPrepared(false); // Reset for next recording. TODO what does this do?
            }
        } catch (error) {
            addLog(`Stop error: ${error}`);
        }
        finally {
            addLog('calling setAudioModeAsync without allowsRecording');
            try {
                await AudioModule.setAudioModeAsync({
                    playsInSilentMode: true,
                    shouldPlayInBackground: true,
                    interruptionMode: Platform.OS === 'ios' ? 'duckOthers' : 'doNotMix',
                    shouldRouteThroughEarpiece: false,
                });
                addLog('Stop Recording. setAudioModeAsync complete.');
            } catch (error) {
                addLog(`❌ Audio mode error: ${error}`);
            }

        }
    };

    // Audio playback functions
    const loadAudio = async () => {
        const startTime = Date.now();

        try {
            await audioPlayer.replace({ uri: TEST_AUDIO_URL });
            addLog('Audio loaded', startTime);
            setAudioLoaded(true);
        } catch (error) {
            addLog(`Audio load error: ${error}`, startTime);
        }
    };

    const startPlaying = () => {
        if (!audioLoaded) {
            addLog('Load audio first');
            return;
        }

        setShowAudioPlaySpinner(true);

        // Use setTimeout to allow React to re-render with spinner visible
        setTimeout(async () => {
            addLog('Attempting to start audio playback...');
            const startTime = Date.now();

            try {
                await audioPlayer.play(); // Sometimes this encounters a delay due to allowsRecording
                const elapsed = Date.now() - startTime;
                addLog(`Audio playback started after ${elapsed}ms`);
            } catch (error) {
                addLog(`Audio play error: ${error}`);
            } finally {
                setShowAudioPlaySpinner(false);
            }
        }, 0); // 0ms delay - just enough to let React re-render
    };

    const pauseAudio = () => {
        if (!audioStatus.playing) {
            addLog('Audio not playing');
            return;
        }

        audioPlayer.pause();
        addLog('Audio paused');
    };

    const startRecording = async () => {
        setIsStartingRecording(true);
        const sequenceStart = Date.now();

        addLog('Calling prepareToRecordAsync...');
        const prepareStart = Date.now();
        setTimeout(async () => {
            try {
                console.log("calling setAudioModeAsync with allowsRecording");
                const startTime = Date.now();
                await AudioModule.setAudioModeAsync({
                    allowsRecording: true,
                    playsInSilentMode: true,
                });

                await audioRecorder.prepareToRecordAsync();

                addLog('Calling record()');
                await audioRecorder.record();
                const elapsed = Date.now() - startTime;
                addLog(`Recording started after ${elapsed}ms`);

                setRecorderPrepared(true); // TODO: What is this for?
            } catch (error) {
                addLog(`Recording error: ${error}`);
            } finally {
                setIsStartingRecording(false);
            }
        }, 0); // 0ms delay - just enough to let React re-render
    };

    const playRecording = () => {
        if (!lastRecordingUri) {
            addLog('No recording available');
            return;
        }

        setIsPlayingRecording(true);

        // Use setTimeout to allow React to re-render with spinner visible
        setTimeout(async () => {
            // Pause the background audio first
            if (audioStatus.playing) {
                audioPlayer.pause();
                addLog('Paused background audio');
            }

            addLog('Loading recorded audio...');
            addLog(`Recording URI: ${lastRecordingUri}`);
            const startTime = Date.now();

            try {
                await recordingPlayer.replace({ uri: lastRecordingUri });

                // LOG RECORDING DURATION AND STATUS
                addLog(`Recording loaded in ${Date.now() - startTime}ms`);

                // Check if it actually loaded
                const playerDuration = recordingPlayer.duration;
                addLog(`Recording duration (player.duration): ${playerDuration}ms`);

                // Use a small delay to ensure status is updated
                setTimeout(() => {
                    addLog(`Recording status isLoaded: ${recordingStatus.isLoaded}`);
                    addLog(`Recording status duration: ${recordingStatus.duration}ms`);
                    addLog(`Recording status playing: ${recordingStatus.playing}`);
                }, 100);

                // Ensure volume is set
                recordingPlayer.volume = 1.0;
                addLog(`Volume set to: ${recordingPlayer.volume}`);

                addLog('Attempting to play recording...');
                const playStart = Date.now();
                await recordingPlayer.play();
                const elapsed = Date.now() - playStart;
                addLog(`Play command sent after ${elapsed}ms`);

                // Check if it's actually playing after a moment
                setTimeout(() => {
                    addLog(`After play - isPlaying: ${recordingStatus.playing}`);
                    addLog(`After play - currentTime: ${recordingStatus.currentTime}ms`);
                }, 200);

            } catch (error) {
                addLog(`Playback error: ${error}`);
            } finally {
                addLog("Setting recording spinner to false");
                setIsPlayingRecording(false);
            }
        }, 0); // 0ms delay - just enough to let React re-render
    };

    return (
        <View style={styles.container}>
            <Text style={styles.title}>Recording Test</Text>

            {/* Main Test Controls */}
            <View style={styles.section}>
                <Text style={{ fontWeight: 'bold', marginBottom: 5 }}>WITH AUDIO:</Text>
                <TouchableOpacity
                    style={[styles.button, { backgroundColor: '#6B7280' }]}
                    onPress={loadAudio}
                >
                    <Text style={styles.buttonText}>LOAD AUDIO</Text>
                </TouchableOpacity>
            </View>

            <View style={styles.section}>
                <TouchableOpacity
                    style={[styles.button, { backgroundColor: '#6B7280' }]}
                    onPress={startPlaying}
                //disabled={isPlayingAudio}
                >
                    {showAudioPlaySpinner ? (
                        <ActivityIndicator color="#FFFFFF" />
                    ) : (
                        <Text style={styles.buttonText}>PLAY AUDIO</Text>
                    )}
                </TouchableOpacity>
            </View>

            <View style={styles.section}>
                <TouchableOpacity
                    style={[styles.button, { backgroundColor: '#6B7280' }]}
                    onPress={pauseAudio}
                >
                    <Text style={styles.buttonText}>PAUSE AUDIO</Text>
                </TouchableOpacity>
            </View>

            <View style={styles.section}>
                <TouchableOpacity
                    style={[styles.button, { backgroundColor: '#6B7280' }]}
                    onPress={startRecording}
                    disabled={isStartingRecording}
                >
                    {isStartingRecording ? (
                        <ActivityIndicator color="#FFFFFF" />
                    ) : (
                        <Text style={styles.buttonText}>START RECORDING</Text>
                    )}
                </TouchableOpacity>
            </View>

            <View style={styles.section}>
                <TouchableOpacity
                    style={[styles.button, { backgroundColor: '#6B7280' }]}
                    onPress={stopRecording}
                >
                    <Text style={styles.buttonText}>STOP RECORDING</Text>
                </TouchableOpacity>
            </View>

            <View style={styles.section}>
                <TouchableOpacity
                    style={[styles.button, { backgroundColor: '#6B7280' }]}
                    onPress={playRecording}
                    disabled={isPlayingRecording}
                >
                    {isPlayingRecording ? (
                        <ActivityIndicator color="#FFFFFF" />
                    ) : (
                        <Text style={styles.buttonText}>PLAY RECORDING</Text>
                    )}
                </TouchableOpacity>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 20,
        paddingTop: 100,  // Add top padding to move content down from status bar
        backgroundColor: '#f5f5f5',
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        textAlign: 'center',
        marginBottom: 5,
    },
    statusContainer: {
        backgroundColor: 'white',
        padding: 15,
        borderRadius: 10,
        marginBottom: 20,
    },
    section: {
        marginBottom: 10,
    },
    button: {
        paddingVertical: 12,
        paddingHorizontal: 24,
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center',
        ...Platform.select({
            ios: {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.25,
                shadowRadius: 3.84,
            },
            android: {
                elevation: 5,
            },
        }),
    },
    buttonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '600',
    },
    consoleContainer: {
        flex: 1,
        backgroundColor: '#222',
        borderRadius: 10,
        padding: 10,
    },
    consoleHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 10,
    },
    consoleTitle: {
        color: '#0F0',
        fontWeight: 'bold',
    },
    console: {
        flex: 1,
    },
    logEntry: {
        color: '#0F0',
        fontSize: 12,
        fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
        marginBottom: 2,
    },
    duration: {
        color: '#FF0',
        fontWeight: 'bold',
    },
});

export default TestRecorder;
