import { NewProjectForm } from "@/components/new-project-form";

export default function NewProjectPage() {
  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <div className="page-header">
        <h1 className="page-title">New project</h1>
        <p className="page-description">
          Connect a GitHub repository to start editing content.
        </p>
      </div>
      <NewProjectForm />
    </div>
  );
}