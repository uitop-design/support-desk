import { RequestForm } from "@/components/RequestForm";

export const metadata = { title: "New request · Support Desk" };

export default function NewRequestPage() {
  return (
    <div className="narrow">
      <h1>Submit a request</h1>
      <RequestForm />
    </div>
  );
}
