export default function ProjectEditorLayout({ children }: { children: React.ReactNode }) {
  return <div className="-m-6 h-[calc(100vh-3.5rem)] overflow-hidden">{children}</div>;
}