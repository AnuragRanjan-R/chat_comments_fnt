"use client";

import { useState } from "react";
import { Button, Input, Label, Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui";
import { useAuth } from "@/context/AuthContext";

export function AuthDialog() {
  const { login, register } = useAuth();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      if (mode === "login") {
        await login(email, password);
      } else {
        await register(name, email, password);
      }
      setOpen(false);
    } catch (err: any) {
      setError(err?.response?.data?.detail || "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">Login / Register</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{mode === "login" ? "Login" : "Register"}</DialogTitle>
          <DialogDescription>
            {mode === "login" ? "Enter your credentials" : "Create a new account"}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="grid gap-4">
          {mode === "register" && (
            <div className="grid gap-2">
              <Label htmlFor="name">Name</Label>
              <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required />
            </div>
          )}
          <div className="grid gap-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="password">Password</Label>
            <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          </div>
          {error && <p className="text-red-600 text-sm">{error}</p>}
          <div className="flex items-center justify-between">
            <Button type="submit" disabled={submitting}>
              {submitting ? "Please wait..." : mode === "login" ? "Login" : "Register"}
            </Button>
            <Button type="button" variant="ghost" onClick={() => setMode(mode === "login" ? "register" : "login")}> 
              {mode === "login" ? "Need an account? Register" : "Have an account? Login"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}



