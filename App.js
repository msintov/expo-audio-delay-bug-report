import { StatusBar } from 'expo-status-bar';
import { StyleSheet, View } from 'react-native';
import TestRecorder from './TestRecorder';

export default function App() {
  return (
    <View style={styles.container}>
      <TestRecorder />
      <StatusBar style="auto" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
});
