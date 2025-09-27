import React, { useState } from "react";
import { api } from "../api.js";

export default function Login({ onLogin }) {
  const [username, setUsername] = useState("");
  const [err, setErr] = useState(null);

  async function submit(e) {
    e.preventDefault();
    setErr(null);
    try {
      const data = await api("/api/login", {
        method: "POST",
        body: JSON.stringify({ username })
      });
      onLogin(data);
    } catch (e) {
      setErr(e.message);
    }
  }

  return (
    <div className="container">
      <h1>Waste Management</h1>
      <form onSubmit={submit}>
        <input
          placeholder="Enter username (admin for worker portal)"
          value={username}
          onChange={e => setUsername(e.target.value)}
        />
        <button type="submit">Enter</button>
      </form>
      {err && <div className="error">{err}</div>}
      <p className="hint">No password needed. Username 'admin' opens worker portal.</p>
    </div>
  );
}