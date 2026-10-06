import { Text, TextInput, View } from "react-native";

type StubProps = { label: string; value: string; onChange: (value: string) => void; error?: string | null };

export function DateTimeField({ label, value, onChange, error }: StubProps) {
  return (
    <View>
      <TextInput accessibilityLabel={label} value={value} onChangeText={onChange} />
      {error ? <Text>{error}</Text> : null}
    </View>
  );
}
