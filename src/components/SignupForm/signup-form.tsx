import { useState, FormEvent } from "react";
import { form, input, button, message, success, error } from "./signup-form.module.css";

type SignupFormProps = {
  actionUrl?: string;
  listId?: string;
  placeholder?: string;
  buttonText?: string;
  successText?: string;
};

export default function SignupForm({
  actionUrl,
  listId,
  placeholder = "Your email address",
  buttonText = "Sign up",
  successText = "You're in! We'll be in touch.",
}: SignupFormProps) {
  const [status, setStatus] = useState<"idle" | "submitting" | "success" | "error">("idle");
  const [msg, setMsg] = useState("");

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!actionUrl) return;
    const formData = new FormData(e.currentTarget);
    const email = formData.get("email") as string;
    if (!email) return;

    setStatus("submitting");

    try {
      const res = await fetch(actionUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, ...(listId && { list_id: listId }) }),
      });
      if (!res.ok) throw new Error(`${res.status}`);
      setStatus("success");
      setMsg(successText);
    } catch {
      setStatus("error");
      setMsg("Something went wrong. Please try again.");
    }
  }

  if (status === "success") {
    return <p className={`${message} ${success}`}>{msg}</p>;
  }

  return (
    <form className={form} onSubmit={handleSubmit} noValidate>
      <input
        className={input}
        type="email"
        name="email"
        placeholder={placeholder}
        required
        disabled={status === "submitting"}
      />
      <button className={button} type="submit" disabled={status === "submitting"}>
        {status === "submitting" ? "..." : buttonText}
      </button>
      {status === "error" && <p className={`${message} ${error}`}>{msg}</p>}
    </form>
  );
}
