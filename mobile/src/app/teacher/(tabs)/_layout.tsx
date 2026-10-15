import { Tabs } from "expo-router";
import { AppTabBar } from "@/components/app-tab-bar";

import { teacherTabs } from "@/components/teacher-tabs";

export default function TeacherTabsLayout() {
  return (
    <Tabs tabBar={(props) => <AppTabBar {...props} tabs={teacherTabs} />} screenOptions={{ headerShown: false }}>
      {teacherTabs.map((tab) => <Tabs.Screen key={tab.name} name={tab.name} options={{ title: tab.label }} />)}
    </Tabs>
  );
}
