// app/dial.tsx
import { useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { useRouter } from "expo-router";

const KEYPAD_ROWS: string[][]= [
  ["1", "2", "3"],
  ["4", "5", "6"],
  ["7", "8", "9"],
  ["*", "0", "#"],
];

export default function DialScreen() {
  const router = useRouter();
  const [input, setInput] = useState("");

  const handlePressKey = (key: string) => {
    setInput((prev) => prev + key);
  };


  const handleCall = () => {
    const numberToCall = input || "911";
    router.push({
      pathname: "/call",
      params: { number: numberToCall },
    });
  };

  return (
    <View style={styles.container}>
      {/* Top section: title + input */}
      <View style={styles.top}>
        <Text style={styles.title}>Call 911</Text>

      </View>

      {/* Keypad */}
      <View style={styles.keypadContainer}>
        {KEYPAD_ROWS.map((row, rowIndex) => (
          <View key={rowIndex} style={styles.keypadRow}>
            {row.map((key) => (
              <TouchableOpacity
                key={key}
                style={styles.keyButton}
                onPress={() => handlePressKey(key)}
              >
                <Text style={styles.keyLabel}>{key}</Text>
              </TouchableOpacity>
            ))}
          </View>
        ))}
      </View>

      {/* Call button */}
      <TouchableOpacity style={styles.callButton} onPress={handleCall}>
        <Text style={styles.callButtonText}>Call</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F5F5F5",
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 30,
    justifyContent: "space-between",
  },
  top: {
    alignItems: "center",
    gap: 8,
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
    color: "#2C3E50",
  },
  keypadRow: {
    flexDirection: "row",
    justifyContent: "center",
  },
  keypadContainer: {
    marginTop: 20,
    gap: 12, 
  },
keyButton: {
  width: 80,
  height: 80,
  borderRadius: 40,
  borderWidth: 1,
  borderColor: "#337485",
  justifyContent: "center",
  alignItems: "center",
  marginHorizontal: 10,
  marginVertical: 8,
  backgroundColor: "#FFFFFF",
  shadowColor: "#000",
  shadowOpacity: 0.05,
  shadowOffset: { width: 0, height: 1 },
  shadowRadius: 2,
  elevation: 1,
},
  keyLabel: {
    fontSize: 24,
    fontWeight: "600",
    color: "#2C3E50",
  },
  callButton: {
    backgroundColor: "#D90429",
    paddingVertical: 16,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 3,
  },
  callButtonText: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "700",
  },
});
