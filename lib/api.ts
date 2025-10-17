import axios from "axios";
import { API_URL } from "./config";

export const api = axios.create({
  baseURL: API_URL,
});

export function setAuthToken(token: string | null) {
  if (token) {
    api.defaults.headers.common["Authorization"] = `Bearer ${token}`;
  } else {
    delete api.defaults.headers.common["Authorization"];
  }
}

export type User = {
  id: number;
  name: string;
  email: string;
  avatar?: string | null;
  created_at: string;
};

export type Comment = {
  id: number;
  text: string;
  upvotes: number;
  user: User;
  replies: Comment[];
  created_at: string;
  parent_id?: number | null;
};

export async function login(email: string, password: string) {
  const form = new URLSearchParams();
  form.append("username", email);
  form.append("password", password);
  const { data } = await api.post<{ access_token: string; token_type: string }>(
    "/token",
    form,
    { headers: { "Content-Type": "application/x-www-form-urlencoded" } }
  );
  return data.access_token;
}

export async function register(name: string, email: string, password: string) {
  const { data } = await api.post<User>("/register", { name, email, password });
  return data;
}

export async function getMe() {
  const { data } = await api.get<User>("/users/me");
  return data;
}

export async function getComments(params?: { limit?: number }) {
  const { data } = await api.get<Comment[]>("/comments", { params });
  return data;
}

export async function createComment(text: string, parent_id?: number | null) {
  const { data } = await api.post<Comment>("/comments", { text, parent_id });
  return data;
}

export async function upvoteComment(commentId: number) {
  const { data } = await api.post<Comment>(`/comments/${commentId}/upvote`);
  return data;
}

export async function logoutApi() {
  // Stateless JWT: endpoint exists for parity; client discards token
  try {
    await api.post("/logout");
  } catch {
    // ignore
  }
}

export async function deleteComment(commentId: number) {
  await api.delete(`/comments/${commentId}`);
}


