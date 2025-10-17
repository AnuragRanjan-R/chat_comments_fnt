"use client";

import { useAuth } from "@/context/AuthContext";
import { AuthDialog } from "@/components/AuthDialog";

export function HeaderAuthArea() {
  const { user, logout, loading } = useAuth();
  if (loading) return <div>Loading...</div>;
  if (user) {
    return (
      <div className="flex items-center gap-3">
        <span className="text-sm">Hi, {user.name}</span>
        <button className="px-3 py-1 border rounded" onClick={logout}>Logout</button>
      </div>
    );
  }
  return <AuthDialog />;
}


