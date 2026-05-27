import Editor from "@monaco-editor/react";
import { useTheme } from "../lib/theme";

export default function CodeEditor({
  value,
  onChange,
  language = "python",
  height = "380px",
  readOnly = false,
}: {
  value: string;
  onChange?: (v: string) => void;
  language?: string;
  height?: string;
  readOnly?: boolean;
}) {
  const { theme } = useTheme();
  return (
    <div className="card overflow-hidden">
      <Editor
        height={height}
        defaultLanguage={language}
        theme={theme === "light" ? "light" : "vs-dark"}
        value={value}
        onChange={(v) => onChange?.(v ?? "")}
        options={{
          fontSize: 13,
          minimap: { enabled: false },
          scrollBeyondLastLine: false,
          fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
          readOnly,
        }}
      />
    </div>
  );
}
