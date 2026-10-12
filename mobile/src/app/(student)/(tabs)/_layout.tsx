import { Tabs } from "expo-router";
import { AppTabBar } from "@/components/app-tab-bar";
import { studentTabs } from "@/components/student-tabs";

export default function StudentTabsLayout() {
  return (
    <Tabs tabBar={(props) => <AppTabBar {...props} tabs={studentTabs} />} screenOptions={{ headerShown: false }}>
      {studentTabs.map((tab) => <Tabs.Screen key={tab.name} name={tab.name} options={{ title: tab.label }} />)}
    </Tabs>
  );
}
