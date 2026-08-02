import React from "react";
import { Link, useNavigate } from "react-router-dom";
export default function Register() {
  const navigate = useNavigate();
  const handleRegister = () => {
  alert("Account created successfully!");
  navigate("/login");
};

  return (
    <div style={styles.container}>
      <div style={styles.card}>

        <h1 style={styles.logo}>❤️ LifeGuard AI</h1>

        <h2>Create an Account</h2>

        <p style={styles.subtitle}>
          Join LifeGuard AI to assess lifestyle disease risks.
        </p>

        <input
          type="text"
          placeholder="Full Name"
          style={styles.input}
        />

        <input
          type="email"
          placeholder="Email Address"
          style={styles.input}
        />

        <input
          type="password"
          placeholder="Password"
          style={styles.input}
        />

        <input
          type="password"
          placeholder="Confirm Password"
          style={styles.input}
        />

        <button
  style={styles.button}
  onClick={handleRegister}
>
  Create Account
</button>

        <p style={styles.footer}>
  Already have an account?
  <Link
    to="/login"
    style={{
      color: "#1976d2",
      marginLeft: "5px",
      textDecoration: "none",
      fontWeight: "bold",
    }}
  >
    Sign In
  </Link>
</p>

      </div>
    </div>
  );
}

const styles = {
  container: {
    height: "100vh",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    background: "#f4f7fb",
  },

  card: {
    width: "420px",
    padding: "40px",
    background: "white",
    borderRadius: "20px",
    boxShadow: "0 12px 30px rgba(0,0,0,.1)",
    textAlign: "center",
  },

  logo: {
    color: "#1976d2",
    marginBottom: "10px",
  },

  subtitle: {
    color: "#666",
    marginBottom: "30px",
  },

  input: {
    width: "100%",
    padding: "15px",
    marginBottom: "15px",
    borderRadius: "10px",
    border: "1px solid #ddd",
    fontSize: "16px",
    boxSizing: "border-box",
  },

  button: {
    width: "100%",
    padding: "15px",
    background: "#1976d2",
    color: "white",
    border: "none",
    borderRadius: "10px",
    fontSize: "18px",
    cursor: "pointer",
  },

  footer: {
    marginTop: "20px",
    color: "#555",
  },

  link: {
    color: "#1976d2",
    cursor: "pointer",
    fontWeight: "bold",
  },
};
