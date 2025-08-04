"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function RegisterPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [codeforcesHandle, setcodeforcesHandle] = useState("");
  const [codechefHandle, setcodechefHandle] = useState("");
  const [leetcodeHandle, setleetcodeHandle] = useState("");
  const [error, setError] = useState("");

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    try {
      const res = await fetch("http://localhost:4000/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password,codeforcesHandle,leetcodeHandle,codechefHandle }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.message || "Registration failed");
      } else {
        alert("Registered successfully!");
        router.push("/login");
      }
    } catch (err) {
      setError("Something went wrong");
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <form
        onSubmit={handleRegister}
        className="bg-white p-8 rounded shadow-md w-full max-w-sm"
      >
        <h1 className="text-xl font-bold mb-4 text-black">Register</h1>

        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="w-full px-3 py-2 border rounded mb-4 text-black"
        />

        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          className="w-full px-3 py-2 border rounded mb-4 text-black"
        />
        <input
          type="text"
          placeholder="Codeforces Handle"
          value={codeforcesHandle}
          onChange={(e) => setcodeforcesHandle(e.target.value)}
          className="w-full px-3 py-2 border rounded mb-4 text-black"
        />
        <input
          type="text"
          placeholder="LeetCode Handle"
          value={leetcodeHandle}
          onChange={(e) => setleetcodeHandle(e.target.value)}
          className="w-full px-3 py-2 border rounded mb-4 text-black"
        />
        <input
          type="text"
          placeholder="CodeChef Handle"
          value={codechefHandle}
          onChange={(e) => setcodechefHandle(e.target.value)}
          className="w-full px-3 py-2 border rounded mb-4 text-black"
        />

        {error && <p className="text-red-500 text-sm mb-3">{error}</p>}

        <button
          type="submit"
          className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700"
        >
          Register
        </button>
      </form>
    </div>
  );
}
