import { Sidebar } from "./components/sidebar/Sidebar";
import { EditorArea } from "./components/editor/EditorArea";
import { Titlebar } from "./components/titlebar/Titlebar";
import { SettingsPanel } from "./components/settings/SettingsPanel";
import { useSettingsStore } from "./stores/settingsStore";

function App() {
  const { showSettings } = useSettingsStore();

  return (
    <div className="flex flex-col h-screen bg-bg-primary">
      <Titlebar />
      <div className="flex flex-1 min-h-0">
        <Sidebar />
        <EditorArea />
      </div>
      {showSettings && <SettingsPanel />}
    </div>
  );
}

export default App;
