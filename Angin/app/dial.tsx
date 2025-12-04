import { useRouter } from "expo-router";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

export default function DialScreen() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Dial Pad</Text>

      <TouchableOpacity
        style={styles.callButton}
        onPress={() => router.push("/call")}
      >
        <Text style={styles.callButtonText}>Start Call</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  title: {
    fontSize: 24,
    marginBottom: 30,
  },
  callButton: {
    backgroundColor: "#FFDE5A",
    paddingHorizontal: 40,
    paddingVertical: 20,
    borderRadius: 30,
  },
  callButtonText: {
    fontSize: 20,
    fontWeight: "600",
  },
});
