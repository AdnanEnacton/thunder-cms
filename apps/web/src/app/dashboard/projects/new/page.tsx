import { NewProjectForm } from "@/components/new-project-form";

export default function NewProjectPage() {
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">New project</h1>
        <p className="text-muted">Connect a GitHub repository to start editing content.</p>
      </div>
      <NewProjectForm />
    </div>
  );
}